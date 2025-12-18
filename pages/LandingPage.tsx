
import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
   ArrowRight, CheckCircle, Play, LayoutGrid, Users,
   BookOpen, Award, Zap, Globe, MessageSquare,
   BarChart2, Shield, MousePointer2, Star, Sparkles, Database
} from '../components/Icons';

interface LandingPageProps {
   onGetStarted: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
   const containerRef = useRef<HTMLDivElement>(null);
   const { scrollY } = useScroll({ container: containerRef });
   const y1 = useTransform(scrollY, [0, 500], [0, 200]);
   const y2 = useTransform(scrollY, [0, 500], [0, -150]);

   return (
      <div ref={containerRef} className="h-screen w-full bg-white font-sans overflow-y-auto overflow-x-hidden selection:bg-blue-100 selection:text-blue-900">

         {/* Background Gradients */}
         <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-200/40 rounded-full blur-[120px]" />
            <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-blue-200/40 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] bg-pink-200/30 rounded-full blur-[120px]" />
         </div>

         {/* Navbar */}
         <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-6 px-4 pointer-events-none">
            <motion.div
               initial={{ y: -50, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               transition={{ duration: 0.8, type: "spring" }}
               className="bg-white/80 backdrop-blur-xl border border-white/40 shadow-sm rounded-full px-6 py-3 flex items-center gap-8 md:gap-12 pointer-events-auto"
            >
               <div className="flex items-center gap-2 cursor-pointer" onClick={onGetStarted}>
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">E</div>
                  <span className="font-bold text-xl tracking-tight text-gray-900">EduSphere</span>
               </div>

               <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
                  <a href="#features" className="hover:text-black transition-colors">Features</a>
                  <a href="#solutions" className="hover:text-black transition-colors">Solutions</a>
                  <a href="#pricing" className="hover:text-black transition-colors">Pricing</a>
                  <a href="#resources" className="hover:text-black transition-colors">Resources</a>
               </div>

               <div className="flex items-center gap-4">
                  <button onClick={onGetStarted} className="text-sm font-bold text-gray-900 hover:text-blue-600 transition-colors hidden sm:block">Login</button>
                  <button
                     onClick={onGetStarted}
                     className="bg-black text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-gray-800 transition-transform hover:scale-105"
                  >
                     Sign Up
                  </button>
               </div>
            </motion.div>
         </nav>

         {/* Hero Section */}
         <section className="relative z-10 pt-40 pb-20 md:pt-48 md:pb-32 px-4 max-w-7xl mx-auto text-center">

            {/* Floating Elements 3D */}
            <motion.div style={{ y: y1 }} className="absolute top-40 left-10 lg:left-40 w-16 h-16 bg-gradient-to-br from-pink-300 to-purple-300 rounded-full blur-sm opacity-80 hidden md:block" />
            <motion.div style={{ y: y2 }} className="absolute top-60 right-10 lg:right-40 w-24 h-24 bg-gradient-to-br from-blue-300 to-cyan-300 rounded-full blur-md opacity-60 hidden md:block" />
            <div className="absolute top-32 right-[20%] w-8 h-8 bg-yellow-400 rounded-full blur-[2px] opacity-80 animate-pulse hidden md:block" />

            <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.6 }}
               className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-1.5 mb-8 shadow-sm"
            >
               <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
               </span>
               <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">V2.5 is Live Now</span>
            </motion.div>

