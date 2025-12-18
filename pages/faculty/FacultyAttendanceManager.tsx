import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
   ArrowLeft, Calendar, Save, CheckCircle, XCircle, Clock,
   History, User, Check, Search, Filter, BarChart2, TrendingUp,
   AlertCircle, Users, QrCode, MapPin
} from '../../components/Icons';
import { supabase } from '../../services/mongoAdapter';
import QRAttendancePanel from '../../components/QRAttendancePanel';
import TimetableSelector from '../../components/TimetableSelector';

interface FacultyAttendanceManagerProps {
   courseId: string;
   onBack: () => void;
}

const FacultyAttendanceManager: React.FC<FacultyAttendanceManagerProps> = ({ courseId, onBack }) => {
   const [activeTab, setActiveTab] = useState<'mark' | 'qr' | 'summary' | 'analytics'>('mark');
   const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
   const [searchQuery, setSearchQuery] = useState('');

   // QR Mode state
   const [selectedLecture, setSelectedLecture] = useState<any>(null);
   const [qrModeActive, setQrModeActive] = useState(false);

   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);
   const [courseName, setCourseName] = useState('');
   const [students, setStudents] = useState<any[]>([]);
   const [attendanceMap, setAttendanceMap] = useState<Record<string, 'Present' | 'Absent' | 'Late'>>({});
   const [summaryStats, setSummaryStats] = useState<Record<string, any>>({});
   const [allAttendanceRecords, setAllAttendanceRecords] = useState<any[]>([]);

   useEffect(() => {
      fetchInitialData();
   }, [courseId]);

   useEffect(() => {
      if (students.length > 0) {
         fetchDailyAttendance(selectedDate);
      }
   }, [selectedDate, students]);

   const fetchInitialData = async () => {
      try {
         setLoading(true);
         const { data: course } = await supabase.from('courses').select('name, code').eq('id', courseId).single();
         if (course) setCourseName(`${course.code} - ${course.name}`);

         const { data: enrollments, error } = await supabase
            .from('enrollments')
            .select(`
               id,
               student_id,
               profiles:student_id (id, full_name, roll_no, avatar_url)
            `)
            .eq('course_id', courseId);

         if (error) throw error;

         const studentList = enrollments?.map((e: any) => ({
            id: e.profiles.id,
            enrollmentId: e.id,
            name: e.profiles.full_name || 'Unknown',
            rollNo: e.profiles.roll_no || 'N/A',
            avatarUrl: e.profiles.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100'
         })) || [];

         setStudents(studentList);

         const enrollmentIds = studentList.map(s => s.enrollmentId);
         if (enrollmentIds.length > 0) {
            const { data: allAttendance } = await supabase
               .from('attendance')
               .select('enrollment_id, status, date')
               .in('enrollment_id', enrollmentIds);

            setAllAttendanceRecords(allAttendance || []);

            const stats: Record<string, any> = {};
            studentList.forEach(s => {
               const records = allAttendance?.filter((a: any) => a.enrollment_id === s.enrollmentId) || [];
               const total = records.length;
               const present = records.filter((a: any) => a.status === 'Present').length;
               const late = records.filter((a: any) => a.status === 'Late').length;
               const absent = records.filter((a: any) => a.status === 'Absent').length;
               const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : 100;
               stats[s.id] = { total, present, absent, late, percentage };
            });
            setSummaryStats(stats);
         }

      } catch (err) {
         console.error("Error fetching attendance init:", err);
      } finally {
         setLoading(false);
      }
   };

   const fetchDailyAttendance = async (date: string) => {
      try {
         const enrollmentIds = students.map(s => s.enrollmentId);
         if (enrollmentIds.length === 0) return;

         const { data: records } = await supabase
            .from('attendance')
            .select('enrollment_id, status')
            .eq('date', date)
            .in('enrollment_id', enrollmentIds);

         const newMap: Record<string, 'Present' | 'Absent' | 'Late'> = {};
         students.forEach(s => {
            const record = records?.find((r: any) => r.enrollment_id === s.enrollmentId);
            newMap[s.id] = record ? record.status : 'Present';
         });
         setAttendanceMap(newMap);

      } catch (err) {
         console.error("Error fetching daily attendance:", err);
      }
   };

   const handleStatusChange = (studentId: string, status: 'Present' | 'Absent' | 'Late') => {
      setAttendanceMap(prev => ({ ...prev, [studentId]: status }));
   };

   const handleMarkAll = (status: 'Present' | 'Absent') => {
      const newMap: Record<string, any> = {};
      students.forEach(s => newMap[s.id] = status);
      setAttendanceMap(newMap);
   };

   const handleSave = async () => {
      try {
         setSaving(true);
         const updates = students.map(s => ({
            enrollment_id: s.enrollmentId,
            date: selectedDate,
            status: attendanceMap[s.id] || 'Present'
         }));

         const { error } = await supabase.from('attendance').upsert(updates, { onConflict: 'enrollment_id,date' });
         if (error) throw error;

         alert('Attendance saved successfully!');
         fetchInitialData(); // Refresh analytics

      } catch (err) {
         console.error("Error saving attendance:", err);
         alert('Failed to save attendance.');
      } finally {
         setSaving(false);
      }
   };

   // Analytics Calculations
   const getAnalyticsData = () => {
      // If no real data exists, return mock data for demonstration
      if (allAttendanceRecords.length === 0) {
         // Generate mock weekly trend data
         const mockWeeklyTrend = [
            { week: 'Week 1', percentage: 82 },
            { week: 'Week 2', percentage: 78 },
            { week: 'Week 3', percentage: 85 },
            { week: 'Week 4', percentage: 88 }
         ];

         // Mock day-wise data
         const mockDayWise: Record<string, { present: number, total: number }> = {
            Monday: { present: 42, total: 48 },
            Tuesday: { present: 45, total: 50 },
            Wednesday: { present: 38, total: 48 },
            Thursday: { present: 44, total: 50 },
            Friday: { present: 35, total: 45 }
         };

         // Mock at-risk students (take first 2 students if available)
         const mockAtRiskStudents = students.slice(0, Math.min(2, students.length));

         return {
            totalSessions: 24,
            totalRecords: 241,
            totalPresent: 185,
            totalAbsent: 38,
            totalLate: 18,
            avgAttendance: 84,
            peakDay: { day: 'Tuesday', percentage: 90 },
            lowestDay: { day: 'Friday', percentage: 78 },
            atRiskStudents: mockAtRiskStudents,
            weeklyTrend: mockWeeklyTrend,
            dayWise: mockDayWise,
            isMockData: true
         };
      }

      const totalSessions = new Set(allAttendanceRecords.map(r => r.date)).size;
      const totalPresent = allAttendanceRecords.filter(r => r.status === 'Present').length;
      const totalAbsent = allAttendanceRecords.filter(r => r.status === 'Absent').length;
      const totalLate = allAttendanceRecords.filter(r => r.status === 'Late').length;
      const avgAttendance = allAttendanceRecords.length > 0
         ? Math.round(((totalPresent + totalLate) / allAttendanceRecords.length) * 100)
         : 0;

      // Day-wise analysis for peak days
      const dayWise: Record<string, { present: number, total: number }> = {};
      allAttendanceRecords.forEach(r => {
         const dayName = new Date(r.date).toLocaleDateString('en', { weekday: 'long' });
         if (!dayWise[dayName]) dayWise[dayName] = { present: 0, total: 0 };
         dayWise[dayName].total++;
         if (r.status === 'Present' || r.status === 'Late') dayWise[dayName].present++;
      });

      let peakDay = { day: 'N/A', percentage: 0 };
      let lowestDay = { day: 'N/A', percentage: 100 };
      Object.entries(dayWise).forEach(([day, data]) => {
         const pct = data.total > 0 ? Math.round((data.present / data.total) * 100) : 0;
         if (pct > peakDay.percentage) peakDay = { day, percentage: pct };
         if (pct < lowestDay.percentage) lowestDay = { day, percentage: pct };
      });

      // Students at risk (< 75%)
      const atRiskStudents = students.filter(s => (summaryStats[s.id]?.percentage || 0) < 75);

      // Weekly trend (last 4 weeks)
      const now = new Date();
      const weeklyTrend: { week: string, percentage: number }[] = [];
      for (let i = 3; i >= 0; i--) {
         const weekStart = new Date(now);
         weekStart.setDate(now.getDate() - (i * 7) - now.getDay());
         const weekEnd = new Date(weekStart);
         weekEnd.setDate(weekStart.getDate() + 6);

         const weekRecords = allAttendanceRecords.filter(r => {
            const d = new Date(r.date);
            return d >= weekStart && d <= weekEnd;
         });
         const weekPresent = weekRecords.filter(r => r.status === 'Present' || r.status === 'Late').length;
         const pct = weekRecords.length > 0 ? Math.round((weekPresent / weekRecords.length) * 100) : 0;
         weeklyTrend.push({
            week: `Week ${4 - i}`,
            percentage: pct
         });
      }

      return {
         totalSessions,
         totalRecords: allAttendanceRecords.length,
         totalPresent,
         totalAbsent,
         totalLate,
         avgAttendance,
         peakDay,
         lowestDay,
         atRiskStudents,
         weeklyTrend,
         dayWise,
         isMockData: false
      };
   };

   const analytics = getAnalyticsData();

   const filteredStudents = students.filter(s =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNo.toLowerCase().includes(searchQuery.toLowerCase())
   );

   if (loading && students.length === 0) return <div className="p-8 text-center text-gray-400">Loading attendance...</div>;

   return (
      <div className="h-full bg-[#F4F4F5] p-6 lg:p-8 overflow-y-auto rounded-t-[2rem] rounded-b-none md:rounded-b-[2rem] font-sans pb-32">

         {/* Header */}
         <div className="flex flex-col gap-6 mb-8">
            <button
               onClick={onBack}
               className="flex items-center gap-2 text-gray-500 hover:text-black font-bold text-sm w-fit transition-colors"
            >
               <ArrowLeft size={18} /> Back to My Courses
            </button>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
               <div>
                  <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Attendance Manager</h1>
                  <p className="text-gray-500 font-medium mt-1">{courseName}</p>
               </div>

               {/* View Toggle */}
               <div className="bg-white p-1.5 rounded-full shadow-sm border border-gray-100 flex gap-1 w-full md:w-auto overflow-x-auto">
                  <button
                     onClick={() => setActiveTab('mark')}
                     className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap flex-1 md:flex-initial justify-center ${activeTab === 'mark' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                     <CheckCircle size={16} /> Mark
                  </button>
                  <button
                     onClick={() => setActiveTab('qr')}
                     className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap flex-1 md:flex-initial justify-center ${activeTab === 'qr' ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                     <QrCode size={16} /> QR Mode
                  </button>
                  <button
                     onClick={() => setActiveTab('summary')}
                     className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap flex-1 md:flex-initial justify-center ${activeTab === 'summary' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                     <History size={16} /> Summary
                  </button>
                  <button
                     onClick={() => setActiveTab('analytics')}
                     className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap flex-1 md:flex-initial justify-center ${activeTab === 'analytics' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                     <BarChart2 size={16} /> Analytics
                  </button>
               </div>
            </div>
         </div>

         {/* CONTENT AREA */}
         <AnimatePresence mode="wait">
            {activeTab === 'mark' && (
               <motion.div
                  key="mark"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
               >
                  {/* Date Selector & Tools */}
                  <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                     <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative w-full md:w-auto">
                           <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                              <Calendar size={18} />
                           </div>
                           <input
                              type="date"
                              value={selectedDate}
                              onChange={(e) => setSelectedDate(e.target.value)}
                              className="w-full md:w-auto pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-700 outline-none focus:ring-2 focus:ring-black"
                           />
                        </div>
                        <div className="h-8 w-px bg-gray-200 hidden md:block"></div>
                        <p className="text-sm font-bold text-gray-500 hidden md:block">Session: Regular Lecture</p>
                     </div>

                     <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto justify-end">
                        <button
                           onClick={() => handleMarkAll('Present')}
                           className="px-4 py-2 bg-green-50 text-green-700 text-xs font-bold rounded-xl hover:bg-green-100 transition-colors"
                        >
                           Mark All Present
                        </button>
                        <button
                           onClick={handleSave}
                           disabled={saving}
                           className="flex items-center justify-center gap-2 px-6 py-2.5 bg-black text-white rounded-xl font-bold text-sm shadow-lg hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-50"
                        >
                           <Save size={18} /> {saving ? 'Saving...' : 'Save Record'}
                        </button>
                     </div>
                  </div>

                  {/* Student List for Marking */}
                  <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                     <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                           <thead className="bg-gray-50">
                              <tr>
                                 <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Student</th>
                                 <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-center whitespace-nowrap">Status</th>
                                 <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-right whitespace-nowrap">Remarks</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-50">
                              {filteredStudents.map(student => {
                                 const status = attendanceMap[student.id];

                                 return (
                                    <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                                       <td className="p-5">
                                          <div className="flex items-center gap-4 min-w-[200px]">
                                             <img src={student.avatarUrl} className="w-10 h-10 rounded-full object-cover border border-gray-100" alt="" />
                                             <div>
                                                <p className="font-bold text-gray-900">{student.name}</p>
                                                <p className="text-xs font-mono text-gray-500">{student.rollNo}</p>
                                             </div>
                                          </div>
                                       </td>
                                       <td className="p-5">
                                          <div className="flex flex-wrap justify-center gap-2 min-w-[240px]">
                                             <button
                                                onClick={() => handleStatusChange(student.id, 'Present')}
                                                className={`flex-1 min-w-[80px] py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${status === 'Present'
                                                   ? 'bg-green-500 text-white shadow-md scale-105'
                                                   : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                                   }`}
                                             >
                                                <CheckCircle size={14} /> Present
                                             </button>
                                             <button
                                                onClick={() => handleStatusChange(student.id, 'Absent')}
                                                className={`flex-1 min-w-[80px] py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${status === 'Absent'
                                                   ? 'bg-red-500 text-white shadow-md scale-105'
                                                   : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                                   }`}
                                             >
                                                <XCircle size={14} /> Absent
                                             </button>
                                             <button
                                                onClick={() => handleStatusChange(student.id, 'Late')}
                                                className={`flex-1 min-w-[80px] py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${status === 'Late'
                                                   ? 'bg-yellow-500 text-white shadow-md scale-105'
                                                   : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                                   }`}
                                             >
                                                <Clock size={14} /> Late
                                             </button>
                                          </div>
                                       </td>
                                       <td className="p-5 text-right">
                                          <input
                                             placeholder="Add note..."
                                             className="text-xs bg-gray-50 border border-transparent focus:border-gray-300 rounded-lg px-3 py-1.5 outline-none w-32 transition-all text-right"
                                          />
                                       </td>
                                    </tr>
                                 )
                              })}
                           </tbody>
                        </table>
                     </div>
                  </div>
               </motion.div>
            )}

            {activeTab === 'qr' && (
               <motion.div
                  key="qr"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
               >
                  <div className="grid md:grid-cols-2 gap-6">
                     {/* Left: Timetable Selection */}
                     <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-4">Select Lecture Slot</h3>
                        <TimetableSelector
                           courseId={courseId}
                           onSelect={setSelectedLecture}
                           selectedLecture={selectedLecture}
                        />

                        {!selectedLecture && (
                           <div className="mt-4 p-4 bg-blue-50 rounded-xl">
                              <p className="text-sm text-blue-600">
                                 Select a lecture slot above, or proceed with manual session.
                              </p>
                           </div>
                        )}

                        {selectedLecture && !qrModeActive && (
                           <button
                              onClick={() => setQrModeActive(true)}
                              className="mt-6 w-full py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all"
                           >
                              <QrCode size={20} />
                              Start QR Attendance
                           </button>
                        )}

                        {!selectedLecture && !qrModeActive && (
                           <button
                              onClick={() => setQrModeActive(true)}
                              className="mt-6 w-full py-4 bg-black text-white rounded-xl font-bold flex items-center justify-center gap-2"
                           >
                              <QrCode size={20} />
                              Start Manual Session
                           </button>
                        )}
                     </div>

                     {/* Right: QR Panel or Placeholder */}
                     <div>
                        {qrModeActive ? (
                           <QRAttendancePanel
                              courseId={courseId}
                              lectureId={selectedLecture?.id}
                              onStop={() => {
                                 setQrModeActive(false);
                                 setSelectedLecture(null);
                              }}
                           />
                        ) : (
                           <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-[2rem] p-12 text-center border-2 border-dashed border-gray-200">
                              <div className="w-20 h-20 mx-auto mb-6 bg-white rounded-full flex items-center justify-center shadow-sm">
                                 <QrCode size={32} className="text-gray-300" />
                              </div>
                              <h3 className="text-lg font-bold text-gray-400 mb-2">QR Code Preview</h3>
                              <p className="text-sm text-gray-400">
                                 Click "Start QR Attendance" to generate a live QR code
                              </p>
                           </div>
                        )}
                     </div>
                  </div>

                  {/* Info Cards */}
                  <div className="grid grid-cols-3 gap-4">
                     <div className="bg-white p-4 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                              <Clock size={18} className="text-blue-500" />
                           </div>
                           <div>
                              <p className="text-2xl font-black text-gray-900">10s</p>
                              <p className="text-xs text-gray-500">Auto-refresh</p>
                           </div>
                        </div>
                     </div>
                     <div className="bg-white p-4 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                              <MapPin size={18} className="text-green-500" />
                           </div>
                           <div>
                              <p className="text-2xl font-black text-gray-900">50m</p>
                              <p className="text-xs text-gray-500">Valid radius</p>
                           </div>
                        </div>
                     </div>
                     <div className="bg-white p-4 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                              <Users size={18} className="text-purple-500" />
                           </div>
                           <div>
                              <p className="text-2xl font-black text-gray-900">{students.length}</p>
                              <p className="text-xs text-gray-500">Enrolled</p>
                           </div>
                        </div>
                     </div>
                  </div>
               </motion.div>
            )}

            {activeTab === 'summary' && (
               <motion.div
                  key="summary"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden"
               >
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                     <h3 className="font-bold text-lg text-gray-900">Cumulative Attendance Report</h3>
                     <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                        <Search size={14} className="text-gray-400" />
                        <input
                           value={searchQuery}
                           onChange={(e) => setSearchQuery(e.target.value)}
                           placeholder="Filter students..."
                           className="bg-transparent text-xs font-bold outline-none w-24 md:w-32"
                        />
                     </div>
                  </div>
                  <div className="overflow-x-auto">
                     <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50">
                           <tr>
                              <th className="p-5 text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Student</th>
                              <th className="p-5 text-xs font-bold text-gray-400 uppercase tracking-wider text-center whitespace-nowrap">Total Sessions</th>
                              <th className="p-5 text-xs font-bold text-gray-400 uppercase tracking-wider text-center whitespace-nowrap">Present</th>
                              <th className="p-5 text-xs font-bold text-gray-400 uppercase tracking-wider text-center whitespace-nowrap">Absent</th>
                              <th className="p-5 text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Overall %</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                           {filteredStudents.map(student => {
                              const stats = summaryStats[student.id] || { total: 0, present: 0, absent: 0, late: 0, percentage: 100 };
                              const isLow = stats.percentage < 75;

                              return (
                                 <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="p-5">
                                       <div className="flex items-center gap-3 min-w-[200px]">
                                          <img src={student.avatarUrl} className="w-8 h-8 rounded-full object-cover" alt="" />
                                          <span className="font-bold text-gray-900 text-sm">{student.name}</span>
                                       </div>
                                    </td>
                                    <td className="p-5 text-center font-medium text-gray-600">{stats.total}</td>
                                    <td className="p-5 text-center font-bold text-green-600">{stats.present}</td>
                                    <td className="p-5 text-center font-bold text-red-500">{stats.absent}</td>
                                    <td className="p-5">
                                       <div className="flex items-center gap-3 min-w-[120px]">
                                          <div className="flex-1 w-24 bg-gray-100 h-2 rounded-full overflow-hidden">
                                             <div
                                                className={`h-full rounded-full ${isLow ? 'bg-red-500' : 'bg-green-500'}`}
                                                style={{ width: `${stats.percentage}%` }}
                                             ></div>
                                          </div>
                                          <span className={`text-sm font-black ${isLow ? 'text-red-500' : 'text-gray-900'}`}>
                                             {stats.percentage}%
                                          </span>
                                       </div>
                                    </td>
                                 </tr>
                              )
                           })}
                        </tbody>
                     </table>
                  </div>
               </motion.div>
            )}

            {activeTab === 'analytics' && (
               <motion.div
                  key="analytics"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
               >
                  {/* Mock Data Indicator */}
                  {analytics.isMockData && (
                     <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                           <AlertCircle size={20} className="text-amber-600" />
                        </div>
                        <div>
                           <p className="font-bold text-amber-800">Sample Data Preview</p>
                           <p className="text-sm text-amber-600">No attendance records found. Displaying sample data to preview analytics features.</p>
                        </div>
                     </div>
                  )}

                  {/* Stats Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                     <div className="bg-white p-5 rounded-[2rem] shadow-sm">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
                           <Calendar size={20} className="text-blue-500" />
                        </div>
                        <p className="text-3xl font-black text-gray-900">{analytics.totalSessions}</p>
                        <p className="text-sm text-gray-500">Total Sessions</p>
                     </div>

                     <div className="bg-white p-5 rounded-[2rem] shadow-sm">
                        <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center mb-3">
                           <TrendingUp size={20} className="text-green-500" />
                        </div>
                        <p className="text-3xl font-black text-gray-900">{analytics.avgAttendance}%</p>
                        <p className="text-sm text-gray-500">Avg Attendance</p>
                     </div>

                     <div className="bg-white p-5 rounded-[2rem] shadow-sm">
                        <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center mb-3">
                           <CheckCircle size={20} className="text-purple-500" />
                        </div>
                        <p className="text-3xl font-black text-gray-900">{analytics.peakDay.day}</p>
                        <p className="text-sm text-gray-500">Peak Day ({analytics.peakDay.percentage}%)</p>
                     </div>

                     <div className="bg-white p-5 rounded-[2rem] shadow-sm">
                        <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center mb-3">
                           <AlertCircle size={20} className="text-red-500" />
                        </div>
                        <p className="text-3xl font-black text-gray-900">{analytics.atRiskStudents.length}</p>
                        <p className="text-sm text-gray-500">At Risk (&lt;75%)</p>
                     </div>
                  </div>

                  {/* Weekly Trend Chart */}
                  <div className="bg-white p-6 rounded-[2rem] shadow-sm">
                     <h3 className="font-bold text-gray-900 mb-6">Weekly Attendance Trend</h3>
                     <div className="flex items-end gap-4 h-40">
                        {analytics.weeklyTrend.map((week, i) => (
                           <div key={i} className="flex-1 flex flex-col items-center">
                              <motion.div
                                 initial={{ height: 0 }}
                                 animate={{ height: `${week.percentage}%` }}
                                 transition={{ duration: 0.5, delay: i * 0.1 }}
                                 className={`w-full rounded-t-xl ${week.percentage >= 75 ? 'bg-green-500' : week.percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                 style={{ minHeight: '8px' }}
                              />
                              <div className="mt-3 text-center">
                                 <p className="font-bold text-gray-900">{week.percentage}%</p>
                                 <p className="text-xs text-gray-500">{week.week}</p>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>

                  {/* Day-wise Distribution */}
                  <div className="bg-white p-6 rounded-[2rem] shadow-sm">
                     <h3 className="font-bold text-gray-900 mb-6">Day-wise Attendance Pattern</h3>
                     <div className="grid grid-cols-5 gap-4">
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => {
                           const data = analytics.dayWise[day] || { present: 0, total: 0 };
                           const pct = data.total > 0 ? Math.round((data.present / data.total) * 100) : 0;
                           const isPeak = day === analytics.peakDay.day;
                           const isLowest = day === analytics.lowestDay.day && analytics.lowestDay.day !== 'N/A';

                           return (
                              <div key={day} className={`p-4 rounded-2xl text-center ${isPeak ? 'bg-green-50 ring-2 ring-green-200' : isLowest ? 'bg-red-50 ring-2 ring-red-200' : 'bg-gray-50'}`}>
                                 <p className="text-xs font-bold text-gray-400 uppercase mb-2">{day.substring(0, 3)}</p>
                                 <p className={`text-2xl font-black ${isPeak ? 'text-green-600' : isLowest ? 'text-red-500' : 'text-gray-900'}`}>{pct}%</p>
                                 <p className="text-xs text-gray-500 mt-1">{data.total} classes</p>
                              </div>
                           );
                        })}
                     </div>
                  </div>

                  {/* At Risk Students */}
                  {analytics.atRiskStudents.length > 0 && (
                     <div className="bg-white p-6 rounded-[2rem] shadow-sm border-l-4 border-red-500">
                        <div className="flex items-center gap-3 mb-4">
                           <AlertCircle size={24} className="text-red-500" />
                           <h3 className="font-bold text-gray-900">Students At Risk</h3>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">These students have attendance below 75% and may need attention.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                           {analytics.atRiskStudents.map(student => {
                              const stats = summaryStats[student.id] || { percentage: 0 };
                              return (
                                 <div key={student.id} className="flex items-center gap-3 p-3 bg-red-50 rounded-xl">
                                    <img src={student.avatarUrl} className="w-10 h-10 rounded-full object-cover" alt="" />
                                    <div className="flex-1">
                                       <p className="font-bold text-gray-900 text-sm">{student.name}</p>
                                       <p className="text-xs text-red-600 font-bold">{stats.percentage}% attendance</p>
                                    </div>
                                 </div>
                              );
                           })}
                        </div>
                     </div>
                  )}

                  {/* Insights */}
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 rounded-[2rem] shadow-lg text-white">
                     <h3 className="font-bold text-xl mb-4">📊 Insights</h3>
                     <ul className="space-y-3 text-sm">
                        <li className="flex items-start gap-2">
                           <CheckCircle size={16} className="shrink-0 mt-0.5" />
                           <span>Best attendance is on <strong>{analytics.peakDay.day}</strong> with {analytics.peakDay.percentage}% average</span>
                        </li>
                        <li className="flex items-start gap-2">
                           <AlertCircle size={16} className="shrink-0 mt-0.5" />
                           <span>Lowest attendance is on <strong>{analytics.lowestDay.day}</strong> with {analytics.lowestDay.percentage}% average</span>
                        </li>
                        <li className="flex items-start gap-2">
                           <Users size={16} className="shrink-0 mt-0.5" />
                           <span><strong>{analytics.atRiskStudents.length}</strong> student(s) need attention for low attendance</span>
                        </li>
                        <li className="flex items-start gap-2">
                           <TrendingUp size={16} className="shrink-0 mt-0.5" />
                           <span>Overall class engagement is at <strong>{analytics.avgAttendance}%</strong></span>
                        </li>
                     </ul>
                  </div>
               </motion.div>
            )}
         </AnimatePresence>
      </div>
   )
}

export default FacultyAttendanceManager;
