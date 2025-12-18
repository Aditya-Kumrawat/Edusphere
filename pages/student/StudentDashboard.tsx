import React, { useState, useEffect } from 'react';
import {
   Download, Mail, Phone, MapPin, BookOpen, UserCheck, Award, AlertCircle,
   Clock, User, Bell, Printer, CalendarCheck, MoreHorizontal, ArrowRight, X
} from '../../components/Icons';
import { Course } from '../../types';
// import { MOCK_FACULTY, MOCK_NOTIFICATIONS } from '../../data/mockData'; // Mocks removed
import { StaggerContainer, StaggerItem, HoverCard } from '../../components/AnimatedComponents';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthContext';

const StudentDashboard = () => {
   const { session } = useAuth();
   const [student, setStudent] = useState<any>(null);
   const [myCourses, setMyCourses] = useState<any[]>([]);
   const [myGrades, setMyGrades] = useState<any[]>([]);
   const [notifications, setNotifications] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);

   const [showMobileUpdates, setShowMobileUpdates] = useState(false);

   useEffect(() => {
      const fetchDashboardData = async () => {
         if (!session?.user) return;

         try {
            // 1. Fetch Profile
            const { data: profile } = await supabase
               .from('profiles')
               .select('*')
               .eq('id', session.user.id)
               .single();

            // 2. Fetch Enrollments with Course & Grade details
            const { data: enrollments } = await supabase
               .from('enrollments')
               .select(`
             id, semester,
             course:courses (
               id, code, name, credits, schedule,
               faculty:profiles (id, full_name, avatar_url)
             )
          `)
               .eq('student_id', session.user.id);

            const { data: grades } = await supabase
               .from('grades')
               .select('*, enrollment_id')
               .in('enrollment_id', (enrollments || []).map(e => e.id));

            const { data: fetchedNotifications } = await supabase
               .from('notifications')
               .select('*')
               .order('date', { ascending: false })
               .limit(10);

            if (fetchedNotifications) {
               setNotifications(fetchedNotifications);
            }

            // Calculate CGPA dynamically if grades exist
            let calculatedCGPA = 0.0;
            if (grades && grades.length > 0) {
               // Simple average for now. In real app, credit-weighted average.
               const totalScore = grades.reduce((acc, curr) => acc + (curr.total || 0), 0);
               const avgPercentage = totalScore / grades.length;
               calculatedCGPA = parseFloat((avgPercentage / 9.5).toFixed(2)); // Approx conversion or 4.0 scale logic
               // Using simple 4.0 scale approximation: (Percentage / 100) * 4
               calculatedCGPA = parseFloat(((avgPercentage / 100) * 4.0).toFixed(2));
            }

            // Construct Student Object
            setStudent({
               name: profile?.full_name || session.user.email,
               email: profile?.email || session.user.email,
               rollNo: '2024-CS-001', // DB doesn't have this yet, keep as placeholder
               department: profile?.department || 'General',
               batch: '2024-2028',
               semester: 1,
               section: 'A',
               avatarUrl: profile?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
               cgpa: calculatedCGPA || 3.8, // Fallback if no grades
               personalInfo: {
                  mobile: '+1 234 567 890',
                  address: 'Campus Hostel'
               }
            });

            // Process Courses
            if (enrollments) {
               const processedCourses = enrollments.map((e: any) => ({
                  ...e.course,
                  semester: e.semester,
                  facultyId: e.course.faculty?.id,
                  faculty: e.course.faculty,
                  enrollmentId: e.id // For linking grades to courses
               }));
               setMyCourses(processedCourses);
            }

            if (grades) {
               setMyGrades(grades);
            }

         } catch (error) {
            console.error("Error loading dashboard", error);
         } finally {
            setLoading(false);
         }
      };

      fetchDashboardData();
   }, [session]);

   if (loading) return <div className="p-8">Loading Dashboard...</div>;
   if (!student) return <div className="p-8">Student profile not found.</div>;

   return (
      <div className="flex flex-col lg:flex-row h-full w-full overflow-hidden bg-[#F4F4F5] rounded-t-[2rem] md:rounded-[2rem] rounded-b-none md:rounded-b-[2rem]">
         {/* LEFT COLUMN: Main Dashboard */}
         <div className="flex-1 p-4 lg:p-8 relative overflow-y-auto no-scrollbar pb-32 lg:pb-8">

            <div className="xl:pl-4 pr-0 max-w-6xl mx-auto">
               <div className="flex justify-between items-center mb-6 lg:mb-8">
                  <motion.div
                     initial={{ opacity: 0, x: -20 }}
                     animate={{ opacity: 1, x: 0 }}
                     transition={{ delay: 0.2 }}
                  >
                     <h2 className="text-2xl lg:text-4xl font-black text-gray-900 tracking-tight mb-1">Student Dashboard</h2>
                     <p className="text-gray-500 font-medium text-sm lg:text-lg">Welcome back, {student.name.split(' ')[0]}! 👋</p>
                  </motion.div>
                  <div className="flex gap-2 lg:gap-3">
                     <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowMobileUpdates(true)}
                        className="flex lg:hidden items-center justify-center w-10 h-10 bg-white border border-gray-200 text-black rounded-full shadow-sm"
                     >
                        <Bell size={18} />
                        <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                     </motion.button>
                     <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-2 bg-black text-white px-4 lg:px-6 py-2 lg:py-3 rounded-full font-bold text-xs lg:text-sm shadow-xl hover:shadow-2xl transition-all"
                     >
                        <Download size={14} className="lg:w-[18px]" /> <span className="hidden sm:inline">Report Card</span><span className="sm:hidden">Report</span>
                     </motion.button>
                  </div>
               </div>

               <StaggerContainer>
                  {/* 1. STUDENT PROFILE SUMMARY */}
                  <StaggerItem className="mb-6 lg:mb-8">
                     <motion.div
                        whileHover={{ scale: 1.01 }}
                        className="bg-white p-4 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] shadow-sm relative overflow-hidden group border border-gray-100"
                     >
                        <motion.div
                           animate={{ rotate: [0, 10, 0] }}
                           transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                           className="absolute -top-20 -right-20 w-80 h-80 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full blur-3xl opacity-60 pointer-events-none"
                        />

                        <div className="flex flex-col md:flex-row gap-6 lg:gap-8 relative z-10 items-center md:items-start text-center md:text-left">
                           <div className="w-16 h-16 lg:w-28 lg:h-28 rounded-full p-1 lg:p-1.5 bg-gradient-to-br from-purple-500 to-blue-500 shrink-0 shadow-lg">
                              <img src={student.avatarUrl} className="w-full h-full rounded-full object-cover border-2 lg:border-4 border-white" alt="profile" />
                           </div>
                           <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 lg:gap-x-8 gap-y-4 lg:gap-y-6 w-full">
                              <div>
                                 <p className="text-[10px] lg:text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Name</p>
                                 <p className="text-lg lg:text-xl font-bold text-gray-900">{student.name}</p>
                                 <p className="text-xs lg:text-sm text-gray-500 flex items-center justify-center md:justify-start gap-1.5 mt-1 font-medium bg-gray-50 w-fit px-2 py-1 rounded-lg mx-auto md:mx-0">
                                    <Mail size={12} /> {student.email}
                                 </p>
                              </div>
                              <div>
                                 <p className="text-[10px] lg:text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Enrollment</p>
                                 <p className="text-lg lg:text-xl font-bold text-gray-900 font-mono">{student.rollNo}</p>
                                 <p className="text-xs lg:text-sm text-gray-500 mt-1">{student.department} Dept.</p>
                              </div>
                              <div className="hidden sm:block">
                                 <p className="text-[10px] lg:text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Academic Info</p>
                                 <p className="text-base lg:text-lg font-bold text-gray-900">Batch: {student.batch}</p>
                                 <p className="text-xs lg:text-sm text-gray-500 mt-1">Sem: {student.semester} | Sec: {student.section}</p>
                              </div>
                              <div className="hidden sm:block">
                                 <p className="text-[10px] lg:text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Contact</p>
                                 <p className="text-xs lg:text-sm font-bold text-gray-900 flex items-center justify-center md:justify-start gap-1.5"><Phone size={12} /> {student.personalInfo.mobile}</p>
                                 <p className="text-[10px] lg:text-xs text-gray-500 mt-1 truncate max-w-[150px]" title={student.personalInfo.address}><MapPin size={10} /> {student.personalInfo.address}</p>
                              </div>
                           </div>
                        </div>
                     </motion.div>
                  </StaggerItem>

                  {/* 2. QUICK STATS CARDS */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5 mb-6 lg:mb-8">
                     {[
                        { color: 'bg-blue-50 text-blue-600', label: 'Enrolled', value: myCourses.length, sub: 'Active Courses', icon: BookOpen },
                        { color: 'bg-green-50 text-green-600', label: 'Attendance', value: '88%', sub: 'Average', icon: UserCheck },
                        { color: 'bg-yellow-50 text-yellow-600', label: 'CGPA', value: student.cgpa, sub: 'Current Score', icon: Award },
                        { color: 'bg-pink-50 text-pink-600', label: 'Alerts', value: '2', sub: 'Pending Items', icon: AlertCircle }
                     ].map((stat, i) => (
                        <StaggerItem key={i} className="h-full">
                           <HoverCard className={`h-full p-4 lg:p-6 rounded-[1.5rem] lg:rounded-[2rem] border border-white/40 shadow-sm transition-all bg-white relative overflow-hidden`}>
                              <div className={`absolute top-0 right-0 p-4 opacity-10`}>
                                 <stat.icon size={60} className="lg:w-20 lg:h-20" />
                              </div>
                              <div className="flex items-center gap-2 lg:gap-3 mb-2 lg:mb-3 relative z-10">
                                 <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-white flex items-center justify-center ${stat.color} shadow-sm`}>
                                    <stat.icon size={14} className="lg:w-[18px]" />
                                 </div>
                                 <span className={`text-[10px] lg:text-xs font-bold uppercase tracking-wider ${stat.color.split(' ')[1]}`}>{stat.label}</span>
                              </div>
                              <p className="text-2xl lg:text-4xl font-black text-gray-900 mb-1 relative z-10">{stat.value}</p>
                              <p className="text-[10px] lg:text-xs font-bold text-gray-400 relative z-10">{stat.sub}</p>
                           </HoverCard>
                        </StaggerItem>
                     ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 pb-10">
                     {/* 3. MY COURSES SECTION */}
                     <div className="lg:col-span-2 space-y-4 lg:space-y-6">
                        <div className="flex items-center justify-between">
                           <h3 className="text-xl lg:text-2xl font-bold text-gray-900">My Courses</h3>
                           <button className="text-[10px] lg:text-xs font-bold bg-white px-3 py-1.5 lg:px-4 lg:py-2 rounded-full shadow-sm hover:bg-gray-50 flex items-center gap-1">View Catalog <ArrowRight size={12} /></button>
                        </div>
                        <div className="space-y-3 lg:space-y-4">
                           {myCourses.map(course => {
                              const faculty = course.faculty;
                              return (
                                 <StaggerItem key={course.id}>
                                    <HoverCard className="bg-white p-4 lg:p-6 rounded-[1.5rem] lg:rounded-[2rem] shadow-sm flex flex-col sm:flex-row items-center gap-4 lg:gap-6 border border-gray-100 group">
                                       <div className={`w-14 h-14 lg:w-20 lg:h-20 rounded-xl lg:rounded-2xl flex items-center justify-center text-lg lg:text-xl font-black transition-colors duration-300 shadow-inner ${['bg-orange-50 text-orange-300 group-hover:bg-orange-500', 'bg-purple-50 text-purple-300 group-hover:bg-purple-500', 'bg-pink-50 text-pink-300 group-hover:bg-pink-500', 'bg-teal-50 text-teal-300 group-hover:bg-teal-500'][Math.floor(Math.random() * 4)]
                                          } group-hover:text-white`}>
                                          {course.code.substring(0, 2)}
                                       </div>
                                       <div className="flex-1 text-center sm:text-left">
                                          <h4 className="font-bold text-gray-900 text-lg lg:text-xl mb-1 lg:mb-2">{course.name}</h4>
                                          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 lg:gap-3">
                                             <span className="text-[10px] lg:text-xs text-gray-500 font-bold bg-gray-100 px-2 py-0.5 lg:px-3 lg:py-1 rounded-lg border border-gray-200">{course.code}</span>
                                             <span className="text-[10px] lg:text-xs text-gray-500 flex items-center gap-1 font-medium"><User size={12} /> {faculty?.name || 'TBA'}</span>
                                             <span className="text-[10px] lg:text-xs text-gray-500 flex items-center gap-1 font-medium"><Clock size={12} /> {course.schedule}</span>
                                          </div>
                                       </div>
                                       <div className="flex flex-col items-end gap-2 lg:gap-3">
                                          <span className="bg-green-50 text-green-700 text-[10px] font-black px-2 py-0.5 lg:px-3 lg:py-1 rounded-full uppercase tracking-wide border border-green-100">{course.credits} Credits</span>
                                          <button className="text-[10px] lg:text-xs font-bold text-gray-400 hover:text-black flex items-center gap-1 group-hover:translate-x-1 transition-transform">Details <ArrowRight size={12} /></button>
                                       </div>
                                    </HoverCard>
                                 </StaggerItem>
                              )
                           })}
                        </div>
                     </div>

                     {/* 4. RECENT MARKS / GRADE OVERVIEW */}
                     <div className="space-y-4 lg:space-y-6">
                        <div className="flex items-center justify-between">
                           <h3 className="text-xl lg:text-2xl font-bold text-gray-900">Performance</h3>
                           <button className="text-[10px] lg:text-xs font-bold bg-white px-3 py-1.5 lg:px-4 lg:py-2 rounded-full shadow-sm hover:bg-gray-50">Full Result</button>
                        </div>
                        <HoverCard className="bg-white rounded-[2rem] lg:rounded-[2.5rem] p-6 lg:p-8 shadow-sm min-h-[250px] lg:min-h-[300px] border border-gray-100 flex flex-col">
                           <div className="flex-1 space-y-6 lg:space-y-8">
                              {myGrades.slice(0, 3).map((record) => {
                                 // Find course for this grade
                                 // Find course for this grade
                                 const course = myCourses.find(c => c.enrollmentId === record.enrollment_id);

                                 return (
                                    <div key={record.id} className="relative">
                                       <div className="flex justify-between items-end mb-2">
                                          <span className="text-xs lg:text-sm font-bold text-gray-900 max-w-[70%] truncate">
                                             {/* Attempt to find course name, or fallback */}
                                             {course?.name || 'Graded Course'}
                                          </span>
                                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${record.grade?.startsWith('A') ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                             Grade {record.grade}
                                          </span>
                                       </div>
                                       <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5 lg:h-2 overflow-hidden">
                                          <motion.div
                                             initial={{ width: 0 }}
                                             whileInView={{ width: `${record.total}%` }}
                                             transition={{ duration: 1, ease: "easeOut" }}
                                             className="bg-black h-full rounded-full"
                                          />
                                       </div>
                                       <div className="flex justify-between text-[10px] text-gray-400 mt-1 font-bold">
                                          <span>Score: {record.total}%</span>
                                          <span>Max: 100</span>
                                       </div>
                                    </div>
                                 )
                              })}
                              {myGrades.length === 0 && <p className="text-center text-gray-400 text-sm py-10">No grades available yet.</p>}
                           </div>
                        </HoverCard>
                     </div>
                  </div>
               </StaggerContainer>
            </div>
         </div>

         {/* RIGHT COLUMN: Notifications & Events (Drawer on Mobile) */}
         <AnimatePresence>
            {(showMobileUpdates || window.innerWidth >= 1024) && (
               <>
                  {/* Backdrop for mobile */}
                  <motion.div
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     exit={{ opacity: 0 }}
                     onClick={() => setShowMobileUpdates(false)}
                     className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                  />

                  <motion.div
                     initial={{ x: '100%' }}
                     animate={{ x: 0 }}
                     exit={{ x: '100%' }}
                     transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                     className={`fixed lg:static top-0 right-0 h-full w-[85%] lg:w-[380px] bg-white lg:bg-[#F4F4F5] p-6 lg:p-8 shrink-0 lg:border-l border-gray-200/50 z-50 lg:z-auto overflow-y-auto no-scrollbar lg:block shadow-2xl lg:shadow-none`}
                  >
                     {/* Mobile Header */}
                     <div className="flex lg:hidden items-center justify-between mb-8">
                        <h2 className="text-2xl font-bold text-gray-900">Updates</h2>
                        <button onClick={() => setShowMobileUpdates(false)} className="p-2 bg-gray-100 rounded-full">
                           <X size={20} />
                        </button>
                     </div>

                     <div className="hidden lg:flex items-center justify-between mb-8">
                        <h2 className="text-2xl font-bold text-gray-900">Updates</h2>
                        <div className="bg-white p-2 rounded-full shadow-sm">
                           <Bell className="text-gray-900" size={20} />
                        </div>
                     </div>

                     <StaggerContainer delay={0.4}>
                        {/* 6. NOTIFICATIONS PANEL */}
                        <div className="space-y-4">
                           {notifications.map(notif => (
                              <StaggerItem key={notif.id}>
                                 <HoverCard className={`p-4 lg:p-6 rounded-[1.5rem] lg:rounded-[2rem] relative cursor-pointer shadow-sm border border-transparent ${notif.type === 'alert' ? 'bg-[#FFF0F0] border-red-100' :
                                    notif.type === 'success' ? 'bg-[#F0FFF4] border-green-100' : 'bg-white border-gray-100'
                                    }`}>
                                    <div className="flex justify-between items-start mb-3">
                                       <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${notif.type === 'alert' ? 'bg-red-100 text-red-600' :
                                          notif.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-600'
                                          }`}>{notif.type}</span>
                                       <span className="text-[10px] font-bold text-gray-400">{notif.date}</span>
                                    </div>
                                    <h4 className="font-bold text-gray-900 text-sm mb-1 leading-snug">{notif.title}</h4>
                                    <p className="text-xs text-gray-500 leading-relaxed font-medium">{notif.message}</p>
                                 </HoverCard>
                              </StaggerItem>
                           ))}
                        </div>

                        <div className="mt-8 lg:mt-10">
                           <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
                           <div className="grid grid-cols-2 gap-4">
                              <HoverCard className="bg-white p-4 lg:p-6 rounded-[1.5rem] lg:rounded-[2rem] shadow-sm hover:bg-gray-50 flex flex-col items-center gap-3 border border-gray-100 text-center">
                                 <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-600">
                                    <Printer size={20} />
                                 </div>
                                 <span className="text-xs font-bold text-gray-700">Exam Slip</span>
                              </HoverCard>
                              <HoverCard className="bg-white p-4 lg:p-6 rounded-[1.5rem] lg:rounded-[2rem] shadow-sm hover:bg-gray-50 flex flex-col items-center gap-3 border border-gray-100 text-center">
                                 <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-600">
                                    <CalendarCheck size={20} />
                                 </div>
                                 <span className="text-xs font-bold text-gray-700">Timetable</span>
                              </HoverCard>
                           </div>
                        </div>
                     </StaggerContainer>
                  </motion.div>
               </>
            )}
         </AnimatePresence>
      </div>
   )
}

export default StudentDashboard;