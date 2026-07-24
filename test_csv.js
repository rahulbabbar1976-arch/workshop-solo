const fs = require('fs');

const txt = fs.readFileSync('C:/Users/rahul/OneDrive/Desktop/JobCard-2-Windows (1)/JobCard-2-Windows/program/item.csv', 'utf-8');

function parseItemsCSV(csvText) {
  const result = [];
  let currentField = '';
  let inQuotes = false;
  let currentRow = [];
  
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentField.trim());
      result.push(currentRow);
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    result.push(currentRow);
  }
  return result;
}

const rows = parseItemsCSV(txt);
let found = 0;
const firstFew = [];

for (const row of rows) {
  if (row.length < 28) continue;
  if (row[8] !== 'WORKSHEET') continue;
  found++;
  if (found <= 5) {
      firstFew.push({ connectionId: row[7], name: row[22], type: row[18], quantity: row[24], price: row[12] });
  }
}

console.log('Found:', found);
console.log('First few:', firstFew);
