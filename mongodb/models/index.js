/**
 * MongoDB Models for EduSphere SIS
 * Converted from Supabase/PostgreSQL Schema
 * 
 * Collections Overview:
 * - users (profiles)
 * - courses
 * - enrollments
 * - attendance
 * - attendance_sessions
 * - timetable
 * - grades
 * - announcements
 * - calendar_events
 * - assignments
 * - assignment_submissions
 * - exam_entries
 * - resources
 * - tests
 * - quiz_results
 * - system_settings
 * - activity_log
 */

import mongoose from 'mongoose';


// ============================================
// 1. USER (PROFILE) SCHEMA
// ============================================
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // hashed
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
// 2. COURSE SCHEMA
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
  class_code: { type: String, unique: true }, // For students to join
  created_at: { type: Date, default: Date.now }
});

// ============================================
// 3. ENROLLMENT SCHEMA
// ============================================
const enrollmentSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  enrolled_at: { type: Date, default: Date.now },
  status: { type: String, enum: ['active', 'dropped', 'completed'], default: 'active' }
});
enrollmentSchema.index({ student_id: 1, course_id: 1 }, { unique: true });

// ============================================
// 4. ATTENDANCE SCHEMA
// ============================================
const attendanceSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ['present', 'absent', 'late', 'excused'], default: 'present' },
  session_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendanceSession' },
  student_lat: Number,
  student_lng: Number,
  marked_via: { type: String, enum: ['manual', 'qr'], default: 'manual' },
  count_as_lecture: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now }
});
attendanceSchema.index({ student_id: 1, course_id: 1, date: 1 });

// ============================================
// 5. ATTENDANCE SESSION SCHEMA (QR-based)
// ============================================
const attendanceSessionSchema = new mongoose.Schema({
  classroom_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  lecture_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Timetable' },
  teacher_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  nonce: { type: String, required: true },
  teacher_lat: Number,
  teacher_lng: Number,
  radius_meters: { type: Number, default: 50 },
  issued_at: { type: Date, default: Date.now },
  expires_at: Date,
  active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now }
});

// ============================================
// 6. TIMETABLE SCHEMA
// ============================================
const timetableSchema = new mongoose.Schema({
  classroom_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  weekday: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    required: true
  },
  start_time: { type: String, required: true }, // "09:00"
  end_time: { type: String, required: true },   // "10:00"
  session_type: { type: String, enum: ['Lecture', 'Lab', 'Tutorial'], default: 'Lecture' },
  created_at: { type: Date, default: Date.now }
});

// ============================================
// 7. GRADES SCHEMA
// ============================================
const gradeSchema = new mongoose.Schema({
  enrollment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Enrollment', required: true },
  internal_marks: { type: Number, default: 0 },
  external_marks: { type: Number, default: 0 },
  total: { type: Number, default: 0 }, // Computed: internal + external
  grade: String, // 'A', 'B', 'C', etc.
  created_at: { type: Date, default: Date.now }
});

// ============================================
// 8. EXAM ENTRIES SCHEMA
// ============================================
const examEntrySchema = new mongoose.Schema({
  course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  exam_type: {
    type: String,
    enum: ['Mid Term', 'End Term', 'Quiz', 'Assignment', 'Lab', 'Project', 'Viva'],
    required: true
  },
  semester: { type: String, required: true },
  marks_obtained: { type: Number, default: 0 },
  total_marks: { type: Number, default: 100 },
  remarks: String,
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});
examEntrySchema.index({ course_id: 1, student_id: 1, exam_type: 1, semester: 1 }, { unique: true });

// ============================================
// 9. ANNOUNCEMENTS SCHEMA
// ============================================
const announcementSchema = new mongoose.Schema({
  course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  author_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  content: String,
  created_at: { type: Date, default: Date.now }
});

// ============================================
// 10. CALENDAR EVENTS SCHEMA
// ============================================
const calendarEventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  start_time: { type: Date, required: true },
  end_time: Date,
  event_type: { type: String, enum: ['CLASS', 'EXAM', 'HOLIDAY', 'DEADLINE'] },
  course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  created_at: { type: Date, default: Date.now }
});

