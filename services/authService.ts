/**
 * Authentication Service for MongoDB API
 */

const API_URL = 'http://localhost:5000/api/auth';

export interface LoginResponse {
    token: string;
    user: {
        id: string;
        email: string;
        full_name: string;
        role: string;
        avatar_url?: string;
        department?: string;
        enrollment_number?: string;
        batch?: string;
    };
}

export interface RegisterData {
    email: string;
    password: string;
    full_name: string;
    role: string;
    enrollment_number?: string;
}

class AuthService {
    // Login user
    async login(email: string, password: string, role: string): Promise<LoginResponse> {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password, role }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Login failed');
        }

        const data = await response.json();

        // Store token in localStorage
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        return data;
    }

    // Register new user
    async register(userData: RegisterData): Promise<LoginResponse> {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Registration failed');
        }

        const data = await response.json();

        // Store token in localStorage
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        return data;
    }

    // Get current user
    async getCurrentUser() {
        const token = this.getToken();
        if (!token) {
            throw new Error('No authentication token found');
        }

        const response = await fetch(`${API_URL}/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            // Token expired or invalid
            this.logout();
            throw new Error('Session expired. Please login again.');
        }

        const data = await response.json();
        localStorage.setItem('user', JSON.stringify(data.user));
        return data.user;
    }

    // Logout user
    logout() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
    }

    // Get stored token
    getToken(): string | null {
        return localStorage.getItem('auth_token');
    }

    // Get stored user
    getUser() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    }

    // Check if user is authenticated
    isAuthenticated(): boolean {
        return !!this.getToken();
    }
}

export const authService = new AuthService();
