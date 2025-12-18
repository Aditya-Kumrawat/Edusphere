import React, { useState, useEffect } from 'react';
import {
    ClipboardList, Send, Search, Trash, Calendar,
    ChevronLeft, CheckCircle, Clock, FileText
} from '../../components/Icons';
import { supabase } from '../../services/mongoAdapter';
import { useAuth } from '../../context/AuthContext';
import AssignmentAnalytics from '../../components/AssignmentAnalytics';
import SubmissionList from '../../components/SubmissionList';

const FacultyAssignments = () => {
    const { session } = useAuth();
    const user = session?.user;

    // View State
    const [view, setView] = useState<'list' | 'review'>('list');
    const [selectedAssignment, setSelectedAssignment] = useState<any>(null);

    // Data State
    const [myCourses, setMyCourses] = useState<any[]>([]);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [selectedCourse, setSelectedCourse] = useState('');
    const [title, setTitle] = useState('');
    const [instructions, setInstructions] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [totalMarks, setTotalMarks] = useState(100);

    // Grading Modal State
    const [gradingModal, setGradingModal] = useState(false);
    const [gradingSubmission, setGradingSubmission] = useState<any>(null);
    const [gradingStudent, setGradingStudent] = useState<any>(null);
    const [gradeMarks, setGradeMarks] = useState('');
    const [gradeFeedback, setGradeFeedback] = useState('');
    const [savingGrade, setSavingGrade] = useState(false);

    useEffect(() => {
        if (user) {
            fetchInitialData();
        }
    }, [user]);

    // Fetch details when switching to review mode
    useEffect(() => {
        if (view === 'review' && selectedAssignment) {
            fetchReviewData(selectedAssignment.id, selectedAssignment.course_id);
        }
    }, [view, selectedAssignment]);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const { data: coursesData } = await supabase
                .from('courses')
                .select('id, name, code')
                .eq('faculty_id', user?.id);

            setMyCourses(coursesData || []);
            if (coursesData && coursesData.length > 0) {
                setSelectedCourse(coursesData[0].id);
            }

            fetchAssignments();
        } catch (err) {
            console.error("Error fetching data:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAssignments = async () => {
        // Fetch from new 'assignments' table
        const { data, error } = await supabase
            .from('assignments')
            .select(`
            *,
            course:courses(code, name)
         `)
            .order('created_at', { ascending: false });

        if (!error) {
            setAssignments(data || []);
        }
    };

    const fetchReviewData = async (assignmentId: string, courseId: string) => {
        try {
            // 1. Fetch Enrolled Students for this course
            const { data: enrollmentData, error: enrollError } = await supabase
                .from('enrollments')
                .select(`
                    student_id,
                    student:profiles!enrollments_student_id_fkey(*)
                `)
                .eq('course_id', courseId);

            if (enrollError) throw enrollError;

            // Extract profiles
            const students = enrollmentData?.map(e => e.student) || [];
            setEnrolledStudents(students);

            // 2. Fetch Submissions for this assignment
            const { data: submissionData, error: subError } = await supabase
                .from('assignment_submissions')
                .select('*')
                .eq('assignment_id', assignmentId);

            if (subError) throw subError;
            setSubmissions(submissionData || []);

        } catch (err) {
            console.error("Error fetching review data:", err);
        }
    };

    const handlePost = async () => {
        if (!title || !selectedCourse || !user) return;

        try {
            const { error } = await supabase
                .from('assignments')
                .insert([
                    {
                        course_id: selectedCourse,
                        created_by: user._id,
                        title: title,
                        description: instructions,
                        due_date: dueDate ? new Date(dueDate).toISOString() : null,
                        total_marks: totalMarks
                    }
                ]);

            if (error) throw error;

            fetchAssignments();
            setTitle('');
            setInstructions('');
            setDueDate('');
            alert('Assignment posted successfully!');

        } catch (err) {
            console.error("Error posting assignment:", err);
            alert("Failed to post assignment");
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this assignment?')) {
            const { error } = await supabase
                .from('assignments')
                .delete()
                .eq('id', id);

            if (!error) {
                setAssignments(assignments.filter(a => a.id !== id));
                if (selectedAssignment?.id === id) {
                    setView('list');
                    setSelectedAssignment(null);
                }
            }
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
            // Refresh submissions
            if (selectedAssignment) {
                fetchReviewData(selectedAssignment.id, selectedAssignment.course_id);
            }
        } catch (err) {
            console.error('Error saving grade:', err);
            alert('Failed to save grade.');
        } finally {
            setSavingGrade(false);
        }
    };

    return (
        <div className="h-full bg-[#F4F4F5] p-6 lg:p-8 overflow-y-auto rounded-t-[2rem] rounded-b-none md:rounded-b-[2rem] font-sans pb-32">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    {view === 'review' ? (
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setView('list')}
                                className="p-2 bg-white rounded-full border border-gray-200 hover:bg-gray-50"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <div>
                                <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">{selectedAssignment?.title}</h1>
                                <p className="text-gray-500 font-medium text-sm flex items-center gap-2">
                                    <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-black uppercase">
                                        {selectedAssignment?.course?.code}
                                    </span>
                                    Reviewing Submissions
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Assignments</h1>
                            <p className="text-gray-500 font-medium">Create and manage class assignments.</p>
                        </div>
                    )}
                </div>
            </div>

            {view === 'list' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* LEFT: Create Assignment Form */}
                    <div className="lg:col-span-1 order-1 lg:order-1">
                        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 sticky top-6">
                            {/* ... Form UI same as before but adapted fields ... */}
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <ClipboardList size={20} />
                                </div>
                                <h3 className="font-bold text-gray-900 text-lg">Post New Assignment</h3>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase ml-2 mb-1 block">Course</label>
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
                                        placeholder="e.g. Research Paper"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-black"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase ml-2 mb-1 block">Due Date</label>
                                        <input
                                            type="datetime-local"
                                            value={dueDate}
                                            onChange={(e) => setDueDate(e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-black text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase ml-2 mb-1 block">Points</label>
                                        <input
                                            type="number"
                                            value={totalMarks}
                                            onChange={(e) => setTotalMarks(Number(e.target.value))}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-black"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase ml-2 mb-1 block">Description</label>
                                    <textarea
                                        value={instructions}
                                        onChange={(e) => setInstructions(e.target.value)}
                                        placeholder="Assignment details..."
                                        rows={4}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium text-gray-900 outline-none focus:ring-2 focus:ring-black resize-none"
                                    />
                                </div>

                                <button
                                    onClick={handlePost}
                                    className="w-full bg-black text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-all shadow-lg mt-2"
                                >
                                    <Send size={18} /> Post Assignment
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Assignment List */}
                    <div className="lg:col-span-2 order-2 lg:order-2">
                        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden min-h-[600px]">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                <h3 className="font-bold text-lg text-gray-900">Your Assignments</h3>
                            </div>
                            <div className="divide-y divide-gray-50">
                                {loading ? <p className="p-8 text-center text-gray-400">Loading...</p> :
                                    assignments.map(assign => (
                                        <div
                                            key={assign.id}
                                            className="p-6 hover:bg-gray-50 transition-all cursor-pointer group"
                                            onClick={() => {
                                                setSelectedAssignment(assign);
                                                setView('review');
                                            }}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide">
                                                            {assign.course?.code}
                                                        </span>
                                                        {assign.due_date && (
                                                            <span className="text-xs font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded flex items-center gap-1">
                                                                <Clock size={10} /> Due: {new Date(assign.due_date).toLocaleDateString()}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h4 className="font-bold text-lg text-gray-900 group-hover:text-blue-600 transition-colors">
                                                        {assign.title}
                                                    </h4>
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(assign.id); }}
                                                    className="p-2 hover:bg-red-50 rounded-full text-gray-300 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash size={16} />
                                                </button>
                                            </div>
                                            <p className="text-sm text-gray-500 line-clamp-2">{assign.description}</p>
                                        </div>
                                    ))}
                                {!loading && assignments.length === 0 && (
                                    <div className="p-12 text-center text-gray-400">No assignments created yet.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* REVIEW MODE */
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <AssignmentAnalytics
                        totalStudents={enrolledStudents.length}
                        submissions={submissions}
                    />

                    <SubmissionList
                        students={enrolledStudents}
                        submissions={submissions}
                        onGrade={handleGrade}
                    />
                </div>
            )}

            {/* Grading Modal */}
            {gradingModal && gradingSubmission && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[2rem] max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Grade Submission</h2>
                                <p className="text-gray-500">{gradingStudent?.full_name || 'Student'}</p>
                            </div>
                            <button
                                onClick={() => setGradingModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Submission Details */}
                        <div className="space-y-4 mb-8">
                            <div className="bg-gray-50 p-4 rounded-xl">
                                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Submitted At</p>
                                <p className="font-medium text-gray-700">
                                    {gradingSubmission.submitted_at
                                        ? new Date(gradingSubmission.submitted_at).toLocaleString()
                                        : 'Not submitted'}
                                </p>
                            </div>

                            {gradingSubmission.submission_url && (
                                <div className="bg-blue-50 p-4 rounded-xl">
                                    <p className="text-xs font-bold text-blue-400 uppercase mb-2">Submission Link</p>
                                    <a
                                        href={gradingSubmission.submission_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 font-bold underline break-all hover:text-blue-700"
                                    >
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

                        {/* Grading Form */}
                        <div className="space-y-4 border-t border-gray-100 pt-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
                                    Marks (out of {selectedAssignment?.total_marks || 100})
                                </label>
                                <input
                                    type="number"
                                    value={gradeMarks}
                                    onChange={(e) => setGradeMarks(e.target.value)}
                                    max={selectedAssignment?.total_marks || 100}
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

                        {/* Actions */}
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setGradingModal(false)}
                                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveGrade}
                                disabled={savingGrade}
                                className="flex-1 px-6 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-colors disabled:opacity-50"
                            >
                                {savingGrade ? 'Saving...' : 'Save Grade'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FacultyAssignments;
