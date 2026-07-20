const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  try {
    const res = await pool.query(`SELECT count(*) FROM "JobCard" WHERE "createdAt" < '2025-01-01'`);
    console.log("Updated createdAt count:", res.rows[0].count);
  } catch (err) {
    console.error('Error executing query', err.stack);
  } finally {
    await pool.end();
  }
}

main();
