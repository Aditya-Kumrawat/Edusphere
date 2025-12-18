# Software Requirements Specification (SRS)
## for Edusphere SIS

**Version:** 1.0  
**Date:** 2025-12-18  
**Prepared by:** Edusphere Team

---

## 1. Introduction

### 1.1 Purpose
The purpose of this document is to present a detailed description of the Edusphere Student Information System (SIS). It will explain the purpose and features of the system, the interfaces of the system, what the system will do, the constraints under which it must operate, and how the system will react to external stimuli. This document is intended for both the stakeholders and the developers of the system.

### 1.2 Scope
Edusphere SIS is a comprehensive web-based application designed to streamline educational administration and enhance the learning experience. The system integrates:
-   **Administration**: Managing users (students, faculty), courses, and institutional reports.
-   **Faculty Operations**: managing attendance (via QR), grading, creating assignments, and generating tests using AI.
-   **Student Engagement**: Accessing course materials, tracking attendance/marks, taking AI-generated tests, and receiving personalized support.

### 1.3 Definitions, Acronyms, and Abbreviations
-   **SIS**: Student Information System
-   **SRS**: Software Requirements Specification
-   **AI**: Artificial Intelligence (specifically Google Gemini AI)
-   **QR**: Quick Response Code
-   **JWT**: JSON Web Token
-   **MERN**: MongoDB, Express.js, React, Node.js

---

## 2. Overall Description

### 2.1 Product Perspective
Edusphere is a standalone web application that interfaces with:
-   **MongoDB**: For storing persistent data (users, courses, grades, attendance).
-   **Supabase**: For storage and potentially authentication services.
-   **Google Gemini API**: For generating AI-powered test questions.
-   **Netlify**: For hosting serverless functions and the frontend.

### 2.2 User Requirements & Characteristics
The system interacts with three main user classes:

#### 2.2.1 Administrator
-   **Role**: Top-level management of the institution.
-   **Capabilities**:
    -   Create and manage Faculty and Student accounts.
    -   Define Courses and Classes.
    -   View institution-wide analytics and reports.
    -   Broadcast global announcements.

#### 2.2.2 Faculty (Teacher)
-   **Role**: Educators managing specific classes and subjects.
-   **Capabilities**:
    -   Take attendance using QR code scanning.
    -   Create and assign coursework and tests.
    -   Use AI to generate quizzes/tests on specific topics.
    -   Enter and manage student grades.
    -   View performance analytics for their classes.

#### 2.2.3 Student
-   **Role**: Learners enrolled in the institution.
-   **Capabilities**:
    -   View enrolled courses and attendance records.
    -   Access assignments and announcements.
    -   Take scheduled or AI-practice tests.
    -   View academic results and progress reports.
    -   Interact with a chatbot for basic assistance.

### 2.3 Operating Environment
-   **Client**: Modern web browsers (Chrome, Firefox, Safari, Edge) on Desktop and Mobile.
-   **Server**: Node.js environment (hosted on Netlify/Serverless or standard Node server).
-   **Database**: MongoDB Atlas (Cloud).

---

## 3. System Features (Functional Requirements)

### 3.1 Authentication & Authorization
-   **REQ-AUTH-01**: The system shall allow users to log in using Email and Password.
-   **REQ-AUTH-02**: The system shall utilize JWT for maintaining user sessions.
-   **REQ-AUTH-03**: The system shall redirect users to their respective dashboards (Admin, Faculty, Student) based on their role.

### 3.2 Attendance Management
-   **REQ-ATT-01**: The Faculty dashboard shall provide a "Scan QR" feature to mark student attendance.
-   **REQ-ATT-02**: The system shall record the timestamp and status (Present/Absent/Late) for each student.
-   **REQ-ATT-03**: Students shall be able to view their cumulative attendance percentage per course.

### 3.3 Test Management & AI Integration
-   **REQ-TEST-01**: Faculty shall be able to create manual tests with multiple-choice questions.
-   **REQ-TEST-02**: The system shall integrate with Google Gemini API to allow Faculty to auto-generate questions by providing a "Topic" and "Difficulty Level".
-   **REQ-TEST-03**: Students shall be able to take assigned tests within a specified time window.
-   **REQ-TEST-04**: The system shall auto-grade MCQ tests and update the student's result immediately.

### 3.4 Academic Management
-   **REQ-ACAD-01**: Admins shall be able to create Courses and assign Faculty to them.
-   **REQ-ACAD-02**: Faculty shall be able to upload resources (PDFs, Links) for their courses.
-   **REQ-ACAD-03**: Faculty shall be able to enter grades for internal and external assessments.
-   **REQ-ACAD-04**: Students shall be able to view a transcript of their grades.

### 3.5 Dashboards & Reporting
-   **REQ-DASH-01**: The Admin dashboard shall show widgets for Total Students, Total Faculty, and Recent Activity.
-   **REQ-DASH-02**: The Faculty dashboard shall show upcoming classes and recent submission stats.
-   **REQ-DASH-03**: The Student dashboard shall show upcoming deadlines and attendance alerts.

---

## 4. External Interface Requirements

### 4.1 User Interfaces
-   **Design Principle**: Responsive, clean, and accessible UI functionality using React and Tailwind CSS.
-   **Theme**: Support for Light/Dark mode.

### 4.2 Hardware Interfaces
-   **Camera/Webcam**: Required on the Faculty device for scanning Student QR codes during attendance.

### 4.3 Software Interfaces
-   **Database**: MongoDB for all relational data.
-   **API**: RESTful API endpoints for client-server communication.
-   **AI Service**: Google Gemini API via REST calls.

---

## 5. Non-Functional Requirements

### 5.1 Performance
-   The system shall load dashboard pages within 2 seconds under normal load.
-   Attendance marking transactions shall complete within 1 second.

### 5.2 Security
-   Passwords shall be hashed (e.g., via bcrypt) before storage.
-   All API endpoints shall be protected via authentication middleware.
-   Data in transit shall be encrypted via HTTPS.

### 5.3 Reliability
-   The system shall be available 99.9% of the time during business hours.
-   Database backups shall be performed daily.

---
**End of SRS**
