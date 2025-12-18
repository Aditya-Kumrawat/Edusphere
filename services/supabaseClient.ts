/**
 * Supabase Client Compatibility Layer
 * 
 * This file now exports the MongoDB adapter instead of the real Supabase client.
 * All existing code that imports from './supabaseClient' will now use MongoDB.
 * 
 * To switch back to Supabase, replace this file's contents with the original Supabase client.
 */

// Export MongoDB adapter as 'supabase' for compatibility with all existing imports
export { supabase } from './mongoAdapter';
