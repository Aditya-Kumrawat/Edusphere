import React, { useState } from 'react';
import { X, User, BookOpen, Shield, CheckCircle } from '../components/Icons';
import { motion, AnimatePresence } from 'framer-motion';
import { UserRole } from '../types';
import { authService } from '../services/authService';

interface SignupModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SignupModal: React.FC<SignupModalProps> = ({ isOpen, onClose }) => {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [enrollmentNumber, setEnrollmentNumber] = useState('');
    const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const roles = [
        {
            value: UserRole.STUDENT,
            label: 'Student',
            icon: BookOpen,
            color: 'from-blue-500 to-blue-600',
            bgColor: 'bg-blue-50',
            textColor: 'text-blue-600',
            description: 'Access courses, grades, and attendance'
        },
        {
            value: UserRole.FACULTY,
            label: 'Faculty',
            icon: User,
            color: 'from-purple-500 to-purple-600',
            bgColor: 'bg-purple-50',
            textColor: 'text-purple-600',
            description: 'Manage courses and student records'
        },
        {
            value: UserRole.ADMIN,
            label: 'Admin',
            icon: Shield,
            color: 'from-gray-700 to-gray-900',
            bgColor: 'bg-gray-50',
            textColor: 'text-gray-700',
            description: 'Full system access and management'
        }
    ];

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedRole) {
            setError('Please select a role');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Register with MongoDB API
            await authService.register({
                email,
                password,
                full_name: fullName,
                role: selectedRole,
                enrollment_number: selectedRole === UserRole.STUDENT ? enrollmentNumber : undefined
            });

            // Show success message
            setSuccess(true);

            // Redirect after 2 seconds
            setTimeout(() => {
                window.location.reload();
            }, 2000);

        } catch (err: any) {
            if (err.message?.includes('already exists')) {
                setError('This email is already registered. Try logging in instead.');
            } else {
                setError(err.message || 'An error occurred during signup');
            }
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFullName('');
        setEmail('');
        setPassword('');
        setEnrollmentNumber('');
        setSelectedRole(null);
        setError(null);
        setSuccess(false);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div className="bg-white rounded-[2rem] lg:rounded-[3rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto pointer-events-auto">

                            {/* Header */}
                            <div className="sticky top-0 bg-white border-b border-gray-100 p-6 lg:p-8 flex items-center justify-between rounded-t-[2rem] lg:rounded-t-[3rem] z-10">
                                <div>
                                    <h2 className="text-2xl lg:text-3xl font-bold text-gray-900">Create Account</h2>
                                    <p className="text-sm lg:text-base text-gray-500 mt-1">Join EduSphere and get started</p>
                                </div>
                                <button
                                    onClick={handleClose}
                                    className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Success State */}
                            {success ? (
                                <div className="p-8 lg:p-12 text-center">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', damping: 15 }}
                                        className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
                                    >
                                        <CheckCircle size={40} className="text-green-600" />
                                    </motion.div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Account Created!</h3>
                                    <p className="text-gray-500">Redirecting you to your dashboard...</p>
                                </div>
                            ) : (
                                <form onSubmit={handleSignup} className="p-6 lg:p-8 space-y-6">
                                    {/* Error Message */}
                                    {error && (
                                        <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
                                            {error}
                                        </div>
                                    )}

                                    {/* Full Name */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Full Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={fullName}
                                            onChange={e => setFullName(e.target.value)}
                                            className="w-full p-4 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            placeholder="John Doe"
                                        />
                                    </div>

                                    {/* Email */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Email Address</label>
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            className="w-full p-4 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            placeholder="you@university.edu"
                                        />
                                    </div>

                                    {/* Password */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Password</label>
                                        <input
                                            type="password"
                                            required
                                            minLength={6}
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            className="w-full p-4 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            placeholder="At least 6 characters"
                                        />
                                    </div>

                                    {/* Role Selection */}
                                    <div className="space-y-3">
                                        <label className="text-sm font-bold text-gray-700">Select Your Role</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            {roles.map(role => (
                                                <motion.button
                                                    key={role.value}
                                                    type="button"
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => setSelectedRole(role.value)}
                                                    className={`p-4 rounded-xl border-2 transition-all text-left ${selectedRole === role.value
                                                        ? `border-current ${role.textColor} ${role.bgColor}`
                                                        : 'border-gray-200 hover:border-gray-300'
                                                        }`}
                                                >
                                                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${role.color} flex items-center justify-center mb-3`}>
                                                        <role.icon size={20} className="text-white" />
                                                    </div>
                                                    <h4 className="font-bold text-gray-900 mb-1">{role.label}</h4>
                                                    <p className="text-xs text-gray-500 leading-relaxed">{role.description}</p>
                                                </motion.button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Enrollment Number (For Students) */}
                                    <AnimatePresence>
                                        {selectedRole === UserRole.STUDENT && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="space-y-2 overflow-hidden"
                                            >
                                                <label className="text-sm font-bold text-gray-700">
                                                    Enrollment Number <span className="text-gray-400">(Optional)</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={enrollmentNumber}
                                                    onChange={e => setEnrollmentNumber(e.target.value)}
                                                    className="w-full p-4 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 outline-none transition-all uppercase placeholder-gray-400"
                                                    placeholder="Enter your enrollment number"
                                                />
                                                <p className="text-xs text-gray-500">
                                                    Your student enrollment or roll number
                                                </p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Submit Button */}
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        disabled={loading}
                                        className="w-full p-4 rounded-xl bg-[#18181B] text-white font-bold text-lg hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? 'Creating Account...' : 'Create Account'}
                                    </motion.button>
                                </form>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default SignupModal;
