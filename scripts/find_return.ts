import fs from 'fs';
const content = fs.readFileSync('C:/Users/rahul/OneDrive/Desktop/workshop-solo/src/app/advisor/page.tsx', 'utf-8');
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('return') && lines[i].includes('<')) {
    console.log(`Line ${i+1}: ${lines[i]}`);
  }
}
