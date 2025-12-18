import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, CheckCircle, Clock, XCircle, Download, Eye, MoreVertical } from 'lucide-react';

interface SubmissionListProps {
    students: any[];
    submissions: any[];
    onGrade: (studentId: string, submission: any) => void;
}

const SubmissionList: React.FC<SubmissionListProps> = ({ students, submissions, onGrade }) => {
    const [filter, setFilter] = useState<'all' | 'submitted' | 'pending'>('all');
    const [search, setSearch] = useState('');

    const getSubmission = (studentId: string) => submissions.find(s => s.student_id === studentId);

    const filteredStudents = students.filter(student => {
        const submission = getSubmission(student.id);
        const hasSubmitted = !!submission;

        // Status Filter
        if (filter === 'submitted' && !hasSubmitted) return false;
        if (filter === 'pending' && hasSubmitted) return false;

        // Search Filter
        if (search) {
            const term = search.toLowerCase();
            return (
                student.full_name?.toLowerCase().includes(term) ||
                student.enrollment_number?.toLowerCase().includes(term)
            );
        }
        return true;
    });

    return (
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
            {/* Header / Filters */}
            <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    {['all', 'submitted', 'pending'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f as any)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-colors whitespace-nowrap ${filter === f
                                    ? 'bg-black text-white'
                                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:w-64">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search student..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl border border-transparent focus:border-gray-200 outline-none font-medium text-sm"
                    />
                </div>
            </div>

            {/* List */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50/50">
                        <tr>
                            <th className="text-left p-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Student</th>
                            <th className="text-left p-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                            <th className="text-left p-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Submitted At</th>
                            <th className="text-left p-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Marks</th>
                            <th className="text-right p-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredStudents.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-12 text-center text-gray-400">
                                    No students found matching filters.
                                </td>
                            </tr>
                        ) : (
                            filteredStudents.map((student, i) => {
                                const submission = getSubmission(student.id);
                                return (
                                    <motion.tr
                                        key={student.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="hover:bg-gray-50/80 transition-colors"
                                    >
                                        <td className="p-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden font-bold text-gray-500">
                                                    {student.avatar_url ? (
                                                        <img src={student.avatar_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        student.full_name?.[0]
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900">{student.full_name}</p>
                                                    <p className="text-xs text-gray-500">{student.enrollment_number || 'No ID'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6">
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
                                        <td className="p-6 text-sm font-medium text-gray-600">
                                            {submission?.submitted_at ? new Date(submission.submitted_at).toLocaleString() : '-'}
                                        </td>
                                        <td className="p-6">
                                            {submission?.marks_obtained != null ? (
                                                <span className="font-bold text-gray-900">{submission.marks_obtained}</span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="p-6 text-right">
                                            {submission ? (
                                                <button
                                                    onClick={() => onGrade(student.id, submission)}
                                                    className="px-4 py-2 bg-black text-white rounded-xl text-xs font-bold hover:opacity-80 transition-opacity"
                                                >
                                                    Review
                                                </button>
                                            ) : (
                                                <button disabled className="px-4 py-2 bg-gray-100 text-gray-400 rounded-xl text-xs font-bold cursor-not-allowed">
                                                    No Submission
                                                </button>
                                            )}
                                        </td>
                                    </motion.tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SubmissionList;
