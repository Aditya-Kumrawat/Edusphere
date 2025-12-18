import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
   Award, Users, Phone, TrendingUp, TrendingDown, Filter,
   BarChart2, ArrowUp, ArrowDown, Search, Download, RefreshCcw, X
} from '../../components/Icons';
import { supabase } from '../../services/mongoAdapter';
import { useAuth } from '../../context/AuthContext';

const MAKE_WEBHOOK_URL = 'https://hook.eu2.make.com/yjzi4wem0xnonfb4pgdun3qbi2ux4yhn';

const GradingSystem = () => {
   const { user, role } = useAuth();
   const [grades, setGrades] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
   const [selectedCourse, setSelectedCourse] = useState('all');
   const [sortBy, setSortBy] = useState<'highest' | 'lowest' | 'name'>('name');
   const [searchQuery, setSearchQuery] = useState('');
   const [courses, setCourses] = useState<any[]>([]);
   const [calling, setCalling] = useState<string | null>(null);
   const [callModal, setCallModal] = useState<any>(null);

   useEffect(() => {
      fetchData();
   }, [user]);

   const fetchData = async () => {
      try {
         setLoading(true);

         // Fetch courses for filter (faculty's courses)
         const { data: coursesData } = await supabase
            .from('courses')
            .select('id, name, code')
            .eq('faculty_id', user?.id);

         setCourses(coursesData || []);

         // Fetch grades with student and course info
         const { data, error } = await supabase
            .from('grades')
            .select(`
               *,
               enrollment:enrollments (
                  student_id,
                  student:profiles!enrollments_student_id_fkey(id, full_name, email, mobile, avatar_url, department, batch),
                  course:courses(id, name, code, max_internal_marks, max_external_marks)
               )
            `)
            .order('created_at', { ascending: false });

         if (error) throw error;

         // Recalculate totals and grades based on PERCENTAGE of MAX MARKS
         const calculateGrade = (percentage: number) => {
            if (percentage >= 90) return 'A+';
            if (percentage >= 80) return 'A';
            if (percentage >= 70) return 'B';
            if (percentage >= 60) return 'C';
            if (percentage >= 50) return 'D';
            return 'F';
         };

         const processedGrades = (data || []).map(g => {
            const maxInt = g.enrollment?.course?.max_internal_marks || 40;
            const maxExt = g.enrollment?.course?.max_external_marks || 60;
            const maxTotal = maxInt + maxExt;

            const earned = (g.internal_marks || 0) + (g.external_marks || 0);
            const percentage = maxTotal > 0 ? (earned / maxTotal) * 100 : 0;
            const roundedPercentage = Math.round(percentage);

            return {
               ...g,
               total: roundedPercentage,
               grade: calculateGrade(roundedPercentage)
            };
         });

         setGrades(processedGrades);
      } catch (err) {
         console.error('Error fetching grades:', err);
      } finally {
         setLoading(false);
      }
   };

   // Filter and sort grades
   const filteredGrades = grades
      .filter(grade => {
         if (selectedCourse !== 'all' && grade.enrollment?.course?.id !== selectedCourse) return false;
         if (searchQuery) {
            const studentName = grade.enrollment?.student?.full_name?.toLowerCase() || '';
            return studentName.includes(searchQuery.toLowerCase());
         }
         return true;
      })
      .sort((a, b) => {
         if (sortBy === 'highest') return (b.total || 0) - (a.total || 0);
         if (sortBy === 'lowest') return (a.total || 0) - (b.total || 0);
         return (a.enrollment?.student?.full_name || '').localeCompare(b.enrollment?.student?.full_name || '');
      });

   // Calculate analytics
   const gradeDistribution = {
      A: grades.filter(g => g.grade === 'A').length,
      B: grades.filter(g => g.grade === 'B').length,
      C: grades.filter(g => g.grade === 'C').length,
      D: grades.filter(g => g.grade === 'D').length,
      F: grades.filter(g => g.grade === 'F').length,
   };

   const avgScore = grades.length > 0
      ? Math.round(grades.reduce((sum, g) => sum + (g.total || 0), 0) / grades.length)
      : 0;

   const highestScore = Math.max(...grades.map(g => g.total || 0), 0);
   const lowestScore = grades.length > 0 ? Math.min(...grades.filter(g => g.total != null).map(g => g.total)) : 0;

   const handleCall = async (student: any) => {
      try {
         setCalling(student.id);
         setCallModal(student);

         // Trigger Make.com webhook
         const payload = {
            student_id: student.id,
            student_name: student.full_name,
            student_email: student.email,
            student_mobile: student.mobile,
            department: student.department,
            batch: student.batch,
            triggered_at: new Date().toISOString(),
            triggered_by: user?.email
         };

         const response = await fetch(MAKE_WEBHOOK_URL, {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
         });

         if (!response.ok) {
            throw new Error('Webhook call failed');
         }

         console.log('Webhook triggered successfully');
      } catch (err) {
         console.error('Error calling student:', err);
         alert('Failed to initiate call. Please try again.');
      } finally {
         setCalling(null);
      }
   };

   const closeCallModal = () => {
      setCallModal(null);
   };

   return (
      <div className="h-full bg-[#F4F4F5] p-6 lg:p-8 overflow-y-auto rounded-t-[2rem] rounded-b-none md:rounded-b-[2rem] font-sans pb-32">
         {/* Header */}
         <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
            <div>
               <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">Grade Management</h1>
               <p className="text-gray-500 font-medium">View and analyze student grades across all courses</p>
            </div>
            <div className="flex gap-3">
               <button onClick={fetchData} className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
                  <RefreshCcw size={18} />
               </button>
               <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl font-bold text-sm">
                  <Download size={16} />
                  Export
               </button>
            </div>
         </div>

         {/* Analytics Cards */}
         <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="bg-white p-5 rounded-[2rem] shadow-sm"
            >
               <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                     <BarChart2 size={20} className="text-blue-500" />
                  </div>
               </div>
               <p className="text-3xl font-black text-gray-900">{avgScore}%</p>
               <p className="text-sm text-gray-500">Average Score</p>
            </motion.div>

            <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.1 }}
               className="bg-white p-5 rounded-[2rem] shadow-sm"
            >
               <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                     <ArrowUp size={20} className="text-green-500" />
                  </div>
               </div>
               <p className="text-3xl font-black text-gray-900">{highestScore}%</p>
               <p className="text-sm text-gray-500">Highest Score</p>
            </motion.div>

            <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.2 }}
               className="bg-white p-5 rounded-[2rem] shadow-sm"
            >
               <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                     <ArrowDown size={20} className="text-red-500" />
                  </div>
               </div>
               <p className="text-3xl font-black text-gray-900">{lowestScore}%</p>
               <p className="text-sm text-gray-500">Lowest Score</p>
            </motion.div>

            <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.3 }}
               className="bg-white p-5 rounded-[2rem] shadow-sm"
            >
               <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                     <Users size={20} className="text-purple-500" />
                  </div>
               </div>
               <p className="text-3xl font-black text-gray-900">{grades.length}</p>
               <p className="text-sm text-gray-500">Total Records</p>
            </motion.div>
         </div>

         {/* Grade Distribution Chart */}
         <div className="bg-white p-6 rounded-[2rem] shadow-sm mb-8">
            <h3 className="font-bold text-gray-900 mb-6">Grade Distribution</h3>
            <div className="flex items-end gap-4 h-32">
               {Object.entries(gradeDistribution).map(([grade, count], i) => {
                  const maxCount = Math.max(...Object.values(gradeDistribution));
                  const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                  const colors = ['bg-green-500', 'bg-blue-500', 'bg-yellow-500', 'bg-orange-500', 'bg-red-500'];

                  return (
                     <div key={grade} className="flex-1 flex flex-col items-center">
                        <motion.div
                           initial={{ height: 0 }}
                           animate={{ height: `${height}%` }}
                           transition={{ duration: 0.5, delay: i * 0.1 }}
                           className={`w-full ${colors[i]} rounded-t-xl min-h-[8px]`}
                        />
                        <div className="mt-3 text-center">
                           <p className="font-bold text-gray-900">{grade}</p>
                           <p className="text-xs text-gray-500">{count}</p>
                        </div>
                     </div>
                  );
               })}
            </div>
         </div>

         {/* Filters */}
         <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px] relative">
               <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
               <input
                  type="text"
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white rounded-xl border border-gray-200 font-medium"
               />
            </div>
            <select
               value={selectedCourse}
               onChange={(e) => setSelectedCourse(e.target.value)}
               className="px-4 py-3 bg-white rounded-xl border border-gray-200 font-bold text-sm"
            >
               <option value="all">All Courses</option>
               {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
               ))}
            </select>
            <select
               value={sortBy}
               onChange={(e) => setSortBy(e.target.value as any)}
               className="px-4 py-3 bg-white rounded-xl border border-gray-200 font-bold text-sm"
            >
               <option value="name">Sort by Name</option>
               <option value="highest">Highest First</option>
               <option value="lowest">Lowest First</option>
            </select>
         </div>

         {/* Grades Table */}
         <div className="bg-white rounded-[2rem] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
               <table className="w-full">
                  <thead>
                     <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left p-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Student</th>
                        <th className="text-left p-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Course</th>
                        <th className="text-center p-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Internal</th>
                        <th className="text-center p-6 text-xs font-bold text-gray-400 uppercase tracking-wider">External</th>
                        <th className="text-center p-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Total</th>
                        <th className="text-center p-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Grade</th>
                        <th className="text-right p-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Action</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                     {loading ? (
                        <tr><td colSpan={7} className="p-8 text-center text-gray-400">Loading grades...</td></tr>
                     ) : filteredGrades.length === 0 ? (
                        <tr><td colSpan={7} className="p-8 text-center text-gray-400">No grades found</td></tr>
                     ) : (
                        filteredGrades.map((grade) => {
                           const student = grade.enrollment?.student || {};
                           const course = grade.enrollment?.course || {};
                           const gradeColors: Record<string, string> = {
                              'A+': 'bg-green-100 text-green-800',
                              'A': 'bg-green-50 text-green-700',
                              'B': 'bg-blue-100 text-blue-700',
                              'C': 'bg-yellow-100 text-yellow-700',
                              'D': 'bg-orange-100 text-orange-700',
                              'F': 'bg-red-100 text-red-700'
                           };

                           return (
                              <tr key={grade.id} className="hover:bg-gray-50 transition-colors">
                                 <td className="p-6">
                                    <div className="flex items-center gap-3">
                                       <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                                          {student.avatar_url ? (
                                             <img src={student.avatar_url} className="w-full h-full object-cover" alt="" />
                                          ) : (
                                             <span className="font-bold text-gray-500">{student.full_name?.[0] || '?'}</span>
                                          )}
                                       </div>
                                       <div>
                                          <p className="font-bold text-gray-900">{student.full_name || 'Unknown'}</p>
                                          <p className="text-xs text-gray-500">{student.email}</p>
                                       </div>
                                    </div>
                                 </td>
                                 <td className="p-6">
                                    <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-bold text-gray-700">
                                       {course.code}
                                    </span>
                                 </td>
                                 <td className="p-6 text-center font-bold text-gray-900">{grade.internal_marks || 0}</td>
                                 <td className="p-6 text-center font-bold text-gray-900">{grade.external_marks || 0}</td>
                                 <td className="p-6 text-center font-black text-gray-900">{grade.total || 0}%</td>
                                 <td className="p-6 text-center">
                                    <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold ${gradeColors[grade.grade] || 'bg-gray-100'}`}>
                                       {grade.grade || '-'}
                                    </span>
                                 </td>
                                 <td className="p-6 text-right">
                                    <motion.button
                                       whileHover={{ scale: 1.05 }}
                                       whileTap={{ scale: 0.95 }}
                                       onClick={() => handleCall(student)}
                                       disabled={calling === student.id}
                                       className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl font-bold text-sm hover:bg-green-600 disabled:opacity-50 ml-auto"
                                    >
                                       <Phone size={14} />
                                       {calling === student.id ? 'Calling...' : 'Call'}
                                    </motion.button>
                                 </td>
                              </tr>
                           );
                        })
                     )}
                  </tbody>
               </table>
            </div>
         </div>

         {/* Call Modal */}
         <AnimatePresence>
            {callModal && (
               <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                  onClick={closeCallModal}
               >
                  <motion.div
                     initial={{ scale: 0.9, opacity: 0 }}
                     animate={{ scale: 1, opacity: 1 }}
                     exit={{ scale: 0.9, opacity: 0 }}
                     className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl text-center"
                     onClick={e => e.stopPropagation()}
                  >
                     <div className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
                        <Phone size={32} className="text-green-600" />
                     </div>
                     <h2 className="text-2xl font-bold text-gray-900 mb-2">Call Initiated!</h2>
                     <p className="text-gray-500 mb-6">
                        Calling <span className="font-bold text-gray-900">{callModal.full_name}</span>
                     </p>
                     <div className="bg-gray-50 p-4 rounded-xl mb-6 text-left">
                        <p className="text-sm text-gray-600"><strong>Email:</strong> {callModal.email}</p>
                        <p className="text-sm text-gray-600"><strong>Mobile:</strong> {callModal.mobile || 'Not available'}</p>
                        <p className="text-sm text-gray-600"><strong>Department:</strong> {callModal.department || 'N/A'}</p>
                     </div>
                     <p className="text-xs text-gray-400 mb-6">Webhook triggered to Make.com automation</p>
                     <button
                        onClick={closeCallModal}
                        className="w-full py-3 bg-black text-white rounded-xl font-bold"
                     >
                        Close
                     </button>
                  </motion.div>
               </motion.div>
            )}
         </AnimatePresence>
      </div>
   );
};

export default GradingSystem;