const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  try {
    const res = await pool.query(`UPDATE "JobCard" SET "createdAt" = "dateIn" WHERE "jobcardNumber" LIKE '%LEGACY%' RETURNING "jobcardNumber", "createdAt", "dateIn"`);
    console.log(`Updated ${res.rowCount} rows`);
    // update closedAt to expectedDeliveryAt if it's missing but we need it? No, the user said "date of completetion not Due date".
    // wait, I will also update the UI in a moment.
  } catch (err) {
    console.error('Error executing query', err.stack);
  } finally {
    await pool.end();
  }
}

main();
