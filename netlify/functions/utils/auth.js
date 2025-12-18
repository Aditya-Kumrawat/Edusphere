/**
 * JWT Authentication Utilities for Serverless Functions
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'datacraft-super-secret-jwt-key-change-in-production-2024';

export function verifyToken(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { error: 'No token provided', user: null };
    }

    const token = authHeader.substring(7);

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return { error: null, user: decoded };
    } catch (err) {
        return { error: 'Invalid or expired token', user: null };
    }
}

export function generateToken(user) {
    return jwt.sign(
        {
            userId: user._id || user.id,
            email: user.email,
            role: user.role
        },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

export function requireAuth(event) {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    const result = verifyToken(authHeader);

    if (result.error) {
        return {
            statusCode: 401,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: result.error })
        };
    }

    return result.user;
}
