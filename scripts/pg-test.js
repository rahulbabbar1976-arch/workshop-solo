const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  try {
    const res = await pool.query(`SELECT "jobcardNumber", "createdAt", "dateIn", "expectedDeliveryAt", "closedAt" FROM "JobCard" WHERE "jobcardNumber" = 'JC-LEGACY-997' OR "jobcardNumber" = 'JC-LEGACY-1858' OR "jobcardNumber" = 'JC-LEGACY-193'`);
    console.log(res.rows);
  } catch (err) {
    console.error('Error executing query', err.stack);
  } finally {
    await pool.end();
  }
}

main();
