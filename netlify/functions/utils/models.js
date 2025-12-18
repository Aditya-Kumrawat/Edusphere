/**
 * MongoDB Models - Re-exported for Netlify Functions
 */

import mongoose from 'mongoose';

// ============================================
// USER SCHEMA
// ============================================
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    full_name: { type: String, required: true },
    role: { type: String, enum: ['STUDENT', 'FACULTY', 'ADMIN'], required: true },
    avatar_url: String,
    batch: String,
    enrollment_number: { type: String, unique: true, sparse: true },
    department: { type: String, default: 'General' },
    dob: Date,
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    mobile: String,
    parent_name: String,
    address: String,
    section: String,
    admission_year: Number,
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

// ============================================
// COURSE SCHEMA
// ============================================
const courseSchema = new mongoose.Schema({
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    description: String,
    faculty_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    credits: { type: Number, default: 3 },
    semester: String,
    schedule: String,
    room: String,
    max_students: { type: Number, default: 60 },
    class_code: { type: String, unique: true },
    created_at: { type: Date, default: Date.now }
});

// ============================================
// ENROLLMENT SCHEMA
// ============================================
const enrollmentSchema = new mongoose.Schema({
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    enrolled_at: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'dropped', 'completed'], default: 'active' }
});
enrollmentSchema.index({ student_id: 1, course_id: 1 }, { unique: true });

// ============================================
// ATTENDANCE SCHEMA
// ============================================
const attendanceSchema = new mongoose.Schema({
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    date: { type: Date, required: true },
    status: { type: String, enum: ['present', 'absent', 'late', 'excused'], default: 'present' },
    session_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendanceSession' },
    created_at: { type: Date, default: Date.now }
});

// ============================================
// GRADE SCHEMA
// ============================================
const gradeSchema = new mongoose.Schema({
    enrollment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Enrollment', required: true },
    internal_marks: { type: Number, default: 0 },
    external_marks: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    grade: String,
    created_at: { type: Date, default: Date.now }
});

// ============================================
// ANNOUNCEMENT SCHEMA
// ============================================
const announcementSchema = new mongoose.Schema({
    course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    author_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    content: String,
    created_at: { type: Date, default: Date.now }
});

// ============================================
// TEST SCHEMA
// ============================================
const testSchema = new mongoose.Schema({
    course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    creator_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    title: { type: String, required: true },
    topic: { type: String, required: true },
    description: String,
    subject: { type: String, required: true },
    difficulty: { type: String, default: 'Medium' },
    questions: { type: mongoose.Schema.Types.Mixed, required: true },
    duration: { type: Number, required: true },
    total_marks: { type: Number, required: true },
    due_date: Date,
    status: { type: String, default: 'published' },
    created_at: { type: Date, default: Date.now }
});

// ============================================
// QUIZ RESULT SCHEMA
// ============================================
const quizResultSchema = new mongoose.Schema({
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    test_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Test' },
    student_name: { type: String, required: true },
    subject: { type: String, required: true },
    grade: { type: Number, required: true },
    mode: { type: String, required: true },
    score: { type: Number, default: 0 },
    total_questions: { type: Number, required: true },
    correct_answers: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 },
    duration: { type: Number, default: 0 },
    completed_at: { type: Date, default: Date.now }
});

// ============================================
// ASSIGNMENT SCHEMA
// ============================================
const assignmentSchema = new mongoose.Schema({
    course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    title: { type: String, required: true },
    description: String,
    due_date: Date,
    total_marks: { type: Number, default: 100 },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    created_at: { type: Date, default: Date.now }
});

// ============================================
// ATTENDANCE SESSION SCHEMA
// ============================================
const attendanceSessionSchema = new mongoose.Schema({
    classroom_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    teacher_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    nonce: { type: String, required: true },
    active: { type: Boolean, default: true },
    created_at: { type: Date, default: Date.now }
});

// ============================================
// RESOURCE SCHEMA
// ============================================
const resourceSchema = new mongoose.Schema({
    course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    title: { type: String, required: true },
    description: String,
    file_url: String,
    file_type: String,
    uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    created_at: { type: Date, default: Date.now }
});

// Create models - use existing or create new
export const User = mongoose.models.User || mongoose.model('User', userSchema);
export const Course = mongoose.models.Course || mongoose.model('Course', courseSchema);
export const Enrollment = mongoose.models.Enrollment || mongoose.model('Enrollment', enrollmentSchema);
export const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);
export const Grade = mongoose.models.Grade || mongoose.model('Grade', gradeSchema);
export const Announcement = mongoose.models.Announcement || mongoose.model('Announcement', announcementSchema);
export const Test = mongoose.models.Test || mongoose.model('Test', testSchema);
export const QuizResult = mongoose.models.QuizResult || mongoose.model('QuizResult', quizResultSchema);
export const Assignment = mongoose.models.Assignment || mongoose.model('Assignment', assignmentSchema);
export const AttendanceSession = mongoose.models.AttendanceSession || mongoose.model('AttendanceSession', attendanceSessionSchema);
export const Resource = mongoose.models.Resource || mongoose.model('Resource', resourceSchema);
