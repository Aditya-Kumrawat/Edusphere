/**
 * Express Backend Server for EduSphere SIS
 * MongoDB Authentication API
 */

import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { connectDB } from './connection.js';
import { User } from './models/index.js';

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'datacraft-super-secret-jwt-key-change-in-production-2024';

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true
}));
app.use(express.json());

// Connect to MongoDB
connectDB();

// ============================================
// AUTH ENDPOINTS
// ============================================

// POST /api/auth/login - Login user
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password, role } = req.body;

        // Validate input
        if (!email || !password || !role) {
            return res.status(400).json({ error: 'Email, password, and role are required' });
        }

        // Find user by email
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Verify role
        if (user.role !== role) {
            return res.status(403).json({ error: `Role mismatch. Please login as ${user.role}` });
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                userId: user._id,
                email: user.email,
                role: user.role
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Return user data (without password)
        const userResponse = {
            id: user._id,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            avatar_url: user.avatar_url,
            department: user.department,
            enrollment_number: user.enrollment_number,
            batch: user.batch
        };

        res.json({
            token,
            user: userResponse
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/auth/register - Register new user
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, full_name, role, enrollment_number } = req.body;

        // Validate input
        if (!email || !password || !full_name || !role) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(409).json({ error: 'User with this email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const newUser = await User.create({
            email: email.toLowerCase(),
            password: hashedPassword,
            full_name,
            role: role.toUpperCase(),
            enrollment_number: role === 'STUDENT' ? enrollment_number : undefined,
            department: 'General'
        });

        // Generate JWT token
        const token = jwt.sign(
            {
                userId: newUser._id,
                email: newUser.email,
                role: newUser.role
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Return user data
        const userResponse = {
            id: newUser._id,
            email: newUser.email,
            full_name: newUser.full_name,
            role: newUser.role,
            enrollment_number: newUser.enrollment_number
        };

        res.status(201).json({
            token,
            user: userResponse
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/auth/me - Get current user (protected route)
app.get('/api/auth/me', async (req, res) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7);

        // Verify token
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        // Find user
        const user = await User.findById(decoded.userId).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user });

    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// MIDDLEWARE - JWT Authentication
// ============================================
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Add user info to request
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

// ============================================
// FACULTY/DATA ENDPOINTS
// ============================================

// GET /api/courses - Get all courses (or filter by faculty)
app.get('/api/courses', authenticateToken, async (req, res) => {
    try {
        const { Course } = await import('./models/index.js');
        const query = {};

        // If faculty, only return their courses
        if (req.user.role === 'FACULTY') {
            query.faculty_id = req.user.userId;
        }

        const courses = await Course.find(query).populate('faculty_id', 'full_name email');
        res.json(courses);
    } catch (error) {
        console.error('Get courses error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/courses/:id - Get course by ID
app.get('/api/courses/:id', authenticateToken, async (req, res) => {
    try {
        const { Course } = await import('./models/index.js');
        const course = await Course.findById(req.params.id).populate('faculty_id', 'full_name email');

        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }

        res.json(course);
    } catch (error) {
        console.error('Get course error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/courses - Create new course (faculty/admin only)
app.post('/api/courses', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'FACULTY' && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { Course } = await import('./models/index.js');
        const courseData = {
            ...req.body,
            faculty_id: req.user.role === 'FACULTY' ? req.user.userId : req.body.faculty_id
        };

        const course = await Course.create(courseData);
        res.status(201).json(course);
    } catch (error) {
        console.error('Create course error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/enrollments - Get enrollments
app.get('/api/enrollments', authenticateToken, async (req, res) => {
    try {
        const { Enrollment } = await import('./models/index.js');
        const { student_id, course_id } = req.query;

        const query = {};
        if (student_id) query.student_id = student_id;
        if (course_id) query.course_id = course_id;

        const enrollments = await Enrollment.find(query)
            .populate('student_id', 'full_name email enrollment_number')
            .populate('course_id', 'name code');

        res.json(enrollments);
    } catch (error) {
        console.error('Get enrollments error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/enrollments - Create enrollment
app.post('/api/enrollments', authenticateToken, async (req, res) => {
    try {
        const { Enrollment } = await import('./models/index.js');
        const enrollment = await Enrollment.create(req.body);
        res.status(201).json(enrollment);
    } catch (error) {
        console.error('Create enrollment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/attendance - Get attendance records
app.get('/api/attendance', authenticateToken, async (req, res) => {
    try {
        const { Attendance } = await import('./models/index.js');
        const { student_id, course_id, date } = req.query;

        const query = {};
        if (student_id) query.student_id = student_id;
        if (course_id) query.course_id = course_id;
        if (date) query.date = new Date(date);

        const attendance = await Attendance.find(query)
            .populate('student_id', 'full_name enrollment_number')
            .populate('course_id', 'name code');

        res.json(attendance);
    } catch (error) {
        console.error('Get attendance error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/attendance - Mark attendance
app.post('/api/attendance', authenticateToken, async (req, res) => {
    try {
        const { Attendance } = await import('./models/index.js');
        const attendance = await Attendance.create(req.body);
        res.status(201).json(attendance);
    } catch (error) {
        console.error('Mark attendance error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/grades - Get grades
app.get('/api/grades', authenticateToken, async (req, res) => {
    try {
        const { Grade } = await import('./models/index.js');
        const { enrollment_id } = req.query;

        const query = enrollment_id ? { enrollment_id } : {};
        const grades = await Grade.find(query).populate('enrollment_id');

        res.json(grades);
    } catch (error) {
        console.error('Get grades error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/grades - Create or update grade
app.post('/api/grades', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'FACULTY' && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { Grade } = await import('./models/index.js');
        const { enrollment_id, internal_marks, external_marks, grade, total } = req.body;

        // Check if grade exists
        let gradeRecord = await Grade.findOne({ enrollment_id });

        if (gradeRecord) {
            // Update existing
            gradeRecord.internal_marks = internal_marks;
            gradeRecord.external_marks = external_marks;
            gradeRecord.total = total || (internal_marks + external_marks);
            gradeRecord.grade = grade;
            await gradeRecord.save();
        } else {
            // Create new
            gradeRecord = await Grade.create({
                enrollment_id,
                internal_marks,
                external_marks,
                total: total || (internal_marks + external_marks),
                grade
            });
        }

        res.json(gradeRecord);
    } catch (error) {
        console.error('Save grade error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/announcements - Get announcements
app.get('/api/announcements', authenticateToken, async (req, res) => {
    try {
        const { Announcement } = await import('./models/index.js');
        const { course_id } = req.query;

        const query = course_id ? { course_id } : {};
        const announcements = await Announcement.find(query)
            .populate('author_id', 'full_name')
            .populate('course_id', 'name code')
            .sort({ created_at: -1 });

        res.json(announcements);
    } catch (error) {
        console.error('Get announcements error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/announcements - Create announcement
app.post('/api/announcements', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'FACULTY' && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { Announcement } = await import('./models/index.js');
        const announcement = await Announcement.create({
            ...req.body,
            author_id: req.user.userId
        });

        res.status(201).json(announcement);
    } catch (error) {
        console.error('Create announcement error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/tests - Get tests
app.get('/api/tests', authenticateToken, async (req, res) => {
    try {
        const { Test } = await import('./models/index.js');
        const { course_id } = req.query;

        const query = {};
        if (course_id) query.course_id = course_id;
        if (req.user.role === 'FACULTY') query.creator_id = req.user.userId;

        const tests = await Test.find(query)
            .populate('course_id', 'name code')
            .populate('creator_id', 'full_name')
            .sort({ created_at: -1 });

        res.json(tests);
    } catch (error) {
        console.error('Get tests error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/tests - Create test
app.post('/api/tests', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'FACULTY' && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { Test } = await import('./models/index.js');
        const test = await Test.create({
            ...req.body,
            creator_id: req.user.userId
        });

        res.status(201).json(test);
    } catch (error) {
        console.error('Create test error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/quiz-results - Get quiz results
app.get('/api/quiz-results', authenticateToken, async (req, res) => {
    try {
        const { QuizResult } = await import('./models/index.js');
        const { test_id, student_id } = req.query;

        const query = {};
        if (test_id) query.test_id = test_id;
        if (student_id) query.student_id = student_id;

        const results = await QuizResult.find(query)
            .populate('student_id', 'full_name email')
            .populate('test_id', 'title')
            .sort({ completed_at: -1 });

        res.json(results);
    } catch (error) {
        console.error('Get quiz results error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/users - Get users (for admin/faculty)
app.get('/api/users', authenticateToken, async (req, res) => {
    try {
        const { role, id } = req.query;

        // If id is provided, return single user
        if (id) {
            const user = await User.findById(id).select('-password');
            if (!user) return res.status(404).json({ error: 'User not found' });
            return res.json(user);
        }

        const query = role ? { role: role.toUpperCase() } : {};
        const users = await User.find(query).select('-password');
        res.json(users);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// PROFILES ENDPOINTS (alias for users)
// ============================================

// GET /api/profiles - Get user profiles (for student pages)
app.get('/api/profiles', authenticateToken, async (req, res) => {
    try {
        const { id } = req.query;

        if (id) {
            const user = await User.findById(id).select('-password');
            if (!user) return res.json([]);
            return res.json([user]);
        }

        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        console.error('Get profiles error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/profiles - Update user profile
app.put('/api/profiles', authenticateToken, async (req, res) => {
    try {
        const { id } = req.query;
        const userId = id || req.user.userId;

        const updated = await User.findByIdAndUpdate(userId, req.body, { new: true }).select('-password');
        if (!updated) return res.status(404).json({ error: 'User not found' });

        res.json(updated);
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// ASSIGNMENTS ENDPOINTS
// ============================================

// GET /api/assignments - Get assignments
app.get('/api/assignments', authenticateToken, async (req, res) => {
    try {
        const { Assignment } = await import('./models/index.js');
        const { course_id } = req.query;

        const query = course_id ? { course_id } : {};
        const assignments = await Assignment.find(query)
            .populate('course_id', 'name code')
            .populate('created_by', 'full_name')
            .sort({ due_date: 1 });

        res.json(assignments);
    } catch (error) {
        console.error('Get assignments error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/assignments - Create assignment
app.post('/api/assignments', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'FACULTY' && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { Assignment } = await import('./models/index.js');
        const assignment = await Assignment.create({
            ...req.body,
            created_by: req.user.userId
        });

        res.status(201).json(assignment);
    } catch (error) {
        console.error('Create assignment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// ASSIGNMENT SUBMISSIONS ENDPOINTS
// ============================================

// GET /api/assignment_submissions - Get submissions
app.get('/api/assignment_submissions', authenticateToken, async (req, res) => {
    try {
        const { AssignmentSubmission } = await import('./models/index.js');
        const { assignment_id, student_id } = req.query;

        const query = {};
        if (assignment_id) query.assignment_id = assignment_id;
        if (student_id) query.student_id = student_id;

        const submissions = await AssignmentSubmission.find(query)
            .populate('assignment_id')
            .populate('student_id', 'full_name email')
            .sort({ submitted_at: -1 });

        res.json(submissions);
    } catch (error) {
        console.error('Get submissions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/assignment_submissions - Submit assignment
app.post('/api/assignment_submissions', authenticateToken, async (req, res) => {
    try {
        const { AssignmentSubmission } = await import('./models/index.js');
        const submission = await AssignmentSubmission.create({
            ...req.body,
            student_id: req.body.student_id || req.user.userId
        });

        res.status(201).json(submission);
    } catch (error) {
        console.error('Create submission error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// RESOURCES ENDPOINTS
// ============================================

// GET /api/resources - Get resources
app.get('/api/resources', authenticateToken, async (req, res) => {
    try {
        const { Resource } = await import('./models/index.js');
        const { course_id } = req.query;

        const query = course_id ? { course_id } : {};
        const resources = await Resource.find(query)
            .populate('course_id', 'name code')
            .populate('uploaded_by', 'full_name')
            .sort({ created_at: -1 });

        res.json(resources);
    } catch (error) {
        console.error('Get resources error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/resources - Create resource
app.post('/api/resources', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'FACULTY' && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { Resource } = await import('./models/index.js');
        const resource = await Resource.create({
            ...req.body,
            uploaded_by: req.user.userId
        });

        res.status(201).json(resource);
    } catch (error) {
        console.error('Create resource error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// NOTIFICATIONS ENDPOINTS
// ============================================

// GET /api/notifications - Get notifications (placeholder)
app.get('/api/notifications', authenticateToken, async (req, res) => {
    try {
        // For now, return empty array - notifications could be derived from announcements
        // or a dedicated notifications collection can be created later
        res.json([]);
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// ATTENDANCE SESSIONS ENDPOINTS
// ============================================

// GET /api/attendance_sessions - Get active attendance sessions
app.get('/api/attendance_sessions', authenticateToken, async (req, res) => {
    try {
        const { AttendanceSession } = await import('./models/index.js');
        const { id, classroom_id, active } = req.query;

        const query = {};
        if (id) query._id = id;
        if (classroom_id) query.classroom_id = classroom_id;
        if (active !== undefined) query.active = active === 'true';

        const sessions = await AttendanceSession.find(query)
            .populate('classroom_id', 'name code')
            .populate('teacher_id', 'full_name')
            .sort({ created_at: -1 });

        res.json(sessions);
    } catch (error) {
        console.error('Get attendance sessions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/attendance_sessions - Create attendance session (for QR)
app.post('/api/attendance_sessions', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'FACULTY' && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { AttendanceSession } = await import('./models/index.js');
        const session = await AttendanceSession.create({
            ...req.body,
            teacher_id: req.user.userId
        });

        res.status(201).json(session);
    } catch (error) {
        console.error('Create attendance session error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/attendance_sessions - Update session (e.g., end session)
app.put('/api/attendance_sessions', authenticateToken, async (req, res) => {
    try {
        const { id } = req.query;
        const { AttendanceSession } = await import('./models/index.js');

        const updated = await AttendanceSession.findByIdAndUpdate(id, req.body, { new: true });
        if (!updated) return res.status(404).json({ error: 'Session not found' });

        res.json(updated);
    } catch (error) {
        console.error('Update attendance session error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// QUIZ RESULTS POST ENDPOINT
// ============================================

// POST /api/quiz-results - Save quiz result
app.post('/api/quiz-results', authenticateToken, async (req, res) => {
    try {
        const { QuizResult } = await import('./models/index.js');
        const result = await QuizResult.create({
            ...req.body,
            student_id: req.body.student_id || req.user.userId
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('Save quiz result error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'EduSphere API Server running with MongoDB' });
});

// Start server
app.listen(PORT, () => {
    console.log(`\n🚀 EduSphere API Server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health\n`);
});
