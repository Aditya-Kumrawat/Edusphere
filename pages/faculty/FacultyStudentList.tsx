
import React, { useState, useEffect } from 'react';
import {
   Search, MoreVertical, Mail, ChevronLeft, Download, User, Award
} from '../../components/Icons';
import { StaggerContainer, StaggerItem } from '../../components/AnimatedComponents';
import { motion } from 'framer-motion';
import { supabase } from '../../services/mongoAdapter';

interface FacultyStudentListProps {
   courseId: string;
   onBack: () => void;
}

const FacultyStudentList: React.FC<FacultyStudentListProps> = ({ courseId, onBack }) => {
   const [searchQuery, setSearchQuery] = useState('');
   const [students, setStudents] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
   const [courseName, setCourseName] = useState('');

   useEffect(() => {
      fetchCourseStudents();
   }, [courseId]);

   const fetchCourseStudents = async () => {
      try {
         setLoading(true);

         // 1. Fetch Course Details (for name)
         const { data: courseData } = await supabase
            .from('courses')
            .select('name, code')
            .eq('id', courseId)
            .single();

         if (courseData) setCourseName(`${courseData.code} - ${courseData.name}`);

         // 2. Fetch Enrollments with Student Profile
         const { data: enrollments, error } = await supabase
            .from('enrollments')
            .select(`
               id,
               student_id,
               enrolled_at,
               student:profiles!enrollments_student_id_fkey (
                  id,
                  full_name,
                  email,
                  avatar_url,
                  enrollment_number,
                  department
               )
            `)
            .eq('course_id', courseId);

         if (error) {
            console.error('Enrollment fetch error:', error);
            throw error;
         }

         console.log('Fetched enrollments:', enrollments);

         // 3. For each enrollment, fetch attendance data
         const transformedStudents = await Promise.all((enrollments || []).map(async (enrollment: any) => {
            const profile = enrollment.student;
            if (!profile) {
               console.log('No profile for enrollment:', enrollment);
               return null;
            }

            // Fetch attendance for this student in this course
            const { data: attendanceData } = await supabase
               .from('attendance')
               .select('status')
               .eq('student_id', profile.id)
               .eq('course_id', courseId);

            const totalAttendance = attendanceData?.length || 0;
            const presentCount = attendanceData?.filter((a: any) => a.status === 'Present').length || 0;
            const attendancePercent = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

            // Fetch grades for this student
            const { data: gradesData } = await supabase
               .from('grades')
               .select('total_marks')
               .eq('student_id', profile.id)
               .eq('enrollment_id', enrollment.id);

            const avgScore = gradesData && gradesData.length > 0
               ? Math.round(gradesData.reduce((acc: number, g: any) => acc + (g.total_marks || 0), 0) / gradesData.length)
               : 0;

            return {
               id: profile.id,
               name: profile.full_name || profile.email?.split('@')[0] || 'Unknown',
               email: profile.email,
               rollNo: profile.enrollment_number || 'S-' + profile.id.substring(0, 4).toUpperCase(),
               avatarUrl: profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || 'S')}&background=random`,
               attendance: attendancePercent || '--',
               avgGrade: avgScore > 0 ? `${avgScore}%` : '--',
               status: attendancePercent >= 75 ? 'Active' : attendancePercent > 0 ? 'At Risk' : 'Active',
               department: profile.department || 'General'
            };
         }));

         const validStudents = transformedStudents.filter(Boolean);
         console.log('Transformed students:', validStudents);
         setStudents(validStudents);

      } catch (err) {
         console.error('Error fetching students:', err);
      } finally {
         setLoading(false);
      }
   };


   // Filter Logic
   const filteredStudents = students.filter(s =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNo?.toLowerCase().includes(searchQuery.toLowerCase())
   );

   if (loading) return <div className="p-8 text-center text-gray-400">Loading student list...</div>;

   return (
      <div className="h-full bg-[#F4F4F5] p-6 lg:p-8 overflow-y-auto rounded-t-[2rem] rounded-b-none md:rounded-b-[2rem] font-sans">

         {/* Header */}
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div className="flex items-center gap-4">
               <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onBack}
                  className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 text-gray-600 transition-colors"
               >
                  <ChevronLeft size={20} />
               </motion.button>
               <div>
                  <motion.h1
                     initial={{ opacity: 0, x: -20 }}
                     animate={{ opacity: 1, x: 0 }}
                     className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight"
                  >
                     {courseName || 'Course Students'}
                  </motion.h1>
                  <p className="text-gray-500 font-medium">Enrolled Students • {students.length} Total</p>
               </div>
            </div>

            <div className="flex gap-3">
               <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition-colors">
                  <Download size={16} /> Export CSV
               </button>
            </div>
         </div>

         {/* Search & Filter Bar */}
         <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100 mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative w-full sm:max-w-xs">
               <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
               <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, roll no..."
                  className="w-full bg-gray-50 border-none rounded-xl py-3 pl-10 pr-4 font-medium text-gray-700 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
               />
            </div>
            <div className="flex gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar">
               {['All', 'Active', 'At Risk', 'Detained'].map((filter) => (
                  <button
                     key={filter}
                     className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${filter === 'All' ? 'bg-black text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                  >
                     {filter}
                  </button>
               ))}
            </div>
         </div>

         {/* Student List Table */}
         <StaggerContainer>
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
               <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                     <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                           <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Student Name</th>
                           <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Roll No</th>
                           <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Attendance</th>
                           <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Performance</th>
                           <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-50">
                        {filteredStudents.length > 0 ? filteredStudents.map((student) => (
                           <tr key={student.id} className="hover:bg-gray-50/50 transition-colors group">
                              <td className="p-6">
                                 <div className="flex items-center gap-4">
                                    <img src={student.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                                    <div>
                                       <p className="font-bold text-gray-900">{student.name}</p>
                                       <p className="text-xs text-gray-500 flex items-center gap-1"><Mail size={10} /> {student.email}</p>
                                    </div>
                                 </div>
                              </td>
                              <td className="p-6 font-mono text-sm font-bold text-gray-600">{student.rollNo}</td>
                              <td className="p-6 text-center">
                                 <span className={`px-2 py-1 rounded-lg text-xs font-bold ${student.attendance >= 75 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                    {student.attendance}%
                                 </span>
                              </td>
                              <td className="p-6 text-center">
                                 <span className="font-bold text-gray-900">{student.avgGrade}</span>
                              </td>
                              <td className="p-6 text-right">
                                 <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button className="p-2 hover:bg-gray-100 rounded-full text-gray-500" title="Email"><Mail size={16} /></button>
                                    <button className="p-2 hover:bg-gray-100 rounded-full text-gray-500" title="Profile"><User size={16} /></button>
                                    <button className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><Award size={16} /></button>
                                 </div>
                              </td>
                           </tr>
                        )) : (
                           <tr>
                              <td colSpan={5} className="p-12 text-center text-gray-400 font-medium">
                                 No students found.
                              </td>
                           </tr>
                        )}
                     </tbody>
                  </table>
               </div>
            </div>
         </StaggerContainer>
      </div>
   );
};

export default FacultyStudentList;
