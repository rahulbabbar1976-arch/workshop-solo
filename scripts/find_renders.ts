import fs from 'fs';

function summarizeFile(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('function render') || lines[i].includes('const render') || lines[i].includes('renderCustomers') || lines[i].includes('renderVehicles')) {
      console.log(`Line ${i + 1}: ${lines[i].trim()}`);
    }
    // Also look for tabs array or switch statement
    if (lines[i].includes('switch (activeTab)')) {
      console.log(`Line ${i + 1}: ${lines[i].trim()}`);
    }
  }
}

summarizeFile('C:/Users/rahul/OneDrive/Desktop/workshop-solo/src/app/advisor/page.tsx');
