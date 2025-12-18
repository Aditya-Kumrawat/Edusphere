import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import {
    ArrowLeft, Megaphone, FileText, Download, Link as LinkIcon,
    Video, Calendar, User, Clock, ClipboardCheck, AlertCircle, Send
} from '../../components/Icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

interface StudentCourseDetailsProps {
    course: any;
    onBack: () => void;
}

const StudentCourseDetails: React.FC<StudentCourseDetailsProps> = ({ course, onBack }) => {
    const { session } = useAuth();
    const [activeTab, setActiveTab] = useState<'announcements' | 'resources' | 'assignments'>('announcements');
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [resources, setResources] = useState<any[]>([]);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [submissions, setSubmissions] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);

    // Submission Modal State
    const [submitModal, setSubmitModal] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
    const [submissionUrl, setSubmissionUrl] = useState('');
    const [submissionText, setSubmissionText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchDetails();
    }, [course.id]);

    const fetchDetails = async () => {
        try {
            setLoading(true);

            // 1. Fetch Announcements
            const { data: annData } = await supabase
                .from('announcements')
                .select('*')
                .eq('course_id', course.id)
                .order('created_at', { ascending: false });
            setAnnouncements(annData || []);

            // 2. Fetch Resources
            const { data: resData, error: resError } = await supabase
                .from('resources')
                .select('*')
                .eq('course_id', course.id)
                .order('uploaded_at', { ascending: false });
            if (resError) console.error('Resources fetch error:', resError);
            setResources(resData || []);

            // 3. Fetch Assignments
            const { data: assignData, error: assignError } = await supabase
                .from('assignments')
                .select('*')
                .eq('course_id', course.id)
                .order('due_date', { ascending: true });
            if (assignError) console.error('Assignments fetch error:', assignError);
            setAssignments(assignData || []);

            // 4. Fetch student's submissions
            if (session?.user?.id && assignData) {
                const { data: subData } = await supabase
                    .from('assignment_submissions')
                    .select('*')
                    .eq('student_id', session.user.id)
                    .in('assignment_id', assignData.map(a => a.id));

                const subMap: Record<string, any> = {};
                (subData || []).forEach(s => { subMap[s.assignment_id] = s; });
                setSubmissions(subMap);
            }

        } catch (error) {
            console.error('Error fetching course details:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'No date';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    };

    const getResourceIcon = (type: string) => {
        const t = (type || '').toLowerCase();
        if (t.includes('pdf')) return <FileText size={20} className="text-red-500" />;
        if (t.includes('video')) return <Video size={20} className="text-blue-500" />;
        if (t.includes('link')) return <LinkIcon size={20} className="text-green-500" />;
        return <Download size={20} className="text-gray-500" />;
    };

    const isOverdue = (dueDate: string) => {
        if (!dueDate) return false; // No due date = not overdue
        return new Date(dueDate) < new Date();
    };

    const openSubmitModal = (assignment: any) => {
        setSelectedAssignment(assignment);
        setSubmissionUrl('');
        setSubmissionText('');
        setSubmitModal(true);
    };

    const handleSubmit = async () => {
        if (!selectedAssignment || !session?.user?.id) return;
        if (!submissionUrl && !submissionText) {
            alert('Please provide a submission URL or text.');
            return;
        }

        try {
            setSubmitting(true);
            const { error } = await supabase
                .from('assignment_submissions')
                .insert([{
                    assignment_id: selectedAssignment.id,
                    student_id: session.user.id,
                    submission_url: submissionUrl || null,
                    submission_text: submissionText || null,
                    submitted_at: new Date().toISOString()
                }]);

            if (error) throw error;

            alert('Assignment submitted successfully!');
            setSubmitModal(false);
            fetchDetails(); // Refresh to update submissions
        } catch (err: any) {
            console.error('Error submitting:', err);
            alert('Failed to submit: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="h-full bg-[#F4F4F5] p-4 lg:p-8 overflow-y-auto rounded-t-[2rem] rounded-b-none md:rounded-b-[2rem] font-sans pb-32">

            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={onBack}
                    className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm hover:bg-gray-50 transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-black text-gray-900">{course.name}</h1>
                    <div className="flex items-center gap-3 text-sm text-gray-500 font-medium">
                        <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-xs font-bold">{course.code}</span>
                        <span className="flex items-center gap-1"><User size={14} /> {course.faculty?.name || 'Faculty'}</span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {[
                    { id: 'announcements', label: 'Announcements', icon: Megaphone },
                    { id: 'assignments', label: 'Assignments', icon: ClipboardCheck },
                    { id: 'resources', label: 'Resources', icon: FileText }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab.id
                            ? 'bg-black text-white'
                            : 'bg-white text-gray-500 hover:bg-gray-100'
                            }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                        {tab.id === 'assignments' && assignments.length > 0 && (
                            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${activeTab === tab.id ? 'bg-white/20' : 'bg-blue-100 text-blue-600'
                                }`}>
                                {assignments.length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="max-w-4xl">
                {loading ? (
                    <div className="text-center py-12 text-gray-400 font-medium">Loading details...</div>
                ) : (
                    <AnimatePresence mode="wait">
                        {/* Announcements Tab */}
                        {activeTab === 'announcements' && (
                            <motion.div
                                key="announcements"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-4"
                            >
                                {announcements.length > 0 ? announcements.map((ann) => (
                                    <div key={ann.id} className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-gray-100">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                                                    <Megaphone size={16} />
                                                </div>
                                                <h3 className="font-bold text-lg text-gray-900">{ann.title}</h3>
                                            </div>
                                            <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded">
                                                {formatDate(ann.created_at)}
                                            </span>
                                        </div>
                                        <p className="text-gray-600 leading-relaxed text-sm pl-11">
                                            {ann.content || ann.message || 'No content provided.'}
                                        </p>
                                    </div>
                                )) : (
                                    <div className="text-center py-12 bg-white rounded-[2rem] border border-dashed border-gray-200">
                                        <Megaphone size={40} className="mx-auto text-gray-300 mb-4" />
                                        <p className="text-gray-400 font-bold">No announcements yet.</p>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* Assignments Tab */}
                        {activeTab === 'assignments' && (
                            <motion.div
                                key="assignments"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-4"
                            >
                                {assignments.length > 0 ? assignments.map((assign) => {
                                    const submission = submissions[assign.id];
                                    const overdue = isOverdue(assign.due_date);

                                    return (
                                        <div key={assign.id} className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-gray-100">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg ${submission ? 'bg-green-50 text-green-600' :
                                                        overdue ? 'bg-red-50 text-red-600' :
                                                            'bg-blue-50 text-blue-600'
                                                        }`}>
                                                        <ClipboardCheck size={18} />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-lg text-gray-900">{assign.title}</h3>
                                                        <p className="text-sm text-gray-500">{assign.description}</p>
                                                    </div>
                                                </div>
                                                {submission ? (
                                                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                                                        ✓ Submitted
                                                    </span>
                                                ) : overdue ? (
                                                    <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">
                                                        Overdue
                                                    </span>
                                                ) : (
                                                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
                                                        Pending
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar size={14} />
                                                        Due: {formatDate(assign.due_date)}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <FileText size={14} />
                                                        {assign.total_marks || 100} marks
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    {submission?.marks_obtained != null && (
                                                        <span className="text-sm font-bold text-green-600">
                                                            Score: {submission.marks_obtained}/{assign.total_marks || 100}
                                                        </span>
                                                    )}
                                                    {!submission && !overdue && (
                                                        <button
                                                            onClick={() => openSubmitModal(assign)}
                                                            className="px-4 py-2 bg-black text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-gray-800 transition-colors"
                                                        >
                                                            <Send size={12} /> Submit
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <div className="text-center py-12 bg-white rounded-[2rem] border border-dashed border-gray-200">
                                        <ClipboardCheck size={40} className="mx-auto text-gray-300 mb-4" />
                                        <p className="text-gray-400 font-bold">No assignments yet.</p>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* Resources Tab */}
                        {activeTab === 'resources' && (
                            <motion.div
                                key="resources"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-3"
                            >
                                {resources.length > 0 ? resources.map((res) => (
                                    <div key={res.id} className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-gray-100 hover:shadow-md transition-all flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center">
                                                {getResourceIcon(res.type)}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{res.title}</h3>
                                                <p className="text-xs text-gray-400 font-medium">{res.description}</p>
                                            </div>
                                        </div>
                                        <a
                                            href={res.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="px-4 py-2 bg-black text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-colors flex items-center gap-2"
                                        >
                                            <Download size={14} /> Open
                                        </a>
                                    </div>
                                )) : (
                                    <div className="text-center py-12 bg-white rounded-[2rem] border border-dashed border-gray-200">
                                        <FileText size={40} className="mx-auto text-gray-300 mb-4" />
                                        <p className="text-gray-400 font-bold">No resources shared yet.</p>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
            </div>

            {/* Submission Modal */}
            {submitModal && selectedAssignment && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[2rem] max-w-lg w-full p-8 shadow-2xl">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Submit Assignment</h2>
                                <p className="text-gray-500 text-sm">{selectedAssignment.title}</p>
                            </div>
                            <button
                                onClick={() => setSubmitModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
                                    Submission URL (Google Drive, GitHub, etc.)
                                </label>
                                <input
                                    type="url"
                                    value={submissionUrl}
                                    onChange={(e) => setSubmissionUrl(e.target.value)}
                                    placeholder="https://drive.google.com/..."
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
                                />
                            </div>

                            <div className="text-center text-gray-400 text-sm font-bold">OR</div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
                                    Text Answer
                                </label>
                                <textarea
                                    value={submissionText}
                                    onChange={(e) => setSubmissionText(e.target.value)}
                                    rows={5}
                                    placeholder="Type your answer here..."
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-black resize-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setSubmitModal(false)}
                                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="flex-1 px-6 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <Send size={16} /> {submitting ? 'Submitting...' : 'Submit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentCourseDetails;
