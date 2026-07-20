const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const csv = require('csv-parser');
const prisma = new PrismaClient();

const CSV_FILE_PATH = 'C:/Users/rahul/OneDrive/Documents/jc transfer/Job cards.csv';

function parseDateString(dateStr) {
  if (!dateStr || dateStr.trim() === '') return null;
  // expects "DD-MM-YYYY" or "DD-MM-YYYY HH:mm"
  const parts = dateStr.trim().split('-');
  if (parts.length < 3) return null;
  
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
  
  // handle time part if exists
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
  console.log('Starting legacy dates backfill...');
  
  const results = [];
  
  fs.createReadStream(CSV_FILE_PATH)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      let updatedCount = 0;
      let errorCount = 0;
      
      for (const row of results) {
        const legacyId = row['Id'];
        if (!legacyId) continue;
        
        const createdDate = parseDateString(row['Created']);
        const deadlineDate = parseDateString(row['Deadline']);
        const closedDate = parseDateString(row['Closed']) || parseDateString(row['Completed']);
        
        if (!createdDate) continue; // If we can't parse created date, skip
        
        try {
          // Find job card by legacy jobcardNumber
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
                closedAt: closedDate || null
              }
            });
            updatedCount++;
          }
        } catch (e) {
          errorCount++;
          console.error(`Error updating Jobcard ${legacyId}:`, e.message);
        }
      }
      
      console.log(`Finished processing. Updated: ${updatedCount}, Errors: ${errorCount}`);
      await prisma.$disconnect();
    });
}

main().catch(e => {
  console.error(e);
  prisma.$disconnect();
});
