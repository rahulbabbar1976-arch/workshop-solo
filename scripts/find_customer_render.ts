import fs from 'fs';

function findFunction(filePath: string, funcName: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(funcName)) {
      console.log(`Line ${i + 1}: ${lines[i]}`);
      // print context
      for (let j = 1; j <= 5; j++) {
        if (i+j < lines.length) console.log(`Line ${i + 1 + j}: ${lines[i+j]}`);
      }
      break;
    }
  }
}

findFunction('C:/Users/rahul/OneDrive/Desktop/workshop-solo/src/app/advisor/page.tsx', 'Customer');
