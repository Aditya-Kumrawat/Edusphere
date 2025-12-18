import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, CheckCircle, XCircle, Clock, AlertCircle, QrCode, BookOpen } from '../../components/Icons';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthContext';

const StudentAttendance = () => {
   const { session } = useAuth();
   const [loading, setLoading] = useState(true);

   // State for stats
   const [stats, setStats] = useState({
      totalLectures: 0,
      attended: 0,
      missed: 0,
      percentage: 0
   });

   // State for calendar and breakdown
   const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
   const [courseBreakdown, setCourseBreakdown] = useState<any[]>([]);

   useEffect(() => {
      if (session?.user?.id) {
         fetchAttendanceData();
      }
   }, [session]);

   const fetchAttendanceData = async () => {
      try {
         setLoading(true);

         // 1. Get student's enrollments with course info
         const { data: enrollments } = await supabase
            .from('enrollments')
            .select(`
               id,
               course: courses(id, name, code)
            `)
            .eq('student_id', session?.user?.id);

         if (!enrollments || enrollments.length === 0) {
            setLoading(false);
            return;
         }

         const courseIds = enrollments.map((e: any) => e.course.id);

         // 2. Fetch student's attendance records (with session_id for deduplication)
         const { data: records } = await supabase
            .from('attendance')
            .select('id, course_id, date, status, session_id')
            .eq('student_id', session?.user?.id);

         setAttendanceRecords(records || []);

         // 3. Fetch total QR sessions per course (this represents total lectures held)
         const { data: allSessions } = await supabase
            .from('attendance_sessions')
            .select('id, classroom_id')
            .in('classroom_id', courseIds);

         // 4. Calculate overall and per-course stats
         let totalLectures = 0;
         let totalAttended = 0;

         const breakdown = enrollments.map((en: any) => {
            const courseId = en.course.id;

            // Total sessions for this course = Total lectures held
            const courseSessions = (allSessions || []).filter(s => s.classroom_id === courseId);
            const courseTotal = courseSessions.length;

            // Student's UNIQUE attendance for this course (use session_id or date to dedupe)
            const courseRecords = (records || []).filter(r => r.course_id === courseId);
            const uniqueAttendedSessions = new Set(
               courseRecords
                  .filter(r => r.status === 'Present' || r.status === 'Late')
                  .map(r => r.session_id || r.date)
            );
            const courseAttended = Math.min(uniqueAttendedSessions.size, courseTotal);

            // Calculate percentage - cap at 100%
            const percentage = courseTotal > 0
               ? Math.min(100, Math.round((courseAttended / courseTotal) * 100))
               : 100; // 100% if no lectures yet

            totalLectures += courseTotal;
            totalAttended += courseAttended;

            return {
               id: courseId,
               name: en.course.name,
               code: en.course.code,
               totalLectures: courseTotal,
               attended: courseAttended,
               missed: Math.max(0, courseTotal - courseAttended),
               percentage
            };
         });

         setCourseBreakdown(breakdown);

         // Overall stats - cap at 100%
         const overallPercentage = totalLectures > 0
            ? Math.min(100, Math.round((totalAttended / totalLectures) * 100))
            : 100;

         setStats({
            totalLectures,
            attended: totalAttended,
            missed: Math.max(0, totalLectures - totalAttended),
            percentage: overallPercentage
         });

      } catch (err) {
         console.error("Error fetching attendance:", err);
      } finally {
         setLoading(false);
      }
   };

   // Calendar Days Logic
   const [selectedCourseId, setSelectedCourseId] = useState<string>('all');

   const currentStats = selectedCourseId === 'all'
      ? stats
      : courseBreakdown.find(c => c.id === selectedCourseId) || { totalLectures: 0, attended: 0, missed: 0, percentage: 0 };

   const currentRecords = selectedCourseId === 'all'
      ? attendanceRecords
      : attendanceRecords.filter(r => r.course_id === selectedCourseId);

   const now = new Date();
   const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
   const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
   const currentMonthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });

   if (loading) return <div className="p-8 text-center text-gray-400">Loading attendance...</div>;

   return (
      <div className="h-full bg-[#F4F4F5] p-6 lg:p-8 overflow-y-auto rounded-t-[2rem] rounded-b-none md:rounded-b-[2rem] font-sans pb-32">

         {/* Header */}
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
               <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">My Attendance</h1>
               <p className="text-gray-500 font-medium text-sm lg:text-base">Track your presence based on attended lectures.</p>
            </div>
            <div className="flex items-center gap-3">
               {/* Scan QR Button */}
               <a
                  href="#scan-attendance"
                  onClick={(e) => {
                     e.preventDefault();
                     window.dispatchEvent(new CustomEvent('navigateTo', { detail: 'scan-attendance' }));
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full shadow-lg font-bold text-sm hover:shadow-xl transition-all"
               >
                  <QrCode size={16} />
                  Scan QR
               </a>
            </div>
         </div>

         {/* Course Filter Tabs */}
         <div className="flex gap-2 mb-8 overflow-x-auto pb-2 no-scrollbar">
            <button
               onClick={() => setSelectedCourseId('all')}
               className={`px-5 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap transition-all ${selectedCourseId === 'all' ? 'bg-black text-white shadow-lg scale-105' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'
                  }`}
            >
               All Courses
            </button>
            {courseBreakdown.map(course => (
               <button
                  key={course.id}
                  onClick={() => setSelectedCourseId(course.id)}
                  className={`px-5 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap transition-all ${selectedCourseId === course.id ? 'bg-black text-white shadow-lg scale-105' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'
                     }`}
               >
                  {course.name} ({course.code})
               </button>
            ))}
         </div>

         {/* Stats Cards */}
         <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <motion.div
               key={`stats-total-${selectedCourseId}`}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100"
            >
               <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500"><BookOpen size={16} /></div>
                  <span className="text-xs font-bold text-gray-500">Total Lectures</span>
               </div>
               <p className="text-3xl font-black text-gray-900">{currentStats.totalLectures}</p>
            </motion.div>
            <motion.div
               key={`stats-attended-${selectedCourseId}`}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.05 }}
               className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100"
            >
               <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-500"><CheckCircle size={16} /></div>
                  <span className="text-xs font-bold text-gray-500">Attended</span>
               </div>
               <p className="text-3xl font-black text-gray-900">{currentStats.attended}</p>
            </motion.div>
            <motion.div
               key={`stats-missed-${selectedCourseId}`}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.1 }}
               className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100"
            >
               <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-500"><XCircle size={16} /></div>
                  <span className="text-xs font-bold text-gray-500">Missed</span>
               </div>
               <p className="text-3xl font-black text-gray-900">{currentStats.missed}</p>
            </motion.div>
            <motion.div
               key={`stats-perc-${selectedCourseId}`}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.15 }}
               className={`p-5 rounded-[2rem] shadow-lg ${currentStats.percentage >= 75 ? 'bg-green-600' : currentStats.percentage >= 50 ? 'bg-yellow-500' : 'bg-red-600'} text-white`}
            >
               <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white"><CalendarDays size={16} /></div>
                  <span className="text-xs font-bold text-white/80">Overall</span>
               </div>
               <p className="text-3xl font-black">{currentStats.percentage}%</p>
               {currentStats.percentage < 75 && (
                  <p className="text-xs mt-1 text-white/80 flex items-center gap-1"><AlertCircle size={12} /> Below minimum</p>
               )}
            </motion.div>
         </div>

         <div className="flex flex-col lg:flex-row gap-8">

            {/* Calendar Grid View */}
            <div className="flex-1 bg-white p-6 lg:p-8 rounded-[2rem] shadow-sm border border-gray-100">
               <h3 className="font-bold text-lg text-gray-900 mb-6">Attendance Calendar</h3>
               <div className="grid grid-cols-7 gap-3 mb-4">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                     <div key={i} className="text-center text-xs font-bold text-gray-400 uppercase tracking-wider">{d}</div>
                  ))}
               </div>
               <div className="grid grid-cols-7 gap-3">
                  {days.map(day => {
                     const hasRecord = currentRecords.find(r => {
                        const d = new Date(r.date);
                        return d.getDate() === day && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                     });

                     let statusColor = 'bg-gray-50 text-gray-400';

                     if (hasRecord) {
                        if (hasRecord.status === 'Present') statusColor = 'bg-green-100 text-green-700 font-bold border border-green-200';
                        else if (hasRecord.status === 'Absent') statusColor = 'bg-red-100 text-red-700 font-bold border border-red-200';
                        else statusColor = 'bg-yellow-100 text-yellow-700 font-bold border border-yellow-200';
                     }

                     return (
                        <div key={day} className={`aspect-square rounded-xl md:rounded-2xl flex items-center justify-center text-xs md:text-sm ${statusColor}`}>
                           {day}
                        </div>
                     )
                  })}
               </div>
               <div className="flex justify-center gap-4 mt-8 flex-wrap">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500"></div><span className="text-xs font-bold text-gray-500">Present</span></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div><span className="text-xs font-bold text-gray-500">Absent</span></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-500"></div><span className="text-xs font-bold text-gray-500">Late</span></div>
               </div>
            </div>

            {/* Course Breakdown List */}
            <div className="w-full lg:w-96 bg-white p-6 lg:p-8 rounded-[2rem] shadow-sm border border-gray-100">
               <h3 className="font-bold text-lg text-gray-900 mb-6">Course Breakdown</h3>
               <div className="space-y-6">
                  {courseBreakdown.map(course => {
                     const isLow = course.percentage < 75;

                     return (
                        <div key={course.id}>
                           <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-gray-900 text-sm truncate max-w-[180px]">{course.name}</span>
                              <span className={`text-xs font-black ${isLow ? 'text-red-500' : 'text-green-500'}`}>{course.percentage}%</span>
                           </div>
                           <div className="flex justify-between text-[10px] text-gray-400 mb-2">
                              <span>{course.attended} attended</span>
                              <span>{course.totalLectures} total lectures</span>
                           </div>
                           <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                              <div
                                 className={`h-full rounded-full transition-all ${isLow ? 'bg-red-500' : 'bg-green-500'}`}
                                 style={{ width: `${course.percentage}%` }}
                              ></div>
                           </div>
                           {isLow && (
                              <div className="flex items-center gap-1 mt-1 text-[10px] text-red-500 font-bold">
                                 <AlertCircle size={10} /> Low Attendance Warning
                              </div>
                           )}
                        </div>
                     )
                  })}
                  {courseBreakdown.length === 0 && <div className="text-gray-400 text-sm text-center">No active courses.</div>}
               </div>
            </div>
         </div>
      </div>
   )
}

export default StudentAttendance;
