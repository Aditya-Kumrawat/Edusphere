/**
 * Data API - Netlify Serverless Function
 * Handles: courses, enrollments, attendance, grades, announcements, tests, etc.
 */

import { connectDB } from './utils/db.js';
import {
    User, Course, Enrollment, Attendance, Grade,
    Announcement, Test, QuizResult, Assignment,
    AttendanceSession, Resource
} from './utils/models.js';
import { requireAuth } from './utils/auth.js';

const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

// Parse query string
const parseQuery = (event) => {
    return event.queryStringParameters || {};
};

export const handler = async (event, context) => {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    await connectDB();

    const path = event.path.replace('/.netlify/functions/data', '');
    const method = event.httpMethod;
    const query = parseQuery(event);

    // Require authentication for all data endpoints
    const user = requireAuth(event);
    if (user.statusCode) return user;

    try {
        // ===== COURSES =====
        if (path === '/courses' || path === '/courses/') {
            if (method === 'GET') {
                const q = {};
                if (user.role === 'FACULTY') q.faculty_id = user.userId;
                const courses = await Course.find(q).populate('faculty_id', 'full_name email');
                return { statusCode: 200, headers, body: JSON.stringify(courses) };
            }
            if (method === 'POST') {
                const data = JSON.parse(event.body);
                const course = await Course.create({
                    ...data,
                    faculty_id: user.role === 'FACULTY' ? user.userId : data.faculty_id
                });
                return { statusCode: 201, headers, body: JSON.stringify(course) };
            }
        }

        // ===== ENROLLMENTS =====
        if (path === '/enrollments' || path === '/enrollments/') {
            if (method === 'GET') {
                const q = {};
                if (query.student_id) q.student_id = query.student_id;
                if (query.course_id) q.course_id = query.course_id;
                const enrollments = await Enrollment.find(q)
                    .populate('student_id', 'full_name email enrollment_number')
                    .populate('course_id', 'name code');
                return { statusCode: 200, headers, body: JSON.stringify(enrollments) };
            }
            if (method === 'POST') {
                const data = JSON.parse(event.body);
                const enrollment = await Enrollment.create(data);
                return { statusCode: 201, headers, body: JSON.stringify(enrollment) };
            }
        }

        // ===== ATTENDANCE =====
        if (path === '/attendance' || path === '/attendance/') {
            if (method === 'GET') {
                const q = {};
                if (query.student_id) q.student_id = query.student_id;
                if (query.course_id) q.course_id = query.course_id;
                const attendance = await Attendance.find(q)
                    .populate('student_id', 'full_name enrollment_number')
                    .populate('course_id', 'name code');
                return { statusCode: 200, headers, body: JSON.stringify(attendance) };
            }
            if (method === 'POST') {
                const data = JSON.parse(event.body);
                const attendance = await Attendance.create(data);
                return { statusCode: 201, headers, body: JSON.stringify(attendance) };
            }
        }

        // ===== GRADES =====
        if (path === '/grades' || path === '/grades/') {
            if (method === 'GET') {
                const q = query.enrollment_id ? { enrollment_id: query.enrollment_id } : {};
                const grades = await Grade.find(q).populate('enrollment_id');
                return { statusCode: 200, headers, body: JSON.stringify(grades) };
            }
            if (method === 'POST') {
                const data = JSON.parse(event.body);
                let grade = await Grade.findOne({ enrollment_id: data.enrollment_id });
                if (grade) {
                    Object.assign(grade, data);
                    await grade.save();
                } else {
                    grade = await Grade.create(data);
                }
                return { statusCode: 200, headers, body: JSON.stringify(grade) };
            }
        }

        // ===== ANNOUNCEMENTS =====
        if (path === '/announcements' || path === '/announcements/') {
            if (method === 'GET') {
                const q = query.course_id ? { course_id: query.course_id } : {};
                const announcements = await Announcement.find(q)
                    .populate('author_id', 'full_name')
                    .populate('course_id', 'name code')
                    .sort({ created_at: -1 });
                return { statusCode: 200, headers, body: JSON.stringify(announcements) };
            }
            if (method === 'POST') {
                const data = JSON.parse(event.body);
                const announcement = await Announcement.create({
                    ...data,
                    author_id: user.userId
                });
                return { statusCode: 201, headers, body: JSON.stringify(announcement) };
            }
        }

        // ===== TESTS =====
        if (path === '/tests' || path === '/tests/') {
            if (method === 'GET') {
                const q = {};
                if (query.course_id) q.course_id = query.course_id;
                if (user.role === 'FACULTY') q.creator_id = user.userId;
                const tests = await Test.find(q)
                    .populate('course_id', 'name code')
                    .populate('creator_id', 'full_name')
                    .sort({ created_at: -1 });
                return { statusCode: 200, headers, body: JSON.stringify(tests) };
            }
            if (method === 'POST') {
                const data = JSON.parse(event.body);
                const test = await Test.create({
                    ...data,
                    creator_id: user.userId
                });
                return { statusCode: 201, headers, body: JSON.stringify(test) };
            }
        }

        // ===== QUIZ RESULTS =====
        if (path === '/quiz-results' || path === '/quiz-results/') {
            if (method === 'GET') {
                const q = {};
                if (query.test_id) q.test_id = query.test_id;
                if (query.student_id) q.student_id = query.student_id;
                const results = await QuizResult.find(q)
                    .populate('student_id', 'full_name email')
                    .populate('test_id', 'title')
                    .sort({ completed_at: -1 });
                return { statusCode: 200, headers, body: JSON.stringify(results) };
            }
            if (method === 'POST') {
                const data = JSON.parse(event.body);
                const result = await QuizResult.create({
                    ...data,
                    student_id: data.student_id || user.userId
                });
                return { statusCode: 201, headers, body: JSON.stringify(result) };
            }
        }

        // ===== USERS/PROFILES =====
        if (path === '/users' || path === '/users/' || path === '/profiles' || path === '/profiles/') {
            if (method === 'GET') {
                if (query.id) {
                    const u = await User.findById(query.id).select('-password');
                    return { statusCode: 200, headers, body: JSON.stringify(u ? [u] : []) };
                }
                const q = query.role ? { role: query.role.toUpperCase() } : {};
                const users = await User.find(q).select('-password');
                return { statusCode: 200, headers, body: JSON.stringify(users) };
            }
            if (method === 'PUT') {
                const data = JSON.parse(event.body);
                const id = query.id || user.userId;
                const updated = await User.findByIdAndUpdate(id, data, { new: true }).select('-password');
                return { statusCode: 200, headers, body: JSON.stringify(updated) };
            }
        }

        // ===== ASSIGNMENTS =====
        if (path === '/assignments' || path === '/assignments/') {
            if (method === 'GET') {
                const q = query.course_id ? { course_id: query.course_id } : {};
                const assignments = await Assignment.find(q)
                    .populate('course_id', 'name code')
                    .populate('created_by', 'full_name');
                return { statusCode: 200, headers, body: JSON.stringify(assignments) };
            }
            if (method === 'POST') {
                const data = JSON.parse(event.body);
                const assignment = await Assignment.create({
                    ...data,
                    created_by: user.userId
                });
                return { statusCode: 201, headers, body: JSON.stringify(assignment) };
            }
        }

        // ===== RESOURCES =====
        if (path === '/resources' || path === '/resources/') {
            if (method === 'GET') {
                const q = query.course_id ? { course_id: query.course_id } : {};
                const resources = await Resource.find(q).populate('uploaded_by', 'full_name');
                return { statusCode: 200, headers, body: JSON.stringify(resources) };
            }
            if (method === 'POST') {
                const data = JSON.parse(event.body);
                const resource = await Resource.create({
                    ...data,
                    uploaded_by: user.userId
                });
                return { statusCode: 201, headers, body: JSON.stringify(resource) };
            }
        }

        // ===== ATTENDANCE SESSIONS =====
        if (path === '/attendance_sessions' || path === '/attendance_sessions/') {
            if (method === 'GET') {
                const q = {};
                if (query.classroom_id) q.classroom_id = query.classroom_id;
                if (query.active !== undefined) q.active = query.active === 'true';
                const sessions = await AttendanceSession.find(q)
                    .populate('classroom_id', 'name code')
                    .populate('teacher_id', 'full_name');
                return { statusCode: 200, headers, body: JSON.stringify(sessions) };
            }
            if (method === 'POST') {
                const data = JSON.parse(event.body);
                const session = await AttendanceSession.create({
                    ...data,
                    teacher_id: user.userId
                });
                return { statusCode: 201, headers, body: JSON.stringify(session) };
            }
        }

        // ===== NOTIFICATIONS (placeholder) =====
        if (path === '/notifications' || path === '/notifications/') {
            return { statusCode: 200, headers, body: JSON.stringify([]) };
        }

        // Not found
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: `Route not found: ${path}` })
        };

    } catch (error) {
        console.error('Data API Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};
