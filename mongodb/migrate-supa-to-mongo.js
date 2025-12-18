import { createClient } from '@supabase/supabase-js';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { connectDB } from './connection.js';
import {
    User, Course, Enrollment, Attendance, Grade,
    Announcement, Assignment, Resource, Test
} from './models/index.js';

// Load env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });
// Also load root .env for Supabase credentials if present
dotenv.config({ path: join(__dirname, '../.env') });
// Try loading from .env.local as well
dotenv.config({ path: join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase Credentials. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
    console.log('Tried loading from:', join(__dirname, '../.env'));
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ID Mapping: UUID (Supabase) -> ObjectId (MongoDB)
const idMap = new Map();

const getNewId = (oldId) => {
    if (!oldId) return undefined;
    if (idMap.has(oldId)) return idMap.get(oldId);
    // If not found, generates a new one (should avoid this mostly if order is correct)
    const newId = new mongoose.Types.ObjectId();
    idMap.set(oldId, newId);
    return newId;
};

// Check if string is valid UUID
const isUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

const migrateUsers = async () => {
    console.log('Migrating Users...');
    const { data: profiles, error } = await supabase.from('profiles').select('*');
    if (error) {
        console.error('Error fetching profiles:', error);
        return;
    }

    const hashedPassword = await bcrypt.hash('password123', 10);

    let count = 0;
    for (const p of profiles) {
        // Check if user already exists
        const existing = await User.findOne({ email: p.email });
        if (existing) {
            console.log(`Skipping existing user: ${p.email}`);
            idMap.set(p.id, existing._id);
            continue;
        }

        const newId = new mongoose.Types.ObjectId();
        idMap.set(p.id, newId);

        try {
            const userData = {
                _id: newId,
                email: p.email,
                password: hashedPassword, // Default password
                full_name: p.full_name || p.username || 'User',
                role: p.role || 'STUDENT',
                avatar_url: p.avatar_url,
                department: p.department || 'General',
                batch: p.batch,
                mobile: p.mobile
            };

            // Only add unique sparse fields if they have a value
            if (p.enrollment_number) {
                userData.enrollment_number = p.enrollment_number;
            }

            await User.create(userData);
            count++;
        } catch (err) {
            console.error(`Failed to migrate user ${p.email}:`, err.message);
        }
        count++;
    }
    console.log(`✅ Migrated ${count} new users.`);
};

const migrateCourses = async () => {
    console.log('Migrating Courses...');
    const { data: courses, error } = await supabase.from('courses').select('*');
    if (error) {
        console.error('Error fetching courses:', error);
        return;
    }

    let count = 0;
    for (const c of courses) {
        // Check if course exists (by code)
        const existing = await Course.findOne({ code: c.code });
        if (existing) {
            idMap.set(c.id, existing._id);
            continue;
        }

        const newId = new mongoose.Types.ObjectId();
        idMap.set(c.id, newId);

        await Course.create({
            _id: newId,
            name: c.name,
            code: c.code,
            description: c.description,
            faculty_id: getNewId(c.faculty_id), // Map faculty ID
            credits: c.credits,
            schedule: c.schedule,
            class_code: c.class_code || c.code // Fallback
        });
        count++;
    }
    console.log(`✅ Migrated ${count} new courses.`);
};

const migrateEnrollments = async () => {
    console.log('Migrating Enrollments...');
    const { data: enrollments, error } = await supabase.from('enrollments').select('*');
    if (error) {
        console.error('Error fetching enrollments:', error);
        return;
    }

    let count = 0;
    for (const e of enrollments) {
        const studentId = getNewId(e.student_id);
        const courseId = getNewId(e.course_id);

        if (studentId && courseId) {
            // Check existence
            const existing = await Enrollment.findOne({ student_id: studentId, course_id: courseId });
            if (existing) continue;

            await Enrollment.create({
                student_id: studentId,
                course_id: courseId,
                enrolled_at: new Date(e.created_at),
                status: 'active'
            });
            count++;
        }
    }
    console.log(`✅ Migrated ${count} new enrollments.`);
};

const migrateAttendance = async () => {
    console.log('Migrating Attendance...');
    const { data: records, error } = await supabase.from('attendance').select('*');
    if (error) { console.log('Skipping attendance (not found or error)'); return; }

    let count = 0;
    for (const r of records) {
        const studentId = getNewId(r.student_id);
        const courseId = getNewId(r.course_id);

        if (studentId && courseId) {
            const date = new Date(r.date);
            // Check for existence (approximate date match)
            const existing = await Attendance.findOne({
                student_id: studentId,
                course_id: courseId,
                date: date
            });

            if (!existing) {
                await Attendance.create({
                    student_id: studentId,
                    course_id: courseId,
                    date: date,
                    status: r.status ? r.status.toLowerCase() : 'present',
                    marked_via: r.marked_via || 'manual'
                });
                count++;
            }
        }
    }
    console.log(`✅ Migrated ${count} attendance records.`);
};

const migrateAnnouncements = async () => {
    console.log('Migrating Announcements...');
    const { data: records, error } = await supabase.from('announcements').select('*');
    if (error) { console.log('Skipping announcements'); return; }

    let count = 0;
    for (const r of records) {
        const courseId = getNewId(r.course_id);
        const authorId = getNewId(r.author_id); // or created_by

        if (courseId && authorId) {
            await Announcement.create({
                course_id: courseId,
                author_id: authorId,
                title: r.title,
                content: r.content || r.message,
                created_at: new Date(r.created_at)
            });
            count++;
        }
    }
    console.log(`✅ Migrated ${count} announcements.`);
};

const migrateAssignments = async () => {
    console.log('Migrating Assignments...');
    const { data: records, error } = await supabase.from('assignments').select('*');
    if (error) { console.log('Skipping assignments'); return; }

    let count = 0;
    for (const r of records) {
        const courseId = getNewId(r.course_id);
        const newId = new mongoose.Types.ObjectId();
        idMap.set(r.id, newId);

        if (courseId) {
            await Assignment.create({
                _id: newId,
                course_id: courseId,
                title: r.title,
                description: r.description,
                due_date: new Date(r.due_date),
                total_marks: r.points || r.total_marks || 100,
                created_by: getNewId(r.created_by)
            });
            count++;
        }
    }
    console.log(`✅ Migrated ${count} assignments.`);
};

const migrateAssignmentSubmissions = async () => {
    console.log('Migrating Assignment Submissions...');
    const { data: records, error } = await supabase.from('assignment_submissions').select('*');
    if (error) { console.log('Skipping submissions'); return; }

    let count = 0;
    for (const r of records) {
        const assignmentId = getNewId(r.assignment_id);
        const studentId = getNewId(r.student_id);

        if (assignmentId && studentId) {
            await import('./models/index.js').then(m => m.AssignmentSubmission.create({
                assignment_id: assignmentId,
                student_id: studentId,
                submission_url: r.file_url || r.submission_url,
                submission_text: r.comments || r.submission_text,
                marks_obtained: r.grade || r.marks_obtained,
                submitted_at: new Date(r.submitted_at || r.created_at)
            }));
            count++;
        }
    }
    console.log(`✅ Migrated ${count} submissions.`);
};

const migrateResources = async () => {
    console.log('Migrating Resources...');
    const { data: records, error } = await supabase.from('resources').select('*');
    if (error) { console.log('Skipping resources'); return; }

    let count = 0;
    for (const r of records) {
        const courseId = getNewId(r.course_id);
        if (courseId) {
            await Resource.create({
                course_id: courseId,
                title: r.title,
                description: r.description,
                file_url: r.url || r.file_url,
                uploaded_by: getNewId(r.uploaded_by)
            });
            count++;
        }
    }
    console.log(`✅ Migrated ${count} resources.`);
};

const migrateTests = async () => {
    console.log('Migrating Tests...');
    const { data: records, error } = await supabase.from('tests').select('*');
    if (error) { console.log('Skipping tests'); return; }

    let count = 0;
    for (const r of records) {
        const courseId = getNewId(r.course_id);
        const newId = new mongoose.Types.ObjectId();
        idMap.set(r.id, newId);

        if (courseId) {
            await Test.create({
                _id: newId, // Preserve mapped ID
                course_id: courseId,
                creator_id: getNewId(r.creator_id),
                title: r.title,
                topic: r.topic || 'General',
                description: r.description,
                subject: r.subject || 'General',
                questions: r.questions || [],
                duration: r.duration || 60,
                total_marks: r.total_marks || 100,
                status: r.status || 'published'
            });
            count++;
        }
    }
    console.log(`✅ Migrated ${count} tests.`);
};

const migrateQuizResults = async () => {
    console.log('Migrating Quiz Results...');
    const { data: records, error } = await supabase.from('quiz_results').select('*');
    if (error) { console.log('Skipping quiz results'); return; }

    let count = 0;
    for (const r of records) {
        const studentId = getNewId(r.student_id);
        const testId = getNewId(r.test_id);

        if (studentId) {
            await import('./models/index.js').then(m => m.QuizResult.create({
                student_id: studentId,
                test_id: testId,
                student_name: r.student_name || 'Student',
                score: r.score,
                total_questions: r.total_questions,
                correct_answers: r.correct_answers,
                accuracy: r.accuracy,
                subject: r.subject || 'General',
                grade: r.grade || 0,
                mode: r.mode || 'rapid'
            }));
            count++;
        }
    }
    console.log(`✅ Migrated ${count} quiz results.`);
};

const migrateGrades = async () => {
    console.log('Migrating Grades...');
    const { data: records, error } = await supabase.from('grades').select('*');
    if (error) { console.log('Skipping grades'); return; }

    let count = 0;
    for (const r of records) {
        // Need to find the enrollment ID (which is mapped)
        // But Grades in Supabase might link directly to enrollment_id
        // We need to know which Enrollment in MongoDB corresponds to that Supabase Enrollment ID
        // Luckily we mapped Enrollment IDs in migrateEnrollments!
        const enrollmentId = getNewId(r.enrollment_id);

        if (enrollmentId) {
            await Grade.create({
                enrollment_id: enrollmentId,
                internal_marks: r.internal_marks || 0,
                external_marks: r.external_marks || 0,
                total: r.total || 0,
                grade: r.grade
            });
            count++;
        }
    }
    console.log(`✅ Migrated ${count} grades.`);
};


const runMigration = async () => {
    try {
        await connectDB();

        console.log('🚀 Starting Migration from Supabase to MongoDB...');

        await migrateUsers();
        await migrateCourses();
        await migrateEnrollments();

        // New Migrations
        await migrateAttendance();
        await migrateAnnouncements();
        await migrateAssignments();
        await migrateAssignmentSubmissions();
        await migrateResources();
        await migrateTests();
        await migrateQuizResults();
        await migrateGrades();

        console.log('\n🎉 Migration Complete!');
        process.exit(0);
    } catch (err) {
        console.error('Migration Failed:', err);
        process.exit(1);
    }
};

runMigration();
