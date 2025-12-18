/**
 * MongoDB Adapter - Supabase-Compatible API
 * 
 * This adapter mimics the Supabase client API but uses MongoDB backend.
 * Works both locally (localhost:5000) and on Netlify (serverless functions)
 * 
 * Usage: import { supabase } from '../services/mongoAdapter';
 */

// Auto-detect API URL based on environment
const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:5000/api'  // Local Express server
    : '/api';  // Netlify Functions (via redirects)

// Get auth token
const getToken = () => localStorage.getItem('auth_token');

// Helper for API calls
const fetchAPI = async (endpoint: string, options: RequestInit = {}) => {
    const token = getToken();
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    const data = await response.json();

    if (!response.ok) {
        return { data: null, error: { message: data.error || 'Request failed' } };
    }

    return { data, error: null };
};

// Table name to endpoint mapping
const tableEndpoints: Record<string, string> = {
    'profiles': '/profiles',
    'courses': '/courses',
    'enrollments': '/enrollments',
    'attendance': '/attendance',
    'grades': '/grades',
    'announcements': '/announcements',
    'tests': '/tests',
    'quiz_results': '/quiz-results',
    'exam_entries': '/exam-entries',
    'assignments': '/assignments',
    'assignment_submissions': '/assignment_submissions',
    'timetable': '/timetable',
    'resources': '/resources',
    'notifications': '/notifications',
    'attendance_sessions': '/attendance_sessions',
};

// Query builder class that mimics Supabase's chained methods
class QueryBuilder {
    private table: string;
    private endpoint: string;
    private filters: Record<string, any> = {};
    private selectColumns: string = '*';
    private orderByColumn: string | null = null;
    private orderAscending: boolean = true;
    private limitCount: number | null = null;
    private singleResult: boolean = false;
    private maybeSingleResult: boolean = false;

    constructor(table: string) {
        this.table = table;
        this.endpoint = tableEndpoints[table] || `/${table}`;
    }

    select(columns: string = '*') {
        this.selectColumns = columns;
        return this;
    }

    eq(column: string, value: any) {
        this.filters[column] = value;
        return this;
    }

    neq(column: string, value: any) {
        this.filters[`${column}__neq`] = value;
        return this;
    }

    gt(column: string, value: any) {
        this.filters[`${column}__gt`] = value;
        return this;
    }

    gte(column: string, value: any) {
        this.filters[`${column}__gte`] = value;
        return this;
    }

    lt(column: string, value: any) {
        this.filters[`${column}__lt`] = value;
        return this;
    }

    lte(column: string, value: any) {
        this.filters[`${column}__lte`] = value;
        return this;
    }

    in(column: string, values: any[]) {
        this.filters[`${column}__in`] = values.join(',');
        return this;
    }

    order(column: string, { ascending = true }: { ascending?: boolean } = {}) {
        this.orderByColumn = column;
        this.orderAscending = ascending;
        return this;
    }

    limit(count: number) {
        this.limitCount = count;
        return this;
    }

    single() {
        this.singleResult = true;
        return this;
    }

    maybeSingle() {
        this.maybeSingleResult = true;
        return this;
    }

    // Execute SELECT query
    async then(resolve: (value: any) => void) {
        const params = new URLSearchParams();

        // Add filters
        Object.entries(this.filters).forEach(([key, value]) => {
            // Convert filter keys - handle special filter formats
            const cleanKey = key.replace('__neq', '').replace('__gt', '').replace('__gte', '')
                .replace('__lt', '').replace('__lte', '').replace('__in', '');
            params.append(cleanKey, String(value));
        });

        if (this.orderByColumn) {
            params.append('_sort', this.orderByColumn);
            params.append('_order', this.orderAscending ? 'asc' : 'desc');
        }

        if (this.limitCount) {
            params.append('_limit', String(this.limitCount));
        }

        const queryString = params.toString();
        const url = queryString ? `${this.endpoint}?${queryString}` : this.endpoint;

        const result = await fetchAPI(url);

        // Handle single/maybeSingle
        if (this.singleResult || this.maybeSingleResult) {
            if (Array.isArray(result.data)) {
                result.data = result.data[0] || null;
            }
            if (this.singleResult && !result.data && !result.error) {
                result.error = { message: 'No rows found' };
            }
        }

        resolve(result);
    }

