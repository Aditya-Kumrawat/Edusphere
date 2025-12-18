import React, { useState, useEffect } from 'react';
import { Trash2, Plus, UserPlus, X, Search } from '../../components/Icons';
import ManagementSection from '../../components/ManagementSection';
import { supabase } from '../../services/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

const StudentManager = () => {
   const [students, setStudents] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
   const [showAddModal, setShowAddModal] = useState(false);
   const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
   const [searchQuery, setSearchQuery] = useState('');
   const [actionLoading, setActionLoading] = useState(false);

   // Form state for adding new student
   const [newStudent, setNewStudent] = useState({
      email: '',
      full_name: '',
      department: 'General',
      enrollment_number: '',
      mobile: ''
   });

   useEffect(() => {
      fetchStudents();
   }, []);

   const fetchStudents = async () => {
      try {
         const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'STUDENT')
            .order('created_at', { ascending: false });

         if (error) throw error;
         setStudents(data || []);
      } catch (err) {
         console.error("Error fetching students:", err);
      } finally {
         setLoading(false);
      }
   };

   const handleAddStudent = async () => {
      if (!newStudent.email || !newStudent.full_name) {
         alert('Please fill in email and full name');
         return;
      }

      setActionLoading(true);
      try {
         // Note: In a real app, you'd create the user through Supabase Auth
         // For now, we'll create a profile entry (the user would need to be invited via email)
         const { data, error } = await supabase
            .from('profiles')
            .insert({
               email: newStudent.email,
               full_name: newStudent.full_name,
               department: newStudent.department,
               enrollment_number: newStudent.enrollment_number || null,
               mobile: newStudent.mobile || null,
               role: 'STUDENT'
            })
            .select()
            .single();

         if (error) throw error;

         setStudents(prev => [data, ...prev]);
         setStudents(prev => [data, ...prev]);
         setShowAddModal(false);

         // Trigger Make.com Webhook if mobile is missing
         if (!newStudent.mobile) {
            console.log('Triggering webhook for missing mobile...');
            try {
               await fetch('https://hook.eu2.make.com/857426w6kabn78rhm24ongjcetuv2r6g', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                     name: newStudent.full_name,
                     email: newStudent.email,
                     missing_field: 'mobile',
                     source: 'StudentManager',
                     timestamp: new Date().toISOString()
                  })
               });
               console.log('Webhook triggered successfully');
            } catch (webhookErr) {
               console.error('Failed to trigger webhook:', webhookErr);
            }
         }

         setNewStudent({ email: '', full_name: '', department: 'General', enrollment_number: '', mobile: '' });
         alert('Student added successfully! ' + (!newStudent.mobile ? '(Webhook triggered for missing mobile)' : ''));
      } catch (err: any) {
         console.error("Error adding student:", err);
         alert('Failed to add student: ' + (err.message || 'Unknown error'));
      } finally {
         setActionLoading(false);
      }
   };

   const handleDeleteStudent = async (studentId: string) => {
      setActionLoading(true);
      try {
         // First, delete related records (enrollments, etc.)
         await supabase.from('enrollments').delete().eq('student_id', studentId);
         await supabase.from('attendance').delete().eq('student_id', studentId);
         await supabase.from('grades').delete().eq('student_id', studentId);
         await supabase.from('assignment_submissions').delete().eq('student_id', studentId);

         // Then delete the profile
         const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', studentId);

         if (error) throw error;

         setStudents(prev => prev.filter(s => s.id !== studentId));
         setShowDeleteModal(null);
         alert('Student removed successfully');
      } catch (err: any) {
         console.error("Error deleting student:", err);
         alert('Failed to delete student: ' + (err.message || 'Unknown error'));
      } finally {
         setActionLoading(false);
      }
   };

   // Filter students by search query
   const filteredStudents = students.filter(student =>
      student.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.enrollment_number?.toLowerCase().includes(searchQuery.toLowerCase())
   );

   return (
      <>
         <ManagementSection
            title="Student Directory"
            onAdd={() => setShowAddModal(true)}
         >
            {/* Search Bar */}
            <div className="mb-4 relative">
               <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
               <input
                  type="text"
                  placeholder="Search by name, email, or enrollment number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:border-black focus:ring-0 outline-none text-sm transition-colors"
               />
            </div>

            <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="text-gray-400 text-sm border-b border-gray-100">
                        <th className="p-4 font-medium">Student</th>
                        <th className="p-4 font-medium">Department</th>
                        <th className="p-4 font-medium hidden md:table-cell">Enrollment No.</th>
                        <th className="p-4 font-medium hidden md:table-cell">Joined</th>
                        <th className="p-4 font-medium text-right">Actions</th>
                     </tr>
                  </thead>
                  <tbody>
                     {loading && <tr><td colSpan={5} className="p-4 text-center">Loading...</td></tr>}
                     {!loading && filteredStudents.length === 0 && (
                        <tr><td colSpan={5} className="p-4 text-center text-gray-400">
                           {searchQuery ? 'No students found matching your search.' : 'No students found.'}
                        </td></tr>
                     )}

                     {filteredStudents.map(student => (
                        <tr key={student.id} className="group hover:bg-gray-50 transition-colors">
                           <td className="p-4 flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-bold overflow-hidden">
                                 {student.avatar_url ? (
                                    <img src={student.avatar_url} className="w-full h-full object-cover" alt="" />
                                 ) : (
                                    student.full_name?.[0]?.toUpperCase() || '?'
                                 )}
                              </div>
                              <div>
                                 <p className="font-bold text-gray-900">{student.full_name || 'Unnamed'}</p>
                                 <p className="text-xs text-gray-500">{student.email}</p>
                              </div>
                           </td>
                           <td className="p-4 text-sm">
                              <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-bold">
                                 {student.department || 'General'}
                              </span>
                           </td>
                           <td className="p-4 text-sm text-gray-600 hidden md:table-cell font-mono">
                              {student.enrollment_number || '-'}
                           </td>
                           <td className="p-4 text-sm text-gray-500 hidden md:table-cell">
                              {new Date(student.created_at || Date.now()).toLocaleDateString()}
                           </td>
                           <td className="p-4 text-right">
                              <button
                                 onClick={() => setShowDeleteModal(student.id)}
                                 className="p-2 hover:bg-red-50 rounded-full text-gray-400 hover:text-red-500 transition-colors"
                                 title="Remove student"
                              >
                                 <Trash2 size={18} />
                              </button>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </ManagementSection>

         {/* Add Student Modal */}
         <AnimatePresence>
            {showAddModal && (
               <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                  onClick={() => setShowAddModal(false)}
               >
                  <motion.div
                     initial={{ scale: 0.9, opacity: 0 }}
                     animate={{ scale: 1, opacity: 1 }}
                     exit={{ scale: 0.9, opacity: 0 }}
                     onClick={(e) => e.stopPropagation()}
                     className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl"
                  >
                     <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                           <UserPlus size={20} className="text-blue-500" />
                           Add New Student
                        </h3>
                        <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                           <X size={20} />
                        </button>
                     </div>

                     <div className="space-y-4">
                        <div>
                           <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Full Name *</label>
                           <input
                              type="text"
                              value={newStudent.full_name}
                              onChange={(e) => setNewStudent(prev => ({ ...prev, full_name: e.target.value }))}
                              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-black outline-none transition-colors"
                              placeholder="John Doe"
                           />
                        </div>
                        <div>
                           <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Email *</label>
                           <input
                              type="email"
                              value={newStudent.email}
                              onChange={(e) => setNewStudent(prev => ({ ...prev, email: e.target.value }))}
                              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-black outline-none transition-colors"
                              placeholder="student@university.edu"
                           />
                        </div>
                        <div>
                           <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Enrollment Number</label>
                           <input
                              type="text"
                              value={newStudent.enrollment_number}
                              onChange={(e) => setNewStudent(prev => ({ ...prev, enrollment_number: e.target.value }))}
                              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-black outline-none transition-colors"
                              placeholder="2024CS001"
                           />
                        </div>
                        <div>
                           <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Mobile Number</label>
                           <input
                              type="tel"
                              value={newStudent.mobile}
                              onChange={(e) => setNewStudent(prev => ({ ...prev, mobile: e.target.value }))}
                              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-black outline-none transition-colors"
                              placeholder="Enter mobile (leave empty to test webhook)"
                           />
                        </div>
                        <div>
                           <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Department</label>
                           <select
                              value={newStudent.department}
                              onChange={(e) => setNewStudent(prev => ({ ...prev, department: e.target.value }))}
                              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-black outline-none transition-colors"
                           >
                              <option>General</option>
                              <option>Computer Science</option>
                              <option>Electronics</option>
                              <option>Mechanical</option>
                              <option>Civil</option>
                              <option>Information Technology</option>
                           </select>
                        </div>
                     </div>

                     <div className="mt-6 flex gap-3">
                        <button
                           onClick={() => setShowAddModal(false)}
                           className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors"
                        >
                           Cancel
                        </button>
                        <button
                           onClick={handleAddStudent}
                           disabled={actionLoading}
                           className="flex-1 px-4 py-3 rounded-xl bg-black text-white font-bold hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                           {actionLoading ? (
                              <span>Adding...</span>
                           ) : (
                              <>
                                 <Plus size={18} />
                                 Add Student
                              </>
                           )}
                        </button>
                     </div>
                  </motion.div>
               </motion.div>
            )}
         </AnimatePresence>

         {/* Delete Confirmation Modal */}
         <AnimatePresence>
            {showDeleteModal && (
               <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                  onClick={() => setShowDeleteModal(null)}
               >
                  <motion.div
                     initial={{ scale: 0.9, opacity: 0 }}
                     animate={{ scale: 1, opacity: 1 }}
                     exit={{ scale: 0.9, opacity: 0 }}
                     onClick={(e) => e.stopPropagation()}
                     className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center"
                  >
                     <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                        <Trash2 size={28} className="text-red-500" />
                     </div>
                     <h3 className="text-xl font-bold text-gray-900 mb-2">Remove Student?</h3>
                     <p className="text-gray-500 text-sm mb-6">
                        This will permanently delete the student and all their associated data including enrollments, attendance, and grades.
                     </p>

                     <div className="flex gap-3">
                        <button
                           onClick={() => setShowDeleteModal(null)}
                           className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors"
                        >
                           Cancel
                        </button>
                        <button
                           onClick={() => handleDeleteStudent(showDeleteModal)}
                           disabled={actionLoading}
                           className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors disabled:opacity-50"
                        >
                           {actionLoading ? 'Removing...' : 'Remove'}
                        </button>
                     </div>
                  </motion.div>
               </motion.div>
            )}
         </AnimatePresence>
      </>
   )
}

export default StudentManager;