const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  try {
    const res = await pool.query(`UPDATE "JobCard" SET "createdAt" = '2020-01-01T00:00:00Z' WHERE "jobcardNumber" = 'JC-LEGACY-997' RETURNING "createdAt"`);
    console.log(res.rows);
  } catch (err) {
    console.error('Error executing query', err.stack);
  } finally {
    await pool.end();
  }
}

main();
