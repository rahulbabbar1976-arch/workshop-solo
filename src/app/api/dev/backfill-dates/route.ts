import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const CSV_FILE_PATH = 'C:/Users/rahul/OneDrive/Documents/jc transfer/Job cards.csv';
  
  if (!fs.existsSync(CSV_FILE_PATH)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const content = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
  const lines = content.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  const results = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    const row: any = {};
    const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || line.split(',');
    
    headers.forEach((h, index) => {
      row[h] = values[index] ? values[index].replace(/^"|"$/g, '').trim() : '';
    });
    results.push(row);
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

  let updatedCount = 0;
  let errorCount = 0;

  for (const row of results) {
    const legacyId = row['Id'];
    if (!legacyId) continue;
    
    const createdDate = parseDateString(row['Created']);
    const deadlineDate = parseDateString(row['Deadline']);
    const closedDate = parseDateString(row['Closed']) || parseDateString(row['Completed']);
    
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
            closedAt: closedDate || null
          }
        });
        updatedCount++;
      }
    } catch (e: any) {
      errorCount++;
      console.error(`Error updating Jobcard ${legacyId}:`, e.message);
    }
  }

  return NextResponse.json({ success: true, updatedCount, errorCount });
}
