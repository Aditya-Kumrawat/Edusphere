import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, FileText, Award } from 'lucide-react';

interface AssignmentAnalyticsProps {
    totalStudents: number;
    submissions: any[];
}

const AssignmentAnalytics: React.FC<AssignmentAnalyticsProps> = ({ totalStudents, submissions }) => {
    const submittedCount = submissions.length;
    const gradedCount = submissions.filter(s => s.marks_obtained != null).length;
    const pendingCount = Math.max(0, totalStudents - submittedCount);

    // Data for Flowchart (Pipeline)
    const workflowSteps = [
        {
            id: 1,
            label: 'Assigned',
            count: totalStudents,
            icon: FileText,
            color: 'bg-blue-100 text-blue-600',
            barColor: 'bg-blue-500'
        },
        {
            id: 2,
            label: 'Submitted',
            count: submittedCount,
            icon: CheckCircle,
            color: 'bg-purple-100 text-purple-600',
            barColor: 'bg-purple-500'
        },
        {
            id: 3,
            label: 'Graded',
            count: gradedCount,
            icon: Award,
            color: 'bg-green-100 text-green-600',
            barColor: 'bg-green-500'
        }
    ];

    // Data for Grade Distribution
    const getGrade = (marks: number, total: number) => {
        const percentage = (marks / total) * 100;
        if (percentage >= 90) return 'A';
        if (percentage >= 80) return 'B';
        if (percentage >= 70) return 'C';
        if (percentage >= 60) return 'D';
        return 'F';
    };

    const gradeData = [
        { name: 'A', count: 0 },
        { name: 'B', count: 0 },
        { name: 'C', count: 0 },
        { name: 'D', count: 0 },
        { name: 'F', count: 0 },
    ];

    submissions.forEach(sub => {
        if (sub.marks_obtained != null) {
            const grade = getGrade(sub.marks_obtained, 100); // Assuming 100 for now, prop could be passed
            const idx = gradeData.findIndex(g => g.name === grade);
            if (idx !== -1) gradeData[idx].count++;
        }
    });

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Flowchart / Progress Pipeline */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-6">Submission Pipeline</h3>
                <div className="flex flex-col gap-6 relative">
                    {/* Connecting Line */}
                    <div className="absolute left-[2.25rem] top-8 bottom-8 w-1 bg-gray-100 -z-0 lg:left-[2.25rem]" />

                    {workflowSteps.map((step, index) => (
                        <motion.div
                            key={step.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-center gap-4 relative z-10"
                        >
                            <div className={`w-18 h-18 p-4 rounded-2xl ${step.color} shadow-sm border-2 border-white`}>
                                <step.icon size={24} />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between mb-2">
                                    <span className="font-bold text-gray-700">{step.label}</span>
                                    <span className="font-bold text-gray-900">{step.count}</span>
                                </div>
                                <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(step.count / totalStudents) * 100}%` }}
                                        transition={{ duration: 1, ease: "easeOut" }}
                                        className={`h-full ${step.barColor} rounded-full`}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Grade Distribution Bar Chart */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-6">Grade Distribution</h3>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={gradeData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12, fontWeight: 'bold' }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                            <Tooltip
                                cursor={{ fill: '#F9FAFB' }}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="count" radius={[8, 8, 8, 8]} barSize={40}>
                                {gradeData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={['#22c55e', '#3b82f6', '#eab308', '#f97316', '#ef4444'][index]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                {gradedCount === 0 && (
                    <div className="text-center text-xs text-gray-400 mt-2">No grades recorded yet logic</div>
                )}
            </div>
        </div>
    );
};

export default AssignmentAnalytics;
