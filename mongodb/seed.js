/**
 * MongoDB Seed Script for EduSphere SIS
 * This script populates the database with sample data for demonstration
 * 
 * Run with: node mongodb/seed.js
 */

import { connectDB } from './connection.js';
import {
    User,
    Course,
    Enrollment,
    Attendance,
    Announcement,
    Grade,
    Test,
    QuizResult,
    Assignment
} from './models/index.js';
import bcrypt from 'bcryptjs';


const seedDatabase = async () => {
    try {
        await connectDB();
        console.log('\n🌱 Starting database seeding...\n');

        // Clear existing data
        await Promise.all([
            User.deleteMany({}),
            Course.deleteMany({}),
            Enrollment.deleteMany({}),
            Attendance.deleteMany({}),
            Announcement.deleteMany({}),
            Grade.deleteMany({}),
            Test.deleteMany({}),
            QuizResult.deleteMany({}),
            Assignment.deleteMany({})
        ]);
        console.log('🗑️  Cleared existing data');

        // Hash password
        const hashedPassword = await bcrypt.hash('password123', 10);

        // ============================================
        // 1. CREATE USERS
        // ============================================
        const admin = await User.create({
            email: 'admin@edusphere.edu',
            password: hashedPassword,
            full_name: 'System Administrator',
            role: 'ADMIN',
            department: 'Administration'
        });

        const faculty1 = await User.create({
            email: 'john.smith@edusphere.edu',
            password: hashedPassword,
            full_name: 'Dr. John Smith',
            role: 'FACULTY',
            department: 'Computer Science',
            mobile: '+91 9876543210'
        });

        const faculty2 = await User.create({
            email: 'sarah.johnson@edusphere.edu',
            password: hashedPassword,
            full_name: 'Prof. Sarah Johnson',
            role: 'FACULTY',
            department: 'Mathematics',
            mobile: '+91 9876543211'
        });

        const students = await User.insertMany([
            {
                email: 'alice@student.edusphere.edu',
                password: hashedPassword,
                full_name: 'Alice Thompson',
                role: 'STUDENT',
                enrollment_number: 'STU2024001',
                batch: '2024',
                department: 'Computer Science',
                section: 'A',
                admission_year: 2024,
                gender: 'Female'
            },
            {
                email: 'bob@student.edusphere.edu',
                password: hashedPassword,
                full_name: 'Bob Williams',
                role: 'STUDENT',
                enrollment_number: 'STU2024002',
                batch: '2024',
                department: 'Computer Science',
                section: 'A',
                admission_year: 2024,
                gender: 'Male'
            },
            {
                email: 'charlie@student.edusphere.edu',
                password: hashedPassword,
                full_name: 'Charlie Brown',
                role: 'STUDENT',
                enrollment_number: 'STU2024003',
                batch: '2024',
                department: 'Computer Science',
                section: 'B',
                admission_year: 2024,
                gender: 'Male'
            },
            {
                email: 'diana@student.edusphere.edu',
                password: hashedPassword,
                full_name: 'Diana Martinez',
                role: 'STUDENT',
                enrollment_number: 'STU2024004',
                batch: '2024',
                department: 'Mathematics',
                section: 'A',
                admission_year: 2024,
                gender: 'Female'
            },
            {
                email: 'ethan@student.edusphere.edu',
                password: hashedPassword,
                full_name: 'Ethan Davis',
                role: 'STUDENT',
                enrollment_number: 'STU2024005',
                batch: '2024',
                department: 'Mathematics',
                section: 'A',
                admission_year: 2024,
                gender: 'Male'
            }
        ]);

        console.log(`👤 Created ${students.length + 3} users (1 admin, 2 faculty, ${students.length} students)`);

        // ============================================
        // 2. CREATE COURSES
        // ============================================
        const course1 = await Course.create({
            name: 'Data Structures and Algorithms',
            code: 'CS201',
            description: 'Fundamental concepts of data structures including arrays, linked lists, trees, graphs, and algorithm analysis.',
            faculty_id: faculty1._id,
            credits: 4,
            semester: 'Fall 2024',
            schedule: 'Mon/Wed/Fri 10:00-11:00 AM',
            room: 'Room 301',
            max_students: 60,
            class_code: 'DSA2024'
        });

        const course2 = await Course.create({
            name: 'Database Management Systems',
            code: 'CS301',
            description: 'Introduction to database concepts, SQL, normalization, and transaction management.',
            faculty_id: faculty1._id,
            credits: 3,
            semester: 'Fall 2024',
            schedule: 'Tue/Thu 2:00-3:30 PM',
            room: 'Room 405',
            max_students: 50,
            class_code: 'DBMS2024'
        });

        const course3 = await Course.create({
            name: 'Linear Algebra',
            code: 'MATH201',
            description: 'Vectors, matrices, linear transformations, eigenvalues, and eigenvectors.',
            faculty_id: faculty2._id,
            credits: 3,
            semester: 'Fall 2024',
            schedule: 'Mon/Wed 1:00-2:30 PM',
            room: 'Room 201',
            max_students: 40,
            class_code: 'LA2024'
        });

        console.log('📚 Created 3 courses');

        // ============================================
        // 3. CREATE ENROLLMENTS
        // ============================================
        const enrollments = await Enrollment.insertMany([
            { student_id: students[0]._id, course_id: course1._id },
            { student_id: students[0]._id, course_id: course2._id },
            { student_id: students[1]._id, course_id: course1._id },
            { student_id: students[1]._id, course_id: course2._id },
            { student_id: students[2]._id, course_id: course1._id },
            { student_id: students[3]._id, course_id: course3._id },
            { student_id: students[4]._id, course_id: course3._id }
        ]);

        console.log(`📝 Created ${enrollments.length} enrollments`);

        // ============================================
        // 4. CREATE ATTENDANCE RECORDS
        // ============================================
        const today = new Date();
        const attendanceRecords = [];

        for (let i = 0; i < 10; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);

            attendanceRecords.push(
                { student_id: students[0]._id, course_id: course1._id, date, status: i % 5 === 0 ? 'absent' : 'present' },
                { student_id: students[1]._id, course_id: course1._id, date, status: 'present' },
                { student_id: students[2]._id, course_id: course1._id, date, status: i % 3 === 0 ? 'late' : 'present' }
            );
        }

        await Attendance.insertMany(attendanceRecords);
        console.log(`✅ Created ${attendanceRecords.length} attendance records`);

        // ============================================
        // 5. CREATE ANNOUNCEMENTS
        // ============================================
        await Announcement.insertMany([
            {
                course_id: course1._id,
                author_id: faculty1._id,
                title: 'Mid-Term Exam Schedule',
                content: 'The mid-term examination for Data Structures will be held on December 20th, 2024. Please prepare accordingly.'
            },
            {
                course_id: course1._id,
                author_id: faculty1._id,
                title: 'Assignment 3 Deadline Extended',
                content: 'Due to multiple requests, the deadline for Assignment 3 has been extended by 3 days.'
            },
            {
                course_id: course2._id,
                author_id: faculty1._id,
                title: 'Guest Lecture on NoSQL Databases',
                content: 'We will have a guest lecture on MongoDB and NoSQL databases this Friday at 3 PM.'
            },
            {
                course_id: course3._id,
                author_id: faculty2._id,
                title: 'Extra Practice Session',
                content: 'An extra practice session for Linear Algebra will be held on Saturday 10 AM.'
            }
        ]);

        console.log('📢 Created 4 announcements');

        // ============================================
        // 6. CREATE GRADES
        // ============================================
        await Grade.insertMany([
            { enrollment_id: enrollments[0]._id, internal_marks: 35, external_marks: 48, total: 83, grade: 'A' },
            { enrollment_id: enrollments[1]._id, internal_marks: 28, external_marks: 42, total: 70, grade: 'B' },
            { enrollment_id: enrollments[2]._id, internal_marks: 40, external_marks: 52, total: 92, grade: 'A+' },
            { enrollment_id: enrollments[3]._id, internal_marks: 32, external_marks: 45, total: 77, grade: 'B+' }
        ]);

        console.log('📊 Created 4 grade records');

        // ============================================
        // 7. CREATE TESTS
        // ============================================
        const test1 = await Test.create({
            course_id: course1._id,
            creator_id: faculty1._id,
            title: 'DSA Quiz - Trees and Graphs',
            topic: 'Binary Trees, BST, Graph Traversal',
            description: 'A quick quiz to test your understanding of tree and graph data structures.',
            subject: 'Data Structures',
            difficulty: 'Medium',
            questions: [
                {
                    question: 'What is the time complexity of searching in a balanced BST?',
                    options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
                    correct: 1
                },
                {
                    question: 'Which traversal visits the root node first?',
                    options: ['Inorder', 'Preorder', 'Postorder', 'Level order'],
                    correct: 1
                },
                {
                    question: 'What data structure is used in BFS?',
                    options: ['Stack', 'Queue', 'Array', 'Linked List'],
                    correct: 1
                }
            ],
            duration: 15,
            total_marks: 30,
            status: 'published'
        });

        console.log('📝 Created 1 test');

        // ============================================
        // 8. CREATE QUIZ RESULTS
        // ============================================
        await QuizResult.insertMany([
            {
                student_id: students[0]._id,
                test_id: test1._id,
                student_name: 'Alice Thompson',
                student_email: 'alice@student.edusphere.edu',
                subject: 'Data Structures',
                grade: 9,
                mode: 'full',
                score: 27,
                total_questions: 3,
                correct_answers: 3,
                accuracy: 100,
                best_streak: 3,
                duration: 480
            },
            {
                student_id: students[1]._id,
                test_id: test1._id,
                student_name: 'Bob Williams',
                student_email: 'bob@student.edusphere.edu',
                subject: 'Data Structures',
                grade: 7,
                mode: 'full',
                score: 20,
                total_questions: 3,
                correct_answers: 2,
                accuracy: 67,
                best_streak: 2,
                duration: 600
            }
        ]);

        console.log('🎯 Created 2 quiz results');

        // ============================================
        // 9. CREATE ASSIGNMENTS
        // ============================================
        await Assignment.insertMany([
            {
                course_id: course1._id,
                title: 'Implement Binary Search Tree',
                description: 'Implement a BST with insert, delete, and search operations in your preferred language.',
                due_date: new Date('2024-12-25'),
                total_marks: 50,
                created_by: faculty1._id
            },
            {
                course_id: course2._id,
                title: 'Design ER Diagram',
                description: 'Design an ER diagram for a library management system with at least 5 entities.',
                due_date: new Date('2024-12-28'),
                total_marks: 40,
                created_by: faculty1._id
            }
        ]);

        console.log('📋 Created 2 assignments');

        // ============================================
        // SUMMARY
        // ============================================
        console.log('\n✨ Database seeding completed successfully!\n');
        console.log('='.repeat(50));
        console.log('📊 SEED DATA SUMMARY');
        console.log('='.repeat(50));
        console.log(`  Users:        ${await User.countDocuments()}`);
        console.log(`  Courses:      ${await Course.countDocuments()}`);
        console.log(`  Enrollments:  ${await Enrollment.countDocuments()}`);
        console.log(`  Attendance:   ${await Attendance.countDocuments()}`);
        console.log(`  Announcements:${await Announcement.countDocuments()}`);
        console.log(`  Grades:       ${await Grade.countDocuments()}`);
        console.log(`  Tests:        ${await Test.countDocuments()}`);
        console.log(`  Quiz Results: ${await QuizResult.countDocuments()}`);
        console.log(`  Assignments:  ${await Assignment.countDocuments()}`);
        console.log('='.repeat(50));
        console.log('\n🔐 Login Credentials:');
        console.log('   Admin:   admin@edusphere.edu / password123');
        console.log('   Faculty: john.smith@edusphere.edu / password123');
        console.log('   Student: alice@student.edusphere.edu / password123\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding error:', error);
        process.exit(1);
    }
};

seedDatabase();
