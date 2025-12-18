import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    BarChart2, PieChart, TrendingUp, Users, Calendar, Download,
    RefreshCcw, FileText, CheckCircle
} from '../../components/Icons';
import { supabase } from '../../services/supabaseClient';

// Mock data for demonstration when database is empty
const MOCK_ATTENDANCE_DATA = {
    overall: 85,
    totalRecords: 22,
    presentCount: 19,
    absentCount: 3,
    byDay: [
        { day: 'Sun', count: 0, present: 0, rate: 0 },
        { day: 'Mon', count: 5, present: 4, rate: 80 },
        { day: 'Tue', count: 4, present: 4, rate: 100 },
        { day: 'Wed', count: 5, present: 4, rate: 80 },
        { day: 'Thu', count: 4, present: 3, rate: 75 },
        { day: 'Fri', count: 4, present: 4, rate: 100 },
        { day: 'Sat', count: 0, present: 0, rate: 0 }
    ],
    byCourse: [
        { name: 'Data Structures & Algorithms', code: 'CS201', total: 6, present: 5, rate: 83 },
        { name: 'Introduction to Programming', code: 'CS101', total: 5, present: 5, rate: 100 },
        { name: 'Database Management Systems', code: 'CS301', total: 4, present: 3, rate: 75 },
        { name: 'Web Development', code: 'CS401', total: 4, present: 3, rate: 75 },
        { name: 'Machine Learning Fundamentals', code: 'CS501', total: 3, present: 3, rate: 100 }
    ]
};

const MOCK_GRADES_DATA = {
    distribution: [
        { grade: 'A', count: 8 },
        { grade: 'B', count: 12 },
        { grade: 'C', count: 6 },
        { grade: 'D', count: 3 },
        { grade: 'F', count: 1 }
    ],
    averageGrade: 3.12,
    totalGrades: 30,
    averageByClass: []
};

const MOCK_ENROLLMENT_DATA = {
    total: 28,
    byDepartment: [
        { name: 'Computer Science', count: 12 },
        { name: 'Electronics & Communication', count: 8 },
        { name: 'Mechanical Engineering', count: 5 },
        { name: 'Information Technology', count: 3 }
    ],
    byCourse: [
        { name: 'Introduction to Programming', code: 'CS101', count: 8 },
        { name: 'Data Structures & Algorithms', code: 'CS201', count: 6 },
        { name: 'Database Management Systems', code: 'CS301', count: 5 },
        { name: 'Web Development', code: 'CS401', count: 5 },
        { name: 'Machine Learning Fundamentals', code: 'CS501', count: 4 }
    ]
};

