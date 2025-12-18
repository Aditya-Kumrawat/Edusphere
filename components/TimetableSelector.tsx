import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Clock, Calendar } from './Icons';

interface TimetableSelectorProps {
    courseId: string;
    onSelect: (lecture: any) => void;
    selectedLecture: any;
}

const TimetableSelector: React.FC<TimetableSelectorProps> = ({ courseId, onSelect, selectedLecture }) => {
    const [timetable, setTimetable] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = weekdays[new Date().getDay()];

    useEffect(() => {
        fetchTimetable();
    }, [courseId]);

    const fetchTimetable = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('timetable')
                .select('*')
                .eq('classroom_id', courseId)
                .eq('weekday', today)
                .order('start_time');

            if (error) throw error;
            setTimetable(data || []);
        } catch (err) {
            console.error('Error fetching timetable:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (time: string) => {
        const [hours, minutes] = time.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${minutes} ${ampm}`;
    };

    if (loading) {
        return <div className="text-gray-400 text-sm p-4">Loading timetable...</div>;
    }

    if (timetable.length === 0) {
        return (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
                <p className="text-orange-600 font-medium text-sm">No lectures scheduled for {today}</p>
                <p className="text-orange-500 text-xs mt-1">You can still start a manual attendance session</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <Calendar size={14} />
                <span className="font-bold">{today}'s Schedule</span>
            </div>

            {timetable.map((lecture) => (
                <button
                    key={lecture.id}
                    onClick={() => onSelect(lecture)}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${selectedLecture?.id === lecture.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-100 bg-white hover:border-gray-200'
                        }`}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedLecture?.id === lecture.id ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'
                                }`}>
                                <Clock size={18} />
                            </div>
                            <div>
                                <p className="font-bold text-gray-900">
                                    {formatTime(lecture.start_time)} – {formatTime(lecture.end_time)}
                                </p>
                                <p className="text-xs text-gray-500">{lecture.session_type}</p>
                            </div>
                        </div>
                        {selectedLecture?.id === lecture.id && (
                            <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                                Selected
                            </span>
                        )}
                    </div>
                </button>
            ))}
        </div>
    );
};

export default TimetableSelector;
