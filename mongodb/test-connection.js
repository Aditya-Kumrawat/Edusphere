/**
 * Test MongoDB Connection
 */

import { connectDB, mongoose } from './connection.js';

async function testConnection() {
    console.log('🔄 Testing MongoDB Atlas connection...\n');

    try {
        await connectDB();

        // If we get here, connection was successful
        console.log('\n✅ CONNECTION TEST PASSED!');
        console.log('Your MongoDB Atlas database is ready to use.\n');

        // Close the connection
        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('\n❌ CONNECTION TEST FAILED!');
        console.error('Error:', error.message);
        process.exit(1);
    }
}

testConnection();
