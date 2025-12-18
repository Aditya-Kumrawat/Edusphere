import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
   MoreVertical, Mail, Phone, Video, MessageSquare,
   Calendar, ChevronLeft, ChevronRight, Plus, Filter,
   Heart, Search, Bell, Settings, Clock, CheckCircle,
   MoreHorizontal, MapPin, User, Globe, Save, Edit, X, GraduationCap, Camera
} from '../../components/Icons';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthContext';

const StudentProfile = () => {
   const { session } = useAuth();
   const fileInputRef = useRef<HTMLInputElement>(null);
   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);
   const [editMode, setEditMode] = useState(false);
   const [uploadingAvatar, setUploadingAvatar] = useState(false);
   const [myCourses, setMyCourses] = useState<any[]>([]);

   const [student, setStudent] = useState<any>({
      name: 'Loading...',
      department: '...',
      avatarUrl: '',
      batch: '',
      enrollment_number: '',
      section: '',
      mobile: '',
      dob: '',
      gender: '',
      parent_name: '',
      address: ''
   });

   const [originalStudent, setOriginalStudent] = useState(student);

   useEffect(() => {
      if (session?.user?.id) {
         fetchData();
      }
   }, [session]);

   const fetchData = async () => {
      try {
         setLoading(true);

         // Run both queries in parallel for faster loading
         const [profileResult, enrollmentsResult] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', session?.user?.id).single(),
            supabase.from('enrollments').select(`
                id,
                course:courses (
                    *,
                    faculty:faculty_id (
                        id,
                        full_name,
                        avatar_url,
                        department
                    )
                )
            `).eq('student_id', session?.user?.id)
         ]);

         if (profileResult.data) {
            const newStudent = {
               name: profileResult.data.full_name || '',
               department: profileResult.data.department || 'General',
               avatarUrl: profileResult.data.avatar_url || '',
               batch: profileResult.data.batch || '',
               enrollment_number: profileResult.data.enrollment_number || '',
               section: profileResult.data.section || '',
               mobile: profileResult.data.mobile || '',
               dob: profileResult.data.dob || '',
               gender: profileResult.data.gender || '',
               parent_name: profileResult.data.parent_name || '',
               address: profileResult.data.address || ''
            };
            setStudent(newStudent);
            setOriginalStudent(newStudent);
         }

         if (enrollmentsResult.data && enrollmentsResult.data.length > 0) {
            setMyCourses(enrollmentsResult.data.map((e: any) => ({
               ...e.course,
               facultyId: e.course.faculty_id
            })).slice(0, 3));
         }
      } catch (err) {
         console.error('Error fetching profile:', err);
      } finally {
         setLoading(false);
      }
   };

   const handleSave = async () => {
      try {
         setSaving(true);

         // Build update object, only including non-empty values for constrained fields
         const updateData: any = {
            full_name: student.name,
            department: student.department,
            batch: student.batch || null,
            enrollment_number: student.enrollment_number || null,
            section: student.section || null,
            mobile: student.mobile || null,
            parent_name: student.parent_name || null,
            address: student.address || null
         };

         // Only include dob if it's a valid date
         if (student.dob) {
            updateData.dob = student.dob;
         }

         // Only include gender if it's one of the valid values
         if (student.gender && ['Male', 'Female', 'Other'].includes(student.gender)) {
            updateData.gender = student.gender;
         }

         const { error } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', session?.user?.id);

         if (error) throw error;

         setOriginalStudent(student);
         setEditMode(false);
         alert('Profile updated successfully!');
      } catch (err: any) {
         console.error('Error saving profile:', err);
         alert('Failed to save profile: ' + err.message);
      } finally {
         setSaving(false);
      }
   };

   const handleCancel = () => {
      setStudent(originalStudent);
      setEditMode(false);
   };

   const handleChange = (field: string, value: string) => {
      setStudent((prev: any) => ({ ...prev, [field]: value }));
   };

   const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !session?.user?.id) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
         alert('Please select an image file');
         return;
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
         alert('Image must be less than 2MB');
         return;
      }

      setUploadingAvatar(true);
      try {
         // Upload to Supabase Storage
         const fileExt = file.name.split('.').pop();
         const fileName = `${session.user.id}/avatar.${fileExt}`;

         const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, file, { upsert: true });

         if (uploadError) throw uploadError;

         // Get public URL
         const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);

         // Update profile with new avatar URL
         const timestamp = Date.now();
         const avatarUrl = `${publicUrl}?t=${timestamp}`;

         const { error: updateError } = await supabase
            .from('profiles')
            .update({ avatar_url: avatarUrl })
            .eq('id', session.user.id);

         if (updateError) throw updateError;

         // Update local state
         setStudent((prev: any) => ({ ...prev, avatarUrl }));
         alert('Avatar updated successfully!');
      } catch (err: any) {
         console.error('Error uploading avatar:', err);
         alert('Failed to upload avatar: ' + (err.message || 'Unknown error'));
      } finally {
         setUploadingAvatar(false);
      }
   };

   // Dummy messages for UI demo
   const messages = [
      { id: 1, name: 'Web Designing', icon: <Globe size={10} />, msg: 'Hey tell me about progress of project?', active: false },
      { id: 2, name: 'Faculty Admin', icon: <Bell size={10} />, msg: 'Assignment received. Good job!', active: true },
      { id: 3, name: 'Academic Office', icon: <Bell size={10} />, msg: 'Please update your contact info.', active: false }
   ];

   if (loading) {
      return <div className="h-full flex items-center justify-center text-gray-400">Loading profile...</div>;
   }

   return (
      <div className="h-full bg-[#E6F0EB] p-4 md:p-8 overflow-y-auto rounded-b-[2rem] font-sans pb-32">

         {/* Top Header */}
         <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <div className="flex items-center gap-4 self-start md:self-auto">
               <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center font-bold shadow-sm hover:bg-gray-50">←</button>
               <h1 className="text-2xl font-black text-gray-900 tracking-tight">My Profile</h1>
            </div>

            <div className="flex items-center gap-3 self-end md:self-auto">
               {editMode ? (
                  <>
                     <button onClick={handleCancel} className="bg-white border border-gray-300 px-4 py-2 rounded-xl text-xs font-bold text-gray-600 shadow-sm flex items-center gap-2">
                        <X size={14} /> Cancel
                     </button>
                     <button onClick={handleSave} disabled={saving} className="bg-black text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 disabled:opacity-50">
                        <Save size={14} /> {saving ? 'Saving...' : 'Save'}
                     </button>
                  </>
               ) : (
                  <button onClick={() => setEditMode(true)} className="bg-black text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2">
                     <Edit size={14} /> Edit Profile
                  </button>
               )}
            </div>
         </div>

         <div className="flex flex-col xl:flex-row gap-6">

            {/* LEFT COLUMN - Profile & Info */}
            <div className="w-full xl:w-[380px] flex flex-col gap-6 shrink-0">

               {/* 1. Profile Card */}
               <div className="bg-white p-6 rounded-[2rem] shadow-sm">
                  <div className="flex items-start gap-4 mb-6">
                     <div className="relative w-20 h-20 shrink-0">
                        <div className="w-full h-full rounded-full p-1 border border-dashed border-gray-300 overflow-hidden flex items-center justify-center bg-gray-50">
                           {student.avatarUrl ?
                              <img src={student.avatarUrl} className="w-full h-full rounded-full object-cover" alt="Profile" /> :
                              <span className="text-2xl font-bold text-gray-400">{student.name?.[0]}</span>
                           }
                           {uploadingAvatar && (
                              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                                 <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              </div>
                           )}
                        </div>
                        <input
                           ref={fileInputRef}
                           type="file"
                           accept="image/*"
                           onChange={handleAvatarUpload}
                           className="hidden"
                        />
                        <button
                           onClick={() => fileInputRef.current?.click()}
                           disabled={uploadingAvatar}
                           className="absolute bottom-0 right-0 p-1.5 bg-black text-white rounded-full hover:scale-110 transition-transform shadow-lg disabled:opacity-50"
                        >
                           <Camera size={12} />
                        </button>
                     </div>
                     <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                           <h2 className="text-xl font-black text-gray-900 truncate">{student.name}</h2>
                           <button className="text-gray-400"><MoreVertical size={20} /></button>
                        </div>
                        <p className="text-xs font-bold text-gray-500 mb-3">Student • {student.department}</p>
                        {student.batch && <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded-full text-[10px] font-bold">{student.batch}</span>}
                     </div>
                  </div>

                  {/* Social Actions */}
                  <div className="flex gap-3 mb-8 px-2">
                     <button className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center hover:scale-105 transition-transform"><Mail size={20} /></button>
                     <button className="w-12 h-12 border border-gray-200 text-gray-600 rounded-2xl flex items-center justify-center hover:bg-gray-50 transition-colors"><Phone size={20} /></button>
                     <button className="w-12 h-12 border border-gray-200 text-gray-600 rounded-2xl flex items-center justify-center hover:bg-gray-50 transition-colors"><MessageSquare size={20} /></button>
                     <button className="w-12 h-12 border border-gray-200 text-gray-600 rounded-2xl flex items-center justify-center hover:bg-gray-50 transition-colors"><Video size={20} /></button>
                  </div>

                  {/* Time Slots Section */}
                  <div>
                     <p className="text-xs font-bold text-gray-400 mb-3">Time Slots</p>
                     <div className="flex justify-between items-center bg-gray-50 p-3 rounded-2xl">
                        <div className="flex items-center gap-2">
                           <Calendar size={16} className="text-gray-500" />
                           <span className="text-sm font-bold text-gray-700">Upcoming</span>
                        </div>
                        <span className="bg-black text-white text-[10px] font-bold px-3 py-1.5 rounded-lg">3 Meetings</span>
                     </div>
                  </div>
               </div>

               {/* 2. Detailed Information - NOW EDITABLE */}
               <div className="bg-white p-6 rounded-[2rem] shadow-sm flex-1">
                  <div className="flex justify-between items-center mb-6">
                     <h3 className="font-bold text-lg text-gray-900">Detailed Information</h3>
                     {editMode && <span className="text-xs text-blue-500 font-bold">Editing...</span>}
                  </div>

                  <div className="space-y-5">
                     {/* Full Name */}
                     <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-3 flex-1">
                           <div className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 group-hover:bg-black group-hover:text-white transition-colors">
                              <User size={14} />
                           </div>
                           <div className="flex-1">
                              <p className="text-[10px] font-bold text-gray-400">Full Name</p>
                              {editMode ? (
                                 <input type="text" value={student.name} onChange={(e) => handleChange('name', e.target.value)} className="w-full text-sm font-bold text-gray-900 bg-gray-50 rounded-lg px-2 py-1 outline-none border-2 border-transparent focus:border-black" />
                              ) : (
                                 <p className="text-sm font-bold text-gray-900">{student.name}</p>
                              )}
                           </div>
                        </div>
                     </div>

                     {/* Email */}
                     <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-400"><Mail size={14} /></div>
                           <div>
                              <p className="text-[10px] font-bold text-gray-400">Email Address</p>
                              <p className="text-sm font-bold text-gray-900 truncate w-32 md:w-auto">{session?.user?.email}</p>
                           </div>
                        </div>
                     </div>

                     {/* Mobile */}
                     <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-3 flex-1">
                           <div className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-400"><Phone size={14} /></div>
                           <div className="flex-1">
                              <p className="text-[10px] font-bold text-gray-400">Contact Number</p>
                              {editMode ? (
                                 <input type="tel" value={student.mobile} onChange={(e) => handleChange('mobile', e.target.value)} placeholder="+91 9876543210" className="w-full text-sm font-bold text-gray-900 bg-gray-50 rounded-lg px-2 py-1 outline-none border-2 border-transparent focus:border-black" />
                              ) : (
                                 <p className="text-sm font-bold text-gray-900">{student.mobile || 'Not set'}</p>
                              )}
                           </div>
                        </div>
                     </div>

                     {/* Address */}
                     <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-3 flex-1">
                           <div className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-400"><MapPin size={14} /></div>
                           <div className="flex-1">
                              <p className="text-[10px] font-bold text-gray-400">Address</p>
                              {editMode ? (
                                 <input type="text" value={student.address} onChange={(e) => handleChange('address', e.target.value)} placeholder="Enter address" className="w-full text-sm font-bold text-gray-900 bg-gray-50 rounded-lg px-2 py-1 outline-none border-2 border-transparent focus:border-black" />
                              ) : (
                                 <p className="text-sm font-bold text-gray-900">{student.address || 'Not set'}</p>
                              )}
                           </div>
                        </div>
                     </div>

                     {/* Department */}
                     <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-3 flex-1">
                           <div className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-400"><GraduationCap size={14} /></div>
                           <div className="flex-1">
                              <p className="text-[10px] font-bold text-gray-400">Department</p>
                              {editMode ? (
                                 <select value={student.department} onChange={(e) => handleChange('department', e.target.value)} className="w-full text-sm font-bold text-gray-900 bg-gray-50 rounded-lg px-2 py-1 outline-none border-2 border-transparent focus:border-black">
                                    <option>General</option>
                                    <option>Computer Science</option>
                                    <option>Electronics</option>
                                    <option>Mechanical</option>
                                    <option>Civil</option>
                                    <option>Information Technology</option>
                                 </select>
                              ) : (
                                 <p className="text-sm font-bold text-gray-900">{student.department}</p>
                              )}
                           </div>
                        </div>
                     </div>

                     {/* Batch */}
                     <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-3 flex-1">
                           <div className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-400"><Calendar size={14} /></div>
                           <div className="flex-1">
                              <p className="text-[10px] font-bold text-gray-400">Batch</p>
                              {editMode ? (
                                 <input type="text" value={student.batch} onChange={(e) => handleChange('batch', e.target.value)} placeholder="2023-2027" className="w-full text-sm font-bold text-gray-900 bg-gray-50 rounded-lg px-2 py-1 outline-none border-2 border-transparent focus:border-black" />
                              ) : (
                                 <p className="text-sm font-bold text-gray-900">{student.batch || 'Not set'}</p>
                              )}
                           </div>
                        </div>
                     </div>

                     {/* Enrollment Number */}
                     <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-3 flex-1">
                           <div className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-400">#</div>
                           <div className="flex-1">
                              <p className="text-[10px] font-bold text-gray-400">Enrollment Number</p>
                              {editMode ? (
                                 <input type="text" value={student.enrollment_number} onChange={(e) => handleChange('enrollment_number', e.target.value)} placeholder="2023CS001" className="w-full text-sm font-bold text-gray-900 bg-gray-50 rounded-lg px-2 py-1 outline-none border-2 border-transparent focus:border-black" />
                              ) : (
                                 <p className="text-sm font-bold text-gray-900">{student.enrollment_number || 'Not set'}</p>
                              )}
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            {/* RIGHT COLUMN - Projects & Calendar */}
            <div className="flex-1 flex flex-col gap-6 min-w-0">

               {/* 1. Ongoing Projects Header */}
               <div className="flex justify-between items-center">
                  <button className="bg-black text-white px-5 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 shadow-lg">
                     Running Courses <ChevronLeft className="-rotate-90" size={14} />
                  </button>
                  <div className="flex gap-2">
                     <button className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-400 shadow-sm hover:text-black transition-colors"><Plus size={18} /></button>
                     <button className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-400 shadow-sm hover:text-black transition-colors"><Filter size={16} /></button>
                  </div>
               </div>

               {/* 2. Projects Cards (Courses) */}
               {myCourses.length === 0 && (
                  <div className="p-8 bg-white rounded-[2rem] text-center text-gray-400 outline-dashed outline-2 outline-gray-200">
                     <p className="font-bold">No active courses enrolled.</p>
                     <p className="text-sm mt-2">Join a classroom to see it here.</p>
                  </div>
               )}

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myCourses.map((course, idx) => {
                     const styles = [
                        { bg: 'bg-[#FFF4D9]', badge: 'On Track', progress: '50%', accent: 'bg-yellow-500' },
                        { bg: 'bg-[#E0F3FF]', badge: 'Started', progress: '50%', accent: 'bg-blue-500' },
                        { bg: 'bg-[#FFE6E6]', badge: 'Behind', progress: '70%', accent: 'bg-red-400' }
                     ];
                     const style = styles[idx % styles.length];
                     const faculty = course.faculty;

                     return (
                        <div key={course.id} className={`${style.bg} p-5 rounded-[2rem] flex flex-col h-48 justify-between relative group hover:-translate-y-1 transition-transform`}>
                           <div className="flex justify-between items-start">
                              <span className="text-[10px] font-bold text-gray-500 border border-black/5 px-3 py-1 rounded-full bg-white/40">
                                 {course.schedule?.split(' ')[0] || 'TBA'}
                              </span>
                              <button className="text-gray-500 hover:text-black"><MoreVertical size={16} /></button>
                           </div>

                           <div>
                              <h4 className="font-bold text-gray-900 text-lg mb-1 truncate" title={course.name}>{course.name}</h4>
                              <p className="text-xs font-bold text-gray-500 mb-4">{course.code}</p>

                              <div className="flex items-center gap-2 mb-2">
                                 <div className="flex-1 h-1.5 bg-white/50 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full bg-black/80" style={{ width: style.progress }}></div>
                                 </div>
                                 <span className="text-[10px] font-bold text-gray-600">{style.progress}</span>
                              </div>

                              <div className="flex items-center justify-between">
                                 <div className="flex -space-x-2">
                                    <img src={student.avatarUrl || 'https://via.placeholder.com/30'} className="w-6 h-6 rounded-full border-2 border-white" alt="" />
                                    {faculty && <img src={faculty.avatar_url || 'https://via.placeholder.com/30'} className="w-6 h-6 rounded-full border-2 border-white" alt="" />}
                                 </div>
                                 <span className="text-[10px] font-bold bg-white/50 px-2 py-1 rounded-lg text-gray-600">{course.credits} Credits</span>
                              </div>
                           </div>
                        </div>
                     )
                  })}
               </div>

               {/* 3. Bottom Section: Calendar & Inbox */}
               <div className="flex flex-col md:flex-row gap-6 flex-1">

                  {/* Calendar Widget */}
                  <div className="bg-white p-6 rounded-[2rem] shadow-sm flex-1">
                     <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full">
                           <Calendar size={14} className="text-gray-400" />
                           <span className="text-xs font-bold text-gray-500">Calendar</span>
                        </div>
                        <button className="text-gray-400"><MoreVertical size={16} /></button>
                     </div>

                     <div className="flex items-center justify-between mb-6 px-4">
                        <button className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-black hover:text-white transition-colors">←</button>
                        <span className="font-bold text-lg">{new Date().toLocaleString('default', { month: 'long' })}</span>
                        <button className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-black hover:text-white transition-colors">→</button>
                     </div>

                     <div className="grid grid-cols-7 gap-y-4 gap-x-1 text-center">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i} className="text-[10px] font-bold text-gray-300">{d}</span>)}
                        {Array.from({ length: 28 }).map((_, i) => {
                           const day = i + 1;
                           const isSelected = day === 5;
                           const isDark = [8, 12, 17, 20, 25].includes(day);
                           const isGrey = [1, 2, 3, 4, 6, 7, 9, 10, 11, 13, 14, 15, 16, 18, 19, 21].includes(day);

                           let bgClass = 'bg-gray-100 text-gray-400';
                           if (isSelected) bgClass = 'bg-[#FF7575] text-white shadow-md shadow-red-200';
                           else if (isDark) bgClass = 'bg-[#565656] text-white';
                           else if (isGrey) bgClass = 'bg-[#E0E0E0] text-gray-500';

                           return (
                              <div key={i} className={`h-8 w-8 mx-auto flex items-center justify-center rounded-lg text-xs font-bold ${bgClass}`}>
                                 {day}
                              </div>
                           )
                        })}
                     </div>
                  </div>

                  {/* Inbox Widget */}
                  <div className="bg-white p-6 rounded-[2rem] shadow-sm flex-1">
                     <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full">
                           <MessageSquare size={14} className="text-gray-400" />
                           <span className="text-xs font-bold text-gray-500">Inbox</span>
                        </div>
                        <button className="text-gray-400"><MoreHorizontal size={16} /></button>
                     </div>

                     <div className="space-y-4">
                        {messages.map((msg) => (
                           <div key={msg.id} className={`flex gap-4 p-3 rounded-2xl cursor-pointer shadow-sm ${msg.active ? 'bg-black text-white shadow-lg transform scale-105' : 'bg-gray-50 hover:bg-[#F4F4F5]'}`}>
                              <div className={`w-10 h-10 rounded-full shrink-0 p-0.5 border-2 ${msg.active ? 'border-gray-600' : 'border-white'}`}>
                                 <div className="w-full h-full rounded-full bg-gray-300 flex items-center justify-center text-[10px] text-black font-bold">
                                    {msg.name[0]}
                                 </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                 <div className="flex justify-between items-center mb-0.5">
                                    <h4 className={`font-bold text-sm ${msg.active ? 'text-white' : 'text-gray-900'}`}>{msg.name}</h4>
                                    <span className={`text-[10px] ${msg.active ? 'text-gray-400' : 'text-gray-400'}`}>{msg.icon}</span>
                                 </div>
                                 <p className={`text-[10px] leading-tight truncate ${msg.active ? 'text-gray-300' : 'text-gray-500'}`}>{msg.msg}</p>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>

            </div>
         </div>
      </div>
   )
}

export default StudentProfile;