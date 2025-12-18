import React, { useState, useEffect } from 'react';
import {
   ArrowLeft, UploadCloud, FileText, DownloadCloud, Trash2,
   Folder, File, Eye, Plus, Search, Filter
} from '../../components/Icons';
import { supabase } from '../../services/mongoAdapter';

interface FacultyResourcesProps {
   courseId: string;
   onBack: () => void;
}

const FacultyResources: React.FC<FacultyResourcesProps> = ({ courseId, onBack }) => {
   const [course, setCourse] = useState<any>(null);
   const [enrolledCount, setEnrolledCount] = useState(0);
   const [loading, setLoading] = useState(true);

   // Mock State for Resources (Ideally this would be a separate table)
   const [resources, setResources] = useState([
      { id: 1, title: 'Lecture Notes - Unit 1', description: 'Introduction to Anatomy basics', category: 'Notes', date: '2024-03-10', type: 'pdf', size: '2.4 MB' },
      { id: 2, title: 'Assignment 1 Guidelines', description: 'Requirements for the case study', category: 'Assignment', date: '2024-03-12', type: 'doc', size: '1.1 MB' },
      { id: 3, title: 'Week 2 Presentation', description: 'Slides from yesterday\'s lecture', category: 'Slides', date: '2024-03-15', type: 'ppt', size: '5.6 MB' },
   ]);

   const [isUploadOpen, setIsUploadOpen] = useState(false);
   const [newFile, setNewFile] = useState<{ title: string; category: string; file: File | null }>({
      title: '', category: 'Notes', file: null
   });

   useEffect(() => {
      const fetchData = async () => {
         setLoading(true);
         if (courseId) {
            // Fetch Course
            const { data: courseData } = await supabase
               .from('courses')
               .select('*')
               .eq('id', courseId)
               .single();
            setCourse(courseData);

            // Fetch Enrollment Count
            const { count } = await supabase
               .from('enrollments')
               .select('*', { count: 'exact', head: true })
               .eq('course_id', courseId);
            setEnrolledCount(count || 0);
         }
         setLoading(false);
      };
      fetchData();
   }, [courseId]);


   const handleUpload = () => {
      if (!newFile.title || !newFile.file) return;

      const newResource = {
         id: Date.now(),
         title: newFile.title,
         description: 'Newly uploaded material',
         category: newFile.category,
         date: new Date().toISOString().split('T')[0],
         type: newFile.file.name.split('.').pop() || 'file',
         size: `${(newFile.file.size / 1024 / 1024).toFixed(2)} MB`
      };

      setResources([newResource, ...resources]);
      setIsUploadOpen(false);
      setNewFile({ title: '', category: 'Notes', file: null });
   };

   const handleDelete = (id: number) => {
      if (confirm('Are you sure you want to delete this resource?')) {
         setResources(resources.filter(r => r.id !== id));
      }
   };

   if (loading) return <div className="p-8 text-center text-gray-500">Loading Resources...</div>;
   if (!course) return <div className="p-8 text-center">Course not found</div>;

   return (
      <div className="h-full bg-[#F4F4F5] p-6 lg:p-8 overflow-y-auto rounded-t-[2rem] rounded-b-none md:rounded-b-[2rem] font-sans pb-32">

         {/* Header */}
         <div className="flex flex-col gap-6 mb-8">
            <button
               onClick={onBack}
               className="flex items-center gap-2 text-gray-500 hover:text-black font-bold text-sm w-fit transition-colors"
            >
               <ArrowLeft size={18} /> Back to My Classrooms
            </button>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
               <div>
                  <div className="flex items-center gap-3 mb-2">
                     <span className="bg-orange-50 text-orange-600 px-3 py-1 rounded-lg text-xs font-black tracking-wide border border-orange-100">
                        RESOURCES
                     </span>
                     <span className="text-gray-400 font-bold text-sm">{course.schedule || 'Semester'}</span>
                  </div>
                  <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Study Materials</h1>
                  <p className="text-gray-500 font-medium mt-1">
                     {course.name} ({course.code}) | Students: <span className="text-black font-bold">{enrolledCount}</span>
                  </p>
               </div>

               <div className="flex gap-3 w-full md:w-auto">
                  <button
                     onClick={() => setIsUploadOpen(true)}
                     className="w-full md:w-auto flex justify-center items-center gap-2 bg-black text-white px-5 py-3 rounded-full font-bold text-sm hover:bg-gray-800 transition-colors shadow-lg"
                  >
                     <UploadCloud size={18} /> Upload New Material
                  </button>
               </div>
            </div>
         </div>

         {/* Upload Form Modal (Inline for simplicity) */}
         {isUploadOpen && (
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 mb-8 animate-fadeIn">
               <h3 className="font-bold text-xl text-gray-900 mb-6">Upload Resource</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                     <label className="text-xs font-bold text-gray-400 uppercase ml-2 mb-1 block">Title</label>
                     <input
                        value={newFile.title}
                        onChange={(e) => setNewFile({ ...newFile, title: e.target.value })}
                        placeholder="e.g. Unit 3 Notes"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-black"
                     />
                  </div>
                  <div>
                     <label className="text-xs font-bold text-gray-400 uppercase ml-2 mb-1 block">Category</label>
                     <select
                        value={newFile.category}
                        onChange={(e) => setNewFile({ ...newFile, category: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-700 outline-none focus:ring-2 focus:ring-black"
                     >
                        <option>Notes</option>
                        <option>Assignment</option>
                        <option>Slides</option>
                        <option>Reference</option>
                     </select>
                  </div>
                  <div className="md:col-span-2">
                     <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition-colors relative">
                        <input
                           type="file"
                           className="absolute inset-0 opacity-0 cursor-pointer"
                           onChange={(e) => setNewFile({ ...newFile, file: e.target.files?.[0] || null })}
                        />
                        <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-2">
                           <Folder size={24} />
                        </div>
                        <p className="font-bold text-gray-900">{newFile.file ? newFile.file.name : 'Click to select or drag file here'}</p>
                        <p className="text-xs text-gray-400 mt-1">PDF, DOCX, PPTX supported</p>
                     </div>
                  </div>
               </div>
               <div className="flex justify-end gap-3 mt-6">
                  <button
                     onClick={() => setIsUploadOpen(false)}
                     className="px-6 py-3 rounded-full font-bold text-sm text-gray-500 hover:bg-gray-50"
                  >
                     Cancel
                  </button>
                  <button
                     onClick={handleUpload}
                     className="px-6 py-3 bg-black text-white rounded-full font-bold text-sm hover:bg-gray-800"
                  >
                     Upload File
                  </button>
               </div>
            </div>
         )}

         {/* Materials List */}
         <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden min-h-[500px]">
            <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
               <h3 className="font-bold text-lg text-gray-900">Course Materials</h3>
               <div className="flex gap-2 w-full sm:w-auto">
                  <div className="flex items-center px-4 gap-2 bg-gray-50 rounded-full border border-gray-100 flex-1">
                     <Search size={16} className="text-gray-400 shrink-0" />
                     <input
                        placeholder="Search files..."
                        className="bg-transparent outline-none text-xs font-bold py-2.5 w-full sm:w-32"
                     />
                  </div>
                  <button className="p-2 bg-gray-50 text-gray-600 rounded-full hover:bg-gray-100 border border-gray-100 shrink-0">
                     <Filter size={16} />
                  </button>
               </div>
            </div>
            <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50">
                     <tr>
                        <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">File Name</th>
                        <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Category</th>
                        <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Date Uploaded</th>
                        <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-right whitespace-nowrap">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                     {resources.map(resource => (
                        <tr key={resource.id} className="hover:bg-gray-50/50 transition-colors group">
                           <td className="p-6">
                              <div className="flex items-center gap-4 min-w-[200px]">
                                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs uppercase border ${resource.type === 'pdf' ? 'bg-red-50 text-red-600 border-red-100' :
                                       resource.type === 'doc' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                          'bg-orange-50 text-orange-600 border-orange-100'
                                    }`}>
                                    {resource.type}
                                 </div>
                                 <div>
                                    <p className="font-bold text-gray-900">{resource.title}</p>
                                    <p className="text-xs text-gray-500">{resource.size}</p>
                                 </div>
                              </div>
                           </td>
                           <td className="p-6">
                              <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-lg text-xs font-bold">
                                 {resource.category}
                              </span>
                           </td>
                           <td className="p-6 text-sm font-bold text-gray-500">
                              {resource.date}
                           </td>
                           <td className="p-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                 <button className="p-2 rounded-xl text-gray-400 hover:text-black hover:bg-gray-100" title="Preview">
                                    <Eye size={18} />
                                 </button>
                                 <button className="p-2 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-blue-50" title="Download">
                                    <DownloadCloud size={18} />
                                 </button>
                                 <button
                                    onClick={() => handleDelete(resource.id)}
                                    className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50"
                                    title="Delete"
                                 >
                                    <Trash2 size={18} />
                                 </button>
                              </div>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
            {resources.length === 0 && (
               <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <FileText size={48} className="mb-4 opacity-20" />
                  <p className="font-bold">No materials uploaded yet</p>
               </div>
            )}
         </div>

      </div>
   )
}

export default FacultyResources;
