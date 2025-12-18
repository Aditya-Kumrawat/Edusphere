import React, { useState, useEffect } from 'react';
import { UserCheck, Clock, Award, Plus, Edit2, Trash2, X, Users, Search } from '../../components/Icons';
import ManagementSection from '../../components/ManagementSection';
import { supabase } from '../../services/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

interface Course {
   id: string;
   code: string;
   name: string;
   description?: string;
   credits: number;
   schedule?: string;
   faculty_id?: string;
   faculty?: { full_name: string };
   enrollment_count?: number;
   created_at?: string;
}

const CourseManager = () => {
   const [courses, setCourses] = useState<Course[]>([]);
   const [faculty, setFaculty] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
   const [searchQuery, setSearchQuery] = useState('');
   const [showAddModal, setShowAddModal] = useState(false);
   const [showEditModal, setShowEditModal] = useState<Course | null>(null);
   const [showDeleteModal, setShowDeleteModal] = useState<Course | null>(null);
   const [actionLoading, setActionLoading] = useState(false);

   const [formData, setFormData] = useState({
      code: '',
      name: '',
      description: '',
      credits: 3,
      schedule: '',
      faculty_id: ''
   });

   useEffect(() => {
      fetchCourses();
      fetchFaculty();
   }, []);

   const fetchCourses = async () => {
      try {
         const { data, error } = await supabase
            .from('courses')
            .select(`
              *,
              faculty:profiles!courses_faculty_id_fkey(full_name)
           `)
            .order('created_at', { ascending: false });

         if (error) throw error;

         // Get enrollment counts
         const coursesWithCounts = await Promise.all((data || []).map(async (course) => {
            const { count } = await supabase
               .from('enrollments')
               .select('*', { count: 'exact', head: true })
               .eq('course_id', course.id);
            return { ...course, enrollment_count: count || 0 };
         }));

         setCourses(coursesWithCounts);
      } catch (err) {
         console.error("Error fetching courses:", err);
      } finally {
         setLoading(false);
      }
   };

   const fetchFaculty = async () => {
      try {
         const { data } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('role', 'FACULTY');
         setFaculty(data || []);
      } catch (err) {
         console.error("Error fetching faculty:", err);
      }
   };

   const resetForm = () => {
      setFormData({
         code: '',
         name: '',
         description: '',
         credits: 3,
         schedule: '',
         faculty_id: ''
      });
   };

   const handleAddCourse = async () => {
      if (!formData.code || !formData.name) {
         alert('Please fill in course code and name');
         return;
      }

      setActionLoading(true);
      try {
         const { data, error } = await supabase
            .from('courses')
            .insert({
               code: formData.code,
               name: formData.name,
               description: formData.description || null,
               credits: formData.credits,
               schedule: formData.schedule || null,
               faculty_id: formData.faculty_id || null
            })
            .select(`*, faculty:profiles!courses_faculty_id_fkey(full_name)`)
            .single();

         if (error) throw error;

         setCourses(prev => [{ ...data, enrollment_count: 0 }, ...prev]);
         setShowAddModal(false);
         resetForm();
      } catch (err: any) {
         console.error("Error adding course:", err);
         alert('Failed to add course: ' + (err.message || 'Unknown error'));
      } finally {
         setActionLoading(false);
      }
   };

   const handleEditCourse = async () => {
      if (!showEditModal || !formData.code || !formData.name) return;

      setActionLoading(true);
      try {
         const { data, error } = await supabase
            .from('courses')
            .update({
               code: formData.code,
               name: formData.name,
               description: formData.description || null,
               credits: formData.credits,
               schedule: formData.schedule || null,
               faculty_id: formData.faculty_id || null
            })
            .eq('id', showEditModal.id)
            .select(`*, faculty:profiles!courses_faculty_id_fkey(full_name)`)
            .single();

         if (error) throw error;

         setCourses(prev => prev.map(c =>
            c.id === showEditModal.id
               ? { ...data, enrollment_count: c.enrollment_count }
               : c
         ));
         setShowEditModal(null);
         resetForm();
      } catch (err: any) {
         console.error("Error updating course:", err);
         alert('Failed to update course: ' + (err.message || 'Unknown error'));
      } finally {
         setActionLoading(false);
      }
   };

   const handleDeleteCourse = async () => {
      if (!showDeleteModal) return;

      setActionLoading(true);
      try {
         // Delete related records first
         await supabase.from('enrollments').delete().eq('course_id', showDeleteModal.id);
         await supabase.from('attendance').delete().eq('course_id', showDeleteModal.id);
         await supabase.from('announcements').delete().eq('course_id', showDeleteModal.id);

         const { error } = await supabase
            .from('courses')
            .delete()
            .eq('id', showDeleteModal.id);

         if (error) throw error;

         setCourses(prev => prev.filter(c => c.id !== showDeleteModal.id));
         setShowDeleteModal(null);
      } catch (err: any) {
         console.error("Error deleting course:", err);
         alert('Failed to delete course: ' + (err.message || 'Unknown error'));
      } finally {
         setActionLoading(false);
      }
   };

   const openEditModal = (course: Course) => {
      setFormData({
         code: course.code || '',
         name: course.name || '',
         description: course.description || '',
         credits: course.credits || 3,
         schedule: course.schedule || '',
         faculty_id: course.faculty_id || ''
      });
      setShowEditModal(course);
   };

   const filteredCourses = courses.filter(course =>
      course.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.code?.toLowerCase().includes(searchQuery.toLowerCase())
   );

   return (
      <>
         <ManagementSection title="Course Catalog" onAdd={() => { resetForm(); setShowAddModal(true); }}>
            {/* Search Bar */}
            <div className="mb-6 relative">
               <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
               <input
                  type="text"
                  placeholder="Search courses by name or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:border-black focus:ring-0 outline-none text-sm transition-colors"
               />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
               {loading && <p className="col-span-full text-center text-gray-400 py-8">Loading courses...</p>}
               {!loading && filteredCourses.length === 0 && (
                  <p className="col-span-full text-center text-gray-400 py-8">
                     {searchQuery ? 'No courses found matching your search.' : 'No courses found. Create your first course!'}
                  </p>
               )}

               {filteredCourses.map(course => (
                  <motion.div
                     key={course.id}
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     className="bg-white border border-gray-100 p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] hover:shadow-lg transition-shadow group"
                  >
                     <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 text-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center font-bold text-lg sm:text-xl">
                           {course.code?.substring(0, 2) || 'C'}
                        </div>
                        <div className="flex items-center gap-2">
                           <div className="px-2 sm:px-3 py-1 bg-gray-50 rounded-full text-[10px] sm:text-xs font-bold text-gray-500">{course.code}</div>
                           <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                              <button
                                 onClick={() => openEditModal(course)}
                                 className="p-1.5 hover:bg-blue-50 rounded-lg text-gray-400 hover:text-blue-500 transition-colors"
                              >
                                 <Edit2 size={14} />
                              </button>
                              <button
                                 onClick={() => setShowDeleteModal(course)}
                                 className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                              >
                                 <Trash2 size={14} />
                              </button>
                           </div>
                        </div>
                     </div>
                     <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 line-clamp-2">{course.name}</h3>
                     <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6">
                        <p className="flex items-center gap-2"><UserCheck size={14} /> {course.faculty?.full_name || 'Unassigned'}</p>
                        <p className="flex items-center gap-2"><Clock size={14} /> {course.schedule || 'Schedule TBA'}</p>
                        <p className="flex items-center gap-2"><Award size={14} /> {course.credits} Credits</p>
                        <p className="flex items-center gap-2"><Users size={14} /> {course.enrollment_count} Students</p>
                     </div>
                  </motion.div>
               ))}
            </div>
         </ManagementSection>

         {/* Add Course Modal */}
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
                     className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
                  >
                     <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-gray-900">Add New Course</h3>
                        <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                           <X size={20} />
                        </button>
                     </div>

                     <div className="space-y-4">
                        <div>
                           <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Course Code *</label>
                           <input
                              type="text"
                              value={formData.code}
                              onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-black outline-none transition-colors"
                              placeholder="CS101"
                           />
                        </div>
                        <div>
                           <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Course Name *</label>
                           <input
                              type="text"
                              value={formData.name}
                              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-black outline-none transition-colors"
                              placeholder="Introduction to Programming"
                           />
                        </div>
                        <div>
                           <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Description</label>
                           <textarea
                              value={formData.description}
                              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-black outline-none transition-colors resize-none"
                              rows={3}
                              placeholder="Course description..."
                           />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Credits</label>
                              <input
                                 type="number"
                                 min="1"
                                 max="6"
                                 value={formData.credits}
                                 onChange={(e) => setFormData(prev => ({ ...prev, credits: parseInt(e.target.value) || 3 }))}
                                 className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-black outline-none transition-colors"
                              />
                           </div>
                           <div>
                              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Schedule</label>
                              <input
                                 type="text"
                                 value={formData.schedule}
                                 onChange={(e) => setFormData(prev => ({ ...prev, schedule: e.target.value }))}
                                 className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-black outline-none transition-colors"
                                 placeholder="MWF 9:00 AM"
                              />
                           </div>
                        </div>
                        <div>
                           <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Assign Faculty</label>
                           <select
                              value={formData.faculty_id}
                              onChange={(e) => setFormData(prev => ({ ...prev, faculty_id: e.target.value }))}
                              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-black outline-none transition-colors"
                           >
                              <option value="">Select Faculty (Optional)</option>
                              {faculty.map(f => (
                                 <option key={f.id} value={f.id}>{f.full_name || f.email}</option>
                              ))}
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
                           onClick={handleAddCourse}
                           disabled={actionLoading}
                           className="flex-1 px-4 py-3 rounded-xl bg-black text-white font-bold hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                           {actionLoading ? 'Adding...' : <><Plus size={18} /> Add Course</>}
                        </button>
                     </div>
                  </motion.div>
               </motion.div>
            )}
         </AnimatePresence>

         {/* Edit Course Modal */}
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
                     className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
                  >
                     <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-gray-900">Edit Course</h3>
                        <button onClick={() => setShowEditModal(null)} className="p-2 hover:bg-gray-100 rounded-full">
                           <X size={20} />
                        </button>
                     </div>

                     <div className="space-y-4">
                        <div>
                           <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Course Code *</label>
                           <input
                              type="text"
                              value={formData.code}
                              onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-black outline-none transition-colors"
                           />
                        </div>
                        <div>
                           <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Course Name *</label>
                           <input
                              type="text"
                              value={formData.name}
                              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-black outline-none transition-colors"
                           />
                        </div>
                        <div>
                           <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Description</label>
                           <textarea
                              value={formData.description}
                              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-black outline-none transition-colors resize-none"
                              rows={3}
                           />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Credits</label>
                              <input
                                 type="number"
                                 min="1"
                                 max="6"
                                 value={formData.credits}
                                 onChange={(e) => setFormData(prev => ({ ...prev, credits: parseInt(e.target.value) || 3 }))}
                                 className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-black outline-none transition-colors"
                              />
                           </div>
                           <div>
                              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Schedule</label>
                              <input
                                 type="text"
                                 value={formData.schedule}
                                 onChange={(e) => setFormData(prev => ({ ...prev, schedule: e.target.value }))}
                                 className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-black outline-none transition-colors"
                              />
                           </div>
                        </div>
                        <div>
                           <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Assign Faculty</label>
                           <select
                              value={formData.faculty_id}
                              onChange={(e) => setFormData(prev => ({ ...prev, faculty_id: e.target.value }))}
                              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-black outline-none transition-colors"
                           >
                              <option value="">Select Faculty (Optional)</option>
                              {faculty.map(f => (
                                 <option key={f.id} value={f.id}>{f.full_name || f.email}</option>
                              ))}
                           </select>
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
                           onClick={handleEditCourse}
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
                     <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Course?</h3>
                     <p className="text-gray-500 text-sm mb-2">
                        <strong>{showDeleteModal.code}: {showDeleteModal.name}</strong>
                     </p>
                     <p className="text-gray-500 text-sm mb-6">
                        This will permanently delete the course and all related enrollments, attendance records, and announcements.
                     </p>

                     <div className="flex gap-3">
                        <button
                           onClick={() => setShowDeleteModal(null)}
                           className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors"
                        >
                           Cancel
                        </button>
                        <button
                           onClick={handleDeleteCourse}
                           disabled={actionLoading}
                           className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors disabled:opacity-50"
                        >
                           {actionLoading ? 'Deleting...' : 'Delete'}
                        </button>
                     </div>
                  </motion.div>
               </motion.div>
            )}
         </AnimatePresence>
      </>
   )
}

export default CourseManager;