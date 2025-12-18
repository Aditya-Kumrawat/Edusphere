/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly GEMINI_API_KEY: string
  readonly VITE_GEMINI_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

export enum UserRole {
  ADMIN = 'ADMIN',
  FACULTY = 'FACULTY',
  STUDENT = 'STUDENT'
}

export interface Student {
  id: string;
  name: string;
  email: string;
  department: string;
  semester: number;
  enrollmentDate: string;
  status: 'Active' | 'Inactive';
  avatarUrl: string;
  cgpa?: number;
  // New Academic Info
  rollNo: string;
  batch: string;
  section?: string;
  // New Personal Info
  personalInfo: {
    dob: string;
    gender: 'Male' | 'Female' | 'Other';
    mobile: string;
    fatherName: string;
    motherName: string;
    address: string;
  };
}

export interface Faculty {
  id: string;
  name: string;
  email: string;
  department: string;
  avatarUrl: string;
  specialization: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  credits: number;
  department: string;
  facultyId?: string; // Assigned faculty
  schedule?: string;
  joinCode?: string; // Unique code for students to join
}

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  semester: string; // e.g., "Spring 2024"
  enrollmentDate: string;
}

export interface GradeRecord {
  id: string;
  enrollmentId: string;
  internalMarks: number; // Out of 40
  externalMarks: number; // Out of 60
  total: number;
  grade: string; // A, B, C...
}

export interface AttendanceRecord {
  id: string;
  courseId: string;
  date: string;
  studentId: string;
  status: 'Present' | 'Absent' | 'Late';
}

export interface DashboardStats {
  totalStudents: number;
  totalCourses: number;
  totalFaculty: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  type: 'info' | 'alert' | 'success';
}
