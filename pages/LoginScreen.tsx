import React, { useState } from 'react';
import { Sparkles, ArrowRight } from '../components/Icons';
import { motion } from 'framer-motion';
import SignupModal from './SignupModal';
import { UserRole } from '../types';
import { authService } from '../services/authService';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.STUDENT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSignup, setShowSignup] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Login with MongoDB API
      await authService.login(email, password, selectedRole);

      // Reload page to trigger AuthContext to pick up the new token
      window.location.reload();

    } catch (err: any) {
      console.error('Login error:', err);

      // Provide specific error messages
      if (err.message?.toLowerCase().includes('role mismatch')) {
        setError(err.message);
      } else if (err.message?.toLowerCase().includes('invalid')) {
        setError('Invalid email or password. Please check your credentials and try again.');
      } else {
        setError(err.message || 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen w-full bg-[#F8F9FA] flex items-center justify-center p-0 sm:p-4 lg:p-0 overflow-auto relative">

      {/* Background Decor - Hidden on very small screens for performance */}
      <div className="hidden sm:block absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-200/30 rounded-full blur-[120px]" />
      <div className="hidden sm:block absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-200/30 rounded-full blur-[120px]" />

      <div className="w-full max-w-6xl min-h-screen sm:min-h-0 sm:h-auto lg:h-[85vh] bg-white lg:rounded-[3rem] shadow-none lg:shadow-2xl overflow-hidden flex flex-col lg:flex-row relative z-10 border-0 lg:border border-white/50">

        {/* LEFT: Visual Section - Hidden on very small (320px) screens, shown on sm and up */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="hidden sm:flex w-full lg:w-1/2 bg-[#18181B] text-white p-6 sm:p-8 lg:p-16 flex-col justify-between relative overflow-hidden shrink-0"
        >
          {/* Abstract Shapes */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -top-24 -right-24 w-64 h-64 border border-white/10 rounded-full border-dashed"
          />
          <motion.div
            animate={{ y: [0, -20, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/3 left-1/4 w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full blur-[40px] opacity-40"
          />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6 lg:mb-8">
              <div className="w-10 h-10 bg-white text-black rounded-xl flex items-center justify-center font-bold text-xl">E</div>
              <span className="font-bold text-lg tracking-wide opacity-80">EduSphere</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-6xl font-black leading-tight mb-4 lg:mb-6">
              Future of <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Education</span> <br />
              is Here.
            </h1>
            <p className="text-gray-400 text-sm lg:text-lg max-w-md leading-relaxed hidden md:block">
              Experience a unified platform for students, faculty, and administration. Seamless, intelligent, and designed for growth.
            </p>
          </div>

          <div className="relative z-10 mt-8 lg:mt-12 flex gap-4 text-sm font-medium text-gray-500">
            <span>© 2024 EduSphere Inc.</span>
            <span className="w-1 h-1 bg-gray-600 rounded-full self-center"></span>
            <span>v2.5.0</span>
          </div>
        </motion.div>

        {/* RIGHT: Login Controls - Optimized for 320x640 screens */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          className="w-full lg:w-1/2 p-4 xs:p-6 md:p-12 lg:p-16 flex flex-col justify-center bg-white flex-1"
        >
          <div className="max-w-md mx-auto w-full">
            {/* Mobile-only branding header (shown on 320px screens) */}
            <div className="sm:hidden flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#18181B] text-white rounded-xl flex items-center justify-center font-bold text-xl">E</div>
              <span className="font-bold text-lg tracking-wide text-gray-800">EduSphere</span>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h2 className="text-xl xs:text-2xl lg:text-3xl font-bold text-gray-900 mb-1 xs:mb-2">Welcome Back</h2>
              <p className="text-gray-500 mb-4 xs:mb-8 lg:mb-10 text-xs xs:text-sm lg:text-base">Sign in to your account.</p>
            </motion.div>

            <form onSubmit={handleLogin} className="space-y-3 xs:space-y-6">
              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
                  <p className="font-medium whitespace-pre-line">{error}</p>
                  {error.toLowerCase().includes('invalid') && (
                    <p className="mt-2 text-xs">
                      Don't have an account?{' '}
                      <button
                        type="button"
                        onClick={() => setShowSignup(true)}
                        className="underline font-bold hover:text-red-700"
                      >
                        Sign up here
                      </button>
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Select Role</label>
                <div className="grid grid-cols-3 gap-2 p-1 bg-gray-100 rounded-2xl">
                  {['STUDENT', 'FACULTY', 'ADMIN'].map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setSelectedRole(role as UserRole)}
                      className={`py-2 text-sm font-bold rounded-xl transition-all ${selectedRole === role
                        ? 'bg-white text-black shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                      {role.charAt(0) + role.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="you@university.edu"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={loading}
                className="w-full p-4 rounded-2xl bg-[#18181B] text-white font-bold text-lg flex items-center justify-center gap-2 hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Sign In'}
                {!loading && <ArrowRight size={20} />}
              </motion.button>
            </form>

            {/* Signup Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <button
                  onClick={() => setShowSignup(true)}
                  className="font-bold text-blue-600 hover:text-blue-700 underline"
                >
                  Sign up
                </button>
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-8 lg:mt-12 text-center"
            >
              <p className="text-[10px] lg:text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center justify-center gap-2">
                <Sparkles size={12} className="text-yellow-500" /> EduSphere SIS
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Signup Modal */}
      <SignupModal isOpen={showSignup} onClose={() => setShowSignup(false)} />
    </div>
  )
}

export default LoginScreen;