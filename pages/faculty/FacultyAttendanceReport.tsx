import React, { useState, useEffect } from 'react';
import {
   ArrowLeft, Download, Printer, Filter,
   TrendingUp, Users, AlertCircle, CheckCircle
} from '../../components/Icons';
import {
   BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line
} from 'recharts';
import { supabase } from '../../services/mongoAdapter';

interface FacultyAttendanceReportProps {
   courseId: string;
   onBack: () => void;
}

const FacultyAttendanceReport: React.FC<FacultyAttendanceReportProps> = ({ courseId, onBack }) => {
   const [course, setCourse] = useState<any>(null);
   const [loading, setLoading] = useState(true);
   const [studentStats, setStudentStats] = useState<any[]>([]);
   const [overallStats, setOverallStats] = useState({
      avgAttendance: 0,
      highest: 0,
      lowest: 0,
      totalClasses: 0
   });

   useEffect(() => {
      fetchReportData();
   }, [courseId]);

   const fetchReportData = async () => {
      try {
         setLoading(true);
         // 1. Fetch Course Info
         const { data: courseData } = await supabase.from('courses').select('*').eq('id', courseId).single();
         setCourse(courseData);

         // 2. Fetch Enrollments with Student Profiles
         const { data: enrollments } = await supabase
            .from('enrollments')
            .select('student_id, profiles:profiles(id, full_name, avatar_url, email)')
            .eq('course_id', courseId);

         // 3. Fetch Attendance Records
         const { data: attendance } = await supabase
            .from('attendance')
            .select('*')
            .eq('course_id', courseId);

         if (enrollments && attendance) {
            const uniqueDates = new Set(attendance.map(a => a.date)).size;
            const totalClasses = uniqueDates || 1; // Avoid division by zero, assuming at least 1 class if no records yet

            // Calculate Stats Per Student
            const stats = enrollments.map((e: any) => {
               const studentRecords = attendance.filter(a => a.student_id === e.student_id);
               const presentCount = studentRecords.filter(a => a.status === 'Present').length;
               // If we know the total unique class dates, we can use that as the denominator?
               // Or we can just sum up their records if we assume a record is always created.
               // For robustness, let's assume total classes so far = unique dates in attendance table.

               const percentage = Math.round((presentCount / (totalClasses || 1)) * 100);
               let status = 'Good';
               if (percentage >= 90) status = 'Excellent';
               else if (percentage < 75) status = 'Low';

               return {
                  student: e.profiles,
                  total: totalClasses,
                  present: presentCount,
                  percentage: percentage,
                  status: status
               };
            });

            setStudentStats(stats);

            if (stats.length > 0) {
               const avg = Math.round(stats.reduce((acc: number, curr: any) => acc + curr.percentage, 0) / stats.length);
               const max = Math.max(...stats.map((s: any) => s.percentage));
               const min = Math.min(...stats.map((s: any) => s.percentage));
               setOverallStats({
                  avgAttendance: avg,
                  highest: max,
                  lowest: min,
                  totalClasses: uniqueDates
               });
            }
         }

      } catch (error) {
         console.error("Error fetching report:", error);
      } finally {
         setLoading(false);
      }
   };

   // Chart Data Preparation
   const distributionData = [
      { name: 'Excellent (>90%)', count: studentStats.filter(s => s.percentage >= 90).length, fill: '#22c55e' },
      { name: 'Good (75-89%)', count: studentStats.filter(s => s.percentage >= 75 && s.percentage < 90).length, fill: '#3b82f6' },
      { name: 'Low (<75%)', count: studentStats.filter(s => s.percentage < 75).length, fill: '#ef4444' },
   ];

   // Mock Trend Data for now (hard to calculate without date grouping logic on client)
   const trendData = [
      { date: 'Week 1', attendance: 85 },
      { date: 'Week 2', attendance: 88 },
      { date: 'Week 3', attendance: overallStats.avgAttendance || 80 },
   ];

   if (loading) return <div className="p-8 text-center text-gray-500">Generating Report...</div>;
   if (!course) return <div className="p-8 text-center">Course not found</div>;

   return (
      <div className="h-full bg-[#F4F4F5] p-6 lg:p-8 overflow-y-auto rounded-b-[2rem] font-sans">

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
                  <div className="flex items-center gap-3 mb-2">
                     <span className="bg-purple-50 text-purple-600 px-3 py-1 rounded-lg text-xs font-black tracking-wide border border-purple-100">
                        REPORT
                     </span>
                     <span className="text-gray-400 font-bold text-sm">{course.schedule || 'Semester'}</span>
                  </div>
                  <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Attendance Report</h1>
                  <p className="text-gray-500 font-medium mt-1">
                     {course.name} ({course.code}) | Total Students: <span className="text-black font-bold">{studentStats.length}</span>
                  </p>
               </div>

               <div className="flex gap-3">
                  <button className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-full font-bold text-sm hover:bg-gray-50 transition-colors shadow-sm">
                     <Printer size={16} /> Print
                  </button>
                  <button className="flex items-center gap-2 bg-black text-white px-4 py-2.5 rounded-full font-bold text-sm hover:bg-gray-800 transition-colors shadow-lg">
                     <Download size={16} /> Export CSV
                  </button>
               </div>
            </div>
         </div>

         {/* 1. Summary Cards */}
         <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100">
               <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500"><TrendingUp size={16} /></div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Avg. Attendance</span>
               </div>
               <p className="text-3xl font-black text-gray-900">{overallStats.avgAttendance}%</p>
            </div>
            <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100">
               <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-500"><Users size={16} /></div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Classes</span>
               </div>
               <p className="text-3xl font-black text-gray-900">{overallStats.totalClasses}</p>
            </div>
            <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100">
               <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-500"><CheckCircle size={16} /></div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Highest</span>
               </div>
               <p className="text-3xl font-black text-gray-900">{overallStats.highest}%</p>
            </div>
            <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100">
               <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-500"><AlertCircle size={16} /></div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Lowest</span>
               </div>
               <p className="text-3xl font-black text-gray-900">{overallStats.lowest}%</p>
            </div>
         </div>

         {/* 2. Charts Section */}
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Trend Line Chart */}
            <div className="lg:col-span-2 bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-gray-900">Weekly Attendance Trend</h3>
                  <button className="text-xs font-bold text-gray-400 hover:text-black">Last 3 Weeks</button>
               </div>
               <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                     <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                        <Tooltip
                           contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Line type="monotone" dataKey="attendance" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }} />
                     </LineChart>
                  </ResponsiveContainer>
               </div>
            </div>

            {/* Distribution Bar Chart */}
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
               <h3 className="font-bold text-gray-900 mb-6">Student Distribution</h3>
               <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={distributionData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={100} tick={{ fill: '#6b7280', fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px' }} />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24} />
                     </BarChart>
                  </ResponsiveContainer>
               </div>
            </div>
         </div>

         {/* 3. Detailed Table */}
         <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
               <h3 className="text-xl font-bold text-gray-900">Student Attendance Records</h3>
               <div className="flex gap-2">
                  <button className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full text-xs font-bold text-gray-600 hover:bg-gray-100">
                     <Filter size={14} /> Filter Status
                  </button>
               </div>
            </div>
            <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="p-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Student Name</th>
                        <th className="p-5 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Classes Present</th>
                        <th className="p-5 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Total Classes</th>
                        <th className="p-5 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Percentage</th>
                        <th className="p-5 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Status</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                     {studentStats.length === 0 && <tr><td colSpan={5} className="p-5 text-center text-gray-400">No student records found.</td></tr>}
                     {studentStats.map((stat, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                           <td className="p-5">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold overflow-hidden">
                                    {stat.student?.avatar_url ? (
                                       <img src={stat.student.avatar_url} className="w-full h-full object-cover" alt="" />
                                    ) : (
                                       stat.student?.full_name?.[0] || '?'
                                    )}
                                 </div>
                                 <span className="font-bold text-gray-900">{stat.student?.full_name || 'Unknown Student'}</span>
                              </div>
                           </td>
                           <td className="p-5 text-center font-medium text-gray-700">{stat.present}</td>
                           <td className="p-5 text-center font-medium text-gray-500">{stat.total}</td>
                           <td className="p-5 text-center">
                              <span className="font-black text-gray-900">{stat.percentage}%</span>
                           </td>
                           <td className="p-5 text-center">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${stat.status === 'Excellent' ? 'bg-green-50 text-green-700' :
                                    stat.status === 'Low' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
                                 }`}>
                                 {stat.status}
                              </span>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>

      </div>
   )
}

export default FacultyAttendanceReport;
