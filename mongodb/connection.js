/**
 * MongoDB Atlas Connection Configuration
 * EduSphere SIS - Student Information System
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from the mongodb folder's .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

// MongoDB Atlas Connection String
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/edusphere?retryWrites=true&w=majority';

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(MONGODB_URI, {
            // These options are no longer needed in Mongoose 6+, but included for compatibility
            // useNewUrlParser: true,
            // useUnifiedTopology: true,
        });

        console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host}`);
        console.log(`📦 Database: ${conn.connection.name}`);

        return conn;
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);
        process.exit(1);
    }
};

// Connection event handlers
mongoose.connection.on('connected', () => {
    console.log('🔗 Mongoose connected to MongoDB Atlas');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('🔌 Mongoose disconnected from MongoDB Atlas');
});

// Graceful shutdown
process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('👋 MongoDB connection closed due to app termination');
    process.exit(0);
});

export { connectDB, mongoose };
