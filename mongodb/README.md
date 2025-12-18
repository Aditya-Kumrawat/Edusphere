# EduSphere SIS - MongoDB Schema Documentation

## Overview
This project has been configured with MongoDB Atlas as the database backend. All 17 collections mirror the original Supabase/PostgreSQL schema.

## Collections Structure

### 1. Users (profiles)
Stores all user accounts - students, faculty, and admins.
```javascript
{
  email: String,          // unique
  password: String,       // bcrypt hashed
  full_name: String,
  role: 'STUDENT' | 'FACULTY' | 'ADMIN',
  avatar_url: String,
  batch: String,
  enrollment_number: String,
  department: String,
  dob: Date,
  gender: 'Male' | 'Female' | 'Other',
  mobile: String,
  section: String,
  admission_year: Number
}
```

### 2. Courses
Academic courses taught by faculty.
```javascript
{
  name: String,
  code: String,           // unique, e.g., "CS201"
  description: String,
  faculty_id: ObjectId,   // references Users
  credits: Number,
  semester: String,
  schedule: String,
  room: String,
  max_students: Number,
  class_code: String      // for students to join
}
```

### 3. Enrollments
Links students to courses.
```javascript
{
  student_id: ObjectId,   // references Users
  course_id: ObjectId,    // references Courses
  enrolled_at: Date,
  status: 'active' | 'dropped' | 'completed'
}
```

### 4. Attendance
Daily attendance records.
```javascript
{
  student_id: ObjectId,
  course_id: ObjectId,
  date: Date,
  status: 'present' | 'absent' | 'late' | 'excused',
  marked_via: 'manual' | 'qr',
  session_id: ObjectId    // for QR-based attendance
}
```

### 5. Tests
Faculty-created assessments.
```javascript
{
  course_id: ObjectId,
  creator_id: ObjectId,
  title: String,
  topic: String,
  questions: Array,       // embedded question objects
  duration: Number,       // minutes
  total_marks: Number,
  status: 'draft' | 'published' | 'active' | 'completed'
}
```

### 6. Quiz Results
Student test attempts and scores.
```javascript
{
  student_id: ObjectId,
  test_id: ObjectId,
  score: Number,
  total_questions: Number,
  correct_answers: Number,
  accuracy: Number,
  duration: Number
}
```

### 7. Grades
Academic grades per enrollment.
```javascript
{
  enrollment_id: ObjectId,
  internal_marks: Number,
  external_marks: Number,
  total: Number,
  grade: String           // 'A', 'B', 'C', etc.
}
```

### 8. Announcements
Course announcements by faculty.
```javascript
{
  course_id: ObjectId,
  author_id: ObjectId,
  title: String,
  content: String
}
```

### 9. Assignments
Homework and projects.
```javascript
{
  course_id: ObjectId,
  title: String,
  description: String,
  due_date: Date,
  total_marks: Number
}
```

### 10. Other Collections
- `attendance_sessions` - QR code session management
- `timetable` - Weekly class schedules
- `calendar_events` - Academic calendar
- `assignment_submissions` - Student submissions
- `exam_entries` - Detailed exam records
- `resources` - Course materials
- `system_settings` - Admin configurations
- `activity_log` - User activity tracking

## Setup Instructions

### 1. MongoDB Atlas Setup
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free cluster
3. Create a database user
4. Whitelist your IP (or use 0.0.0.0/0 for all IPs)
5. Get connection string from "Connect > Connect your application"

### 2. Configure Environment
```bash
# Copy example env file
cp mongodb/.env.example mongodb/.env

# Edit with your credentials
MONGODB_URI=mongodb+srv://youruser:yourpassword@cluster0.xxxxx.mongodb.net/edusphere
```

### 3. Seed Database
```bash
# Install dependencies
npm install mongoose bcryptjs

# Run seed script
node mongodb/seed.js
```

### 4. Verify in MongoDB Atlas
- Go to Atlas Dashboard
- Click "Browse Collections"
- You should see all collections with sample data

## Sample Login Credentials (after seeding)
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@edusphere.edu | password123 |
| Faculty | john.smith@edusphere.edu | password123 |
| Student | alice@student.edusphere.edu | password123 |

## Key Differences from Supabase

| Feature | Supabase | MongoDB |
|---------|----------|---------|
| Schema | Relational (SQL) | Document (NoSQL) |
| Auth | Built-in Supabase Auth | JWT + bcryptjs |
| RLS | Row Level Security policies | Middleware-based auth |
| IDs | UUID | ObjectId |
| Relationships | Foreign keys | References + populate() |
| Real-time | Built-in subscriptions | Change Streams |