            <motion.h1
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.6, delay: 0.1 }}
               className="text-5xl md:text-7xl lg:text-8xl font-black text-gray-900 tracking-tight leading-[1.1] mb-6"
            >
               The <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-blue-600">Smart SIS</span> <br />
               AI The Future Is Here
            </motion.h1>

            <motion.p
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.6, delay: 0.2 }}
               className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed font-medium"
            >
               EduSphere is the all-in-one institute management tool that can help cover all of your academic, administrative, and creative needs.
            </motion.p>

            <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.6, delay: 0.3 }}
               className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
               <button
                  onClick={onGetStarted}
                  className="h-14 px-8 rounded-full bg-black text-white font-bold text-lg hover:scale-105 transition-transform shadow-xl shadow-blue-500/20 flex items-center gap-2"
               >
                  Start Free Trial <Sparkles size={18} className="text-yellow-400" />
               </button>
               <button className="h-14 px-8 rounded-full bg-white text-gray-900 border border-gray-200 font-bold text-lg hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm">
                  <Play size={18} className="fill-current" /> Watch Demo
               </button>
            </motion.div>

            {/* Dashboard Preview (Hero Image) */}
            <motion.div
               initial={{ opacity: 0, y: 50, rotateX: 10 }}
               animate={{ opacity: 1, y: 0, rotateX: 0 }}
               transition={{ duration: 1, delay: 0.4, type: "spring" }}
               className="mt-20 relative max-w-5xl mx-auto perspective-1000"
            >
               <div className="relative bg-white rounded-[2rem] shadow-2xl border-[6px] border-white/50 overflow-hidden transform-gpu">
                  <img src="https://images.unsplash.com/photo-1665686376173-ada7a0031a85?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80" alt="Dashboard Preview" className="w-full h-auto opacity-20 blur-xl absolute inset-0" />

                  {/* Constructed Mock UI to match Screenshot style */}
                  <div className="relative bg-[#F4F4F5] p-6 md:p-8 aspect-[16/10] flex gap-6 overflow-hidden text-left">
                     {/* Sidebar Mock */}
                     <div className="w-16 md:w-64 bg-white rounded-3xl shadow-sm p-4 flex flex-col gap-4 hidden md:flex">
                        <div className="flex items-center gap-3 mb-4">
                           <div className="w-8 h-8 rounded-lg bg-blue-600"></div>
                           <div className="h-4 w-24 bg-gray-100 rounded"></div>
                        </div>
                        {[1, 2, 3, 4, 5].map(i => (
                           <div key={i} className="h-10 w-full bg-gray-50 rounded-xl"></div>
                        ))}
                        <div className="mt-auto bg-blue-600 p-4 rounded-2xl text-white">
                           <div className="h-4 w-12 bg-white/20 rounded mb-2"></div>
                           <div className="h-6 w-20 bg-white/40 rounded"></div>
                        </div>
                     </div>

                     {/* Main Content Mock */}
                     <div className="flex-1 flex flex-col gap-6">
                        {/* Top Bar */}
                        <div className="h-16 bg-white rounded-full shadow-sm flex items-center px-6 justify-between">
                           <div className="h-4 w-32 bg-gray-100 rounded"></div>
                           <div className="flex gap-2">
                              <div className="h-8 w-8 rounded-full bg-gray-100"></div>
                              <div className="h-8 w-8 rounded-full bg-gray-100"></div>
                           </div>
                        </div>

                        {/* Grid */}
                        <div className="flex-1 grid grid-cols-2 lg:grid-cols-3 gap-6">
                           {/* Chat / Feed Card Mock */}
                           <div className="col-span-2 bg-white rounded-[2rem] shadow-sm p-6 flex flex-col">
                              <div className="flex items-center gap-4 mb-6">
                                 <div className="w-10 h-10 rounded-full bg-purple-100"></div>
                                 <div className="space-y-2">
                                    <div className="h-3 w-24 bg-gray-100 rounded"></div>
                                    <div className="h-2 w-16 bg-gray-50 rounded"></div>
                                 </div>
                              </div>
                              <div className="bg-gray-50 rounded-2xl p-4 mb-4 w-[80%]">
                                 <div className="h-2 w-full bg-gray-200 rounded mb-2"></div>
                                 <div className="h-2 w-[60%] bg-gray-200 rounded"></div>
                              </div>
                              <div className="bg-blue-50 rounded-2xl p-4 w-[60%] self-end">
                                 <div className="h-2 w-full bg-blue-200 rounded mb-2"></div>
                              </div>
                           </div>
                           {/* Stats Card Mock */}
                           <div className="bg-white rounded-[2rem] shadow-sm p-6">
                              <div className="h-10 w-10 bg-orange-100 rounded-xl mb-4"></div>
                              <div className="h-8 w-16 bg-gray-100 rounded mb-2"></div>
                              <div className="h-4 w-24 bg-gray-50 rounded"></div>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Floating UI Elements around Dashboard */}
               <motion.div
                  animate={{ y: [0, -20, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -right-12 top-20 bg-white p-4 rounded-2xl shadow-xl hidden lg:block"
               >
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                        <CheckCircle size={20} />
                     </div>
                     <div>
                        <p className="font-bold text-sm text-gray-900">Task Completed</p>
                        <p className="text-xs text-gray-500">Just now</p>
                     </div>
                  </div>
               </motion.div>

               <motion.div
                  animate={{ y: [0, 20, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="absolute -left-12 bottom-40 bg-white p-4 rounded-2xl shadow-xl hidden lg:block"
               >
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <Users size={20} />
                     </div>
                     <div>
                        <p className="font-bold text-sm text-gray-900">New Enrollment</p>
                        <p className="text-xs text-gray-500">+12 Students</p>
                     </div>
                  </div>
               </motion.div>
            </motion.div>
         </section>

         {/* Integration Section */}
         <section className="py-20 px-4">
            <div className="max-w-7xl mx-auto text-center">
               <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-12">EduSphere Ecosystem Integration</h2>

               <div className="relative h-[400px] flex items-center justify-center">
                  {/* Center Node */}
                  <div className="relative z-10 w-24 h-24 bg-white rounded-3xl shadow-2xl flex items-center justify-center border-4 border-gray-50">
                     <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl">
                        E
                     </div>
                  </div>

                  {/* Connecting Lines (SVG) */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-gray-200" style={{ strokeWidth: 2 }}>
                     <path d="M50% 50% L20% 20%" />
                     <path d="M50% 50% L80% 20%" />
                     <path d="M50% 50% L15% 50%" />
                     <path d="M50% 50% L85% 50%" />
                     <path d="M50% 50% L20% 80%" />
                     <path d="M50% 50% L80% 80%" />
                  </svg>

                  {/* Orbiting Nodes */}
                  {[
                     { icon: Globe, color: 'text-blue-500', bg: 'bg-blue-50', pos: 'top-10 left-[20%]' },
                     { icon: MessageSquare, color: 'text-green-500', bg: 'bg-green-50', pos: 'top-10 right-[20%]' },
                     { icon: Shield, color: 'text-purple-500', bg: 'bg-purple-50', pos: 'top-[50%] left-[10%] -translate-y-1/2' },
                     { icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-50', pos: 'top-[50%] right-[10%] -translate-y-1/2' },
                     { icon: BarChart2, color: 'text-red-500', bg: 'bg-red-50', pos: 'bottom-10 left-[20%]' },
                     { icon: Users, color: 'text-orange-500', bg: 'bg-orange-50', pos: 'bottom-10 right-[20%]' },
                  ].map((item, idx) => (
                     <motion.div
                        key={idx}
                        whileHover={{ scale: 1.1 }}
                        className={`absolute ${item.pos} w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center border border-gray-50 z-10`}
                     >
                        <div className={`w-8 h-8 rounded-lg ${item.bg} ${item.color} flex items-center justify-center`}>
                           <item.icon size={20} />
                        </div>
                     </motion.div>
                  ))}
               </div>

               <p className="mt-8 text-gray-500 max-w-lg mx-auto">
                  EduSphere connects seamlessly with your favorite tools to create a unified educational experience.
               </p>
            </div>
         </section>

         {/* Features Grid */}
         <section id="features" className="py-20 bg-gray-50/50">
            <div className="max-w-7xl mx-auto px-4">
               <div className="text-center mb-16">
                  <h2 className="text-4xl font-black text-gray-900 mb-4">Our Powerful AI Solutions</h2>
                  <p className="text-gray-500 text-lg">Automate grading, attendance, and reporting with next-gen AI.</p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {[
                     { title: 'AI Grading Assistant', desc: 'Automatically grade assignments and quizzes with 99% accuracy using our advanced NLP models.', icon: Award, color: 'bg-purple-500' },
                     { title: 'Smart Attendance', desc: 'Face recognition and geolocation tracking for seamless student and faculty attendance.', icon: CheckCircle, color: 'bg-blue-500' },
                     { title: 'Predictive Analytics', desc: 'Identify at-risk students early with machine learning algorithms analyzing performance trends.', icon: BarChart2, color: 'bg-pink-500' },
                     { title: 'Automated Scheduling', desc: 'Conflict-free timetable generation in seconds, considering faculty availability and room capacity.', icon: LayoutGrid, color: 'bg-orange-500' },
                     { title: 'Secure Data Vault', desc: 'Enterprise-grade encryption keeping sensitive student and institutional data safe.', icon: Shield, color: 'bg-green-500' },
                     { title: 'Parent Portal', desc: 'Real-time updates for parents on grades, attendance, and school announcements.', icon: Users, color: 'bg-yellow-500' },
                  ].map((feature, idx) => (
                     <motion.div
                        key={idx}
                        whileHover={{ y: -5 }}
                        className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-xl transition-all"
                     >
                        <div className={`w-14 h-14 rounded-2xl ${feature.color} text-white flex items-center justify-center mb-6 shadow-lg shadow-${feature.color}/30`}>
                           <feature.icon size={28} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                        <p className="text-gray-500 leading-relaxed text-sm">{feature.desc}</p>

                        <div className="mt-6 flex items-center gap-2 text-sm font-bold text-gray-900 cursor-pointer hover:gap-3 transition-all">
                           Learn more <ArrowRight size={16} />
                        </div>
                     </motion.div>
                  ))}
               </div>
            </div>
         </section>

         {/* CTA Section */}
         <section className="py-20 px-4">
            <div className="max-w-5xl mx-auto bg-black rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-full opacity-30">
                  <div className="absolute top-[-50%] left-[-20%] w-[80%] h-[80%] bg-purple-600 rounded-full blur-[150px]" />
                  <div className="absolute bottom-[-50%] right-[-20%] w-[80%] h-[80%] bg-blue-600 rounded-full blur-[150px]" />
               </div>

               <div className="relative z-10">
                  <h2 className="text-4xl md:text-6xl font-black text-white mb-6">Built For Growth</h2>
                  <p className="text-gray-400 text-lg mb-10 max-w-2xl mx-auto">
                     Join 500+ educational institutions transforming their campus management with EduSphere AI.
                  </p>
                  <button
                     onClick={onGetStarted}
                     className="bg-white text-black px-10 py-4 rounded-full font-bold text-lg hover:bg-gray-200 transition-colors shadow-xl"
                  >
                     Get Started Now
                  </button>
               </div>
            </div>
         </section>

         {/* Footer */}
         <footer className="bg-gray-50 pt-20 pb-10 border-t border-gray-200">
            <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
               <div className="col-span-1 md:col-span-2">
                  <div className="flex items-center gap-2 mb-6">
                     <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-bold">E</div>
                     <span className="font-bold text-xl text-gray-900">EduSphere</span>
                  </div>
                  <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
                     The most advanced AI-powered Student Information System for modern educational institutions.
                  </p>
               </div>
               <div>
                  <h4 className="font-bold text-gray-900 mb-4">Product</h4>
                  <ul className="space-y-2 text-sm text-gray-500">
                     <li><a href="#" className="hover:text-black">Features</a></li>
                     <li><a href="#" className="hover:text-black">Integrations</a></li>
                     <li><a href="#" className="hover:text-black">Pricing</a></li>
                     <li><a href="#" className="hover:text-black">Changelog</a></li>
                  </ul>
               </div>
               <div>
                  <h4 className="font-bold text-gray-900 mb-4">Company</h4>
                  <ul className="space-y-2 text-sm text-gray-500">
                     <li><a href="#" className="hover:text-black">About Us</a></li>
                     <li><a href="#" className="hover:text-black">Careers</a></li>
                     <li><a href="#" className="hover:text-black">Blog</a></li>
                     <li><a href="#" className="hover:text-black">Contact</a></li>
                  </ul>
               </div>
            </div>
            <div className="text-center text-xs font-bold text-gray-400 border-t border-gray-200 pt-8">
               © 2024 EduSphere Inc. All rights reserved.
            </div>
         </footer>
      </div>
   );
};

export default LandingPage;
