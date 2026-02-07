import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pharmacy_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

export async function query<T = any>(sql: string, params: any[] = []): Promise<T> {
  const [results] = await pool.execute(sql, params)
  return results as T
}
