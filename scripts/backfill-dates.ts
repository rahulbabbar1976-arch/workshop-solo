import { prisma } from '../src/lib/db';
import fs from 'fs';
import csv from 'csv-parser';

// Force dotenv to load .env since tsx doesn't always automatically load it like Next.js does
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });



const CSV_FILE_PATH = 'C:/Users/rahul/OneDrive/Documents/jc transfer/Job cards.csv';

function parseDateString(dateStr: string) {
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
  
  return new Date(year, month, day, hours, minutes);
}

async function main() {
  if (!fs.existsSync(CSV_FILE_PATH)) {
    console.error('File not found:', CSV_FILE_PATH);
    return;
  }

  const results: any[] = [];
  let rowCount = 0;

  console.log('Reading CSV...');
  fs.createReadStream(CSV_FILE_PATH)
    .pipe(csv({
      mapHeaders: ({ header, index }) => index.toString()
    }))
    .on('data', (data) => {
      results.push(data);
    })
    .on('end', async () => {
      console.log(`Parsed ${results.length} rows. Updating database...`);
      let updatedCount = 0;
      let errorCount = 0;
      
      for (const row of results) {
        rowCount++;
        if (rowCount % 50 === 0) console.log(`Processed ${rowCount}/${results.length} rows...`);

        const legacyId = row['0'];
        if (!legacyId) continue;
        
        // 26 = AA (Created)
        // 27 = AB (Deadline)
        // 28 = AC (Completed)
        const createdDate = parseDateString(row['26']);
        const deadlineDate = parseDateString(row['27']);
        const completedDate = parseDateString(row['28']);
        
        if (!createdDate) continue; 
        
        try {
          const jobCard = await prisma.jobCard.findUnique({
            where: { jobcardNumber: legacyId }
          });
          
          if (jobCard) {
            await prisma.jobCard.update({
              where: { id: jobCard.id },
              data: {
                createdAt: createdDate,
                dateIn: createdDate,
                expectedDeliveryAt: deadlineDate || null,
                closedAt: completedDate || null
              }
            });
            updatedCount++;
          }
        } catch (e: any) {
          errorCount++;
          console.error(`Error updating Jobcard ${legacyId}:`, e.message);
        }
      }
      
      console.log(`Finished! Updated: ${updatedCount}, Errors: ${errorCount}`);
      await prisma.$disconnect();
    })
    .on('error', (err) => {
      console.error('CSV parse error:', err);
    });
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
