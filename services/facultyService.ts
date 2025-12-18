/**
 * Faculty Data Service
 * API calls for faculty operations
 */

const API_URL = 'http://localhost:5000/api';

// Helper to get auth headers
const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

// Helper for API calls
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            ...getAuthHeaders(),
            ...options.headers,
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'API request failed');
    }

    return response.json();
};

export const facultyService = {
    // ===== COURSES =====
    async getCourses() {
        return apiCall('/courses');
    },

    async getCourse(id: string) {
        return apiCall(`/courses/${id}`);
    },

    async createCourse(courseData: any) {
        return apiCall('/courses', {
            method: 'POST',
            body: JSON.stringify(courseData),
        });
    },

    // ===== ENROLLMENTS =====
    async getEnrollments(filters: { student_id?: string; course_id?: string } = {}) {
        const params = new URLSearchParams(filters as any);
        return apiCall(`/enrollments?${params}`);
    },

    async enrollStudent(enrollmentData: any) {
        return apiCall('/enrollments', {
            method: 'POST',
            body: JSON.stringify(enrollmentData),
        });
    },

    // ===== ATTENDANCE =====
    async getAttendance(filters: { student_id?: string; course_id?: string; date?: string } = {}) {
        const params = new URLSearchParams(filters as any);
        return apiCall(`/attendance?${params}`);
    },

    async markAttendance(attendanceData: any) {
        return apiCall('/attendance', {
            method: 'POST',
            body: JSON.stringify(attendanceData),
        });
    },

    // ===== GRADES =====
    async getGrades(enrollment_id?: string) {
        const params = enrollment_id ? `?enrollment_id=${enrollment_id}` : '';
        return apiCall(`/grades${params}`);
    },

    async saveGrade(gradeData: any) {
        return apiCall('/grades', {
            method: 'POST',
            body: JSON.stringify(gradeData),
        });
    },

    // ===== ANNOUNCEMENTS =====
    async getAnnouncements(course_id?: string) {
        const params = course_id ? `?course_id=${course_id}` : '';
        return apiCall(`/announcements${params}`);
    },

    async createAnnouncement(announcementData: any) {
        return apiCall('/announcements', {
            method: 'POST',
            body: JSON.stringify(announcementData),
        });
    },

    // ===== TESTS =====
    async getTests(course_id?: string) {
        const params = course_id ? `?course_id=${course_id}` : '';
        return apiCall(`/tests${params}`);
    },

    async createTest(testData: any) {
        return apiCall('/tests', {
            method: 'POST',
            body: JSON.stringify(testData),
        });
    },

    async getQuizResults(filters: { test_id?: string; student_id?: string } = {}) {
        const params = new URLSearchParams(filters as any);
        return apiCall(`/quiz-results?${params}`);
    },

    // ===== USERS =====
    async getUsers(role?: string) {
        const params = role ? `?role=${role}` : '';
        return apiCall(`/users${params}`);
    },
};
