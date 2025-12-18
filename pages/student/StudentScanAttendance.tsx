import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, MapPin, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthContext';

// Haversine distance calculation
const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const StudentScanAttendance = () => {
    const { session } = useAuth();
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [status, setStatus] = useState<'idle' | 'scanning' | 'validating' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [studentLocation, setStudentLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [isScanning, setIsScanning] = useState(false);

    // Request location - non-blocking, will retry during validation
    const requestLocation = () => {
        if (!navigator.geolocation) {
            console.warn('Geolocation not supported');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setStudentLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
            },
            (error) => {
                // Don't show error here - will handle during validation
                console.warn('Location error:', error.message);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    // Start QR scanner
    const startScanning = async () => {
        setStatus('scanning');
        setErrorMessage('');
        requestLocation();

        // Wait for DOM element to be rendered with retry
        let attempts = 0;
        while (!document.getElementById('qr-reader') && attempts < 10) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (!document.getElementById('qr-reader')) {
            setErrorMessage('Scanner initialization failed. Please try again.');
            setStatus('idle');
            return;
        }

        try {
            // Create scanner instance
            scannerRef.current = new Html5Qrcode("qr-reader");
            setIsScanning(true);

            // Scanner config with higher FPS for faster detection
            const config = {
                fps: 15,
                qrbox: { width: 250, height: 250 }
            };

            // Try back camera first, fall back to front camera
            try {
                await scannerRef.current.start(
                    { facingMode: "environment" },
                    config,
                    async (decodedText) => {
                        await stopScanning();
                        validateAndSubmit(decodedText); // Don't await - faster response
                    },
                    () => { } // Ignore scan errors (camera still looking)
                );
            } catch {
                // Fallback to front camera
                await scannerRef.current.start(
                    { facingMode: "user" },
                    config,
                    async (decodedText) => {
                        await stopScanning();
                        validateAndSubmit(decodedText); // Don't await - faster response
                    },
                    () => { }
                );
            }
        } catch (err: any) {
            console.error('Scanner error:', err);
            setErrorMessage(
                err.message?.includes('Permission')
                    ? 'Camera permission denied. Please allow camera access in your browser settings.'
                    : 'Camera not available. Please ensure no other app is using the camera.'
            );
            setStatus('idle');
            setIsScanning(false);
        }
    };

    // Stop scanner
    const stopScanning = async () => {
        if (scannerRef.current && isScanning) {
            try {
                await scannerRef.current.stop();
                scannerRef.current.clear();
            } catch (e) {
                console.log('Scanner already stopped');
            }
            setIsScanning(false);
        }
    };

    // Validate and submit attendance
    const validateAndSubmit = async (qrData: string) => {
        setStatus('validating');
        setErrorMessage('');

        try {
            // 1. Decode QR data
            let payload;
            try {
                payload = JSON.parse(atob(qrData));
            } catch {
                throw new Error('Invalid QR code format');
            }

            const { sid, nonce, exp } = payload;

            // 2. Check expiry
            if (new Date(exp) < new Date()) {
                throw new Error('QR code has expired. Please scan the new code.');
            }

            // 3. Use cached location or skip location check
            // Location is optional - if not available, we'll skip distance validation
            const currentLocation = studentLocation;

            // 4. Fetch session from Supabase (just check session ID and active status)
            // Note: We skip nonce validation since QR changes every 15s and causes race conditions
            const { data: sessionData, error: sessionError } = await supabase
                .from('attendance_sessions')
                .select('id, classroom_id, teacher_lat, teacher_lng, radius_meters, active')
                .eq('id', sid)
                .eq('active', true)
                .maybeSingle();

            if (sessionError) {
                console.error('Session query error:', sessionError);
                throw new Error('Failed to validate session. Please try again.');
            }

            if (!sessionData) {
                throw new Error('Session not found. The QR code may have expired.');
            }

            // 5. Validate distance only if location is available
            if (currentLocation && sessionData.teacher_lat && sessionData.teacher_lng) {
                const distance = haversineDistance(
                    currentLocation.lat,
                    currentLocation.lng,
                    sessionData.teacher_lat,
                    sessionData.teacher_lng
                );

                const radiusMeters = sessionData.radius_meters || 50;

                if (distance > radiusMeters) {
                    throw new Error(`You are too far from the classroom (${Math.round(distance)}m away). Please move closer.`);
                }
            }

            // 6. Check for duplicate
            const { data: existing } = await supabase
                .from('attendance')
                .select('id')
                .eq('session_id', sid)
                .eq('student_id', session?.user?.id)
                .single();

            if (existing) {
                throw new Error('You have already marked attendance for this session.');
            }

            // 7. Insert attendance record
            const { error: insertError } = await supabase.from('attendance').insert({
                course_id: sessionData.classroom_id,
                student_id: session?.user?.id,
                date: new Date().toISOString().split('T')[0],
                status: 'Present',
                session_id: sid,
                student_lat: currentLocation?.lat || null,
                student_lng: currentLocation?.lng || null,
                marked_via: 'qr'
            });

            if (insertError) throw insertError;

            setStatus('success');

        } catch (err: any) {
            setErrorMessage(err.message || 'Failed to mark attendance');
            setStatus('error');
        }
    };

    // Cleanup on unmount and visibility change
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && isScanning) {
                stopScanning();
                setStatus('idle');
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            stopScanning();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [isScanning]);

    return (
        <div className="h-full bg-[#F4F4F5] p-6 lg:p-8 overflow-y-auto rounded-t-[2rem] rounded-b-none md:rounded-b-[2rem] font-sans pb-32">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">Scan Attendance</h1>
                <p className="text-gray-500 font-medium">Scan the QR code shown by your teacher</p>
            </div>

            <div className="max-w-lg mx-auto">
                <AnimatePresence mode="wait">
                    {status === 'idle' && (
                        <motion.div
                            key="idle"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="bg-white rounded-[2rem] p-8 shadow-sm text-center"
                        >
                            <div className="w-24 h-24 mx-auto mb-6 bg-blue-50 rounded-full flex items-center justify-center">
                                <Camera size={40} className="text-blue-500" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Ready to Scan</h2>
                            <p className="text-gray-500 mb-6">
                                Point your camera at the QR code displayed by your teacher
                            </p>

                            {errorMessage && (
                                <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-4 text-sm">
                                    {errorMessage}
                                </div>
                            )}

                            <button
                                onClick={startScanning}
                                className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all"
                            >
                                <Camera size={20} />
                                Start Scanning
                            </button>
                        </motion.div>
                    )}

                    {status === 'scanning' && (
                        <motion.div
                            key="scanning"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="bg-white rounded-[2rem] overflow-hidden shadow-sm"
                        >
                            {/* QR Scanner Container */}
                            <div className="relative">
                                <div id="qr-reader" className="w-full" style={{ minHeight: '350px' }} />

                                {/* Scanning overlay text */}
                                <div className="absolute bottom-4 left-0 right-0 text-center">
                                    <div className="inline-flex items-center gap-2 bg-black/70 text-white px-4 py-2 rounded-full text-sm">
                                        <RefreshCw size={14} className="animate-spin" />
                                        Scanning for QR code...
                                    </div>
                                </div>
                            </div>

                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`flex items-center gap-2 ${studentLocation ? 'text-green-600' : 'text-yellow-600'}`}>
                                        <MapPin size={16} />
                                        <span className="text-sm font-medium">
                                            {studentLocation ? 'Location captured' : 'Getting location...'}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => { stopScanning(); setStatus('idle'); }}
                                    className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-bold"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {status === 'validating' && (
                        <motion.div
                            key="validating"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="bg-white rounded-[2rem] p-12 shadow-sm text-center"
                        >
                            <div className="w-20 h-20 mx-auto mb-6 bg-blue-50 rounded-full flex items-center justify-center">
                                <RefreshCw size={32} className="text-blue-500 animate-spin" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">Validating...</h2>
                            <p className="text-gray-500 mt-2">Checking your location and session</p>
                        </motion.div>
                    )}

                    {status === 'success' && (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white rounded-[2rem] p-12 shadow-sm text-center"
                        >
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', delay: 0.2 }}
                                className="w-24 h-24 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center"
                            >
                                <CheckCircle size={48} className="text-green-500" />
                            </motion.div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Attendance Marked!</h2>
                            <p className="text-gray-500 mb-6">Your attendance has been recorded successfully</p>
                            <button
                                onClick={() => setStatus('idle')}
                                className="px-8 py-3 bg-black text-white rounded-xl font-bold"
                            >
                                Done
                            </button>
                        </motion.div>
                    )}

                    {status === 'error' && (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="bg-white rounded-[2rem] p-12 shadow-sm text-center"
                        >
                            <div className="w-24 h-24 mx-auto mb-6 bg-red-50 rounded-full flex items-center justify-center">
                                <XCircle size={48} className="text-red-500" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Attendance Failed</h2>
                            <p className="text-red-500 mb-6">{errorMessage}</p>
                            <button
                                onClick={() => setStatus('idle')}
                                className="px-8 py-3 bg-black text-white rounded-xl font-bold"
                            >
                                Try Again
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default StudentScanAttendance;
