import React, { useEffect, useState } from 'react';
import {
   Users, BookOpen, ClipboardCheck, Award, Megaphone, Activity,
   Mail, Phone, Calendar, ChevronRight,
   ClipboardList, Clock
} from '../../components/Icons';
import { StaggerContainer, StaggerItem, HoverCard } from '../../components/AnimatedComponents';
import { motion } from 'framer-motion';
import { supabase } from '../../services/mongoAdapter';
import { useAuth } from '../../context/AuthContext';

const FacultyDashboard = () => {
   const { session } = useAuth(); // CHANGED: Destructure session, not user
   const user = session?.user;    // CHANGED: Derive user from session
   const [profile, setProfile] = useState<any>(null);
   const [myCourses, setMyCourses] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
   const [stats, setStats] = useState({
      totalStudents: 0,
      coursesCount: 0,
      pendingAttendance: 1, // Placeholder
      pendingGrades: 2      // Placeholder
   });

   const [announcements, setAnnouncements] = useState<any[]>([]);

   useEffect(() => {
      const fetchDashboardData = async () => {
         console.log('FacultyDashboard: fetchDashboardData started. User:', user);
         if (!user) {
            console.log('FacultyDashboard: User is null, waiting...');
            return;
         }

         try {
            console.log('FacultyDashboard: Setting loading=true');
            setLoading(true);

            // 1. Fetch Profile
            const { data: profileData } = await supabase
               .from('profiles')
               .select('*')
               .eq('id', user._id)
               .single();

            setProfile(profileData || {
               name: user.email?.split('@')[0] || 'Faculty',
               avatarUrl: 'https://images.unsplash.com/photo-1556157382-97eda2d622ca?auto=format&fit=crop&q=80&w=200',
               email: user.email,
               department: 'General',
               specialization: 'Instructor'
            });

            // 2. Fetch Assigned Courses
            const { data: coursesData } = await supabase
               .from('courses')
               .select('*')
               .eq('faculty_id', user._id);

            const courses = coursesData || [];
            setMyCourses(courses);

            // 3. Fetch Total Students Enrolled
            let totalEnrolled = 0;
            if (courses.length > 0) {
               const courseIds = courses.map(c => c.id);
               const { count } = await supabase
                  .from('enrollments')
                  .select('id', { count: 'exact', head: true })
                  .in('course_id', courseIds);

               totalEnrolled = count || 0;
            }

            setStats(prev => ({
               ...prev,
               coursesCount: courses.length,
               totalStudents: totalEnrolled
            }));

            console.log('FacultyDashboard: Fetching announcements...');
            const { data: notices, error: noticeError } = await supabase
               .from('announcements')
               .select('*')
               .order('created_at', { ascending: false })
               .limit(2);

            if (noticeError) console.error('FacultyDashboard: Announcement error:', noticeError);
            setAnnouncements(notices || []);

            console.log('FacultyDashboard: Data fetch complete.');
         } catch (error) {
            console.error('Error fetching faculty dashboard:', error);
         } finally {
            console.log('FacultyDashboard: Finally block - setting loading=false');
            setLoading(false);
         }
      };

      fetchDashboardData();
   }, [user]);

   if (loading) {
      return <div className="flex items-center justify-center h-full text-gray-400">Loading dashboard...</div>;
   }

   // Fallback defaults if profile fields missing
   const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Faculty Member';
   const displayDept = profile?.department || 'Academic';
   const displaySpec = profile?.specialization || 'Instructor';
   const displayAvatar = profile?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200';

   return (
      <div className="flex flex-col lg:flex-row h-full w-full overflow-hidden bg-[#F4F4F5] rounded-b-[2rem] font-sans">

         {/* MAIN CONTENT COLUMN */}
         <div className="flex-1 p-6 lg:p-8 relative overflow-y-auto no-scrollbar">
            <div className="max-w-6xl mx-auto">

               {/* Header */}
               <div className="flex justify-between items-center mb-8">
                  <motion.div
                     initial={{ opacity: 0, x: -20 }}
                     animate={{ opacity: 1, x: 0 }}
                     transition={{ delay: 0.2 }}
                  >
                     <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-1">Faculty Dashboard</h2>
                     <p className="text-gray-500 font-medium text-lg">Manage your courses, students, and assessments.</p>
                  </motion.div>
                  <motion.div
                     initial={{ opacity: 0, scale: 0.9 }}
                     animate={{ opacity: 1, scale: 1 }}
                     transition={{ delay: 0.4 }}
                     className="flex gap-3"
                  >
                     <span className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-full font-bold text-sm shadow-sm flex items-center gap-2">
                        <Calendar size={16} /> Spring 2024
                     </span>
                  </motion.div>
               </div>

               <StaggerContainer>
                  {/* 1. FACULTY PROFILE SUMMARY CARD */}
                  <StaggerItem className="mb-8">
                     <motion.div
                        whileHover={{ scale: 1.01 }}
                        className="bg-white p-6 rounded-[2.5rem] shadow-sm relative overflow-hidden group border border-gray-100"
                     >
                        <motion.div
                           animate={{ rotate: [0, 10, 0] }}
                           transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                           className="absolute top-0 right-0 w-96 h-96 bg-blue-50/50 rounded-full translate-x-1/3 -translate-y-1/3 -z-0 pointer-events-none"
                        />
                        <div className="flex flex-col md:flex-row gap-8 relative z-10 items-center md:items-start text-center md:text-left">
                           <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-br from-blue-400 to-purple-400 shrink-0 shadow-lg">
                              <img src={displayAvatar} className="w-full h-full rounded-full object-cover border-4 border-white" alt="profile" />
                           </div>
                           <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-6 w-full">
                              <div className="sm:col-span-3 lg:col-span-1">
                                 <h3 className="text-2xl font-black text-gray-900">{displayName}</h3>
                                 <p className="text-blue-600 font-bold text-sm bg-blue-50 inline-block px-3 py-1 rounded-full mt-2 border border-blue-100">{displaySpec}</p>
                                 <p className="text-gray-500 text-sm mt-2 font-medium">{displayDept} Department</p>
                              </div>
                              <div className="flex flex-col justify-center gap-2">
                                 <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Contact Info</p>
                                 <p className="text-sm font-bold text-gray-700 flex items-center justify-center md:justify-start gap-2"><Mail size={14} /> {user?.email}</p>
                                 <p className="text-sm font-bold text-gray-700 flex items-center justify-center md:justify-start gap-2"><Phone size={14} /> --</p>
                              </div>
                              <div className="flex flex-col justify-center gap-2">
                                 <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Faculty ID</p>
                                 <p className="text-lg font-black text-gray-900 font-mono">FAC-{user?._id?.substring(0, 6).toUpperCase()}</p>
                                 <p className="text-xs text-green-600 font-bold bg-green-50 px-2 py-1 rounded-full w-fit mx-auto md:mx-0 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" /> Active
                                 </p>
                              </div>
                           </div>
                        </div>
                     </motion.div>
                  </StaggerItem>

                  {/* 2. QUICK STATS CARDS */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                     {[
                        { color: 'bg-blue-50 text-blue-600', label: 'Courses', value: stats.coursesCount, sub: 'Assigned', icon: BookOpen },
                        { color: 'bg-purple-50 text-purple-600', label: 'Students', value: stats.totalStudents, sub: 'Total Enrolled', icon: Users },
                        { color: 'bg-yellow-50 text-yellow-600', label: 'Attendance', value: stats.pendingAttendance, sub: 'Pending Review', icon: ClipboardCheck },
                        { color: 'bg-red-50 text-red-600', label: 'Grades', value: stats.pendingGrades, sub: 'Submission Due', icon: Award }
                     ].map((stat, i) => (
                        <StaggerItem key={i} className="h-full">
                           <HoverCard className={`h-full p-6 rounded-[2rem] border border-white/60 shadow-sm bg-white relative overflow-hidden group`}>
                              <div className={`absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform duration-500`}>
                                 <stat.icon size={80} />
                              </div>
                              <div className="flex items-center gap-3 mb-3 relative z-10">
                                 <div className={`w-10 h-10 rounded-full bg-white flex items-center justify-center ${stat.color} shadow-sm`}>
                                    <stat.icon size={18} />
                                 </div>
                                 <span className={`text-xs font-bold uppercase tracking-wider ${stat.color.split(' ')[1]}`}>{stat.label}</span>
                              </div>
                              <p className="text-3xl font-black text-gray-900 mb-1 relative z-10">{stat.value}</p>
                              <p className="text-xs font-bold text-gray-400 relative z-10">{stat.sub}</p>
                           </HoverCard>
                        </StaggerItem>
                     ))}
                  </div>

                  {/* 3. MY COURSES TABLE */}
                  <StaggerItem>
                     <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden mb-8">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                           <h3 className="text-xl font-bold text-gray-900">My Assigned Courses</h3>
                           <button className="text-sm font-bold text-gray-500 hover:text-black flex items-center gap-1 transition-colors">
                              View All <ChevronRight size={14} />
                           </button>
                        </div>
                        <div className="overflow-x-auto">
                           <table className="w-full text-left border-collapse">
                              <thead>
                                 <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="p-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Course Code</th>
                                    <th className="p-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Course Name</th>
                                    <th className="p-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Schedule</th>
                                    <th className="p-5 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Enrolled</th>
                                    <th className="p-5 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                 {myCourses.length > 0 ? myCourses.slice(0, 5).map(course => (
                                    <tr key={course.id} className="hover:bg-gray-50/50 transition-colors group">
                                       <td className="p-5">
                                          <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold">{course.code}</span>
                                       </td>
                                       <td className="p-5 font-bold text-gray-900">{course.name}</td>
                                       <td className="p-5 text-sm text-gray-500 flex items-center gap-2">
                                          <Clock size={14} /> {course.schedule || 'TBA'}
                                       </td>
                                       <td className="p-5 text-center font-bold text-gray-900">--</td>
                                       <td className="p-5 text-right">
                                          <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                             <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors" title="Students">
                                                <Users size={16} />
                                             </motion.button>
                                             <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors" title="Attendance">
                                                <ClipboardList size={16} />
                                             </motion.button>
                                             <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="p-2 bg-yellow-50 text-yellow-600 rounded-xl hover:bg-yellow-100 transition-colors" title="Marks">
                                                <Award size={16} />
                                             </motion.button>
                                          </div>
                                       </td>
                                    </tr>
                                 )) : (
                                    <tr>
                                       <td colSpan={5} className="p-8 text-center text-gray-400 font-medium">No courses assigned yet.</td>
                                    </tr>
                                 )}
                              </tbody>
                           </table>
                        </div>
                     </div>
                  </StaggerItem>
               </StaggerContainer>

            </div>
         </div>

         {/* RIGHT COLUMN: Activities & Announcements */}
         <div className="hidden lg:block w-[350px] bg-[#F4F4F5] p-8 shrink-0 relative border-l border-gray-200/50 overflow-y-auto">

            <StaggerContainer delay={0.4}>
               {/* 4. RECENT ACTIVITIES */}
               <div className="mb-10">
                  <div className="flex items-center gap-3 mb-6">
                     <div className="p-2 bg-black text-white rounded-lg shadow-md">
                        <Activity size={18} />
                     </div>
                     <h3 className="text-xl font-bold text-gray-900">Recent Activity</h3>
                  </div>
                  <div className="space-y-6 relative">
                     <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gray-200"></div>

                     <StaggerItem className="relative pl-8">
                        <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-green-100 border-4 border-[#F4F4F5] flex items-center justify-center z-10">
                           <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        </div>
                        <p className="text-xs font-bold text-gray-400 mb-1">Today, 10:30 AM</p>
                        <p className="text-sm font-bold text-gray-900">System Ready</p>
                        <p className="text-xs text-gray-500">Dashboard integration complete.</p>
                     </StaggerItem>

                     <StaggerItem className="relative pl-8">
                        <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-blue-100 border-4 border-[#F4F4F5] flex items-center justify-center z-10">
                           <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        </div>
                        <p className="text-xs font-bold text-gray-400 mb-1">Yesterday</p>
                        <p className="text-sm font-bold text-gray-900">Account Created</p>
                        <p className="text-xs text-gray-500">Welcome to EduSphere!</p>
                     </StaggerItem>
                  </div>
               </div>

               {/* 5. ANNOUNCEMENTS PANEL */}
               <div>
                  <div className="flex items-center gap-3 mb-6">
                     <div className="p-2 bg-orange-500 text-white rounded-lg shadow-md">
                        <Megaphone size={18} />
                     </div>
                     <h3 className="text-xl font-bold text-gray-900">Notices</h3>
                  </div>

                  {announcements.length > 0 ? announcements.map((notice: any) => (
                     <StaggerItem key={notice.id}>
                        <HoverCard className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm mb-4 cursor-pointer">
                           <div className="flex justify-between items-start mb-2">
                              <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-1 rounded">{notice.type || 'NOTICE'}</span>
                              <span className="text-[10px] font-bold text-gray-400">{notice.date}</span>
                           </div>
                           <p className="font-bold text-gray-900 text-sm mb-1">{notice.title}</p>
                           <p className="text-xs text-gray-500 line-clamp-2">{notice.message}</p>
                        </HoverCard>
                     </StaggerItem>
                  )) : (
                     <div className="text-center text-gray-400 text-sm">No announcements</div>
                  )}
               </div>
            </StaggerContainer>

         </div>
      </div>
   )
}

export default FacultyDashboard;