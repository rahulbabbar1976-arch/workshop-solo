import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import fs from 'fs';
import csv from 'csv-parser';

export async function GET() {
  const CSV_FILE_PATH = 'C:/Users/rahul/OneDrive/Documents/jc transfer/Job cards.csv';
  
  if (!fs.existsSync(CSV_FILE_PATH)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

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

  return new Promise((resolve) => {
    const results: any[] = [];
    fs.createReadStream(CSV_FILE_PATH)
      .pipe(csv({
        mapHeaders: ({ header, index }) => index.toString() // We map headers to their column index to be 100% sure!
      }))
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        let updatedCount = 0;
        let errorCount = 0;
        
        // 0. Id
        // 26. Created (AA)
        // 27. Deadline (AB)
        // 28. Completed (AC)
        for (const row of results) {
          const legacyId = row['0'];
          if (!legacyId) continue;
          
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
        
        resolve(NextResponse.json({ success: true, updatedCount, errorCount, processed: results.length }));
      })
      .on('error', (err) => {
        resolve(NextResponse.json({ error: err.message }, { status: 500 }));
      });
  });
}
