/**
 * Auth API - Netlify Serverless Function
 * Handles: login, register, get current user
 */

import { connectDB } from './utils/db.js';
import { User } from './utils/models.js';
import { generateToken, requireAuth } from './utils/auth.js';
import bcrypt from 'bcryptjs';

const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

export const handler = async (event, context) => {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    await connectDB();

    const path = event.path.replace('/.netlify/functions/api', '');
    const method = event.httpMethod;

    try {
        // POST /auth/login
        if (path === '/auth/login' && method === 'POST') {
            const { email, password, role } = JSON.parse(event.body);

            if (!email || !password || !role) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Email, password, and role are required' })
                };
            }

            const user = await User.findOne({ email: email.toLowerCase() });
            if (!user) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ error: 'Invalid email or password' })
                };
            }

            const isValid = await bcrypt.compare(password, user.password);
            if (!isValid) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ error: 'Invalid email or password' })
                };
            }

            if (user.role !== role) {
                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({ error: `Role mismatch. Please login as ${user.role}` })
                };
            }

            const token = generateToken(user);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    token,
                    user: {
                        id: user._id,
                        email: user.email,
                        full_name: user.full_name,
                        role: user.role,
                        department: user.department
                    }
                })
            };
        }

        // POST /auth/register
        if (path === '/auth/register' && method === 'POST') {
            const { email, password, full_name, role, enrollment_number } = JSON.parse(event.body);

            if (!email || !password || !full_name || !role) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'All fields are required' })
                };
            }

            const existing = await User.findOne({ email: email.toLowerCase() });
            if (existing) {
                return {
                    statusCode: 409,
                    headers,
                    body: JSON.stringify({ error: 'User with this email already exists' })
                };
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = await User.create({
                email: email.toLowerCase(),
                password: hashedPassword,
                full_name,
                role: role.toUpperCase(),
                enrollment_number: role === 'STUDENT' ? enrollment_number : undefined,
                department: 'General'
            });

            const token = generateToken(newUser);
            return {
                statusCode: 201,
                headers,
                body: JSON.stringify({
                    token,
                    user: {
                        id: newUser._id,
                        email: newUser.email,
                        full_name: newUser.full_name,
                        role: newUser.role
                    }
                })
            };
        }

        // GET /auth/me
        if (path === '/auth/me' && method === 'GET') {
            const authResult = requireAuth(event);
            if (authResult.statusCode) return authResult;

            const user = await User.findById(authResult.userId).select('-password');
            if (!user) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'User not found' })
                };
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ user })
            };
        }

        // Route not found
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Not found' })
        };

    } catch (error) {
        console.error('API Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};
