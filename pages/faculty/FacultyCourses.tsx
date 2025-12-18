
import React, { useState, useEffect } from 'react';
import {
   Search, BookOpen, Clock, Users, Copy, UploadCloud, Plus, X, ClipboardCheck, Award, Trash2
} from '../../components/Icons';
// import { MOCK_ENROLLMENTS } from '../../data/mockData'; // Removed
import { Course } from '../../types';
import { StaggerContainer, StaggerItem, HoverCard } from '../../components/AnimatedComponents';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../services/mongoAdapter';
import { useAuth } from '../../context/AuthContext';

interface FacultyCoursesProps {
   onViewStudents?: (courseId: string) => void;
   onViewReports?: (courseId: string) => void;
   onMarkAttendance?: (courseId: string) => void;
   onEnterMarks?: (courseId: string) => void;
   onViewGradebook?: (courseId: string) => void;
   onViewResources?: (courseId: string) => void;
}

const FacultyCourses: React.FC<FacultyCoursesProps> = ({
   onViewStudents,
   onViewReports,
   onMarkAttendance,
   onEnterMarks,
   onViewGradebook,
   onViewResources
}) => {
   const { session } = useAuth(); // CHANGED: Destructure session
   const user = session?.user;    // CHANGED: Derive user from session
   const [searchQuery, setSearchQuery] = useState('');

   const [myCourses, setMyCourses] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);

   // Modal State
   const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
   const [newClass, setNewClass] = useState({ name: '', code: '', credits: 3 });

   useEffect(() => {
      fetchCourses();
   }, [user]);

   const fetchCourses = async () => {
      if (!user || !user._id) return;
      try {
         setLoading(true);
         const { data, error } = await supabase
            .from('courses')
            .select('*, enrollments(count)')
            .eq('faculty_id', user._id)
            .order('created_at', { ascending: false });

         if (error) throw error;
         setMyCourses(data || []);
      } catch (err) {
         console.error('Error fetching courses:', err);
      } finally {
         setLoading(false);
      }
   };

   // Filter Logic
   const filteredCourses = myCourses.filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase())
   );

   const generateJoinCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 6; i++) {
         code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
   };

   const handleDeleteCourse = async (courseId: string, courseName: string) => {
      if (!window.confirm(`Are you sure you want to delete "${courseName}"?\n\nThis will permanently delete:\n- Class Data\n- Student Enrollments\n- Attendance Records\n- Assignments & Resources`)) {
         return;
      }

      try {
         const { error } = await supabase
            .from('courses')
            .delete()
            .eq('id', courseId);

         if (error) throw error;

         // Optimistic update
         setMyCourses(prev => prev.filter(c => c.id !== courseId));
      } catch (err: any) {
         console.error('Error deleting course:', err);
         alert('Failed to delete course: ' + err.message);
      }
   };

   const handleCreateClass = async () => {
      if (!newClass.name || !newClass.code || !user) return;

      try {
         const joinCode = generateJoinCode();
         const { data, error } = await supabase
            .from('courses')
            .insert([
               {
                  name: newClass.name,
                  code: newClass.code.toUpperCase(),
                  credits: newClass.credits,
                  faculty_id: user._id,
                  department: 'General', // Default or fetch from profile
                  schedule: 'TBA',
                  join_code: joinCode
               }
            ])
            .select()
            .single();

         if (error) throw error;

         // Update local state
         setMyCourses([data, ...myCourses]);
         setIsCreateModalOpen(false);
         setNewClass({ name: '', code: '', credits: 3 });
         alert(`Classroom created! Join Code: ${joinCode}`);

      } catch (err) {
         console.error('Error creating class:', err);
         alert('Failed to create class. Please try again.');
      }
   };

   const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      alert('Join code copied to clipboard!');
   };

   if (loading) return <div className="p-8 text-center text-gray-400">Loading courses...</div>;

   return (
      <div className="h-full bg-[#F4F4F5] p-6 lg:p-8 overflow-y-auto rounded-t-[2rem] rounded-b-none md:rounded-b-[2rem] font-sans relative pb-32">

         {/* 1. Header Section */}
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
               <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">My Classrooms</h1>
               <p className="text-gray-500 font-medium text-sm lg:text-base">Manage your active classes and student cohorts.</p>
            </motion.div>

            <div className="flex items-center gap-3 w-full md:w-auto">
               <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex-1 md:flex-initial justify-center flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-full font-bold text-sm hover:bg-gray-800 transition-colors shadow-lg"
               >
                  <Plus size={18} /> Create Classroom
               </motion.button>
            </div>
         </div>

         {/* Search Bar */}
         <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 mb-8 flex items-center gap-2 max-w-md"
         >
            <div className="w-10 h-10 flex items-center justify-center text-gray-400">
               <Search size={20} />
            </div>
            <input
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               placeholder="Search classrooms..."
               className="flex-1 bg-transparent outline-none font-medium text-gray-700 placeholder:text-gray-300"
            />
         </motion.div>

         {/* 2. Courses Table */}
         {filteredCourses.length > 0 ? (
            <StaggerContainer>
               <StaggerItem>
                  <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                     <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                           <thead>
                              <tr className="bg-gray-50 border-b border-gray-100">
                                 <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Class Info</th>
                                 <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-center whitespace-nowrap">Join Code</th>
                                 <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-center whitespace-nowrap">Students</th>
                                 <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-right whitespace-nowrap">Actions</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-50">
                              {filteredCourses.map((course, idx) => {
                                 // Fetch real student count
                                 const studentCount = course.enrollments?.[0]?.count || 0;

                                 return (
                                    <tr key={course.id || idx} className="hover:bg-gray-50/50 transition-colors group">
                                       <td className="p-6">
                                          <div className="flex items-center gap-3 min-w-[200px]">
                                             <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm shadow-sm group-hover:scale-110 transition-transform duration-300">
                                                {course.code?.substring(0, 2) || '??'}
                                             </div>
                                             <div>
                                                <p className="font-bold text-gray-900 text-lg">{course.name}</p>
                                                <p className="text-xs text-gray-500 font-bold mt-0.5">{course.code} • {course.credits} Credits</p>
                                             </div>
                                          </div>
                                       </td>
                                       <td className="p-6 text-center">
                                          <motion.button
                                             whileHover={{ scale: 1.05 }}
                                             whileTap={{ scale: 0.95 }}
                                             onClick={() => copyToClipboard(course.join_code || 'N/A')}
                                             className="group/code relative inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl transition-colors"
                                          >
                                             <span className="font-mono font-bold text-gray-900 tracking-widest text-lg">{course.join_code || '----'}</span>
                                             <Copy size={14} className="text-gray-400 group-hover/code:text-black" />
                                          </motion.button>
                                       </td>
                                       <td className="p-6 text-center">
                                          <div className="flex items-center justify-center gap-2">
                                             <Users size={16} className="text-gray-400" />
                                             <span className="text-lg font-black text-gray-900">{studentCount}</span>
                                          </div>
                                       </td>
                                       <td className="p-6 text-right">
                                          <div className="flex items-center justify-end gap-2">
                                             <motion.button
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => handleDeleteCourse(course.id, course.name)}
                                                className="p-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-black hover:text-white hover:border-black transition-all shadow-sm group/del"
                                                title="Delete Course"
                                             >
                                                <Trash2 size={16} className="text-red-500 group-hover/del:text-white" />
                                             </motion.button>
                                             <motion.button
                                                whileHover={{ scale: 1.1, rotate: 2 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => onViewResources?.(course.id)}
                                                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all shadow-sm"
                                                title="Resources"
                                             >
                                                <UploadCloud size={14} /> <span className="hidden xl:inline">Resources</span>
                                             </motion.button>
                                             <motion.button
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => onViewStudents?.(course.id)}
                                                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-black hover:text-white hover:border-black transition-all shadow-sm"
                                                title="Students"
                                             >
                                                <Users size={14} />
                                             </motion.button>
                                             <motion.button
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => onMarkAttendance?.(course.id)}
                                                className="p-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-green-600 hover:text-white hover:border-green-600 transition-all shadow-sm"
                                                title="Attendance"
                                             >
                                                <ClipboardCheck size={16} />
                                             </motion.button>
                                             <motion.button
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => onEnterMarks?.(course.id)}
                                                className="p-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-yellow-500 hover:text-white hover:border-yellow-500 transition-all shadow-sm"
                                                title="Marks"
                                             >
                                                <Award size={16} />
                                             </motion.button>
                                          </div>
                                       </td>
                                    </tr>
                                 )
                              })}
                           </tbody>
                        </table>
                     </div>
                  </div>
               </StaggerItem>
            </StaggerContainer>
         ) : (
            <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[2.5rem] border border-gray-100 border-dashed text-gray-400">
               <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 animate-pulse">
                  <BookOpen size={32} />
               </div>
               <p className="font-bold text-lg text-gray-900">No classrooms found</p>
               <button onClick={() => setIsCreateModalOpen(true)} className="text-black font-bold underline mt-2 hover:text-gray-600">Create your first class</button>
            </div>
         )}

         {/* Create Class Modal */}
         <AnimatePresence>
            {isCreateModalOpen && (
               <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
               >
                  <motion.div
                     initial={{ scale: 0.9, opacity: 0, y: 20 }}
                     animate={{ scale: 1, opacity: 1, y: 0 }}
                     exit={{ scale: 0.9, opacity: 0, y: 20 }}
                     className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl"
                  >
                     <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-black text-gray-900">Create Classroom</h2>
                        <button onClick={() => setIsCreateModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                           <X size={24} />
                        </button>
                     </div>

                     <div className="space-y-4">
                        <div>
                           <label className="text-xs font-bold text-gray-400 uppercase ml-2 mb-1 block">Course Name</label>
                           <input
                              value={newClass.name}
                              onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                              placeholder="e.g. Advanced Calculus"
                              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-black transition-all"
                           />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <label className="text-xs font-bold text-gray-400 uppercase ml-2 mb-1 block">Course Code</label>
                              <input
                                 value={newClass.code}
                                 onChange={(e) => setNewClass({ ...newClass, code: e.target.value })}
                                 placeholder="e.g. MTH301"
                                 className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-black transition-all"
                              />
                           </div>
                           <div>
                              <label className="text-xs font-bold text-gray-400 uppercase ml-2 mb-1 block">Credits</label>
                              <select
                                 value={newClass.credits}
                                 onChange={(e) => setNewClass({ ...newClass, credits: Number(e.target.value) })}
                                 className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-black transition-all"
                              >
                                 <option value={1}>1 Credit</option>
                                 <option value={2}>2 Credits</option>
                                 <option value={3}>3 Credits</option>
                                 <option value={4}>4 Credits</option>
                              </select>
                           </div>
                        </div>

                        <div className="pt-4">
                           <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={handleCreateClass}
                              className="w-full bg-black text-white py-4 rounded-2xl font-bold shadow-lg"
                           >
                              Generate Class & Join Code
                           </motion.button>
                        </div>
                     </div>
                  </motion.div>
               </motion.div>
            )}
         </AnimatePresence>

      </div>
   )
}

export default FacultyCourses;