// ============================================
// 11. ASSIGNMENTS SCHEMA
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
// 12. ASSIGNMENT SUBMISSIONS SCHEMA
// ============================================
const assignmentSubmissionSchema = new mongoose.Schema({
  assignment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  submission_url: String,
  submission_text: String,
  marks_obtained: Number,
  feedback: String,
  submitted_at: { type: Date, default: Date.now },
  graded_at: Date
});
assignmentSubmissionSchema.index({ assignment_id: 1, student_id: 1 }, { unique: true });

// ============================================
// 13. RESOURCES SCHEMA
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

// ============================================
// 14. TESTS SCHEMA (AI-generated tests)
// ============================================
const testSchema = new mongoose.Schema({
  course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  creator_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: { type: String, required: true },
  topic: { type: String, required: true },
  description: String,
  subject: { type: String, required: true },
  difficulty: { type: String, default: 'Medium' },
  questions: { type: mongoose.Schema.Types.Mixed, required: true }, // Array of question objects
  duration: { type: Number, required: true }, // in minutes
  total_marks: { type: Number, required: true },
  due_date: Date,
  status: { type: String, enum: ['draft', 'published', 'active', 'completed'], default: 'published' },
  type: { type: String, default: 'quiz' },
  is_proctored: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now }
});

// ============================================
// 15. QUIZ RESULTS SCHEMA
// ============================================
const quizResultSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  test_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Test' },
  student_name: { type: String, required: true },
  student_email: String,
  subject: { type: String, required: true },
  grade: { type: Number, required: true },
  mode: { type: String, enum: ['rapid', 'full'], required: true },
  score: { type: Number, default: 0 },
  total_questions: { type: Number, required: true },
  correct_answers: { type: Number, default: 0 },
  accuracy: { type: Number, default: 0 },
  best_streak: { type: Number, default: 0 },
  duration: { type: Number, default: 0 }, // in seconds
  questions: mongoose.Schema.Types.Mixed, // stores question details for review
  completed_at: { type: Date, default: Date.now },
  created_at: { type: Date, default: Date.now }
});

// ============================================
// 16. SYSTEM SETTINGS SCHEMA
// ============================================
const systemSettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: mongoose.Schema.Types.Mixed,
  updated_at: { type: Date, default: Date.now },
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

// ============================================
// 17. ACTIVITY LOG SCHEMA
// ============================================
const activityLogSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true },
  entity_type: String, // 'course', 'student', 'attendance', etc.
  entity_id: mongoose.Schema.Types.ObjectId,
  metadata: mongoose.Schema.Types.Mixed,
  created_at: { type: Date, default: Date.now }
});

// ============================================
// CREATE MODELS
// ============================================
const User = mongoose.model('User', userSchema);
const Course = mongoose.model('Course', courseSchema);
const Enrollment = mongoose.model('Enrollment', enrollmentSchema);
const Attendance = mongoose.model('Attendance', attendanceSchema);
const AttendanceSession = mongoose.model('AttendanceSession', attendanceSessionSchema);
const Timetable = mongoose.model('Timetable', timetableSchema);
const Grade = mongoose.model('Grade', gradeSchema);
const ExamEntry = mongoose.model('ExamEntry', examEntrySchema);
const Announcement = mongoose.model('Announcement', announcementSchema);
const CalendarEvent = mongoose.model('CalendarEvent', calendarEventSchema);
const Assignment = mongoose.model('Assignment', assignmentSchema);
const AssignmentSubmission = mongoose.model('AssignmentSubmission', assignmentSubmissionSchema);
const Resource = mongoose.model('Resource', resourceSchema);
const Test = mongoose.model('Test', testSchema);
const QuizResult = mongoose.model('QuizResult', quizResultSchema);
const SystemSetting = mongoose.model('SystemSetting', systemSettingSchema);
const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

export {
  User,
  Course,
  Enrollment,
  Attendance,
  AttendanceSession,
  Timetable,
  Grade,
  ExamEntry,
  Announcement,
  CalendarEvent,
  Assignment,
  AssignmentSubmission,
  Resource,
  Test,
  QuizResult,
  SystemSetting,
  ActivityLog
};
