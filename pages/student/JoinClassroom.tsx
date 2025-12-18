import React, { useState, useEffect } from 'react';
import { Hash, PlusCircle, User, Clock, CheckSquare } from '../../components/Icons';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { Course } from '../../types';


interface JoinClassroomProps {
   onSuccess?: () => void;
}

const JoinClassroom: React.FC<JoinClassroomProps> = ({ onSuccess }) => {
   const { session } = useAuth();
   const user = session?.user;
   const [classCode, setClassCode] = useState('');
   const [availableCourses, setAvailableCourses] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
   const [showSuccessModal, setShowSuccessModal] = useState(false);
   const [joinedCourseName, setJoinedCourseName] = useState('');

   const [errorMsg, setErrorMsg] = useState('');

   useEffect(() => {
      fetchCourses();
   }, []);

   const fetchCourses = async () => {
      try {
         const { data, error } = await supabase
            .from('courses')
            .select(`
               *,
               faculty:profiles(full_name)
            `)
            .order('created_at', { ascending: false });

         if (error) throw error;
         setAvailableCourses(data || []);
      } catch (err) {
         console.error('Error fetching courses:', err);
      } finally {
         setLoading(false);
      }
   };

   const handleJoin = async (courseId?: string, joinCodeInput?: string) => {
      setErrorMsg(''); // Clear previous errors
      if (!user) {
         setErrorMsg('You must be logged in to join a class.');
         return;
      }

      const codeToUse = joinCodeInput || classCode;

      try {
         // 1. Validate Code First
         const { data: course, error: courseError } = await supabase
            .from('courses')
            .select('id, join_code, name')
            .eq(courseId ? 'id' : 'join_code', courseId ? courseId : codeToUse)
            .single();

         if (courseError || !course) {
            setErrorMsg('Invalid Class Code');
            return;
         }

         // If we passed an ID, we still might want to verify the code if the user typed it manually? 
         // For now, simpler logic: If using input box, verify matches.
         if (joinCodeInput && course.join_code !== joinCodeInput) {
            setErrorMsg("This code doesn't seem to match any class.");
            return;
         }

         // 2. Check if already enrolled
         const { data: existing } = await supabase
            .from('enrollments')
            .select('id')
            .eq('student_id', user.id)
            .eq('course_id', course.id)
            .maybeSingle();

         if (existing) {
            setErrorMsg('You are already enrolled in this class.');
            return;
         }

         // 3. Enroll
         const { data: inserted, error: enrollError } = await supabase
            .from('enrollments')
            .insert([
               {
                  student_id: user.id,
                  course_id: course.id,
                  semester: 'Fall 2024',
                  enrollment_date: new Date().toISOString()
               }
            ])
            .select()
            .single();

         if (enrollError) throw enrollError;
         if (!inserted) throw new Error('Enrollment failed - please try again (No data returned).');

         // Show Success Modal instead of Alert
         setJoinedCourseName(course.name);
         setShowSuccessModal(true);
         setClassCode('');

      } catch (err: any) {
         console.error('Error joining class:', err);
         setErrorMsg(err.message || 'Failed to join class.');
      }
   };

   return (
      <div className="h-full bg-[#F4F4F5] p-6 lg:p-8 overflow-y-auto rounded-t-[2rem] rounded-b-none md:rounded-b-[2rem] font-sans pb-32 relative">

         {/* Error Toast/Banner */}
         {errorMsg && (
            <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-6 py-3 rounded-xl z-50 flex items-center gap-3 shadow-lg max-w-md w-full mx-4">
               <div className="bg-red-500 text-white rounded-full p-1 shrink-0">!</div>
               <span className="font-bold flex-1">{errorMsg}</span>
               <button onClick={() => setErrorMsg('')} className="text-red-900 font-bold">&times;</button>
            </div>
         )}

         {/* Success Modal */}
         {showSuccessModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
               <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl text-center transform scale-100 transition-all">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                     <CheckSquare size={32} />
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 mb-2">Joined Successfully!</h2>
                  <p className="text-gray-500 font-medium mb-6">
                     You are now enrolled in <br />
                     <span className="text-black font-bold">{joinedCourseName}</span>
                  </p>
                  <div className="flex flex-col gap-3">
                     <button
                        onClick={() => {
                           setShowSuccessModal(false);
                           if (onSuccess) onSuccess();
                        }}
                        className="w-full py-3 rounded-xl bg-black text-white font-bold hover:scale-95 transition-transform"
                     >
                        Go to My Courses
                     </button>
                     <button
                        onClick={() => setShowSuccessModal(false)}
                        className="w-full py-3 rounded-xl bg-gray-100 text-gray-500 font-bold hover:bg-gray-200 transition-colors"
                     >
                        Join Another Class
                     </button>
                  </div>
               </div>
            </div>
         )}

         {/* Header */}
         <div className="mb-10 text-center max-w-2xl mx-auto pt-4 md:pt-0">
            <h1 className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tight mb-4">Join a Classroom</h1>
            <p className="text-gray-500 font-medium text-base lg:text-lg px-4">Enter the unique code provided by your instructor or browse available public classes below.</p>
         </div>

         {/* Code Input Section */}
         <div className="max-w-md mx-auto mb-16 relative px-4 md:px-0">
            <div className="absolute left-8 md:left-6 top-1/2 -translate-y-1/2 text-gray-400">
               <Hash size={24} />
            </div>
            <input
               value={classCode}
               onChange={(e) => setClassCode(e.target.value.toUpperCase())}
               placeholder="CLASS CODE"
               className="w-full h-20 pl-16 pr-6 bg-white rounded-[2rem] shadow-lg border-2 border-transparent focus:border-black text-xl md:text-2xl font-black tracking-widest placeholder:text-gray-300 outline-none uppercase text-center"
            />
            <button
               disabled={!classCode}
               onClick={() => handleJoin(undefined, classCode)}
               className="absolute right-6 md:right-3 top-3 bottom-3 bg-black text-white px-6 rounded-2xl font-bold hover:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all text-sm md:text-base"
            >
               Join
            </button>
         </div>

         {/* Available Classes */}
         <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-6 px-4 md:px-0">
               <h3 className="text-xl font-bold text-gray-900">Recommended for you</h3>
               <span className="bg-black text-white text-xs font-bold px-2 py-1 rounded-md">{availableCourses.length}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {availableCourses.map(course => (
                  <div key={course.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all group">
                     <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 font-bold text-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                           {course.code?.substring(0, 2) || '??'}
                        </div>
                        <span className="text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1 rounded-full">{course.code}</span>
                     </div>

                     <h4 className="font-bold text-xl text-gray-900 mb-2">{course.name}</h4>

                     <div className="space-y-2 mb-6">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                           <User size={14} />
                           <span className="font-medium">{course.faculty?.full_name || 'Unknown Faculty'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                           <Clock size={14} />
                           <span className="font-medium">{course.schedule || 'TBA'}</span>
                        </div>
                     </div>

                     <button
                        onClick={() => {
                           // Pre-fill input
                           setClassCode(course.join_code || '');
                        }}
                        className="w-full py-4 rounded-2xl bg-gray-900 text-white font-bold flex items-center justify-center gap-2 hover:bg-black group-hover:shadow-lg transition-all"
                     >
                        <PlusCircle size={18} /> Use Code
                     </button>
                  </div>
               ))}
            </div>
         </div>
      </div>
   )
}

export default JoinClassroom;