    // INSERT
    async insert(data: any | any[]) {
        const items = Array.isArray(data) ? data : [data];
        const results = [];

        for (const item of items) {
            const result = await fetchAPI(this.endpoint, {
                method: 'POST',
                body: JSON.stringify(item),
            });
            if (result.error) return result;
            results.push(result.data);
        }

        return {
            data: Array.isArray(data) ? results : results[0],
            error: null
        };
    }

    // UPDATE
    async update(data: any) {
        // For updates, we need an ID - get it from filters
        const id = this.filters['id'] || this.filters['_id'];

        if (id) {
            return fetchAPI(`${this.endpoint}/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data),
            });
        }

        // If no ID, update based on filters
        const params = new URLSearchParams(this.filters as any);
        return fetchAPI(`${this.endpoint}?${params}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    // UPSERT
    async upsert(data: any | any[]) {
        // For upsert, we'll use POST which handles create/update in our API
        return this.insert(data);
    }

    // DELETE
    async delete() {
        const id = this.filters['id'] || this.filters['_id'];

        if (id) {
            return fetchAPI(`${this.endpoint}/${id}`, {
                method: 'DELETE',
            });
        }

        const params = new URLSearchParams(this.filters as any);
        return fetchAPI(`${this.endpoint}?${params}`, {
            method: 'DELETE',
        });
    }
}

// RPC function handler
const rpc = async (functionName: string, params: Record<string, any> = {}) => {
    // Map known RPC functions to API endpoints
    const rpcEndpoints: Record<string, string> = {
        'check_organization_code': '/auth/verify-org-code',
    };

    const endpoint = rpcEndpoints[functionName] || `/rpc/${functionName}`;

    return fetchAPI(endpoint, {
        method: 'POST',
        body: JSON.stringify(params),
    });
};

// Auth module that mimics Supabase auth
const auth = {
    async getSession() {
        const token = getToken();
        if (!token) {
            return { data: { session: null }, error: null };
        }

        try {
            const result = await fetchAPI('/auth/me');
            if (result.error) {
                return { data: { session: null }, error: result.error };
            }

            return {
                data: {
                    session: {
                        user: result.data.user,
                        access_token: token,
                    }
                },
                error: null
            };
        } catch {
            return { data: { session: null }, error: null };
        }
    },

    async signInWithPassword({ email, password }: { email: string; password: string }) {
        // This is handled by authService, but we provide compatibility
        const result = await fetchAPI('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password, role: 'STUDENT' }), // Default role
        });

        if (result.error) {
            return { data: { user: null, session: null }, error: result.error };
        }

        localStorage.setItem('auth_token', result.data.token);
        localStorage.setItem('user', JSON.stringify(result.data.user));

        return {
            data: {
                user: result.data.user,
                session: { user: result.data.user, access_token: result.data.token }
            },
            error: null
        };
    },

    async signUp({ email, password, options }: { email: string; password: string; options?: any }) {
        const userData = options?.data || {};

        const result = await fetchAPI('/auth/register', {
            method: 'POST',
            body: JSON.stringify({
                email,
                password,
                full_name: userData.full_name || 'New User',
                role: userData.role || 'STUDENT',
            }),
        });

        if (result.error) {
            return { data: { user: null, session: null }, error: result.error };
        }

        localStorage.setItem('auth_token', result.data.token);
        localStorage.setItem('user', JSON.stringify(result.data.user));

        return {
            data: {
                user: result.data.user,
                session: { user: result.data.user, access_token: result.data.token }
            },
            error: null
        };
    },

    async signOut() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        return { error: null };
    },

    onAuthStateChange(callback: (event: string, session: any) => void) {
        // Check current auth state
        const token = getToken();
        if (token) {
            const user = JSON.parse(localStorage.getItem('user') || 'null');
            callback('SIGNED_IN', { user });
        }

        // Return subscription object (for compatibility)
        return {
            data: {
                subscription: {
                    unsubscribe: () => { }
                }
            }
        };
    }
};

// Main supabase-like export
export const supabase = {
    from: (table: string) => new QueryBuilder(table),
    rpc,
    auth,
};

// Default export for compatibility
export default supabase;