const AdminReports = () => {
    const [loading, setLoading] = useState(true);
    const [activeReport, setActiveReport] = useState<'attendance' | 'grades' | 'enrollment'>('attendance');
    const [dateRange, setDateRange] = useState('week');
    const [exporting, setExporting] = useState(false);

    const [attendanceData, setAttendanceData] = useState<any>({
        overall: 0,
        totalRecords: 0,
        presentCount: 0,
        absentCount: 0,
        byDay: [],
        byCourse: []
    });

    const [gradesData, setGradesData] = useState<any>({
        distribution: [],
        averageGrade: 0,
        totalGrades: 0,
        averageByClass: []
    });

    const [enrollmentData, setEnrollmentData] = useState<any>({
        total: 0,
        trend: [],
        byDepartment: [],
        byCourse: []
    });

    useEffect(() => {
        fetchReportData();
    }, [activeReport, dateRange]);

    const getDateFilter = () => {
        const now = new Date();
        let startDate = new Date();

        switch (dateRange) {
            case 'week':
                startDate.setDate(now.getDate() - 7);
                break;
            case 'month':
                startDate.setDate(now.getDate() - 30);
                break;
            case 'semester':
                startDate.setMonth(now.getMonth() - 4);
                break;
            case 'year':
                startDate.setFullYear(now.getFullYear() - 1);
                break;
        }

        return startDate.toISOString();
    };

    const fetchReportData = async () => {
        setLoading(true);
        try {
            if (activeReport === 'attendance') {
                await fetchAttendanceReport();
            } else if (activeReport === 'grades') {
                await fetchGradesReport();
            } else {
                await fetchEnrollmentReport();
            }
        } catch (err) {
            console.error('Error fetching report:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAttendanceReport = async () => {
        const startDate = getDateFilter();

        const { data: attendance } = await supabase
            .from('attendance')
            .select('*, course:courses(name, code)')
            .gte('date', startDate.split('T')[0]);

        const records = attendance || [];
        const presentCount = records.filter(r => r.status === 'Present').length;
        const absentCount = records.filter(r => r.status === 'Absent').length;
        const overallRate = records.length > 0 ? Math.round((presentCount / records.length) * 100) : 0;

        // Group by day of week
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const byDay = dayNames.map(day => ({ day, count: 0, present: 0 }));

        records.forEach(r => {
            const dayIndex = new Date(r.date).getDay();
            byDay[dayIndex].count++;
            if (r.status === 'Present') byDay[dayIndex].present++;
        });

        // Group by course
        const courseMap: Record<string, { name: string; code: string; total: number; present: number }> = {};
        records.forEach(r => {
            const courseId = r.course_id;
            const courseName = r.course?.name || 'Unknown';
            const courseCode = r.course?.code || '';
            if (!courseMap[courseId]) {
                courseMap[courseId] = { name: courseName, code: courseCode, total: 0, present: 0 };
            }
            courseMap[courseId].total++;
            if (r.status === 'Present') courseMap[courseId].present++;
        });

        // Use mock data if no real data exists
        if (records.length === 0) {
            setAttendanceData(MOCK_ATTENDANCE_DATA);
        } else {
            setAttendanceData({
                overall: overallRate,
                totalRecords: records.length,
                presentCount,
                absentCount,
                byDay: byDay.map(d => ({ ...d, rate: d.count > 0 ? Math.round((d.present / d.count) * 100) : 0 })),
                byCourse: Object.values(courseMap)
                    .map(c => ({ ...c, rate: c.total > 0 ? Math.round((c.present / c.total) * 100) : 0 }))
                    .sort((a, b) => b.total - a.total)
            });
        }
    };

    const fetchGradesReport = async () => {
        const { data: grades } = await supabase
            .from('grades')
            .select('*, enrollment:enrollments(course:courses(name))');

        const records = grades || [];

        // Grade distribution
        const gradeLabels = ['A', 'B', 'C', 'D', 'F'];
        const distribution = gradeLabels.map(g => ({
            grade: g,
            count: records.filter(r => r.grade === g).length
        }));

        // Calculate average (A=4, B=3, C=2, D=1, F=0)
        const gradePoints: Record<string, number> = { 'A': 4, 'B': 3, 'C': 2, 'D': 1, 'F': 0 };
        const validGrades = records.filter(r => gradePoints[r.grade] !== undefined);
        const avgGrade = validGrades.length > 0
            ? (validGrades.reduce((sum, r) => sum + gradePoints[r.grade], 0) / validGrades.length).toFixed(2)
            : 0;

        // Use mock data if no real data exists
        if (records.length === 0) {
            setGradesData(MOCK_GRADES_DATA);
        } else {
            setGradesData({
                distribution,
                averageGrade: avgGrade,
                totalGrades: records.length,
                averageByClass: []
            });
        }
    };

    const fetchEnrollmentReport = async () => {
        const startDate = getDateFilter();

        const { data: enrollments } = await supabase
            .from('enrollments')
            .select('*, student:profiles!enrollments_student_id_fkey(department), course:courses(name, code)')
            .gte('enrolled_at', startDate);

        const records = enrollments || [];

        // By department
        const deptMap: Record<string, number> = {};
        records.forEach(r => {
            const dept = r.student?.department || 'General';
            deptMap[dept] = (deptMap[dept] || 0) + 1;
        });

        // By course
        const courseMap: Record<string, { name: string; code: string; count: number }> = {};
        records.forEach(r => {
            const courseId = r.course_id;
            if (!courseMap[courseId]) {
                courseMap[courseId] = {
                    name: r.course?.name || 'Unknown',
                    code: r.course?.code || '',
                    count: 0
                };
            }
            courseMap[courseId].count++;
        });

        // Use mock data if no real data exists
        if (records.length === 0) {
            setEnrollmentData(MOCK_ENROLLMENT_DATA);
        } else {
            setEnrollmentData({
                total: records.length,
                byDepartment: Object.entries(deptMap)
                    .map(([name, count]) => ({ name, count }))
                    .sort((a, b) => b.count - a.count),
                byCourse: Object.values(courseMap).sort((a, b) => b.count - a.count)
            });
        }
    };

    const exportToCSV = async () => {
        setExporting(true);
        try {
            let csvContent = '';
            let filename = '';

            if (activeReport === 'attendance') {
                filename = `attendance_report_${dateRange}.csv`;
                csvContent = 'Course,Total Records,Present,Rate\n';
                attendanceData.byCourse.forEach((c: any) => {
                    csvContent += `"${c.name}",${c.total},${c.present},${c.rate}%\n`;
                });
            } else if (activeReport === 'grades') {
                filename = `grades_report.csv`;
                csvContent = 'Grade,Count\n';
                gradesData.distribution.forEach((g: any) => {
                    csvContent += `${g.grade},${g.count}\n`;
                });
            } else {
                filename = `enrollment_report_${dateRange}.csv`;
                csvContent = 'Department,Enrollments\n';
                enrollmentData.byDepartment.forEach((d: any) => {
                    csvContent += `"${d.name}",${d.count}\n`;
                });
            }

            // Create and download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            link.click();
            URL.revokeObjectURL(link.href);
        } catch (err) {
            console.error('Export failed:', err);
            alert('Failed to export report');
        } finally {
            setExporting(false);
        }
    };

    const tabs = [
        { id: 'attendance', label: 'Attendance', icon: Calendar },
        { id: 'grades', label: 'Grades', icon: BarChart2 },
        { id: 'enrollment', label: 'Enrollment', icon: Users },
    ];

    return (
        <div className="h-full bg-[#F4F4F5] p-4 sm:p-6 lg:p-8 overflow-y-auto rounded-t-[2rem] rounded-b-none md:rounded-b-[2rem] font-sans pb-32">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 sm:mb-8">
                <div>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">Reports & Analytics</h1>
                    <p className="text-gray-500 font-medium text-sm sm:text-base">Comprehensive insights into your institution</p>
                </div>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="px-3 sm:px-4 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs sm:text-sm"
                    >
                        <option value="week">Last 7 Days</option>
                        <option value="month">Last 30 Days</option>
                        <option value="semester">This Semester</option>
                        <option value="year">This Year</option>
                    </select>
                    <button
                        onClick={exportToCSV}
                        disabled={exporting || loading}
                        className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs sm:text-sm hover:bg-gray-50 disabled:opacity-50"
                    >
                        <Download size={14} />
                        {exporting ? 'Exporting...' : 'Export CSV'}
                    </button>
                    <button
                        onClick={fetchReportData}
                        disabled={loading}
                        className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50"
                    >
                        <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 sm:gap-2 mb-6 sm:mb-8 bg-white p-1.5 sm:p-2 rounded-xl sm:rounded-2xl w-fit shadow-sm overflow-x-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveReport(tab.id as any)}
                        className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-bold transition-all whitespace-nowrap text-xs sm:text-sm ${activeReport === tab.id
                            ? 'bg-black text-white shadow-md'
                            : 'text-gray-500 hover:bg-gray-100'
                            }`}
                    >
                        <tab.icon size={16} />
                        <span className="hidden sm:inline">{tab.label}</span>
                        <span className="sm:hidden">{tab.label.slice(0, 3)}</span>
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-16">
                    <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-400">Loading report data...</p>
                </div>
            ) : (
                <>
                    {/* Attendance Report */}
                    {activeReport === 'attendance' && (
                        <div className="space-y-4 sm:space-y-6">
                            {/* Stats Row */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                                <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] text-white">
                                    <p className="text-white/70 text-xs sm:text-sm mb-1">Overall Rate</p>
                                    <p className="text-3xl sm:text-4xl font-black">{attendanceData.overall}%</p>
                                </div>
                                <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] shadow-sm">
                                    <p className="text-gray-500 text-xs sm:text-sm mb-1">Total Records</p>
                                    <p className="text-2xl sm:text-3xl font-black text-gray-900">{attendanceData.totalRecords}</p>
                                </div>
                                <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] shadow-sm">
                                    <p className="text-gray-500 text-xs sm:text-sm mb-1">Present</p>
                                    <p className="text-2xl sm:text-3xl font-black text-green-600">{attendanceData.presentCount}</p>
                                </div>
                                <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] shadow-sm">
                                    <p className="text-gray-500 text-xs sm:text-sm mb-1">Absent</p>
                                    <p className="text-2xl sm:text-3xl font-black text-red-600">{attendanceData.absentCount}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                                {/* By Day */}
                                <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] shadow-sm">
                                    <h3 className="font-bold text-gray-900 mb-4 sm:mb-6 text-sm sm:text-base">Attendance by Day</h3>
                                    <div className="space-y-3 sm:space-y-4">
                                        {attendanceData.byDay.map((day: any) => (
                                            <div key={day.day}>
                                                <div className="flex justify-between text-xs sm:text-sm mb-1">
                                                    <span className="font-medium text-gray-700">{day.day}</span>
                                                    <span className="font-bold text-gray-900">{day.rate}%</span>
                                                </div>
                                                <div className="h-2 sm:h-3 bg-gray-100 rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${day.rate}%` }}
                                                        className={`h-full rounded-full ${day.rate >= 75 ? 'bg-green-500' : day.rate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* By Course */}
                                <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] shadow-sm">
                                    <h3 className="font-bold text-gray-900 mb-4 sm:mb-6 text-sm sm:text-base">Attendance by Course</h3>
                                    <div className="space-y-2 sm:space-y-3 max-h-64 overflow-y-auto">
                                        {attendanceData.byCourse.length === 0 ? (
                                            <p className="text-gray-400 text-center py-4 text-sm">No data available</p>
                                        ) : (
                                            attendanceData.byCourse.slice(0, 10).map((course: any, i: number) => (
                                                <div key={i} className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-xl">
                                                    <div className="min-w-0 flex-1">
                                                        <span className="font-medium text-gray-700 text-xs sm:text-sm block truncate">{course.name}</span>
                                                        <span className="text-[10px] sm:text-xs text-gray-400">{course.total} records</span>
                                                    </div>
                                                    <span className={`font-bold text-xs sm:text-sm shrink-0 ml-2 ${course.rate >= 75 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {course.rate}%
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Grades Report */}
                    {activeReport === 'grades' && (
                        <div className="space-y-4 sm:space-y-6">
                            {/* Stats Row */}
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] text-white">
                                    <p className="text-white/70 text-xs sm:text-sm mb-1">Average GPA</p>
                                    <p className="text-3xl sm:text-4xl font-black">{gradesData.averageGrade}</p>
                                </div>
                                <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] shadow-sm">
                                    <p className="text-gray-500 text-xs sm:text-sm mb-1">Total Grades</p>
                                    <p className="text-2xl sm:text-3xl font-black text-gray-900">{gradesData.totalGrades}</p>
                                </div>
                                <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] shadow-sm col-span-2 lg:col-span-1">
                                    <p className="text-gray-500 text-xs sm:text-sm mb-1">Pass Rate</p>
                                    <p className="text-2xl sm:text-3xl font-black text-green-600">
                                        {gradesData.totalGrades > 0
                                            ? Math.round(((gradesData.totalGrades - (gradesData.distribution.find((d: any) => d.grade === 'F')?.count || 0)) / gradesData.totalGrades) * 100)
                                            : 0}%
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] shadow-sm">
                                <h3 className="font-bold text-gray-900 mb-4 sm:mb-6 text-sm sm:text-base">Grade Distribution</h3>
                                <div className="flex items-end gap-2 sm:gap-4 h-40 sm:h-48">
                                    {gradesData.distribution.map((g: any, i: number) => {
                                        const maxCount = Math.max(...gradesData.distribution.map((d: any) => d.count), 1);
                                        const height = maxCount > 0 ? (g.count / maxCount) * 100 : 0;
                                        const colors = ['bg-green-500', 'bg-blue-500', 'bg-yellow-500', 'bg-orange-500', 'bg-red-500'];

                                        return (
                                            <div key={g.grade} className="flex-1 flex flex-col items-center">
                                                <motion.div
                                                    initial={{ height: 0 }}
                                                    animate={{ height: `${Math.max(height, 5)}%` }}
                                                    className={`w-full ${colors[i]} rounded-t-xl min-h-[8px]`}
                                                />
                                                <div className="mt-2 sm:mt-3 text-center">
                                                    <p className="font-bold text-gray-900 text-sm sm:text-base">{g.grade}</p>
                                                    <p className="text-[10px] sm:text-xs text-gray-500">{g.count}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Enrollment Report */}
                    {activeReport === 'enrollment' && (
                        <div className="space-y-4 sm:space-y-6">
                            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4 sm:p-8 rounded-2xl sm:rounded-[2rem] text-white">
                                <p className="text-white/70 text-xs sm:text-sm mb-1 sm:mb-2">Total Enrollments</p>
                                <p className="text-4xl sm:text-5xl font-black">{enrollmentData.total}</p>
                                <p className="text-white/70 text-xs sm:text-sm mt-1">in selected period</p>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                                {/* By Department */}
                                <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] shadow-sm">
                                    <h3 className="font-bold text-gray-900 mb-4 sm:mb-6 text-sm sm:text-base">By Department</h3>
                                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                        {enrollmentData.byDepartment.length === 0 ? (
                                            <p className="col-span-2 text-gray-400 text-center py-4 text-sm">No data available</p>
                                        ) : (
                                            enrollmentData.byDepartment.map((dept: any, i: number) => {
                                                const colors = ['bg-blue-50 text-blue-700', 'bg-purple-50 text-purple-700', 'bg-green-50 text-green-700', 'bg-orange-50 text-orange-700', 'bg-pink-50 text-pink-700'];
                                                return (
                                                    <div key={dept.name} className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl ${colors[i % colors.length]}`}>
                                                        <p className="text-xl sm:text-2xl font-black">{dept.count}</p>
                                                        <p className="font-medium text-xs sm:text-sm truncate">{dept.name}</p>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>

                                {/* By Course */}
                                <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] shadow-sm">
                                    <h3 className="font-bold text-gray-900 mb-4 sm:mb-6 text-sm sm:text-base">By Course</h3>
                                    <div className="space-y-2 sm:space-y-3 max-h-64 overflow-y-auto">
                                        {enrollmentData.byCourse.length === 0 ? (
                                            <p className="text-gray-400 text-center py-4 text-sm">No data available</p>
                                        ) : (
                                            enrollmentData.byCourse.slice(0, 8).map((course: any, i: number) => (
                                                <div key={i} className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-xl">
                                                    <div className="min-w-0 flex-1">
                                                        <span className="font-medium text-gray-700 text-xs sm:text-sm block truncate">{course.name}</span>
                                                        <span className="text-[10px] sm:text-xs text-gray-400">{course.code}</span>
                                                    </div>
                                                    <span className="font-bold text-blue-600 text-xs sm:text-sm shrink-0 ml-2">
                                                        {course.count} enrolled
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default AdminReports;
