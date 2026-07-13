import fs from 'fs';
const content = fs.readFileSync('C:/Users/rahul/OneDrive/Desktop/workshop-solo/src/app/advisor/page.tsx', 'utf-8');
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('mobile-bottom-nav') || lines[i].includes('tab-btn')) {
    console.log(`Line ${i+1}: ${lines[i]}`);
    for (let j = 1; j <= 20; j++) {
      if (i+j < lines.length) console.log(`Line ${i+1+j}: ${lines[i+j]}`);
    }
  }
}
