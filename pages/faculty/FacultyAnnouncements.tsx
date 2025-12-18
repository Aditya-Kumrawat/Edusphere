import React, { useState, useEffect } from 'react';
import {
   Megaphone, Send, Paperclip, Filter, Search,
   Trash, Edit, FileText, Calendar, Clock
} from '../../components/Icons';
import { supabase } from '../../services/mongoAdapter';
import { useAuth } from '../../context/AuthContext';

const FacultyAnnouncements = () => {
   const { session } = useAuth();
   const user = session?.user;

   // State
   const [myCourses, setMyCourses] = useState<any[]>([]);
   const [announcements, setAnnouncements] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);

   // Form State
   const [selectedCourse, setSelectedCourse] = useState('');
   const [title, setTitle] = useState('');
   const [message, setMessage] = useState('');
   const [file, setFile] = useState<File | null>(null);

   useEffect(() => {
      if (user) {
         fetchInitialData();
      }
   }, [user]);

   const fetchInitialData = async () => {
      try {
         setLoading(true);
         // 1. Fetch Courses for this Faculty
         const { data: coursesData } = await supabase
            .from('courses')
            .select('id, name, code')
            .eq('faculty_id', user?.id);

         setMyCourses(coursesData || []);
         if (coursesData && coursesData.length > 0) {
            setSelectedCourse(coursesData[0].id);
         }

         // 2. Fetch Announcements
         fetchAnnouncements();
      } catch (err) {
         console.error("Error fetching data:", err);
      } finally {
         setLoading(false);
      }
   };

   const fetchAnnouncements = async () => {
      // Fetch announcements for courses taught by this faculty
      // We can use the policy, so just select *
      const { data, error } = await supabase
         .from('announcements')
         .select(`
            *,
            course:courses(code, name)
         `)
         .order('created_at', { ascending: false });

      if (!error) {
         setAnnouncements(data || []);
      }
   };

   const handlePost = async () => {
      if (!title || !message || !selectedCourse || !user) return;

      try {
         const { error } = await supabase
            .from('announcements')
            .insert([
               {
                  course_id: selectedCourse,
                  author_id: user._id,
                  title,
                  content: message,
                  // attachment: file ? file.name : null // Needs storage bucket implementation
               }
            ]);

         if (error) throw error;

         // Refresh list
         fetchAnnouncements();

         // Reset form
         setTitle('');
         setMessage('');
         setFile(null);
         alert('Announcement posted!');

      } catch (err) {
         console.error("Error posting announcement:", err);
         alert("Failed to post announcement");
      }
   };

   const handleDelete = async (id: string) => {
      if (window.confirm('Are you sure you want to delete this announcement?')) {
         const { error } = await supabase
            .from('announcements')
            .delete()
            .eq('id', id);

         if (!error) {
            setAnnouncements(announcements.filter(a => a.id !== id));
         }
      }
   };

   return (
      <div className="h-full bg-[#F4F4F5] p-6 lg:p-8 overflow-y-auto rounded-t-[2rem] rounded-b-none md:rounded-b-[2rem] font-sans pb-32">

         {/* Header */}
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
               <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Announcements</h1>
               <p className="text-gray-500 font-medium">Communicate updates to your students.</p>
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* LEFT: Create Announcement Form */}
            <div className="lg:col-span-1 order-1 lg:order-1">
               <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 sticky top-6">
                  <div className="flex items-center gap-3 mb-6">
                     <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center">
                        <Megaphone size={20} />
                     </div>
                     <h3 className="font-bold text-gray-900 text-lg">Post New Update</h3>
                  </div>

                  <div className="space-y-4">
                     <div>
                        <label className="text-xs font-bold text-gray-400 uppercase ml-2 mb-1 block">Target Course</label>
                        <select
                           value={selectedCourse}
                           onChange={(e) => setSelectedCourse(e.target.value)}
                           className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-700 outline-none focus:ring-2 focus:ring-black"
                        >
                           <option value="">Select Course</option>
                           {myCourses.map(c => (
                              <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                           ))}
                        </select>
                     </div>

                     <div>
                        <label className="text-xs font-bold text-gray-400 uppercase ml-2 mb-1 block">Title</label>
                        <input
                           value={title}
                           onChange={(e) => setTitle(e.target.value)}
                           placeholder="e.g. Assignment Deadline Extended"
                           className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-black placeholder:font-medium"
                        />
                     </div>

                     <div>
                        <label className="text-xs font-bold text-gray-400 uppercase ml-2 mb-1 block">Message</label>
                        <textarea
                           value={message}
                           onChange={(e) => setMessage(e.target.value)}
                           placeholder="Write your announcement here..."
                           rows={4}
                           className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium text-gray-900 outline-none focus:ring-2 focus:ring-black resize-none placeholder:font-medium"
                        />
                     </div>

                     {/* Attachment UI (Visual only for now) */}
                     <div>
                        <label className="flex items-center gap-2 w-fit px-4 py-2 bg-gray-50 border border-gray-200 border-dashed rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                           <Paperclip size={16} className="text-gray-500" />
                           <span className="text-xs font-bold text-gray-600">
                              {file ? file.name : 'Attach File (Optional)'}
                           </span>
                           <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                        </label>
                     </div>

                     <button
                        onClick={handlePost}
                        disabled={!selectedCourse || !title || !message}
                        className="w-full bg-black text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-all shadow-lg mt-2 disabled:opacity-50"
                     >
                        <Send size={18} /> Post Announcement
                     </button>
                  </div>
               </div>
            </div>

            {/* RIGHT: Announcement History */}
            <div className="lg:col-span-2 order-2 lg:order-2">
               <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden min-h-[600px]">
                  {/* Filters */}
                  <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                     <h3 className="font-bold text-lg text-gray-900">Recent Posts</h3>
                     <div className="flex gap-2 w-full sm:w-auto">
                        <div className="flex items-center px-4 gap-2 bg-gray-50 rounded-full border border-gray-100 flex-1 sm:flex-initial">
                           <Search size={16} className="text-gray-400" />
                           <input
                              placeholder="Search..."
                              className="bg-transparent outline-none text-xs font-bold py-2.5 w-full sm:w-32"
                           />
                        </div>
                     </div>
                  </div>

                  {/* List */}
                  <div className="divide-y divide-gray-50">
                     {loading && <p className="p-8 text-center text-gray-400">Loading...</p>}
                     {!loading && announcements.map(announcement => {
                        const dateObj = new Date(announcement.created_at);
                        const dateStr = dateObj.toLocaleDateString();
                        const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                        return (
                           <div key={announcement.id} className="p-6 hover:bg-gray-50/50 transition-colors group">
                              <div className="flex justify-between items-start mb-3">
                                 <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-3">
                                       <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide border border-blue-100">
                                          {announcement.course?.code || '???'}
                                       </span>
                                       <span className="text-xs font-bold text-gray-400 flex items-center gap-1">
                                          <Calendar size={12} /> {dateStr}
                                          <span className="mx-1">•</span>
                                          <Clock size={12} /> {timeStr}
                                       </span>
                                    </div>
                                    <h4 className="font-bold text-xl text-gray-900">{announcement.title}</h4>
                                 </div>
                                 <div className="flex gap-2">
                                    {/* <button className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-black">
                                     <Edit size={16} />
                                  </button> */}
                                    <button
                                       onClick={() => handleDelete(announcement.id)}
                                       className="p-2 hover:bg-red-50 rounded-full text-gray-400 hover:text-red-500"
                                    >
                                       <Trash size={16} />
                                    </button>
                                 </div>
                              </div>

                              <p className="text-gray-600 text-sm leading-relaxed mb-4">
                                 {announcement.content}
                              </p>

                              {/* {announcement.attachment && (
                               <div className="flex items-center gap-2 w-fit px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
                                  <FileText size={14} className="text-gray-500"/>
                                  <span className="text-xs font-bold text-gray-700">{announcement.attachment}</span>
                               </div>
                            )} */}
                           </div>
                        )
                     })}
                     {!loading && announcements.length === 0 && (
                        <div className="p-12 text-center text-gray-400">
                           <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                              <Megaphone size={24} />
                           </div>
                           <p className="font-medium">No announcements posted yet.</p>
                        </div>
                     )}
                  </div>
               </div>
            </div>
         </div>
      </div>
   )
}

export default FacultyAnnouncements;
