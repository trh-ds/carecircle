import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import pool from '@/lib/db';

async function testConnection() {
    try {
        console.log(process.env.MYSQL_PASSWORD)
        const connection = await pool.getConnection();
        console.log('✅ MySQL connected successfully!');
        connection.release(); // Always release the connection back to the pool
        return true;
    } catch (error) {
        console.error('❌ MySQL connection failed:', error);
        return false;
    }
}

testConnection().then(success => {
    process.exit(success ? 0 : 1);
}); 