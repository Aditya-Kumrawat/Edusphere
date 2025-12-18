import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Search, BookOpen, Mail, UserPlus } from '../../components/Icons';
import ManagementSection from '../../components/ManagementSection';
import { supabase } from '../../services/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

interface Faculty {
   id: string;
   full_name: string;
   email: string;
   department?: string;
   avatar_url?: string;
   mobile?: string;
   course_count?: number;
   created_at?: string;
}

const FacultyManager = () => {
   const [faculty, setFaculty] = useState<Faculty[]>([]);
   const [loading, setLoading] = useState(true);
   const [searchQuery, setSearchQuery] = useState('');
   const [showAddModal, setShowAddModal] = useState(false);
   const [showEditModal, setShowEditModal] = useState<Faculty | null>(null);
   const [showDeleteModal, setShowDeleteModal] = useState<Faculty | null>(null);
   const [actionLoading, setActionLoading] = useState(false);

   const [formData, setFormData] = useState({
      full_name: '',
      email: '',
      department: 'General',
      mobile: ''
   });

   useEffect(() => {
      fetchFaculty();
   }, []);

   const fetchFaculty = async () => {
      try {
         const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'FACULTY')
            .order('created_at', { ascending: false });

         if (error) throw error;

         // Get course counts for each faculty
         const facultyWithCounts = await Promise.all((data || []).map(async (f) => {
            const { count } = await supabase
               .from('courses')
               .select('*', { count: 'exact', head: true })
               .eq('faculty_id', f.id);
            return { ...f, course_count: count || 0 };
         }));

         setFaculty(facultyWithCounts);
      } catch (err) {
         console.error("Error fetching faculty:", err);
      } finally {
         setLoading(false);
      }
   };

   const resetForm = () => {
      setFormData({
         full_name: '',
         email: '',
         department: 'General',
         mobile: ''
      });
   };

   const handleAddFaculty = async () => {
      if (!formData.email || !formData.full_name) {
         alert('Please fill in email and full name');
         return;
      }

      setActionLoading(true);
      try {
         // Create profile entry for the faculty member
         const { data, error } = await supabase
            .from('profiles')
            .insert({
               email: formData.email,
               full_name: formData.full_name,
               department: formData.department,
               mobile: formData.mobile || null,
               role: 'FACULTY'
            })
            .select()
            .single();

         if (error) throw error;

         setFaculty(prev => [{ ...data, course_count: 0 }, ...prev]);
         setShowAddModal(false);
         resetForm();
         alert('Faculty member added successfully!');
      } catch (err: any) {
         console.error("Error adding faculty:", err);
         alert('Failed to add faculty: ' + (err.message || 'Unknown error'));
      } finally {
         setActionLoading(false);
      }
   };

   const handleEditFaculty = async () => {
      if (!showEditModal || !formData.email || !formData.full_name) return;

      setActionLoading(true);
      try {
         const { data, error } = await supabase
            .from('profiles')
            .update({
               full_name: formData.full_name,
               email: formData.email,
               department: formData.department,
               mobile: formData.mobile || null
            })
            .eq('id', showEditModal.id)
            .select()
            .single();

         if (error) throw error;

         setFaculty(prev => prev.map(f =>
            f.id === showEditModal.id
               ? { ...data, course_count: f.course_count }
               : f
         ));
         setShowEditModal(null);
         resetForm();
      } catch (err: any) {
         console.error("Error updating faculty:", err);
         alert('Failed to update faculty: ' + (err.message || 'Unknown error'));
      } finally {
         setActionLoading(false);
      }
   };

   const handleDeleteFaculty = async () => {
      if (!showDeleteModal) return;

      setActionLoading(true);
      try {
         // Update courses to remove faculty assignment
         await supabase
            .from('courses')
            .update({ faculty_id: null })
            .eq('faculty_id', showDeleteModal.id);

         // Delete the profile
         const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', showDeleteModal.id);

         if (error) throw error;

         setFaculty(prev => prev.filter(f => f.id !== showDeleteModal.id));
         setShowDeleteModal(null);
      } catch (err: any) {
         console.error("Error deleting faculty:", err);
         alert('Failed to delete faculty: ' + (err.message || 'Unknown error'));
      } finally {
         setActionLoading(false);
      }
   };

   const openEditModal = (f: Faculty) => {
      setFormData({
         full_name: f.full_name || '',
         email: f.email || '',
         department: f.department || 'General',
         mobile: f.mobile || ''
      });
      setShowEditModal(f);
   };

   const filteredFaculty = faculty.filter(f =>
      f.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.department?.toLowerCase().includes(searchQuery.toLowerCase())
   );

   return (
      <>
         <ManagementSection title="Faculty Members" onAdd={() => { resetForm(); setShowAddModal(true); }}>
            {/* Search Bar */}
            <div className="mb-6 relative">
               <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
               <input
                  type="text"
                  placeholder="Search by name, email, or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:border-black focus:ring-0 outline-none text-sm transition-colors"
               />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
               {loading && <p className="col-span-full text-center text-gray-400 py-8">Loading faculty...</p>}
               {!loading && filteredFaculty.length === 0 && (
                  <p className="col-span-full text-center text-gray-400 py-8">
                     {searchQuery ? 'No faculty found matching your search.' : 'No faculty members found.'}
                  </p>
               )}

               {filteredFaculty.map(f => (
                  <motion.div
                     key={f.id}
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     className="flex items-start gap-3 sm:gap-4 p-4 sm:p-5 bg-gray-50 hover:bg-gray-100 rounded-2xl sm:rounded-3xl transition-colors group relative"
                  >
                     <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white font-bold text-lg sm:text-xl overflow-hidden shrink-0 shadow-lg">
                        {f.avatar_url ? (
                           <img src={f.avatar_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                           f.full_name?.[0]?.toUpperCase() || '?'
                        )}
                     </div>
                     <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                           <div className="min-w-0">
                              <h3 className="font-bold text-gray-900 text-sm sm:text-base truncate">{f.full_name || 'Unnamed'}</h3>
                              <p className="text-xs text-purple-600 font-bold">{f.department || 'General'}</p>
                           </div>
                           <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity shrink-0">
                              <button
                                 onClick={() => openEditModal(f)}
                                 className="p-1.5 hover:bg-blue-100 rounded-lg text-gray-400 hover:text-blue-500 transition-colors"
                              >
                                 <Edit2 size={14} />
                              </button>
                              <button
                                 onClick={() => setShowDeleteModal(f)}
                                 className="p-1.5 hover:bg-red-100 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                              >
                                 <Trash2 size={14} />
                              </button>
                           </div>
                        </div>
                        <div className="mt-2 space-y-1">
                           <p className="text-xs text-gray-500 flex items-center gap-1.5 truncate">
                              <Mail size={12} /> {f.email}
                           </p>
                           <p className="text-xs text-gray-500 flex items-center gap-1.5">
                              <BookOpen size={12} /> {f.course_count} Course{f.course_count !== 1 ? 's' : ''} Assigned
                           </p>
                        </div>
                     </div>
                  </motion.div>
               ))}
            </div>
         </ManagementSection>

         {/* Add Faculty Modal */}
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
                           <UserPlus size={20} className="text-purple-500" />
                           Add Faculty Member
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
                              value={formData.full_name}
                              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-black outline-none transition-colors"
                              placeholder="Dr. Jane Smith"
                           />
                        </div>
                        <div>
                           <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Email *</label>
                           <input
                              type="email"
                              value={formData.email}
                              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-black outline-none transition-colors"
                              placeholder="faculty@university.edu"
                           />
                        </div>
                        <div>
                           <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Department</label>
                           <select
                              value={formData.department}
                              onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-black outline-none transition-colors"
                           >
                              <option>General</option>
                              <option>Computer Science</option>
                              <option>Electronics</option>
                              <option>Mechanical</option>
                              <option>Civil</option>
                              <option>Information Technology</option>
                              <option>Mathematics</option>
                              <option>Physics</option>
                              <option>Chemistry</option>
                           </select>
                        </div>
                        <div>
                           <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Mobile (Optional)</label>
                           <input
                              type="tel"
                              value={formData.mobile}
                              onChange={(e) => setFormData(prev => ({ ...prev, mobile: e.target.value }))}
                              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-black outline-none transition-colors"
                              placeholder="+91 98765 43210"
                           />
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
                           onClick={handleAddFaculty}
                           disabled={actionLoading}
                           className="flex-1 px-4 py-3 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                           {actionLoading ? 'Adding...' : <><Plus size={18} /> Add Faculty</>}
                        </button>
                     </div>
                  </motion.div>
               </motion.div>
            )}
         </AnimatePresence>

         {/* Edit Faculty Modal */}
         <AnimatePresence>
            {showEditModal && (
               <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                  onClick={() => setShowEditModal(null)}
               >
                  <motion.div
                     initial={{ scale: 0.9, opacity: 0 }}
                     animate={{ scale: 1, opacity: 1 }}
                     exit={{ scale: 0.9, opacity: 0 }}
                     onClick={(e) => e.stopPropagation()}
                     className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl"
                  >
                     <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-gray-900">Edit Faculty</h3>
                        <button onClick={() => setShowEditModal(null)} className="p-2 hover:bg-gray-100 rounded-full">
                           <X size={20} />
                        </button>
                     </div>

                     <div className="space-y-4">
                        <div>
                           <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Full Name *</label>
                           <input
                              type="text"
                              value={formData.full_name}
                              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-black outline-none transition-colors"
                           />
                        </div>
                        <div>
                           <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Email *</label>
                           <input
                              type="email"
                              value={formData.email}
                              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-black outline-none transition-colors"
                           />
                        </div>
                        <div>
                           <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Department</label>
                           <select
                              value={formData.department}
                              onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-black outline-none transition-colors"
                           >
                              <option>General</option>
                              <option>Computer Science</option>
                              <option>Electronics</option>
                              <option>Mechanical</option>
                              <option>Civil</option>
                              <option>Information Technology</option>
                              <option>Mathematics</option>
                              <option>Physics</option>
                              <option>Chemistry</option>
                           </select>
                        </div>
                        <div>
                           <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Mobile</label>
                           <input
                              type="tel"
                              value={formData.mobile}
                              onChange={(e) => setFormData(prev => ({ ...prev, mobile: e.target.value }))}
                              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-black outline-none transition-colors"
                           />
                        </div>
                     </div>

                     <div className="mt-6 flex gap-3">
                        <button
                           onClick={() => setShowEditModal(null)}
                           className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors"
                        >
                           Cancel
                        </button>
                        <button
                           onClick={handleEditFaculty}
                           disabled={actionLoading}
                           className="flex-1 px-4 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                           {actionLoading ? 'Saving...' : 'Save Changes'}
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
                     <h3 className="text-xl font-bold text-gray-900 mb-2">Remove Faculty?</h3>
                     <p className="text-gray-500 text-sm mb-2">
                        <strong>{showDeleteModal.full_name}</strong>
                     </p>
                     <p className="text-gray-500 text-sm mb-6">
                        This will remove the faculty member. Their assigned courses will be marked as unassigned.
                     </p>

                     <div className="flex gap-3">
                        <button
                           onClick={() => setShowDeleteModal(null)}
                           className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors"
                        >
                           Cancel
                        </button>
                        <button
                           onClick={handleDeleteFaculty}
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

export default FacultyManager;