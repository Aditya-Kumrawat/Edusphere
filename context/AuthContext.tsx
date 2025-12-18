import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserRole } from '../types';
import { authService } from '../services/authService';

interface AuthContextType {
    session: any;
    user: any;
    role: UserRole | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    role: null,
    loading: true,
    signOut: async () => { }
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<any>(null);
    const [role, setRole] = useState<UserRole | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is logged in (has token)
        const initAuth = async () => {
            try {
                if (authService.isAuthenticated()) {
                    // Try to get current user from API
                    const currentUser = await authService.getCurrentUser();
                    setUser(currentUser);

                    // Set role from user data
                    const userRole = currentUser.role?.toUpperCase();
                    if (userRole === 'STUDENT') setRole(UserRole.STUDENT);
                    else if (userRole === 'FACULTY') setRole(UserRole.FACULTY);
                    else if (userRole === 'ADMIN') setRole(UserRole.ADMIN);
                    else setRole(UserRole.STUDENT);
                } else {
                    // No token, user is not logged in
                    setUser(null);
                    setRole(null);
                }
            } catch (error) {
                console.error('Auth initialization error:', error);
                // Token might be expired or invalid
                authService.logout();
                setUser(null);
                setRole(null);
            } finally {
                setLoading(false);
            }
        };

        initAuth();
    }, []);

    const signOut = async () => {
        authService.logout();
        setUser(null);
        setRole(null);
        window.location.href = '/';
    };

    // Create a session object for compatibility
    const session = user ? { user } : null;

    return (
        <AuthContext.Provider value={{ session, user, role, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
