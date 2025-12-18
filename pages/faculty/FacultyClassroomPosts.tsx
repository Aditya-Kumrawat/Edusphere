import React, { useState, useEffect } from 'react';
import {
    Megaphone, Send, Paperclip, Search, ClipboardList,
    Trash, Calendar, Clock, CheckCircle, Filter, Plus, X, Eye, Users, Phone, ArrowLeft, BarChart2
} from '../../components/Icons';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../services/mongoAdapter';
import { useAuth } from '../../context/AuthContext';

const MAKE_WEBHOOK_URL = 'https://hook.eu2.make.com/yjzi4wem0xnonfb4pgdun3qbi2ux4yhn';

type PostType = 'announcement' | 'assignment';

interface Post {
    id: string;
    type: PostType;
    title: string;
    content: string;
    course_id: string;
    course_name?: string;
    course_code?: string;
    due_date?: string;
    total_marks?: number;
    created_at: string;
}

const FacultyClassroomPosts = () => {
    const { session } = useAuth();
    const [activeTab, setActiveTab] = useState<PostType>('announcement');
    const [courses, setCourses] = useState<any[]>([]);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Review mode state
    const [reviewMode, setReviewMode] = useState(false);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [gradingModal, setGradingModal] = useState(false);
    const [gradingSubmission, setGradingSubmission] = useState<any>(null);
    const [gradingStudent, setGradingStudent] = useState<any>(null);
    const [gradeMarks, setGradeMarks] = useState('');
    const [gradeFeedback, setGradeFeedback] = useState('');
    const [savingGrade, setSavingGrade] = useState(false);
    const [callingStudent, setCallingStudent] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        courseId: '',
        dueDate: '',
        totalMarks: 100
    });
    const [posting, setPosting] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, [session]);

    useEffect(() => {
        if (courses.length > 0) {
            fetchPosts();
        }
    }, [activeTab, courses]);

    const fetchInitialData = async () => {
        try {
            // Fetch faculty's courses
            const { data: coursesData, error } = await supabase
                .from('courses')
                .select('id, name, code')
                .eq('faculty_id', session?.user?.id);

            if (error) throw error;
            setCourses(coursesData || []);
            if (coursesData?.[0]) {
                setFormData(prev => ({ ...prev, courseId: coursesData[0].id }));
            }
        } catch (err) {
            console.error('Error fetching courses:', err);
        }
    };

    const fetchPosts = async () => {
        try {
            setLoading(true);
            const courseIds = courses.map(c => c.id);

            if (activeTab === 'announcement') {
                const { data, error } = await supabase
                    .from('announcements')
                    .select('*, course:courses(name, code)')
                    .in('course_id', courseIds)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setPosts((data || []).map(d => ({
                    id: d.id,
                    type: 'announcement' as PostType,
                    title: d.title,
                    content: d.content,
                    course_id: d.course_id,
                    course_name: d.course?.name,
                    course_code: d.course?.code,
                    created_at: d.created_at
                })));
            } else {
                const { data, error } = await supabase
                    .from('assignments')
                    .select('*, course:courses(name, code)')
                    .in('course_id', courseIds)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setPosts((data || []).map(d => ({
                    id: d.id,
                    type: 'assignment' as PostType,
                    title: d.title,
                    content: d.description,
                    course_id: d.course_id,
                    course_name: d.course?.name,
                    course_code: d.course?.code,
                    due_date: d.due_date,
                    total_marks: d.total_marks,
                    created_at: d.created_at
                })));
            }
        } catch (err) {
            console.error('Error fetching posts:', err);
        } finally {
            setLoading(false);
        }
    };

    const handlePost = async () => {
        if (!formData.title.trim() || !formData.courseId) {
            alert('Please fill in required fields');
            return;
        }

        try {
            setPosting(true);

            if (activeTab === 'announcement') {
                const { error } = await supabase
                    .from('announcements')
                    .insert({
                        title: formData.title,
                        content: formData.content,
                        course_id: formData.courseId,
                        author_id: session?.user?.id
                    });
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('assignments')
                    .insert({
                        title: formData.title,
                        description: formData.content,
                        course_id: formData.courseId,
                        due_date: formData.dueDate || null,
                        total_marks: formData.totalMarks,
                        created_by: session?.user?.id
                    });
                if (error) throw error;
            }

            setFormData({ title: '', content: '', courseId: courses[0]?.id || '', dueDate: '', totalMarks: 100 });
            setShowCreateModal(false);
            fetchPosts();
        } catch (err) {
            console.error('Error posting:', err);
            alert('Failed to create post');
        } finally {
            setPosting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this post?')) return;

        try {
            const table = activeTab === 'announcement' ? 'announcements' : 'assignments';
            const { error } = await supabase.from(table).delete().eq('id', id);
            if (error) throw error;
            fetchPosts();
        } catch (err) {
            console.error('Error deleting:', err);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const viewSubmissions = async (post: Post) => {
        setSelectedPost(post);
        setReviewMode(true);

        try {
            // Fetch enrolled students
            const { data: enrollmentData } = await supabase
                .from('enrollments')
                .select(`student_id, student:profiles!enrollments_student_id_fkey(*)`)
                .eq('course_id', post.course_id);

            const students = enrollmentData?.map(e => e.student) || [];
            setEnrolledStudents(students);

            // Fetch submissions for this assignment
            const { data: submissionData } = await supabase
                .from('assignment_submissions')
                .select('*')
                .eq('assignment_id', post.id);

            setSubmissions(submissionData || []);
        } catch (err) {
            console.error('Error fetching review data:', err);
        }
    };

    const handleGrade = (studentId: string, submission: any) => {
        const student = enrolledStudents.find(s => s.id === studentId);
        setGradingStudent(student);
        setGradingSubmission(submission);
        setGradeMarks(submission.marks_obtained?.toString() || '');
        setGradeFeedback(submission.feedback || '');
        setGradingModal(true);
    };

    const saveGrade = async () => {
        if (!gradingSubmission) return;
        try {
            setSavingGrade(true);
            const { error } = await supabase
                .from('assignment_submissions')
                .update({
                    marks_obtained: parseFloat(gradeMarks) || 0,
                    feedback: gradeFeedback,
                    graded_at: new Date().toISOString()
                })
                .eq('id', gradingSubmission.id);

            if (error) throw error;
            alert('Grade saved successfully!');
            setGradingModal(false);
            if (selectedPost) viewSubmissions(selectedPost);
        } catch (err) {
            console.error('Error saving grade:', err);
            alert('Failed to save grade.');
        } finally {
            setSavingGrade(false);
        }
    };

    const getSubmission = (studentId: string) => submissions.find(s => s.student_id === studentId);

    const callStudent = async (student: any) => {
        if (!student.mobile) {
            // Trigger Make.com webhook when no phone number is available
            try {
                await fetch('https://hook.eu2.make.com/857426w6kabn78rhm24ongjcetuv2r6g', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({})
                });
            } catch (err) {
                console.error('Webhook error:', err);
            }
            alert('No phone number available for this student.');
            return;
        }
        try {
            setCallingStudent(student.id);
            const response = await fetch(MAKE_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentName: student.full_name,
                    studentPhone: student.mobile,
                    assignmentTitle: selectedPost?.title,
                    courseCode: selectedPost?.course_code,
                    message: `Reminder: Please submit your assignment "${selectedPost?.title}" for ${selectedPost?.course_code}.`
                })
            });
            if (response.ok) {
                alert(`Call initiated to ${student.full_name}`);
            } else {
                throw new Error('Webhook failed');
            }
        } catch (err) {
            console.error('Error calling student:', err);
            alert('Failed to initiate call. Please try again.');
        } finally {
            setCallingStudent(null);
        }
    };

    const filteredStudents = enrolledStudents.filter(student => {
        if (!searchQuery) return true;
        const term = searchQuery.toLowerCase();
        return student.full_name?.toLowerCase().includes(term) ||
            student.enrollment_number?.toLowerCase().includes(term);
    });

    const submittedCount = submissions.length;
    const pendingCount = enrolledStudents.length - submittedCount;
    const submissionRate = enrolledStudents.length > 0
        ? Math.round((submittedCount / enrolledStudents.length) * 100)
        : 0;

    // If in review mode, render full page analytics view
    if (reviewMode && selectedPost) {
        return (
            <div className="h-full bg-[#F4F4F5] p-6 lg:p-8 overflow-y-auto rounded-t-[2rem] rounded-b-none md:rounded-b-[2rem] font-sans pb-32">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => { setReviewMode(false); setSelectedPost(null); }}
                            className="p-3 bg-white rounded-xl shadow-sm hover:shadow-md transition-all"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">
                                {selectedPost.title}
                            </h1>
                            <p className="text-gray-500 font-medium">{selectedPost.course_code} • Assignment Submissions</p>
                        </div>
                    </div>
                </div>

                {/* Analytics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-gray-100 rounded-xl">
                                <Users size={20} className="text-gray-600" />
                            </div>
                        </div>
                        <p className="text-3xl font-black text-gray-900">{enrolledStudents.length}</p>
                        <p className="text-xs text-gray-500 font-bold uppercase">Total Students</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-green-100 rounded-xl">
                                <CheckCircle size={20} className="text-green-600" />
                            </div>
                        </div>
                        <p className="text-3xl font-black text-green-600">{submittedCount}</p>
                        <p className="text-xs text-gray-500 font-bold uppercase">Submitted</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-orange-100 rounded-xl">
                                <Clock size={20} className="text-orange-600" />
                            </div>
                        </div>
                        <p className="text-3xl font-black text-orange-600">{pendingCount}</p>
                        <p className="text-xs text-gray-500 font-bold uppercase">Pending</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-100 rounded-xl">
                                <BarChart2 size={20} className="text-blue-600" />
                            </div>
                        </div>
                        <p className="text-3xl font-black text-blue-600">{submissionRate}%</p>
                        <p className="text-xs text-gray-500 font-bold uppercase">Submission Rate</p>
                    </motion.div>
                </div>

                {/* Progress Bar */}
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 mb-8">
                    <div className="flex justify-between items-center mb-3">
                        <p className="font-bold text-gray-900">Submission Progress</p>
                        <p className="text-sm font-bold text-gray-500">{submittedCount} / {enrolledStudents.length}</p>
                    </div>
                    <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${submissionRate}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full"
                        />
                    </div>
                </div>

                {/* Student List */}
                <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                        <h3 className="font-bold text-lg text-gray-900">Student Submissions</h3>
                        <div className="relative w-full md:w-72">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search students..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl border border-transparent focus:border-gray-200 outline-none font-medium text-sm"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50/80">
                                <tr>
                                    <th className="text-left p-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Student</th>
                                    <th className="text-left p-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="text-left p-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Submitted At</th>
                                    <th className="text-left p-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Marks</th>
                                    <th className="text-right p-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredStudents.map((student: any) => {
                                    const submission = getSubmission(student.id);
                                    return (
                                        <motion.tr
                                            key={student.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="hover:bg-gray-50/50 transition-colors"
                                        >
                                            <td className="p-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white font-bold">
                                                        {student.full_name?.[0] || '?'}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900">{student.full_name}</p>
                                                        <p className="text-xs text-gray-500">{student.enrollment_number || 'No ID'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-5">
                                                {submission ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-600 border border-green-100">
                                                        <CheckCircle size={12} /> Submitted
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-600 border border-orange-100">
                                                        <Clock size={12} /> Pending
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-5 text-sm font-medium text-gray-600">
                                                {submission?.submitted_at ? new Date(submission.submitted_at).toLocaleString() : '-'}
                                            </td>
                                            <td className="p-5">
                                                {submission?.marks_obtained != null ? (
                                                    <span className="font-bold text-gray-900">{submission.marks_obtained}/{selectedPost.total_marks || 100}</span>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="p-5 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {submission ? (
                                                        <button
                                                            onClick={() => handleGrade(student.id, submission)}
                                                            className="px-4 py-2 bg-black text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-colors"
                                                        >
                                                            Review
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => callStudent(student)}
                                                            disabled={callingStudent === student.id}
                                                            className="px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                                                        >
                                                            <Phone size={12} />
                                                            {callingStudent === student.id ? 'Calling...' : 'Call'}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Grading Modal */}
                {gradingModal && gradingSubmission && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-[2rem] max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">Grade Submission</h2>
                                    <p className="text-gray-500">{gradingStudent?.full_name || 'Student'}</p>
                                </div>
                                <button onClick={() => setGradingModal(false)} className="p-2 hover:bg-gray-100 rounded-full">✕</button>
                            </div>

                            <div className="space-y-4 mb-8">
                                <div className="bg-gray-50 p-4 rounded-xl">
                                    <p className="text-xs font-bold text-gray-400 uppercase mb-2">Submitted At</p>
                                    <p className="font-medium text-gray-700">
                                        {gradingSubmission.submitted_at ? new Date(gradingSubmission.submitted_at).toLocaleString() : 'Not submitted'}
                                    </p>
                                </div>

                                {gradingSubmission.submission_url && (
                                    <div className="bg-blue-50 p-4 rounded-xl">
                                        <p className="text-xs font-bold text-blue-400 uppercase mb-2">Submission Link</p>
                                        <a href={gradingSubmission.submission_url} target="_blank" rel="noopener noreferrer"
                                            className="text-blue-600 font-bold underline break-all hover:text-blue-700">
                                            {gradingSubmission.submission_url}
                                        </a>
                                    </div>
                                )}

                                {gradingSubmission.submission_text && (
                                    <div className="bg-gray-50 p-4 rounded-xl">
                                        <p className="text-xs font-bold text-gray-400 uppercase mb-2">Submission Text</p>
                                        <p className="text-gray-700 whitespace-pre-wrap">{gradingSubmission.submission_text}</p>
                                    </div>
                                )}

                                {!gradingSubmission.submission_url && !gradingSubmission.submission_text && (
                                    <div className="bg-orange-50 p-4 rounded-xl text-center text-orange-600 font-medium">
                                        No submission content attached.
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4 border-t border-gray-100 pt-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
                                        Marks (out of {selectedPost?.total_marks || 100})
                                    </label>
                                    <input
                                        type="number"
                                        value={gradeMarks}
                                        onChange={(e) => setGradeMarks(e.target.value)}
                                        max={selectedPost?.total_marks || 100}
                                        min={0}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
                                        placeholder="Enter marks..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Feedback</label>
                                    <textarea
                                        value={gradeFeedback}
                                        onChange={(e) => setGradeFeedback(e.target.value)}
                                        rows={4}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-black resize-none"
                                        placeholder="Provide feedback for the student..."
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setGradingModal(false)}
                                    className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200">
                                    Cancel
                                </button>
                                <button onClick={saveGrade} disabled={savingGrade}
                                    className="flex-1 px-6 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 disabled:opacity-50">
                                    {savingGrade ? 'Saving...' : 'Save Grade'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="h-full bg-[#F4F4F5] p-6 lg:p-8 overflow-y-auto rounded-t-[2rem] rounded-b-none md:rounded-b-[2rem] font-sans pb-32">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">Classroom Posts</h1>
                    <p className="text-gray-500 font-medium">Manage announcements and assignments for your classes</p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-2xl font-bold shadow-lg"
                >
                    <Plus size={18} />
                    Create {activeTab === 'announcement' ? 'Announcement' : 'Assignment'}
                </motion.button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-8 bg-white p-2 rounded-2xl w-fit shadow-sm">
                <button
                    onClick={() => setActiveTab('announcement')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'announcement'
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'text-gray-500 hover:bg-gray-100'
                        }`}
                >
                    <Megaphone size={18} />
                    Announcements
                </button>
                <button
                    onClick={() => setActiveTab('assignment')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'assignment'
                        ? 'bg-purple-500 text-white shadow-md'
                        : 'text-gray-500 hover:bg-gray-100'
                        }`}
                >
                    <ClipboardList size={18} />
                    Assignments
                </button>
            </div>

            {/* Posts Grid */}
            {loading ? (
                <div className="text-center text-gray-400 py-12">Loading posts...</div>
            ) : posts.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-[2rem]">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                        {activeTab === 'announcement' ? <Megaphone size={32} className="text-gray-400" /> : <ClipboardList size={32} className="text-gray-400" />}
                    </div>
                    <p className="text-gray-500 font-bold">No {activeTab === 'announcement' ? 'announcements' : 'assignments'} yet</p>
                    <p className="text-gray-400 text-sm">Create one to get started!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence>
                        {posts.map(post => (
                            <motion.div
                                key={post.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-lg transition-shadow"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${post.type === 'announcement'
                                        ? 'bg-blue-50 text-blue-600'
                                        : 'bg-purple-50 text-purple-600'
                                        }`}>
                                        {post.course_code}
                                    </span>
                                    <button
                                        onClick={() => handleDelete(post.id)}
                                        className="p-2 hover:bg-red-50 rounded-full text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash size={16} />
                                    </button>
                                </div>

                                <h3 className="font-bold text-gray-900 text-lg mb-2 line-clamp-2">{post.title}</h3>
                                <p className="text-gray-500 text-sm mb-4 line-clamp-3">{post.content}</p>

                                {post.type === 'assignment' && (
                                    <div className="flex gap-4 mb-4">
                                        {post.due_date && (
                                            <div className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
                                                <Calendar size={12} />
                                                Due: {new Date(post.due_date).toLocaleDateString()}
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                            <CheckCircle size={12} />
                                            {post.total_marks} marks
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center justify-between gap-2 text-xs text-gray-400 pt-4 border-t border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <Clock size={12} />
                                        {formatDate(post.created_at)}
                                    </div>
                                    {post.type === 'assignment' && (
                                        <button
                                            onClick={() => viewSubmissions(post)}
                                            className="px-3 py-1.5 bg-black text-white rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-gray-800 transition-colors"
                                        >
                                            <Eye size={12} /> View Submissions
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Create Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowCreateModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-[2rem] p-8 w-full max-w-xl shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-extrabold text-gray-900">
                                    Create {activeTab === 'announcement' ? 'Announcement' : 'Assignment'}
                                </h2>
                                <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Course *</label>
                                    <select
                                        value={formData.courseId}
                                        onChange={e => setFormData(prev => ({ ...prev, courseId: e.target.value }))}
                                        className="w-full p-4 bg-gray-50 rounded-xl border-2 border-transparent focus:border-black outline-none font-medium"
                                    >
                                        {courses.map(c => (
                                            <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Title *</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                        placeholder={activeTab === 'announcement' ? 'Announcement title...' : 'Assignment title...'}
                                        className="w-full p-4 bg-gray-50 rounded-xl border-2 border-transparent focus:border-black outline-none font-medium"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
                                    <textarea
                                        value={formData.content}
                                        onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
                                        placeholder="Add details..."
                                        rows={4}
                                        className="w-full p-4 bg-gray-50 rounded-xl border-2 border-transparent focus:border-black outline-none font-medium resize-none"
                                    />
                                </div>

                                {activeTab === 'assignment' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Due Date</label>
                                            <input
                                                type="datetime-local"
                                                value={formData.dueDate}
                                                onChange={e => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                                                className="w-full p-4 bg-gray-50 rounded-xl border-2 border-transparent focus:border-black outline-none font-medium"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Total Marks</label>
                                            <input
                                                type="number"
                                                value={formData.totalMarks}
                                                onChange={e => setFormData(prev => ({ ...prev, totalMarks: parseInt(e.target.value) }))}
                                                className="w-full p-4 bg-gray-50 rounded-xl border-2 border-transparent focus:border-black outline-none font-medium"
                                            />
                                        </div>
                                    </div>
                                )}

                                <motion.button
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.99 }}
                                    onClick={handlePost}
                                    disabled={posting}
                                    className="w-full py-4 bg-black text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <Send size={18} />
                                    {posting ? 'Posting...' : `Post ${activeTab === 'announcement' ? 'Announcement' : 'Assignment'}`}
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FacultyClassroomPosts;
