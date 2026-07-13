// src/lib/mysql.ts
import 'dotenv/config';
// or, if you want to explicitly point to .env.local:
import { config } from 'dotenv';
config({ path: '.env.local' });
// Create the connection poeol
import mysql from 'mysql2/promise';
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10, // Max number of connections in the pool
  queueLimit: 0,       // Unlimited queueing
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});



// Export the pool for queries
export default pool;