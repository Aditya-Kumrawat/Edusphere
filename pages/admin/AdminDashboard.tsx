import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Users, BookOpen, UserCheck, TrendingUp, Calendar, Activity,
    AlertCircle, CheckCircle, Clock, BarChart2, PieChart, ArrowUp, ArrowDown,
    FileText, Bell
} from '../../components/Icons';
import { supabase } from '../../services/supabaseClient';

// Mock data for demonstration when database is empty
const MOCK_STATS = {
    totalStudents: 28,
    totalFaculty: 8,
    totalCourses: 5,
    totalEnrollments: 45,
    activeClasses: 5,
    todayAttendance: 22,
    totalAssignments: 12,
    pendingSubmissions: 3
};

const MOCK_TRENDS = {
    students: { value: 12, isUp: true },
    faculty: { value: 5, isUp: true },
    courses: { value: 8, isUp: true },
    enrollments: { value: 15, isUp: true }
};

const MOCK_RECENT_ACTIVITY = [
    { id: '1', action: 'Student joined', user: 'Rahul Sharma', time: new Date().toISOString(), type: 'user' },
    { id: '2', action: 'New course created', user: 'Dr. Priya Patel', time: new Date(Date.now() - 3600000).toISOString(), type: 'course' },
    { id: '3', action: 'Assignment submitted', user: 'Ankit Kumar', time: new Date(Date.now() - 7200000).toISOString(), type: 'assignment' },
    { id: '4', action: 'Faculty joined', user: 'Dr. Suresh Menon', time: new Date(Date.now() - 10800000).toISOString(), type: 'user' },
    { id: '5', action: 'Attendance marked', user: 'Prof. Kavita Reddy', time: new Date(Date.now() - 14400000).toISOString(), type: 'attendance' }
];

const MOCK_DEPARTMENT_BREAKDOWN = [
    { name: 'Computer Science', count: 12 },
    { name: 'Electronics & Communication', count: 8 },
    { name: 'Mechanical Engineering', count: 5 },
    { name: 'Information Technology', count: 3 }
];

const MOCK_ANNOUNCEMENTS = [
    {
        id: '1',
        title: 'Semester Exams Schedule Released',
        content: 'The final semester examination schedule has been released. Please check your respective department notice boards for detailed timetables.',
        created_at: new Date().toISOString(),
        course: { name: 'All Departments' }
    },
    {
        id: '2',
        title: 'Campus Placement Drive',
        content: 'Major tech companies will be visiting campus next week for placements. Eligible students are requested to register by this Friday.',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        course: { name: 'Career Services' }
    },
    {
        id: '3',
        title: 'Library Holiday Notice',
        content: 'The central library will remain closed on account of annual inventory from Dec 20-22. Digital resources will continue to be available.',
        created_at: new Date(Date.now() - 172800000).toISOString(),
        course: { name: 'Library Services' }
    }
];

const AdminDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalStudents: 0,
        totalFaculty: 0,
        totalCourses: 0,
        totalEnrollments: 0,
        activeClasses: 0,
        todayAttendance: 0,
        totalAssignments: 0,
        pendingSubmissions: 0
    });
    const [trends, setTrends] = useState({
        students: { value: 0, isUp: true },
        faculty: { value: 0, isUp: true },
        courses: { value: 0, isUp: true },
        enrollments: { value: 0, isUp: true }
    });
    const [recentActivity, setRecentActivity] = useState<any[]>([]);
    const [departmentBreakdown, setDepartmentBreakdown] = useState<any[]>([]);
    const [announcements, setAnnouncements] = useState<any[]>([]);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            // Get date ranges for trend calculation
            const now = new Date();
            const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
            const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

            // Fetch students count (total and this month)
            const { count: studentCount } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('role', 'STUDENT');

            const { count: newStudentsThisMonth } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('role', 'STUDENT')
                .gte('created_at', thisMonthStart);

            const { count: studentsLastMonth } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('role', 'STUDENT')
                .gte('created_at', lastMonthStart)
                .lt('created_at', lastMonthEnd);

            // Fetch faculty count
            const { count: facultyCount } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('role', 'FACULTY');

            const { count: newFacultyThisMonth } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('role', 'FACULTY')
                .gte('created_at', thisMonthStart);

            // Fetch courses count
            const { count: courseCount } = await supabase
                .from('courses')
                .select('*', { count: 'exact', head: true });

            const { count: newCoursesThisMonth } = await supabase
                .from('courses')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', thisMonthStart);

            // Fetch enrollments count
            const { count: enrollmentCount } = await supabase
                .from('enrollments')
                .select('*', { count: 'exact', head: true });

            const { count: newEnrollmentsThisMonth } = await supabase
                .from('enrollments')
                .select('*', { count: 'exact', head: true })
                .gte('enrolled_at', thisMonthStart);

            // Today's attendance
            const today = new Date().toISOString().split('T')[0];
            const { count: attendanceCount } = await supabase
                .from('attendance')
                .select('*', { count: 'exact', head: true })
                .eq('date', today)
                .eq('status', 'Present');

            // Fetch assignments count
            const { count: assignmentCount } = await supabase
                .from('assignments')
                .select('*', { count: 'exact', head: true });

            // Fetch pending submissions (assignments without submissions)
            const { count: submissionCount } = await supabase
                .from('assignment_submissions')
                .select('*', { count: 'exact', head: true });

            // Use mock data if all stats are zero (empty database)
            const hasRealData = (studentCount || 0) + (facultyCount || 0) + (courseCount || 0) > 0;

            if (hasRealData) {
                setStats({
                    totalStudents: studentCount || 0,
                    totalFaculty: facultyCount || 0,
                    totalCourses: courseCount || 0,
                    totalEnrollments: enrollmentCount || 0,
                    activeClasses: courseCount || 0,
                    todayAttendance: attendanceCount || 0,
                    totalAssignments: assignmentCount || 0,
                    pendingSubmissions: (assignmentCount || 0) - (submissionCount || 0)
                });

                // Calculate real trends
                const calcTrend = (thisMonth: number, lastMonth: number) => {
                    if (lastMonth === 0) return { value: thisMonth > 0 ? 100 : 0, isUp: true };
                    const change = Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
                    return { value: Math.abs(change), isUp: change >= 0 };
                };

                setTrends({
                    students: calcTrend(newStudentsThisMonth || 0, studentsLastMonth || 0),
                    faculty: calcTrend(newFacultyThisMonth || 0, 0),
                    courses: calcTrend(newCoursesThisMonth || 0, 0),
                    enrollments: calcTrend(newEnrollmentsThisMonth || 0, 0)
                });
            } else {
                // Use mock data for empty database
                setStats(MOCK_STATS);
                setTrends(MOCK_TRENDS);
            }

            // Fetch recent activity from activity_log or fallback to profiles
            const { data: activityLogs } = await supabase
                .from('activity_log')
                .select('*, user:profiles(full_name)')
                .order('created_at', { ascending: false })
                .limit(5);

            if (activityLogs && activityLogs.length > 0) {
                setRecentActivity(activityLogs.map(log => ({
                    id: log.id,
                    action: log.action,
                    user: log.user?.full_name || 'System',
                    time: log.created_at,
                    type: log.entity_type
                })));
            } else {
                // Fallback to recent profiles
                const { data: recentUsers } = await supabase
                    .from('profiles')
                    .select('id, full_name, email, role, created_at')
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (recentUsers && recentUsers.length > 0) {
                    setRecentActivity(recentUsers.map(u => ({
                        id: u.id,
                        action: `${u.role === 'STUDENT' ? 'Student' : u.role === 'FACULTY' ? 'Faculty' : 'User'} joined`,
                        user: u.full_name || u.email,
                        time: u.created_at,
                        type: 'user'
                    })));
                } else {
                    // Use mock data if no real activity exists
                    setRecentActivity(MOCK_RECENT_ACTIVITY);
                }
            }

            // Department breakdown
            const { data: students } = await supabase
                .from('profiles')
                .select('department')
                .eq('role', 'STUDENT');

            const deptCounts: Record<string, number> = {};
            (students || []).forEach((s: any) => {
                const dept = s.department || 'General';
                deptCounts[dept] = (deptCounts[dept] || 0) + 1;
            });

            // Use mock data if no departments found
            if (Object.keys(deptCounts).length > 0) {
                setDepartmentBreakdown(
                    Object.entries(deptCounts)
                        .map(([name, count]) => ({ name, count }))
                        .sort((a, b) => b.count - a.count)
                );
            } else {
                setDepartmentBreakdown(MOCK_DEPARTMENT_BREAKDOWN);
            }

            // Fetch recent announcements
            const { data: announcementData } = await supabase
                .from('announcements')
                .select('*, course:courses(name)')
                .order('created_at', { ascending: false })
                .limit(3);

            // Use mock data if no announcements found
            if (announcementData && announcementData.length > 0) {
                setAnnouncements(announcementData);
            } else {
                setAnnouncements(MOCK_ANNOUNCEMENTS);
            }

        } catch (err) {
            console.error('Error fetching dashboard data:', err);
        } finally {
            setLoading(false);
        }
    };

    // Navigation helper - dispatches custom event
    const navigateTo = (view: string) => {
        window.dispatchEvent(new CustomEvent('navigateTo', { detail: view }));
    };

    const statCards = [
        { title: 'Total Students', value: stats.totalStudents, icon: Users, color: 'blue', trend: trends.students },
        { title: 'Total Faculty', value: stats.totalFaculty, icon: UserCheck, color: 'purple', trend: trends.faculty },
        { title: 'Active Courses', value: stats.totalCourses, icon: BookOpen, color: 'green', trend: trends.courses },
        { title: 'Enrollments', value: stats.totalEnrollments, icon: TrendingUp, color: 'orange', trend: trends.enrollments },
    ];

    const colorMap: Record<string, string> = {
        blue: 'bg-blue-500',
        purple: 'bg-purple-500',
        green: 'bg-green-500',
        orange: 'bg-orange-500'
    };

    const bgColorMap: Record<string, string> = {
        blue: 'bg-blue-50',
        purple: 'bg-purple-50',
        green: 'bg-green-50',
        orange: 'bg-orange-50'
    };

    const iconColorMap: Record<string, string> = {
        blue: 'text-blue-500',
        purple: 'text-purple-500',
        green: 'text-green-500',
        orange: 'text-orange-500'
    };

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4">
                <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
                <p className="font-medium">Loading dashboard...</p>
            </div>
        );
    }

    return (
        <div className="h-full bg-[#F4F4F5] p-4 sm:p-6 lg:p-8 overflow-y-auto rounded-t-[2rem] rounded-b-none md:rounded-b-[2rem] font-sans pb-32">
            {/* Header */}
            <div className="mb-6 sm:mb-8">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">Admin Dashboard</h1>
                <p className="text-gray-500 font-medium text-sm sm:text-base">Welcome back! Here's your institution overview.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
                {statCards.map((stat, i) => (
                    <motion.div
                        key={stat.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-lg transition-shadow"
                    >
                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                            <div className={`w-10 h-10 sm:w-12 sm:h-12 ${bgColorMap[stat.color]} rounded-xl sm:rounded-2xl flex items-center justify-center`}>
                                <stat.icon size={20} className={iconColorMap[stat.color]} />
                            </div>
                            <span className={`flex items-center gap-1 text-[10px] sm:text-xs font-bold ${stat.trend.isUp ? 'text-green-500 bg-green-50' : 'text-red-500 bg-red-50'} px-2 py-1 rounded-full`}>
                                {stat.trend.isUp ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                                {stat.trend.value}%
                            </span>
                        </div>
                        <p className="text-2xl sm:text-3xl font-black text-gray-900">{stat.value}</p>
                        <p className="text-xs sm:text-sm font-medium text-gray-500">{stat.title}</p>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Quick Actions */}
                <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] shadow-sm border border-gray-100">
                    <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-4 sm:mb-6">Quick Actions</h3>
                    <div className="space-y-2 sm:space-y-3">
                        <button
                            onClick={() => navigateTo('students')}
                            className="w-full p-3 sm:p-4 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl sm:rounded-2xl font-bold text-left flex items-center gap-3 transition-colors text-sm sm:text-base"
                        >
                            <Users size={18} />
                            Manage Students
                        </button>
                        <button
                            onClick={() => navigateTo('faculty')}
                            className="w-full p-3 sm:p-4 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl sm:rounded-2xl font-bold text-left flex items-center gap-3 transition-colors text-sm sm:text-base"
                        >
                            <UserCheck size={18} />
                            Manage Faculty
                        </button>
                        <button
                            onClick={() => navigateTo('courses')}
                            className="w-full p-3 sm:p-4 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl sm:rounded-2xl font-bold text-left flex items-center gap-3 transition-colors text-sm sm:text-base"
                        >
                            <BookOpen size={18} />
                            Manage Courses
                        </button>
                        <button
                            onClick={() => navigateTo('reports')}
                            className="w-full p-3 sm:p-4 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-xl sm:rounded-2xl font-bold text-left flex items-center gap-3 transition-colors text-sm sm:text-base"
                        >
                            <BarChart2 size={18} />
                            View Reports
                        </button>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] shadow-sm border border-gray-100">
                    <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-4 sm:mb-6">Recent Activity</h3>
                    <div className="space-y-3 sm:space-y-4">
                        {recentActivity.length === 0 ? (
                            <div className="text-center py-8">
                                <Activity size={32} className="mx-auto text-gray-300 mb-2" />
                                <p className="text-gray-400">No recent activity</p>
                            </div>
                        ) : (
                            recentActivity.map((activity) => (
                                <div key={activity.id} className="flex items-center gap-3 sm:gap-4 p-2 sm:p-3 rounded-xl hover:bg-gray-50 transition-colors">
                                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 ${activity.type === 'user' ? 'bg-blue-100' :
                                        activity.type === 'course' ? 'bg-green-100' :
                                            activity.type === 'attendance' ? 'bg-purple-100' : 'bg-gray-100'
                                        }`}>
                                        {activity.type === 'user' ? <Users size={16} className="text-blue-500" /> :
                                            activity.type === 'course' ? <BookOpen size={16} className="text-green-500" /> :
                                                <Activity size={16} className="text-gray-500" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-gray-900 text-xs sm:text-sm truncate">{activity.user}</p>
                                        <p className="text-xs text-gray-500 truncate">{activity.action}</p>
                                    </div>
                                    <span className="text-[10px] sm:text-xs text-gray-400 shrink-0">
                                        {new Date(activity.time).toLocaleDateString()}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Department Distribution */}
                <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] shadow-sm border border-gray-100">
                    <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-4 sm:mb-6">Department Distribution</h3>
                    <div className="space-y-3 sm:space-y-4">
                        {departmentBreakdown.length === 0 ? (
                            <div className="text-center py-8">
                                <PieChart size={32} className="mx-auto text-gray-300 mb-2" />
                                <p className="text-gray-400">No data available</p>
                            </div>
                        ) : (
                            departmentBreakdown.slice(0, 5).map((dept, i) => {
                                const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500'];
                                const bgColors = ['bg-blue-100', 'bg-purple-100', 'bg-green-100', 'bg-orange-100', 'bg-pink-100'];
                                const maxCount = Math.max(...departmentBreakdown.map(d => d.count));
                                const percentage = (dept.count / maxCount) * 100;

                                return (
                                    <div key={dept.name}>
                                        <div className="flex justify-between items-center mb-1 sm:mb-2">
                                            <span className="font-medium text-gray-700 text-xs sm:text-sm truncate">{dept.name}</span>
                                            <span className="text-[10px] sm:text-xs font-bold text-gray-500">{dept.count} students</span>
                                        </div>
                                        <div className={`h-2 rounded-full ${bgColors[i % bgColors.length]} overflow-hidden`}>
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${percentage}%` }}
                                                transition={{ duration: 0.5, delay: i * 0.1 }}
                                                className={`h-full ${colors[i % colors.length]} rounded-full`}
                                            />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Section - Announcements & Today's Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-6 sm:mt-8">
                {/* Recent Announcements */}
                <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4 sm:mb-6">
                        <h3 className="font-bold text-base sm:text-lg text-gray-900">Recent Announcements</h3>
                        <Bell size={18} className="text-gray-400" />
                    </div>
                    {announcements.length === 0 ? (
                        <div className="text-center py-8">
                            <Bell size={32} className="mx-auto text-gray-300 mb-2" />
                            <p className="text-gray-400">No announcements</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {announcements.map((announcement) => (
                                <div key={announcement.id} className="p-3 bg-gray-50 rounded-xl">
                                    <p className="font-bold text-gray-900 text-sm">{announcement.title}</p>
                                    <p className="text-xs text-gray-500 line-clamp-2">{announcement.content}</p>
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-xs text-blue-600 font-medium">{announcement.course?.name}</span>
                                        <span className="text-[10px] text-gray-400">
                                            {new Date(announcement.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Today's Summary */}
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 sm:p-8 rounded-2xl sm:rounded-[2rem] text-white">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-6">
                        <div>
                            <h3 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">Today's Summary</h3>
                            <p className="text-white/70 text-sm sm:text-base">
                                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                        <div className="flex gap-6 sm:gap-8">
                            <div className="text-center">
                                <p className="text-3xl sm:text-4xl font-black">{stats.todayAttendance}</p>
                                <p className="text-xs sm:text-sm text-white/70">Present Today</p>
                            </div>
                            <div className="text-center">
                                <p className="text-3xl sm:text-4xl font-black">{stats.activeClasses}</p>
                                <p className="text-xs sm:text-sm text-white/70">Active Classes</p>
                            </div>
                            <div className="text-center">
                                <p className="text-3xl sm:text-4xl font-black">{stats.totalAssignments}</p>
                                <p className="text-xs sm:text-sm text-white/70">Assignments</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
