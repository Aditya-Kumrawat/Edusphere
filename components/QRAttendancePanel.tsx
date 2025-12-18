import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, MapPin, RefreshCw, StopCircle, CheckCircle, AlertCircle, Users } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';

interface QRAttendancePanelProps {
    courseId: string;
    lectureId?: string;
    onStop: () => void;
}

// Generate a simple UUID
const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

const QRAttendancePanel: React.FC<QRAttendancePanelProps> = ({ courseId, lectureId, onStop }) => {
    const { session } = useAuth();
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [qrData, setQrData] = useState<string>('');
    const [countdown, setCountdown] = useState(15);
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [status, setStatus] = useState<'requesting-location' | 'confirm' | 'generating' | 'active' | 'stopped'>('requesting-location');
    const [presentCount, setPresentCount] = useState(0);
    const [totalEnrolled, setTotalEnrolled] = useState(0);
    const [countAsLecture, setCountAsLecture] = useState(true); // Default: count as lecture

    // Request location on mount
    useEffect(() => {
        requestLocation();
        fetchEnrolledCount();
    }, []);

    const fetchEnrolledCount = async () => {
        const { count } = await supabase
            .from('enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', courseId);
        setTotalEnrolled(count || 0);
    };

    const requestLocation = () => {
        setStatus('requesting-location');
        setLocationError(null);

        if (!navigator.geolocation) {
            setLocationError('Geolocation is not supported by your browser');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
                // Go to confirmation step instead of starting immediately
                setStatus('confirm');
            },
            (error) => {
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        setLocationError('Location permission denied. Please enable location access.');
                        break;
                    case error.POSITION_UNAVAILABLE:
                        setLocationError('Location information unavailable.');
                        break;
                    case error.TIMEOUT:
                        setLocationError('Location request timed out.');
                        break;
                    default:
                        setLocationError('An unknown error occurred.');
                }
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const startSession = async (shouldCountAsLecture: boolean) => {
        if (!location) return;

        setStatus('generating');

        const newSessionId = generateUUID();
        const nonce = generateUUID();
        const expiresAt = new Date(Date.now() + 15000).toISOString(); // 15 seconds

        // Generate QR IMMEDIATELY (don't wait for DB)
        setSessionId(newSessionId);
        generateQR(newSessionId, nonce, expiresAt);
        setStatus('active');
        setCountdown(15);

        // Save to database in background (always save, regardless of count option)
        supabase.from('attendance_sessions').insert({
            id: newSessionId,
            classroom_id: courseId,
            lecture_id: lectureId || null,
            teacher_id: session?.user?.id,
            nonce,
            teacher_lat: location.lat,
            teacher_lng: location.lng,
            expires_at: expiresAt,
            active: true,
            count_as_lecture: shouldCountAsLecture
        }).then(({ error }) => {
            if (error) {
                console.error('Error saving session:', error);
            }
        });
    };

    const generateQR = (sid: string, nonce: string, exp: string) => {
        const payload = JSON.stringify({ sid, nonce, exp });
        const encoded = btoa(payload);
        setQrData(encoded);
    };

    const refreshQR = useCallback(async () => {
        if (!sessionId || !location) return;

        const nonce = generateUUID();
        const expiresAt = new Date(Date.now() + 15000).toISOString(); // 15 seconds

        await supabase
            .from('attendance_sessions')
            .update({ nonce, expires_at: expiresAt })
            .eq('id', sessionId);

        generateQR(sessionId, nonce, expiresAt);
        setCountdown(15);
    }, [sessionId, location]);

    // Countdown and auto-refresh
    useEffect(() => {
        if (status !== 'active') return;

        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    refreshQR();
                    return 15;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [status, refreshQR]);

    // Poll for attendance count
    useEffect(() => {
        if (!sessionId || status !== 'active') return;

        const pollInterval = setInterval(async () => {
            const { count } = await supabase
                .from('attendance')
                .select('*', { count: 'exact', head: true })
                .eq('session_id', sessionId);
            setPresentCount(count || 0);
        }, 3000);

        return () => clearInterval(pollInterval);
    }, [sessionId, status]);

    const stopSession = async () => {
        if (sessionId) {
            await supabase
                .from('attendance_sessions')
                .update({ active: false, expires_at: new Date().toISOString() })
                .eq('id', sessionId);
        }
        setStatus('stopped');
        onStop();
    };

    return (
        <div className="bg-white rounded-[2rem] p-6 shadow-lg border border-gray-100">
            <AnimatePresence mode="wait">
                {status === 'requesting-location' && (
                    <motion.div
                        key="location"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-center py-12"
                    >
                        <div className="w-20 h-20 mx-auto mb-6 bg-blue-50 rounded-full flex items-center justify-center">
                            <MapPin size={32} className="text-blue-500 animate-pulse" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Requesting Location</h3>
                        <p className="text-gray-500 mb-4">Please allow location access to generate secure QR</p>

                        {locationError && (
                            <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-4">
                                <AlertCircle className="inline mr-2" size={16} />
                                {locationError}
                            </div>
                        )}

                        <button
                            onClick={requestLocation}
                            className="px-6 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600"
                        >
                            {locationError ? 'Retry' : 'Requesting...'}
                        </button>
                    </motion.div>
                )}

                {status === 'confirm' && (
                    <motion.div
                        key="confirm"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-center py-8"
                    >
                        <div className="w-20 h-20 mx-auto mb-6 bg-blue-50 rounded-full flex items-center justify-center">
                            <QrCode size={32} className="text-blue-500" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Count This as a Lecture?</h3>
                        <p className="text-gray-500 mb-6 text-sm">
                            This will add to the total lecture count for attendance percentage calculation
                        </p>

                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={() => startSession(false)}
                                className="px-8 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                            >
                                No, Skip Count
                            </button>
                            <button
                                onClick={() => startSession(true)}
                                className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg transition-all"
                            >
                                Yes, Count It
                            </button>
                        </div>

                        <p className="text-xs text-gray-400 mt-4">
                            Location: {location?.lat.toFixed(4)}, {location?.lng.toFixed(4)}
                        </p>
                    </motion.div>
                )}

                {status === 'generating' && (
                    <motion.div
                        key="generating"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-center py-12"
                    >
                        <div className="w-20 h-20 mx-auto mb-6 bg-purple-50 rounded-full flex items-center justify-center">
                            <RefreshCw size={32} className="text-purple-500 animate-spin" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">Generating QR Code...</h3>
                    </motion.div>
                )}

                {status === 'active' && (
                    <motion.div
                        key="active"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                                <span className="font-bold text-green-600">Session Active</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-500">
                                <Users size={16} />
                                <span className="font-bold">{presentCount}/{totalEnrolled}</span>
                            </div>
                        </div>

                        {/* QR Code */}
                        <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 p-1 rounded-[2rem] mb-6">
                            <div className="bg-white p-6 rounded-[1.8rem] flex items-center justify-center">
                                <motion.div
                                    key={qrData}
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                >
                                    <QRCodeSVG
                                        value={qrData}
                                        size={220}
                                        level="M"
                                        includeMargin={true}
                                    />
                                </motion.div>
                            </div>

                            {/* Countdown Ring */}
                            <div className="absolute -top-2 -right-2 w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center">
                                <svg className="w-12 h-12 -rotate-90">
                                    <circle
                                        cx="24" cy="24" r="20"
                                        fill="none"
                                        stroke="#e5e7eb"
                                        strokeWidth="4"
                                    />
                                    <circle
                                        cx="24" cy="24" r="20"
                                        fill="none"
                                        stroke="#3b82f6"
                                        strokeWidth="4"
                                        strokeDasharray={125.6}
                                        strokeDashoffset={125.6 - (countdown / 15) * 125.6}
                                        className="transition-all duration-1000"
                                    />
                                </svg>
                                <span className="absolute text-sm font-bold text-gray-900">{countdown}</span>
                            </div>
                        </div>

                        {/* Info */}
                        <div className="bg-gray-50 rounded-xl p-4 mb-6 text-sm">
                            <div className="flex items-center gap-2 text-gray-600 mb-2">
                                <MapPin size={14} />
                                <span>Location: {location?.lat.toFixed(4)}, {location?.lng.toFixed(4)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                                <CheckCircle size={14} />
                                <span>Radius: 50 meters</span>
                            </div>
                        </div>

                        {/* Stop Button */}
                        <button
                            onClick={stopSession}
                            className="w-full py-4 bg-red-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-600 transition-colors"
                        >
                            <StopCircle size={20} />
                            Stop Attendance
                        </button>
                    </motion.div>
                )}

                {status === 'stopped' && (
                    <motion.div
                        key="stopped"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-12"
                    >
                        <div className="w-20 h-20 mx-auto mb-6 bg-green-50 rounded-full flex items-center justify-center">
                            <CheckCircle size={32} className="text-green-500" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Session Ended</h3>
                        <p className="text-gray-500">{presentCount} students marked present</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default QRAttendancePanel;
