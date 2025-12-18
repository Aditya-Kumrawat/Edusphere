
import React, { useState, useEffect } from 'react';
import {
   Search, Filter, Save, Download, ChevronLeft,
   CheckCircle, AlertCircle, FileText, ChevronDown, Settings
} from '../../components/Icons';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../services/mongoAdapter';

interface FacultyGradebookProps {
   courseId: string;
   onBack: () => void;
}

const FacultyGradebook: React.FC<FacultyGradebookProps> = ({ courseId, onBack }) => {
   const [students, setStudents] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);
   const [searchQuery, setSearchQuery] = useState('');
   const [courseName, setCourseName] = useState('');
   const [maxInt, setMaxInt] = useState(40);
   const [maxExt, setMaxExt] = useState(60);
   const [showSettings, setShowSettings] = useState(false);
   const [tempMaxInt, setTempMaxInt] = useState(40);
   const [tempMaxExt, setTempMaxExt] = useState(60);

   // Fetch Data
   useEffect(() => {
      fetchGradebookData();
   }, [courseId]);

   const fetchGradebookData = async () => {
      try {
         setLoading(true);
         // 1. Fetch Course Info
         const { data: course } = await supabase
            .from('courses')
            .select('name, code, max_internal_marks, max_external_marks')
            .eq('id', courseId)
            .single();

         if (course) {
            setCourseName(`${course.code} - ${course.name}`);
            setMaxInt(course.max_internal_marks || 40);
            setMaxExt(course.max_external_marks || 60);
         }

         // 2. Fetch Enrollments + Profiles + Grades
         const { data: enrollments, error } = await supabase
            .from('enrollments')
            .select(`
           id,
           student_id,
           profiles:student_id (id, full_name, email, avatar_url),
           grades (id, internal_marks, external_marks, total, grade)
        `)
            .eq('course_id', courseId);

         if (error) throw error;

         // 3. Transform
         const transformed = enrollments?.map((e: any) => {
            const g = e.grades && e.grades[0] ? e.grades[0] : {}; // Assume 1 grade record per enrollment for now
            return {
               id: e.profiles.id,
               enrollmentId: e.id,
               name: e.profiles.full_name || 'Unknown',
               email: e.profiles.email,
               avatarUrl: e.profiles.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100',
               internal: g.internal_marks || 0,
               external: g.external_marks || 0,
               total: g.total || 0,
               grade: g.grade || '-',
               gradeId: g.id,
               isDirty: false
            };
         }) || [];

         setStudents(transformed);

      } catch (err) {
         console.error("Error fetching gradebook:", err);
      } finally {
         setLoading(false);
      }
   };

   const calculateGrade = (total: number, maxTotal: number) => {
      const percentage = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
      if (percentage >= 90) return 'A+';
      if (percentage >= 80) return 'A';
      if (percentage >= 70) return 'B';
      if (percentage >= 60) return 'C';
      if (percentage >= 50) return 'D';
      return 'F';
   };

   const handleGradeChange = (studentId: string, field: 'internal' | 'external', value: string) => {
      const numVal = parseInt(value) || 0;
      setStudents(prev => prev.map(s => {
         if (s.id === studentId) {
            const updated = { ...s, [field]: numVal };
            updated.total = updated.internal + updated.external;
            updated.grade = calculateGrade(updated.total, maxInt + maxExt);
            updated.isDirty = true;
            return updated;
         }
         return s;
      }));
   };

   const updateSettings = async () => {
      try {
         const { error } = await supabase.from('courses').update({
            max_internal_marks: tempMaxInt,
            max_external_marks: tempMaxExt
         }).eq('id', courseId);

         if (error) throw error;

         setMaxInt(tempMaxInt);
         setMaxExt(tempMaxExt);
         setShowSettings(false);

         // Recalculate grades for all students
         setStudents(prev => prev.map(s => {
            const updated = { ...s };
            // Recalculate grade based on NEW max
            updated.grade = calculateGrade(updated.total, tempMaxInt + tempMaxExt);
            updated.isDirty = true; // Mark as dirty so user can save
            return updated;
         }));

         alert('Grading scheme updated! Grades have been recalculated based on new limits. Please click "Save Changes" to persist these grades.');

      } catch (err) {
         console.error("Error updating settings:", err);
         alert('Failed to update grading scheme.');
      }
   };

   const saveGrades = async () => {
      try {
         setSaving(true);
         const updates = students.filter(s => s.isDirty).map(s => ({
            enrollment_id: s.enrollmentId,
            internal_marks: s.internal,
            external_marks: s.external,
            total: s.total,
            grade: s.grade,
            assessment_type: 'Final', // Default for now
            ...(s.gradeId ? { id: s.gradeId } : {}) // Update if exists
         }));

         if (updates.length === 0) {
            setSaving(false);
            return;
         }

         const { error } = await supabase.from('grades').upsert(updates);
         if (error) throw error;

         alert('Grades saved successfully!');
         // Refresh to get new IDs and clear dirty flags
         fetchGradebookData();

      } catch (err) {
         console.error("Error saving grades:", err);
         alert('Failed to save grades.');
      } finally {
         setSaving(false);
      }
   };

   const filteredStudents = students.filter(s =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
   );

   if (loading) return <div className="p-8 text-center text-gray-400">Loading gradebook...</div>;

   return (
      <div className="h-full bg-[#F4F4F5] p-6 lg:p-8 overflow-y-auto rounded-t-[2rem] rounded-b-none md:rounded-b-[2rem] font-sans pb-32">

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
                     Gradebook
                  </motion.h1>
                  <p className="text-gray-500 font-medium">{courseName}</p>
               </div>
            </div>

            <div className="flex gap-3">
               <button
                  onClick={() => { setShowSettings(!showSettings); setTempMaxInt(maxInt); setTempMaxExt(maxExt); }}
                  className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-bold shadow-sm transition-colors ${showSettings ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
               >
                  <Settings size={16} /> Scheme
               </button>
               <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition-colors">
                  <Download size={16} /> Export
               </button>
               <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={saveGrades}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-black text-white rounded-xl text-sm font-bold hover:bg-gray-800 shadow-lg transition-all disabled:opacity-50"
               >
                  <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
               </motion.button>
            </div>
         </div>

         {/* Settings Panel */}
         <AnimatePresence>
            {showSettings && (
               <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-white border border-blue-100 rounded-2xl p-6 mb-6 overflow-hidden shadow-sm"
               >
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-800">
                     <Settings size={20} className="text-blue-500" /> Configure Grading Scheme
                  </h3>
                  <div className="flex gap-8 items-end">
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Max Internal Marks</label>
                        <input
                           type="number"
                           value={tempMaxInt}
                           onChange={(e) => setTempMaxInt(parseInt(e.target.value) || 0)}
                           className="w-32 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Max External Marks</label>
                        <input
                           type="number"
                           value={tempMaxExt}
                           onChange={(e) => setTempMaxExt(parseInt(e.target.value) || 0)}
                           className="w-32 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                     </div>
                     <div className="pb-1">
                        <button
                           onClick={updateSettings}
                           className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-blue-700 transition-colors"
                        >
                           Update & Recalculate
                        </button>
                     </div>
                  </div>
                  <p className="text-xs text-blue-400 mt-4 font-medium flex items-center gap-1">
                     <AlertCircle size={12} /> Updating this will recalculate grades for all students.
                  </p>
               </motion.div>
            )}
         </AnimatePresence>

         {/* Search Bar */}
         <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100 mb-6 flex items-center gap-4 max-w-md">
            <Search size={18} className="text-gray-400 ml-2" />
            <input
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               placeholder="Search student..."
               className="w-full bg-transparent outline-none font-medium text-gray-700"
            />
         </div>

         {/* Gradebook Table */}
         <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">Student</th>
                        <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Internal ({maxInt})</th>
                        <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">External ({maxExt})</th>
                        <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Total ({maxInt + maxExt})</th>
                        <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Grade</th>
                        <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Status</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                     {filteredStudents.map((student) => (
                        <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                           <td className="p-6 sticky left-0 bg-white group-hover:bg-gray-50/50 transition-colors">
                              <div className="flex items-center gap-3">
                                 <img src={student.avatarUrl} className="w-8 h-8 rounded-full object-cover border border-gray-200" alt="" />
                                 <span className="font-bold text-gray-900">{student.name}</span>
                              </div>
                           </td>
                           <td className="p-6 text-center">
                              <input
                                 type="number"
                                 value={student.internal}
                                 max={maxInt}
                                 onChange={(e) => handleGradeChange(student.id, 'internal', e.target.value)}
                                 className="w-16 text-center bg-gray-50 border border-gray-200 rounded-lg py-1 font-bold text-gray-900 focus:ring-2 focus:ring-black outline-none"
                              />
                           </td>
                           <td className="p-6 text-center">
                              <input
                                 type="number"
                                 value={student.external}
                                 max={maxExt}
                                 onChange={(e) => handleGradeChange(student.id, 'external', e.target.value)}
                                 className="w-16 text-center bg-gray-50 border border-gray-200 rounded-lg py-1 font-bold text-gray-900 focus:ring-2 focus:ring-black outline-none"
                              />
                           </td>
                           <td className="p-6 text-center">
                              <span className="font-black text-gray-900 text-lg">{student.total}</span>
                           </td>
                           <td className="p-6 text-center">
                              <span className={`px-3 py-1 rounded-lg text-sm font-bold ${student.grade.startsWith('A') ? 'bg-green-100 text-green-700' :
                                 student.grade === 'F' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                 }`}>
                                 {student.grade}
                              </span>
                           </td>
                           <td className="p-6 text-right">
                              {student.total >= 40 ? (
                                 <span className="inline-flex items-center gap-1 text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded-full">
                                    <CheckCircle size={12} /> Pass
                                 </span>
                              ) : (
                                 <span className="inline-flex items-center gap-1 text-red-600 text-xs font-bold bg-red-50 px-2 py-1 rounded-full">
                                    <AlertCircle size={12} /> Fail
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

export default FacultyGradebook;
