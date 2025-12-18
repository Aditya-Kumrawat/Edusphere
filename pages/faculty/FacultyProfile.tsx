
import React, { useState, useEffect, useRef } from 'react';
import {
   User, Mail, Phone, MapPin, BookOpen, Users,
   Edit, Save, Lock, Bell, Shield, LogOut, Camera
} from '../../components/Icons';
import { supabase } from '../../services/mongoAdapter';
import { useAuth } from '../../context/AuthContext';
const FacultyProfile = () => {
   const { user, signOut } = useAuth();
   const fileInputRef = useRef<HTMLInputElement>(null);


   const [isEditing, setIsEditing] = useState(false);
   const [loading, setLoading] = useState(true);
   const [uploadingAvatar, setUploadingAvatar] = useState(false);

   // Profile State
   const [profile, setProfile] = useState<any>(null);
   const [stats, setStats] = useState({ courses: 0, students: 0 });

   // Form State
   const [formData, setFormData] = useState({
      full_name: '',
      email: '',
      department: '',
      specialization: ''
   });

   useEffect(() => {
      if (user) {
         fetchProfileData();
      }
   }, [user]);

   const fetchProfileData = async () => {
      try {
         setLoading(true);

         // Run all queries in parallel for faster loading
         const [profileResult, courseCountResult, coursesResult] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', user?.id).single(),
            supabase.from('courses').select('id', { count: 'exact', head: true }).eq('faculty_id', user?.id),
            supabase.from('courses').select('id').eq('faculty_id', user?.id)
         ]);

         // Handle profile
         if (profileResult.data) {
            setProfile(profileResult.data);
            setFormData({
               full_name: profileResult.data.full_name || '',
               email: profileResult.data.email || '',
               department: profileResult.data.department || '',
               specialization: profileResult.data.specialization || ''
            });
         }

         // Handle stats
         const courseIds = coursesResult.data?.map(c => c.id) || [];
         let studentCount = 0;

         if (courseIds.length > 0) {
            const { count } = await supabase
               .from('enrollments')
               .select('id', { count: 'exact', head: true })
               .in('course_id', courseIds);
            studentCount = count || 0;
         }

         setStats({
            courses: courseCountResult.count || 0,
            students: studentCount
         });

      } catch (err) {
         console.error("Error fetching profile data:", err);
      } finally {
         setLoading(false);
      }
   };

   const handleSave = async () => {
      try {
         const { error } = await supabase
            .from('profiles')
            .update({
               full_name: formData.full_name,
               department: formData.department,
               specialization: formData.specialization
            })
            .eq('id', user?.id);

         if (error) throw error;

         alert('Profile updated successfully!');
         setIsEditing(false);
         fetchProfileData(); // Refresh

      } catch (err) {
         console.error("Error updating profile:", err);
         alert('Failed to update profile.');
      }
   };

   const handleSignOut = async () => {
      await signOut();
   };

   const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !user) return;

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
         const fileName = `${user._id}/avatar.${fileExt}`;

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
            .eq('id', user._id);

         if (updateError) throw updateError;

         // Update local state
         setProfile((prev: any) => ({ ...prev, avatar_url: avatarUrl }));
         alert('Avatar updated successfully!');
      } catch (err: any) {
         console.error('Error uploading avatar:', err);
         alert('Failed to upload avatar: ' + (err.message || 'Unknown error'));
      } finally {
         setUploadingAvatar(false);
      }
   };

   if (loading) return <div className="p-8 text-center text-gray-400">Loading profile...</div>;

   return (
      <div className="h-full bg-[#F4F4F5] p-6 lg:p-8 overflow-y-auto rounded-b-[2rem] font-sans">

         <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
               <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">My Profile</h1>
               <p className="text-gray-500 font-medium">Manage your personal information and account settings.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

               {/* LEFT: Identity Card */}
               <div className="lg:col-span-1">
                  <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col items-center text-center sticky top-6">
                     <div className="relative mb-6">
                        <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-br from-blue-400 to-purple-400">
                           <img
                              src={profile?.avatar_url || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200"}
                              className="w-full h-full rounded-full object-cover border-4 border-white"
                              alt="profile"
                           />
                           {uploadingAvatar && (
                              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                                 <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
                           className="absolute bottom-0 right-0 p-2 bg-black text-white rounded-full hover:scale-110 transition-transform shadow-lg disabled:opacity-50"
                        >
                           <Camera size={16} />
                        </button>
                     </div>

                     <h2 className="text-2xl font-black text-gray-900">{profile?.full_name || 'Faculty Member'}</h2>
                     <p className="text-blue-600 font-bold text-sm bg-blue-50 px-3 py-1 rounded-full mt-2 mb-1">
                        {profile?.specialization || 'General Faculty'}
                     </p>
                     <p className="text-gray-500 text-sm font-medium">{profile?.department || 'Unknown'} Department</p>

                     <div className="grid grid-cols-2 gap-4 w-full mt-8 pt-8 border-t border-gray-100">
                        <div>
                           <p className="text-2xl font-black text-gray-900">{stats.courses}</p>
                           <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Courses</p>
                        </div>
                        <div>
                           <p className="text-2xl font-black text-gray-900">{stats.students}</p>
                           <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Students</p>
                        </div>
                     </div>
                  </div>
               </div>

               {/* RIGHT: Details & Settings */}
               <div className="lg:col-span-2 space-y-8">

                  {/* Personal Information */}
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 relative">
                     <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                           <User size={20} className="text-gray-400" /> Personal Details
                        </h3>
                        <button
                           onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                           className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${isEditing
                              ? 'bg-green-600 text-white shadow-lg scale-105'
                              : 'bg-gray-50 text-gray-600 hover:bg-black hover:text-white'
                              }`}
                        >
                           {isEditing ? <><Save size={14} /> Save Changes</> : <><Edit size={14} /> Edit Profile</>}
                        </button>
                     </div>

                     <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div>
                              <label className="text-xs font-bold text-gray-400 uppercase ml-2 mb-1 block">Full Name</label>
                              <input
                                 disabled={!isEditing}
                                 value={formData.full_name}
                                 onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                 className={`w-full px-4 py-3 rounded-xl font-bold text-gray-900 outline-none transition-all ${isEditing ? 'bg-white border-2 border-gray-200 focus:border-black' : 'bg-gray-50 border border-transparent cursor-not-allowed'
                                    }`}
                              />
                           </div>
                           <div>
                              <label className="text-xs font-bold text-gray-400 uppercase ml-2 mb-1 block">Role</label>
                              <input
                                 disabled
                                 value={profile?.role || 'FACULTY'}
                                 className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-3 font-bold text-gray-500 cursor-not-allowed"
                              />
                           </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div>
                              <label className="text-xs font-bold text-gray-400 uppercase ml-2 mb-1 block">Email Address</label>
                              <div className="relative">
                                 <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                 <input
                                    disabled // Email usually can't be changed easily
                                    value={formData.email}
                                    className="w-full pl-12 pr-4 py-3 rounded-xl font-bold text-gray-500 bg-gray-50 border border-transparent cursor-not-allowed"
                                 />
                              </div>
                           </div>
                           <div>
                              <label className="text-xs font-bold text-gray-400 uppercase ml-2 mb-1 block">Department</label>
                              <div className="relative">
                                 <BookOpen size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                 <input
                                    disabled={!isEditing}
                                    value={formData.department}
                                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                    className={`w-full pl-12 pr-4 py-3 rounded-xl font-bold text-gray-900 outline-none transition-all ${isEditing ? 'bg-white border-2 border-gray-200 focus:border-black' : 'bg-gray-50 border border-transparent'
                                       }`}
                                 />
                              </div>
                           </div>
                        </div>

                        <div>
                           <label className="text-xs font-bold text-gray-400 uppercase ml-2 mb-1 block">Specialization</label>
                           <input
                              disabled={!isEditing}
                              value={formData.specialization}
                              onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                              className={`w-full px-4 py-3 rounded-xl font-bold text-gray-900 outline-none transition-all ${isEditing ? 'bg-white border-2 border-gray-200 focus:border-black' : 'bg-gray-50 border border-transparent'
                                 }`}
                           />
                        </div>
                     </div>
                  </div>

                  {/* Account Settings */}
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                     <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-6">
                        <Shield size={20} className="text-gray-400" /> Account Settings
                     </h3>

                     <div className="space-y-4">
                        <button className="w-full flex justify-between items-center p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors group">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-400 shadow-sm group-hover:text-black">
                                 <Lock size={18} />
                              </div>
                              <div className="text-left">
                                 <p className="font-bold text-gray-900">Change Password</p>
                                 <p className="text-xs text-gray-500">Last changed 3 months ago</p>
                              </div>
                           </div>
                           <div className="px-4 py-2 bg-white text-gray-600 rounded-xl text-xs font-bold shadow-sm group-hover:bg-black group-hover:text-white transition-colors">
                              Update
                           </div>
                        </button>

                        <div className="pt-4 mt-4 border-t border-gray-100">
                           <button
                              onClick={handleSignOut}
                              className="w-full py-4 rounded-2xl border-2 border-red-50 text-red-500 font-bold hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                           >
                              <LogOut size={18} /> Sign Out
                           </button>
                        </div>
                     </div>
                  </div>

               </div>
            </div>
         </div>
      </div>
   )
}

export default FacultyProfile;
