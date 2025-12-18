
import React, { useState, useEffect } from 'react';
import {
   ArrowLeft, Save, Upload, Download, Search, CheckCircle,
   AlertCircle, ChevronLeft, Calendar
} from '../../components/Icons';
import { motion } from 'framer-motion';
import { supabase } from '../../services/mongoAdapter';

interface FacultyMarksEntryProps {
   courseId: string;
   onBack: () => void;
}

const FacultyMarksEntry: React.FC<FacultyMarksEntryProps> = ({ courseId, onBack }) => {
   const [students, setStudents] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);
   const [courseName, setCourseName] = useState('');
   const [examType, setExamType] = useState('Mid Term');
   const [maxMarks, setMaxMarks] = useState(50);
   const [selectedSemester, setSelectedSemester] = useState(1);

   useEffect(() => {
      fetchData();
   }, [courseId]);

   const fetchData = async () => {
      try {
         setLoading(true);
         // 1. Fetch Course
         const { data: course } = await supabase.from('courses').select('name, code').eq('id', courseId).single();
         if (course) setCourseName(`${course.code} - ${course.name}`);

         // 2. Fetch Enrollments & Profiles
         const { data: enrollments, error } = await supabase
            .from('enrollments')
            .select(`
              id,
              student_id,
              profiles:student_id (id, full_name, roll_no, avatar_url),
              grades(id, internal_marks, external_marks, total)
           `)
            .eq('course_id', courseId);

         if (error) throw error;

         // 3. Transform
         const transformed = enrollments?.map((e: any) => {
            const grade = e.grades?.[0] || {};
            return {
               id: e.profiles.id,
               enrollmentId: e.id,
               name: e.profiles.full_name || 'Unknown',
               rollNo: e.profiles.roll_no || 'N/A',
               avatarUrl: e.profiles.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100',
               marks: grade.internal_marks || 0, // Defaulting to internal marks for this view
               total: grade.total || 0,
               gradeId: grade.id,
               status: grade.id ? 'Submitted' : 'Pending',
               isDirty: false
            };
         }) || [];

         setStudents(transformed);

      } catch (err) {
         console.error("Error fetching marks entry:", err);
      } finally {
         setLoading(false);
      }
   };

   const handleMarkChange = (id: string, value: string) => {
      const numVal = Math.min(parseInt(value) || 0, maxMarks);
      setStudents(prev => prev.map(s => s.id === id ? { ...s, marks: numVal, isDirty: true } : s));
   };

   const handleSave = async () => {
      try {
         setSaving(true);
         const dirtyStudents = students.filter(s => s.isDirty);

         for (const s of dirtyStudents) {
            const gradeData = {
               enrollment_id: s.enrollmentId,
               internal_marks: s.marks,
               grade: s.marks >= 90 ? 'A' : s.marks >= 80 ? 'B' : s.marks >= 70 ? 'C' : s.marks >= 60 ? 'D' : 'F'
            };

            if (s.gradeId) {
               // Update existing grade
               const { error } = await supabase
                  .from('grades')
                  .update(gradeData)
                  .eq('id', s.gradeId);
               if (error) throw error;
            } else {
               // Insert new grade
               const { error } = await supabase
                  .from('grades')
                  .insert(gradeData);
               if (error) throw error;
            }
         }

         if (dirtyStudents.length > 0) {
            alert('Marks saved successfully!');
            fetchData();
         } else {
            alert('No changes to save.');
         }
      } catch (err: any) {
         console.error("Error saving marks:", err);
         alert('Failed to save marks: ' + (err.message || 'Unknown error'));
      } finally {
         setSaving(false);
      }
   };

   if (loading) return <div className="p-8 text-center text-gray-400">Loading marks entry...</div>;

   return (
      <div className="h-full bg-[#F4F4F5] p-6 lg:p-8 overflow-y-auto rounded-t-[2rem] rounded-b-none md:rounded-b-[2rem] font-sans pb-32">

         {/* Header */}
         <div className="flex flex-col gap-6 mb-8">
            <button
               onClick={onBack}
               className="flex items-center gap-2 text-gray-500 hover:text-black font-bold text-sm w-fit transition-colors"
            >
               <ChevronLeft size={18} /> Back to Dashboard
            </button>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
               <div>
                  <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Enter Marks</h1>
                  <p className="text-gray-500 font-medium mt-1">{courseName}</p>
               </div>
               <div className="flex gap-3">
                  <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition-colors">
                     <Upload size={16} /> Import CSV
                  </button>
                  <motion.button
                     whileHover={{ scale: 1.02 }}
                     whileTap={{ scale: 0.98 }}
                     onClick={handleSave}
                     disabled={saving}
                     className="flex items-center gap-2 px-6 py-2 bg-black text-white rounded-xl text-sm font-bold hover:bg-gray-800 shadow-lg transition-all disabled:opacity-50"
                  >
                     <Save size={16} /> {saving ? 'Saving...' : 'Save Marks'}
                  </motion.button>
               </div>
            </div>
         </div>

         {/* Configuration Bar */}
         <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 mb-8 flex flex-wrap gap-8 items-center">
            <div className="flex flex-col gap-2">
               <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Semester</label>
               <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(parseInt(e.target.value))}
                  className="font-bold text-gray-900 bg-transparent outline-none border-b border-gray-200 pb-1 focus:border-black transition-colors"
               >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                     <option key={sem} value={sem}>Semester {sem}</option>
                  ))}
               </select>
            </div>
            <div className="flex flex-col gap-2">
               <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Exam Type</label>
               <select
                  value={examType}
                  onChange={(e) => setExamType(e.target.value)}
                  className="font-bold text-gray-900 bg-transparent outline-none border-b border-gray-200 pb-1 focus:border-black transition-colors"
               >
                  <option>Mid Term</option>
                  <option>Final Exam</option>
                  <option>Internal Assessment</option>
                  <option>Quiz</option>
                  <option>Assignment</option>
               </select>
            </div>
            <div className="flex flex-col gap-2">
               <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Date</label>
               <div className="flex items-center gap-2 font-bold text-gray-900 border-b border-gray-200 pb-1">
                  <Calendar size={16} className="text-gray-400" />
                  <span>{new Date().toLocaleDateString()}</span>
               </div>
            </div>
            <div className="flex flex-col gap-2">
               <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Max Marks</label>
               <input
                  type="number"
                  value={maxMarks}
                  onChange={(e) => setMaxMarks(parseInt(e.target.value))}
                  className="w-24 font-bold text-gray-900 bg-transparent outline-none border-b border-gray-200 pb-1 focus:border-black transition-colors"
               />
            </div>
         </div>

         {/* Marks Table */}
         <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Student</th>
                        <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Current Score</th>
                        <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Marks Obtained</th>
                        <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Status</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                     {students.map((student) => (
                        <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                           <td className="p-6">
                              <div className="flex items-center gap-3">
                                 <img src={student.avatarUrl} className="w-10 h-10 rounded-full object-cover border border-gray-200" alt="" />
                                 <div>
                                    <p className="font-bold text-gray-900">{student.name}</p>
                                    <p className="text-xs text-gray-500 font-mono">{student.rollNo}</p>
                                 </div>
                              </div>
                           </td>
                           <td className="p-6 text-center">
                              <span className="font-bold text-gray-400 text-lg">
                                 {student.marks > 0 ? student.marks : '-'} <span className="text-xs text-gray-300">/ {maxMarks}</span>
                              </span>
                           </td>
                           <td className="p-6 text-center">
                              <div className="w-32 mx-auto relative">
                                 <input
                                    type="number"
                                    value={student.marks}
                                    onChange={(e) => handleMarkChange(student.id, e.target.value)}
                                    className="w-full bg-gray-50 border-2 border-transparent focus:border-black rounded-xl py-2 px-4 text-center font-bold text-xl outline-none transition-all placeholder-gray-300"
                                    placeholder="0"
                                    max={maxMarks}
                                 />
                              </div>
                           </td>
                           <td className="p-6 text-right">
                              {student.isDirty ? (
                                 <span className="inline-flex items-center gap-1 text-yellow-600 text-xs font-bold bg-yellow-50 px-3 py-1 rounded-full">
                                    Unsaved
                                 </span>
                              ) : student.marks > 0 ? (
                                 <span className="inline-flex items-center gap-1 text-green-600 text-xs font-bold bg-green-50 px-3 py-1 rounded-full">
                                    <CheckCircle size={12} /> Saved
                                 </span>
                              ) : (
                                 <span className="inline-flex items-center gap-1 text-gray-400 text-xs font-bold bg-gray-50 px-3 py-1 rounded-full">
                                    Pending
                                 </span>
                              )}
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

export default FacultyMarksEntry;
