
import React, { useState, useMemo, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
   Users,
   BookOpen,
   Award,
   LogOut,
   ChevronDown,
   LayoutDashboard,
   ClipboardCheck,
   FileBarChart,
   User,
   UserCheck,
   CalendarDays,
   PlusCircle,
   Megaphone,
   LayoutGrid,
   ClipboardList
} from './components/Icons';
import { UserRole } from './types';
// import { MOCK_STUDENTS, MOCK_COURSES, MOCK_FACULTY } from './data/mockData'; // Removed mock data
import { supabase } from './services/supabaseClient';

// Animated wrapper
import { PageTransition } from './components/AnimatedComponents';

// Pages
import LoginScreen from './pages/LoginScreen';
import LandingPage from './pages/LandingPage';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentResultsPage from './pages/student/StudentResultsPage';
import StudentProfile from './pages/student/StudentProfile';
import StudentCourses from './pages/student/StudentCourses';
import StudentAttendance from './pages/student/StudentAttendance';
import StudentScanAttendance from './pages/student/StudentScanAttendance';
import JoinClassroom from './pages/student/JoinClassroom';
import TestArena from './pages/student/TestArena';
import StudentManager from './pages/admin/StudentManager';
import CourseManager from './pages/admin/CourseManager';
import FacultyManager from './pages/admin/FacultyManager';
import GradingSystem from './pages/faculty/GradingSystem';
import FacultyDashboard from './pages/faculty/FacultyDashboard';
import FacultyCourses from './pages/faculty/FacultyCourses';
import FacultyStudentList from './pages/faculty/FacultyStudentList';
import FacultyAttendanceReport from './pages/faculty/FacultyAttendanceReport';
import FacultyAttendanceManager from './pages/faculty/FacultyAttendanceManager';
import FacultyMarksEntry from './pages/faculty/FacultyMarksEntry';
import FacultyGradebook from './pages/faculty/FacultyGradebook';
import FacultyAnnouncements from './pages/faculty/FacultyAnnouncements';
import FacultyAssignments from './pages/faculty/FacultyAssignments';
import FacultyClassroomPosts from './pages/faculty/FacultyClassroomPosts';
import FacultyResources from './pages/faculty/FacultyResources';
import FacultyProfile from './pages/faculty/FacultyProfile';
import FacultyCalendar from './pages/faculty/FacultyCalendar';
import TestManagement from './pages/faculty/TestManagement';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminReports from './pages/admin/AdminReports';
import ManagementSection from './components/ManagementSection';
import { AuthProvider, useAuth } from './context/AuthContext';

interface DockButtonProps {
   icon: any;
   isActive: boolean;
   onClick: () => void;
   className?: string;
}

const DockButton: React.FC<DockButtonProps> = ({
   icon: Icon,
   isActive,
   onClick,
   className = "w-12 h-12"
}) => (
   <motion.button
      whileHover={{ scale: 1.1, y: -2 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`${className} shrink-0 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${isActive ? 'bg-white text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
   >
      <Icon size={20} />
   </motion.button>
);

// [NEW] Curved Bottom Navigation for Students
const CurvedBottomDock = ({ items, activeId, onSelect }: any) => {
   const CenterIcon = items[2].icon;

   return (
      <div className="fixed bottom-0 left-0 w-full h-24 z-[100] md:hidden pointer-events-none flex justify-center items-end pb-6">
         <div className="relative w-[320px] h-[70px] pointer-events-auto filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.1)]">
            {/* SVG Shape - White Bar with Notch */}
            <svg className="absolute top-0 left-0 w-full h-full text-white" viewBox="0 0 320 70" fill="currentColor">
               <path d="M0 0H118.1C123.4 0 128.3 3.1 130.8 8.1L134.6 15.7C140.9 28.3 154.5 35 160 35C165.5 35 179.1 28.3 185.4 15.7L189.2 8.1C191.7 3.1 196.6 0 201.9 0H320V70H0V0Z" />
            </svg>

            {/* Center Floating Action Button (Index 2) */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2">
               <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onSelect(items[2].id)}
                  className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl shadow-blue-500/30 transition-all ${activeId === items[2].id
                     ? 'bg-blue-600 text-white'
                     : 'bg-blue-500 text-white'
                     }`}
               >
                  <CenterIcon size={26} />
               </motion.button>
            </div>

            {/* Icons Container */}
            <div className="absolute top-0 left-0 w-full h-full flex justify-between px-5 pt-1">
               {/* Left Group (0, 1) */}
               <div className="flex gap-8 pl-3">
                  {items.slice(0, 2).map((item: any) => (
                     <button
                        key={item.id}
                        onClick={() => onSelect(item.id)}
                        className={`flex flex-col items-center justify-center pt-3 transition-colors ${activeId === item.id ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                           }`}
                     >
                        <item.icon size={24} strokeWidth={activeId === item.id ? 2.5 : 2} />
                        <div className={`w-1 h-1 rounded-full mt-1 ${activeId === item.id ? 'bg-blue-600' : 'bg-transparent'}`} />
                     </button>
                  ))}
               </div>

               {/* Right Group (3, 4) */}
               <div className="flex gap-8 pr-3">
                  {items.slice(3, 5).map((item: any) => (
                     <button
                        key={item.id}
                        onClick={() => onSelect(item.id)}
                        className={`flex flex-col items-center justify-center pt-3 transition-colors ${activeId === item.id ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                           }`}
                     >
                        <item.icon size={24} strokeWidth={activeId === item.id ? 2.5 : 2} />
                        <div className={`w-1 h-1 rounded-full mt-1 ${activeId === item.id ? 'bg-blue-600' : 'bg-transparent'}`} />
                     </button>
                  ))}
               </div>
            </div>
         </div>
      </div>
   )
}

