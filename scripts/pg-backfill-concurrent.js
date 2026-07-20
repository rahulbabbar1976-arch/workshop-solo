const { Pool } = require('pg');
const fs = require('fs');
const csv = require('csv-parser');
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // 20 connections max
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
  
  return new Date(year, month, day, hours, minutes).toISOString();
}

async function main() {
  const results = [];
  
  fs.createReadStream(CSV_FILE_PATH)
    .pipe(csv({
      mapHeaders: ({ header, index }) => index.toString()
    }))
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      console.log(`Parsed ${results.length} rows. Updating database concurrently...`);
      let updatedCount = 0;
      let errorCount = 0;
      
      const batchSize = 100;
      for (let i = 0; i < results.length; i += batchSize) {
        const batch = results.slice(i, i + batchSize);
        
        const promises = batch.map(async (row) => {
          const legacyId = row['0'];
          if (!legacyId) return;
          
          const createdDate = parseDateString(row['26']);
          const deadlineDate = parseDateString(row['27']);
          const completedDate = parseDateString(row['28']);
          
          if (!createdDate) return; 
          
          const legacyIdStr = legacyId.trim();
          
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
          
          updateQuery += ` WHERE "jobcardNumber" = 'JC-LEGACY-' || $${paramIdx} OR "jobcardNumber" = 'LEGACY-' || $${paramIdx}`;
          params.push(legacyIdStr);
          
          try {
            const res = await pool.query(updateQuery, params);
            if (res.rowCount > 0) {
              updatedCount++;
            } else {
              errorCount++;
            }
          } catch(e) {
            errorCount++;
          }
        });
        
        await Promise.all(promises);
        console.log(`Processed ${Math.min(i + batchSize, results.length)} / ${results.length}`);
      }
      
      console.log(`Finished! Updated: ${updatedCount}, Not found/Error: ${errorCount}`);
      await pool.end();
    });
}

main();
