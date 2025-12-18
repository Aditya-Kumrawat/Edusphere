import { connectDB, mongoose } from './connection.js';
import {
    User, Course, Enrollment, Attendance, Grade,
    Announcement, Assignment, Resource, Test, QuizResult
} from './models/index.js';

const verifyData = async () => {
    try {
        await connectDB();
        console.log('\n📊 Database Verification Stats:\n');

        const stats = {
            Users: await User.countDocuments(),
            Courses: await Course.countDocuments(),
            Enrollments: await Enrollment.countDocuments(),
            Attendance: await Attendance.countDocuments(),
            Announcements: await Announcement.countDocuments(),
            Assignments: await Assignment.countDocuments(),
            Resources: await Resource.countDocuments(),
            Tests: await Test.countDocuments(),
            QuizResults: await QuizResult.countDocuments(),
            Grades: await Grade.countDocuments(),
        };

        console.table(stats);

        process.exit(0);
    } catch (err) {
        console.error('Check failed:', err);
        process.exit(1);
    }
};

verifyData();
