
import React, { useState, useEffect } from 'react';
import {
   BookOpen, User, Clock, MoreVertical, Search, Filter,
   LayoutGrid, LayoutList, ChevronDown, CheckCircle, AlertCircle,
   FileText, Download, Award, ChevronRight, Bell, LogOut
} from '../../components/Icons';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { Course } from '../../types';
import StudentCourseDetails from './StudentCourseDetails';

const StudentCourses = () => {
   const { session } = useAuth();
   const [availableSemesters, setAvailableSemesters] = useState<string[]>([]);
   const [selectedSemester, setSelectedSemester] = useState<string>('');
   const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
   const [searchQuery, setSearchQuery] = useState('');
   const [courses, setCourses] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
   const [selectedCourse, setSelectedCourse] = useState<any | null>(null);



   // 1. Fetch available semesters first (or just fetch all enrollments and derived semesters)
   useEffect(() => {
      const fetchEnrollments = async () => {
         if (!session?.user?.id) return;
         setLoading(true);

         try {
            // Fetch ALL enrollments for this student
            const { data, error } = await supabase
               .from('enrollments')
               .select(`
                  id,
                  semester,
                  course:courses (
                     id, code, name, credits, department,
                     faculty:profiles (id, full_name, avatar_url)
                  )
               `)
               .eq('student_id', session.user.id);

            if (error) {
               console.error('Error fetching enrollments:', error);
            } else if (data) {
               // Extract unique semesters
               const semesters = Array.from(new Set(data.map((e: any) => e.semester))).sort();
               setAvailableSemesters(semesters);

               // Set default semester if none selected
               if (!selectedSemester && semesters.length > 0) {
                  // Prefer 'Fall 2024' or the last one? Let's pick the last one as it likely implies most recent
                  setSelectedSemester(semesters[semesters.length - 1]);
               }

               // Process courses
               const formattedCourses = await Promise.all(data.map(async (enrollment: any) => {
                  // Fetch grade
                  const { data: gradeData } = await supabase
                     .from('grades')
                     .select('*')
                     .eq('enrollment_id', enrollment.id)
                     .maybeSingle();

                  // Mock stats
                  const attendance = Math.floor(Math.random() * (100 - 75) + 75);
                  const progress = Math.floor(Math.random() * (100 - 30) + 30);
                  const type = 'Core';
                  const hasNotification = Math.random() > 0.8;

                  return {
                     ...enrollment.course,
                     enrollmentId: enrollment.id,
                     semester: enrollment.semester, // Keep track of semester
                     faculty: {
                        name: enrollment.course.faculty?.full_name || 'TBA',
                        avatarUrl: enrollment.course.faculty?.avatar_url,
                        id: enrollment.course.faculty?.id
                     },
                     grade: gradeData,
                     stats: {
                        attendance,
                        progress,
                        type,
                        hasNotification
                     }
                  };
               }));

               // Store ALL courses, filtering will happen in render or derived state?
               // Actually better to store all and filter locally since dataset is small
               setCourses(formattedCourses);
            }
         } catch (err) {
            console.error(err);
         } finally {
            setLoading(false);
         }
      };

      fetchEnrollments();
   }, [session?.user?.id]); // Only re-fetch if user changes, not selectedSemester

   if (selectedCourse) {
      return <StudentCourseDetails course={selectedCourse} onBack={() => setSelectedCourse(null)} />;
   }

   const handleUnenroll = async (enrollmentId: string, courseName: string, e: React.MouseEvent) => {
      e.stopPropagation(); // prevent card click
      if (!window.confirm(`Are you sure you want to unenroll from "${courseName}"?`)) {
         return;
      }

      try {
         const { error } = await supabase
            .from('enrollments')
            .delete()
            .eq('id', enrollmentId);

         if (error) throw error;

         // Optimistic update
         setCourses(prev => prev.filter(c => c.enrollmentId !== enrollmentId));
         alert('Successfully unenrolled from ' + courseName);
      } catch (err: any) {
         console.error('Error unenrolling:', err);
         alert('Failed to unenroll: ' + err.message);
      }
   };

   // Filter courses based on selectedSemester and searchQuery
   const filteredCourses = courses.filter(c => {
      const matchesSemester = selectedSemester ? c.semester === selectedSemester : true;
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSemester && matchesSearch;
   });

   return (
      <div className="h-full bg-[#F4F4F5] p-4 lg:p-8 overflow-y-auto rounded-t-[2rem] rounded-b-none md:rounded-b-[2rem] font-sans pb-32">

         {/* Header Section */}
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
               <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">My Courses</h1>
               <p className="text-gray-500 font-medium text-sm lg:text-base">Manage your academic journey and resources.</p>
            </div>

            <div className="flex flex-col sm:flex-row w-full sm:w-auto items-stretch sm:items-center gap-3 bg-white p-1.5 rounded-2xl sm:rounded-full shadow-sm border border-gray-100">
               <div className="flex items-center px-4 gap-2 border-b sm:border-b-0 sm:border-r border-gray-100 py-2 sm:py-0">
                  <Search size={18} className="text-gray-400 shrink-0" />
                  <input
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     placeholder="Search courses..."
                     className="bg-transparent outline-none text-sm font-medium w-full sm:w-48"
                  />
               </div>
               <div className="flex justify-end gap-1 p-1">
                  <button
                     onClick={() => setViewMode('grid')}
                     className={`p-2 rounded-full transition-all ${viewMode === 'grid' ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
                  >
                     <LayoutGrid size={18} />
                  </button>
                  <button
                     onClick={() => setViewMode('list')}
                     className={`p-2 rounded-full transition-all ${viewMode === 'list' ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
                  >
                     <LayoutList size={18} />
                  </button>
               </div>
            </div>
         </div>

         {/* Semester Filter */}
         <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-4 no-scrollbar">
            {availableSemesters.length > 0 ? availableSemesters.map(sem => (
               <button
                  key={sem}
                  onClick={() => setSelectedSemester(sem)}
                  className={`px-5 py-2.5 rounded-full font-bold text-sm whitespace-nowrap transition-all flex items-center gap-2 ${selectedSemester === sem
                     ? 'bg-black text-white shadow-lg scale-105'
                     : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-100'
                     }`}
               >
                  {sem === selectedSemester && <CheckCircle size={14} className="text-green-400" />}
                  {sem}
               </button>
            )) : (
               <div className="text-gray-400 text-sm font-medium italic pl-1">No enrolled semesters found.</div>
            )}
         </div>

         {/* CONTENT AREA */}
         {filteredCourses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
               <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <BookOpen size={32} />
               </div>
               <p className="font-bold text-lg text-gray-900">No courses found</p>
               <p className="font-medium text-center px-4">You don't have any enrollments for {selectedSemester || 'this semester'}.</p>
               <p className="text-xs mt-2 text-gray-400">Try joining a class!</p>
            </div>
         ) : (
            <>
               {viewMode === 'grid' ? (
                  /* GRID VIEW (CARDS) */
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                     {filteredCourses.map((course: any) => (
                        <div key={course.id} className="bg-white p-6 rounded-[2rem] shadow-sm hover:shadow-lg transition-all group relative overflow-hidden border border-gray-100">
                           {/* Top Badge */}
                           <div className="flex justify-between items-start mb-4">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${course.stats.type === 'Core' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                                 }`}>
                                 {course.stats.type}
                              </span>
                              <button className="text-gray-300 hover:text-black transition-colors"><MoreVertical size={20} /></button>
                           </div>

                           {/* Course Info */}
                           <div className="mb-6">
                              <div className="flex items-center gap-2 mb-2">
                                 <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded">{course.code}</span>
                                 {course.stats.hasNotification && (
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full animate-pulse">
                                       <Bell size={10} /> Update
                                    </span>
                                 )}
                              </div>
                              <h3 className="text-xl font-black text-gray-900 leading-tight mb-2 h-14 line-clamp-2">{course.name}</h3>
                              <div className="flex items-center gap-3">
                                 <img src={course.faculty?.avatarUrl} className="w-8 h-8 rounded-full border-2 border-white shadow-sm" alt="" />
                                 <div>
                                    <p className="text-xs font-bold text-gray-900">{course.faculty?.name || 'Unknown Faculty'}</p>
                                    <p className="text-[10px] text-gray-500">Instructor</p>
                                 </div>
                              </div>
                           </div>

                           {/* Stats Row */}
                           <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded-2xl">
                              <div>
                                 <div className="flex justify-between items-end mb-1">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Attend.</span>
                                    <span className={`text-xs font-bold ${course.stats.attendance < 75 ? 'text-red-500' : 'text-green-600'}`}>{course.stats.attendance}%</span>
                                 </div>
                                 <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${course.stats.attendance < 75 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${course.stats.attendance}%` }}></div>
                                 </div>
                              </div>
                              <div>
                                 <div className="flex justify-between items-end mb-1">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Compl.</span>
                                    <span className="text-xs font-bold text-blue-600">{course.stats.progress}%</span>
                                 </div>
                                 <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${course.stats.progress}%` }}></div>
                                 </div>
                              </div>
                           </div>

                           {/* Footer Actions */}
                           <div className="flex items-center gap-2">
                              <button
                                 onClick={() => setSelectedCourse(course)}
                                 className="flex-1 bg-black text-white py-3 rounded-xl text-xs font-bold hover:bg-gray-800 transition-colors"
                              >
                                 View Details
                              </button>
                              <button className="w-10 h-10 flex items-center justify-center border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50" title="Syllabus">
                                 <FileText size={16} />
                              </button>
                              <button
                                 onClick={() => setSelectedCourse(course)}
                                 className="w-10 h-10 flex items-center justify-center border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50" title="Resources"
                              >
                                 <Download size={16} />
                              </button>
                              <button
                                 onClick={(e) => handleUnenroll(course.enrollmentId, course.name, e)}
                                 className="w-10 h-10 flex items-center justify-center border border-gray-200 rounded-xl text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors" title="Unenroll"
                              >
                                 <LogOut size={16} />
                              </button>
                           </div>
                        </div>
                     ))}
                  </div>
               ) : (
                  /* LIST VIEW (TABLE) */
                  <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                     <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                           <thead>
                              <tr className="bg-gray-50 border-b border-gray-100">
                                 <th className="p-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Course</th>
                                 <th className="p-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Faculty</th>
                                 <th className="p-5 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Type</th>
                                 <th className="p-5 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Credits</th>
                                 <th className="p-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Attendance</th>
                                 <th className="p-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Performance</th>
                                 <th className="p-5 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-50">
                              {filteredCourses.map((course: any) => (
                                 <tr key={course.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="p-5">
                                       <div>
                                          <p className="font-bold text-gray-900">{course.name}</p>
                                          <p className="text-xs font-mono text-gray-500 mt-0.5">{course.code}</p>
                                       </div>
                                    </td>
                                    <td className="p-5">
                                       <div className="flex items-center gap-3">
                                          <img src={course.faculty?.avatarUrl} className="w-8 h-8 rounded-full object-cover" alt="" />
                                          <span className="text-sm font-medium text-gray-700 whitespace-nowrap">{course.faculty?.name || 'TBA'}</span>
                                       </div>
                                    </td>
                                    <td className="p-5 text-center">
                                       <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${course.stats.type === 'Core' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                                          }`}>
                                          {course.stats.type}
                                       </span>
                                    </td>
                                    <td className="p-5 text-center font-medium text-gray-600">{course.credits}</td>
                                    <td className="p-5">
                                       <div className="flex items-center gap-3 min-w-[120px]">
                                          <div className="flex-1 w-24 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                             <div
                                                className={`h-full rounded-full ${course.stats.attendance < 75 ? 'bg-red-500' : 'bg-green-500'}`}
                                                style={{ width: `${course.stats.attendance}%` }}
                                             ></div>
                                          </div>
                                          <span className="text-xs font-bold text-gray-600">{course.stats.attendance}%</span>
                                       </div>
                                    </td>
                                    <td className="p-5">
                                       {course.grade ? (
                                          <div className="flex flex-col gap-1 min-w-[100px]">
                                             <div className="flex justify-between text-[10px] font-bold text-gray-500">
                                                <span>Int: {course.grade.internalMarks}</span>
                                                <span>Ext: {course.grade.externalMarks}</span>
                                             </div>
                                             <div className="flex items-center gap-2">
                                                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                                   <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${course.grade.total}%` }}></div>
                                                </div>
                                                <span className="text-xs font-bold text-yellow-700">{course.grade.grade}</span>
                                             </div>
                                          </div>
                                       ) : (
                                          <span className="text-xs text-gray-400 italic">Not Graded</span>
                                       )}
                                    </td>
                                    <td className="p-5 text-right">
                                       <button
                                          onClick={() => setSelectedCourse(course)}
                                          className="text-gray-400 hover:text-black font-bold text-xs flex items-center gap-1 justify-end ml-auto"
                                       >
                                          Details <ChevronRight size={14} />
                                       </button>
                                       <button
                                          onClick={(e) => handleUnenroll(course.enrollmentId, course.name, e)}
                                          className="text-red-400 hover:text-red-600 font-bold text-xs flex items-center gap-1 justify-end ml-4"
                                          title="Unenroll"
                                       >
                                          <LogOut size={14} />
                                       </button>
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  </div>
               )}
            </>
         )}
      </div>
   )
}

export default StudentCourses;