// Inner App Component using Auth Context
const AppContent = () => {
   const { role, loading, signOut, session } = useAuth();
   const [view, setView] = useState<string>('dashboard');
   const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
   const [profile, setProfile] = useState<any>(null);

   useEffect(() => {
      const fetchProfile = async () => {
         if (session?.user) {
            const { data } = await supabase
               .from('profiles')
               .select('*')
               .eq('id', session.user.id)
               .single();
            setProfile(data);
         }
      };
      fetchProfile();
   }, [session]);

   // Listen for custom navigation events (from child components like StudentAttendance)
   useEffect(() => {
      const handleNavigate = (e: CustomEvent) => {
         setView(e.detail);
      };
      window.addEventListener('navigateTo', handleNavigate as EventListener);
      return () => window.removeEventListener('navigateTo', handleNavigate as EventListener);
   }, []);

   // Define Navigation Items based on Role
   const navItems = useMemo(() => {
      switch (role) {
         case UserRole.ADMIN:
            return [
               { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
               { id: 'students', label: 'Students', icon: Users },
               { id: 'courses', label: 'Courses', icon: BookOpen },
               { id: 'faculty', label: 'Faculty', icon: UserCheck },
               { id: 'reports', label: 'Reports', icon: FileBarChart },
               { id: 'grades', label: 'Results', icon: Award },
            ];
         case UserRole.FACULTY:
            return [
               { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
               { id: 'my-courses', label: 'My Classrooms', icon: BookOpen },
               { id: 'faculty-students', label: 'Students', icon: Users },
               { id: 'grades', label: 'Grading', icon: Award },
               { id: 'test-management', label: 'Test Results', icon: FileBarChart },
               { id: 'classroom-posts', label: 'Classroom Posts', icon: Megaphone },
               { id: 'faculty-profile', label: 'Profile', icon: User },
               { id: 'calendar', label: 'Calendar', icon: CalendarDays },
            ];
         case UserRole.STUDENT:
            // Expanded Student Navigation - REORDERED for Curved Dock (Main action in center)
            return [
               { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
               { id: 'courses', label: 'My Courses', icon: BookOpen },
               { id: 'join-class', label: 'Join Class', icon: PlusCircle }, // Center (Index 2)
               { id: 'test-arena', label: 'Test Arena', icon: Award },
               { id: 'attendance', label: 'Attendance', icon: CalendarDays },
               { id: 'results', label: 'Results', icon: FileBarChart },
            ];
         default:
            return [];
      }
   }, [role]);

   // [NEW] Define Mobile Navigation Items (Strictly 5 items for Curved Dock)
   const mobileNavItems = useMemo(() => {
      if (role === UserRole.STUDENT) {
         return [
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'courses', label: 'Courses', icon: BookOpen },
            { id: 'join-class', label: 'Join', icon: PlusCircle }, // Center
            { id: 'attendance', label: 'Attend.', icon: CalendarDays },
            { id: 'results', label: 'Results', icon: FileBarChart },
         ];
      } else if (role === UserRole.FACULTY) {
         return [
            { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
            { id: 'my-courses', label: 'Classes', icon: BookOpen },
            { id: 'assignments', label: 'Post', icon: ClipboardList }, // Center
            { id: 'calendar', label: 'Calendar', icon: CalendarDays },
            { id: 'faculty-more', label: 'More', icon: LayoutGrid }, // Triggers Menu
         ];
      } else if (role === UserRole.ADMIN) {
         return [
            { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
            { id: 'students', label: 'Students', icon: Users },
            { id: 'courses', label: 'Courses', icon: BookOpen }, // Center
            { id: 'faculty', label: 'Faculty', icon: UserCheck },
            { id: 'reports', label: 'Reports', icon: FileBarChart },
         ];
      }
      return [];
   }, [role]);

   if (loading) {
      return <div className="h-screen w-full flex items-center justify-center bg-gray-100">Loading...</div>;
   }

   if (!role) {
      return <LoginScreen />;
   }

   const handleProfileClick = () => {
      if (role === UserRole.STUDENT) {
         setView('profile');
      } else if (role === UserRole.FACULTY) {
         setView('faculty-profile');
      }
   };

   // Display helpers
   const displayAvatar = profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100';
   const displayName = profile?.full_name || session?.user?.email?.split('@')[0] || 'User';

   const renderContent = () => {
      // Student Logic
      if (role === UserRole.STUDENT) {
         if (view === 'dashboard') return <StudentDashboard />;
         if (view === 'courses') return <StudentCourses />;
         if (view === 'attendance') return <StudentAttendance />;
         if (view === 'scan-attendance') return <StudentScanAttendance />;
         if (view === 'join-class') return <JoinClassroom onSuccess={() => setView('courses')} />;
         if (view === 'results') return <StudentResultsPage />;
         if (view === 'profile') return <StudentProfile />;
         if (view === 'test-arena') return <TestArena />;

         return <div className="p-8"><h2 className="text-2xl font-bold">Coming Soon</h2></div>;
      }

      // Admin & Faculty Views
      switch (view) {
         case 'dashboard':
            if (role === UserRole.ADMIN) {
               return <AdminDashboard />;
            } else {
               // FACULTY DASHBOARD
               return <FacultyDashboard />;
            }
         case 'my-courses':
            return <FacultyCourses
               onViewStudents={(courseId) => { setSelectedCourseId(courseId); setView('faculty-students'); }}
               onViewReports={(courseId) => { setSelectedCourseId(courseId); setView('faculty-reports'); }}
               onMarkAttendance={(courseId) => { setSelectedCourseId(courseId); setView('faculty-attendance'); }}
               onEnterMarks={(courseId) => { setSelectedCourseId(courseId); setView('faculty-marks'); }}
               onViewGradebook={(courseId) => { setSelectedCourseId(courseId); setView('faculty-gradebook'); }}
               onViewResources={(courseId) => { setSelectedCourseId(courseId); setView('faculty-resources'); }}
            />;
         case 'faculty-students':
            const activeCourseId = selectedCourseId;

            return activeCourseId
               ? <FacultyStudentList courseId={activeCourseId} onBack={() => setView('my-courses')} />
               : <div className="p-8 flex flex-col items-center justify-center h-full text-gray-400">
                  <Users size={48} className="mb-4 opacity-50" />
                  <p className="text-xl font-bold text-gray-600">No Course Selected</p>
                  <p>Please select a course from "My Courses" to view students.</p>
                  <button onClick={() => setView('my-courses')} className="mt-4 px-6 py-2 bg-black text-white rounded-xl font-bold text-sm">
                     Go to My Courses
                  </button>
               </div>;
         case 'faculty-reports':
            return selectedCourseId
               ? <FacultyAttendanceReport courseId={selectedCourseId} onBack={() => setView('my-courses')} />
               : <div>Error: No course selected</div>;
         case 'faculty-attendance':
            return selectedCourseId
               ? <FacultyAttendanceManager courseId={selectedCourseId} onBack={() => setView('my-courses')} />
               : <div>Error: No course selected</div>;
         case 'faculty-marks':
            return selectedCourseId
               ? <FacultyMarksEntry courseId={selectedCourseId} onBack={() => setView('my-courses')} />
               : <div>Error: No course selected</div>;
         case 'faculty-gradebook':
            return selectedCourseId
               ? <FacultyGradebook courseId={selectedCourseId} onBack={() => setView('my-courses')} />
               : <div>Error: No course selected</div>;
         case 'faculty-resources':
            return selectedCourseId
               ? <FacultyResources courseId={selectedCourseId} onBack={() => setView('my-courses')} />
               : <div>Error: No course selected</div>;
         case 'classroom-posts':
            return <FacultyClassroomPosts />;
         case 'announcements':
            return <FacultyAnnouncements />;
         case 'assignments':
            return <FacultyAssignments />;
         case 'faculty-profile':
            return <FacultyProfile />;
         case 'calendar':
            return <FacultyCalendar />;
         case 'test-management':
            return <TestManagement />;
         case 'faculty-more':
            return (
               <div className="p-6 h-full overflow-y-auto pb-32">
                  <h1 className="text-3xl font-extrabold text-gray-900 mb-2">More Apps</h1>
                  <p className="text-gray-500 mb-8 font-medium">Access additional management tools.</p>

                  <div className="grid grid-cols-2 gap-4">
                     <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} onClick={() => setView('my-courses')} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><Users size={24} /></div>
                        <span className="font-bold text-gray-900">Students</span>
                     </motion.button>
                     <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} onClick={() => setView('grades')} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-yellow-50 text-yellow-600 flex items-center justify-center"><Award size={24} /></div>
                        <span className="font-bold text-gray-900">Grading</span>
                     </motion.button>
                     <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} onClick={() => setView('classroom-posts')} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center"><Megaphone size={24} /></div>
                        <span className="font-bold text-gray-900">Posts</span>
                     </motion.button>
                     <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} onClick={() => setView('faculty-profile')} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center"><User size={24} /></div>
                        <span className="font-bold text-gray-900">Profile</span>
                     </motion.button>
                  </div>
               </div>
            );
         case 'students': return <StudentManager />;
         case 'courses': return <CourseManager />;
         case 'faculty': return <FacultyManager />;
         case 'reports': return <AdminReports />;
         case 'grades': return <GradingSystem />;
         default: return <div className="p-8">Work in progress</div>;
      }
   };

   return (
      <>
         <div className="flex flex-col h-[100dvh] bg-black text-[#1D1D1D] font-sans overflow-hidden p-0 md:p-6 rounded-none md:rounded-[3rem] transition-all duration-500 ease-in-out">

            {/* Top Navigation Bar */}
            <motion.header
               initial={{ y: -50, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
               className="flex justify-between items-center px-4 py-3 sm:mb-4 text-white shrink-0 gap-4"
            >
               <div className="flex items-center gap-4 lg:gap-8 min-w-0 flex-1 overflow-hidden">
                  <div className="flex items-center gap-2 shrink-0">
                     <h1 className="text-xl sm:text-2xl font-black tracking-tight truncate">EduSphere</h1>
                     {role === UserRole.ADMIN && <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase backdrop-blur-md">Admin</span>}
                     {role === UserRole.FACULTY && <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase backdrop-blur-md">Faculty</span>}
                  </div>

                  <nav className="hidden md:flex items-center gap-2 bg-[#1D1D1D]/90 backdrop-blur-md rounded-full px-2 py-1.5 border border-gray-800/50 overflow-x-auto no-scrollbar max-w-full shadow-2xl">
                     {navItems.map((item) => {
                        const isActive = view === item.id;
                        const Icon = item.icon;
                        return (
                           <motion.button
                              key={item.id}
                              onClick={() => setView(item.id)}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className={`relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap z-10 ${isActive
                                 ? 'text-black'
                                 : 'text-gray-400 hover:text-white'
                                 }`}
                           >
                              {isActive && (
                                 <motion.div
                                    layoutId="nav-pill"
                                    className="absolute inset-0 bg-white rounded-full -z-10 shadow-md"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                 />
                              )}
                              <Icon size={16} />
                              {item.label}
                           </motion.button>
                        );
                     })}
                  </nav>
               </div>

               <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                  <motion.button
                     whileHover={{ scale: 1.1, backgroundColor: "#374151" }}
                     whileTap={{ scale: 0.9 }}
                     onClick={() => signOut()}
                     className="p-2 bg-gray-800 rounded-full transition-colors shrink-0"
                     title="Log Out"
                  >
                     <LogOut size={16} />
                  </motion.button>
                  <motion.button
                     whileHover={{ opacity: 0.8 }}
                     onClick={handleProfileClick}
                     className="flex items-center gap-2 sm:gap-3 pl-3 sm:pl-4 border-l border-gray-800 transition-opacity shrink-0 max-w-[200px]"
                     title="View Profile"
                  >
                     <img src={displayAvatar} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-gray-800 object-cover shrink-0" alt="profile" />
                     <div className="hidden sm:block text-right min-w-0">
                        <p className="text-sm font-bold leading-tight truncate">{displayName}</p>
                        <p className="text-[10px] text-gray-400 capitalize truncate">{role?.toLowerCase()}</p>
                     </div>
                     <ChevronDown size={14} className="text-gray-500 hidden sm:block shrink-0" />
                  </motion.button>
               </div>
            </motion.header>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden relative rounded-t-[2rem] rounded-b-none md:rounded-b-[2rem] bg-[#F4F4F5] shadow-inner">
               <AnimatePresence mode="wait">
                  <PageTransition key={view} className="overflow-hidden">
                     {renderContent()}
                  </PageTransition>
               </AnimatePresence>
            </div>
         </div>

         {/* Bottom Floating Dock (Mobile only) - Curved Dock for all roles */}
         {(role === UserRole.STUDENT || role === UserRole.FACULTY || role === UserRole.ADMIN) && (
            <CurvedBottomDock
               items={mobileNavItems}
               activeId={view}
               onSelect={setView}
            />
         )}

      </>
   );
}

export default function App() {
   return (
      <AuthProvider>
         <AppContent />
      </AuthProvider>
   );
}

