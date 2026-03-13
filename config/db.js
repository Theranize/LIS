import "../config/env.js";
import mysql from "mysql2/promise";

console.log("Initializing database connection...");
console.log("Database configuration:", process.env.DB_HOST, process.env.DB_USER, process.env.DB_NAME);

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "",
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10
});

// Test database connection
async function checkDatabaseConnection() {
  try {
    const connection = await pool.getConnection();
    console.log("Database connection established successfully.");
    connection.release();
  } catch (error) {
    console.error("Failed to establish database connection.");
    console.error("Error details:", error);
  }
}

checkDatabaseConnection();

export default pool;