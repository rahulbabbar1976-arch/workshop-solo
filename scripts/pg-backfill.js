const { Pool } = require('pg');
const fs = require('fs');
const csv = require('csv-parser');
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const CSV_FILE_PATH = 'C:/Users/rahul/OneDrive/Documents/jc transfer/Job cards.csv';

function parseDateString(dateStr) {
  if (!dateStr || dateStr.trim() === '') return null;
  const parts = dateStr.trim().split('-');
  if (parts.length < 3) return null;
  
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; 
  
  const yearTime = parts[2].split(' ');
  const year = parseInt(yearTime[0], 10);
  
  let hours = 0;
  let minutes = 0;
  if (yearTime.length > 1) {
    const timeParts = yearTime[1].split(':');
    if (timeParts.length >= 2) {
      hours = parseInt(timeParts[0], 10);
      minutes = parseInt(timeParts[1], 10);
    }
  }
  
  // Format for postgres: YYYY-MM-DD HH:mm:ss
  const date = new Date(year, month, day, hours, minutes);
  return date.toISOString();
}

async function main() {
  if (!fs.existsSync(CSV_FILE_PATH)) {
    console.error('File not found:', CSV_FILE_PATH);
    return;
  }

  const results = [];
  
  fs.createReadStream(CSV_FILE_PATH)
    .pipe(csv({
      mapHeaders: ({ header, index }) => index.toString()
    }))
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      console.log(`Parsed ${results.length} rows. Updating database...`);
      let updatedCount = 0;
      let errorCount = 0;
      
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        for (const row of results) {
          const legacyId = row['0'];
          if (!legacyId) continue;
          
          const createdDate = parseDateString(row['26']);
          const deadlineDate = parseDateString(row['27']);
          const completedDate = parseDateString(row['28']);
          
          if (!createdDate) continue; 
          
          const jobCardNum = `LEGACY-${legacyId.trim()}`;
          
          let updateQuery = 'UPDATE "JobCard" SET "createdAt" = $1, "dateIn" = $1';
          const params = [createdDate];
          let paramIdx = 2;
          
          if (deadlineDate) {
            updateQuery += `, "expectedDeliveryAt" = $${paramIdx}`;
            params.push(deadlineDate);
            paramIdx++;
          }
          if (completedDate) {
            updateQuery += `, "closedAt" = $${paramIdx}`;
            params.push(completedDate);
            paramIdx++;
          }
          
          updateQuery += ` WHERE "jobcardNumber" = $${paramIdx}`;
          params.push(jobCardNum);
          
          const res = await client.query(updateQuery, params);
          if (res.rowCount > 0) {
            updatedCount++;
          } else {
            errorCount++;
          }
        }
        
        await client.query('COMMIT');
        console.log(`Finished! Updated: ${updatedCount}, Not found: ${errorCount}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error during transaction', err);
      } finally {
        client.release();
        await pool.end();
      }
    });
}

main();
