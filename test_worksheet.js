const fs = require('fs');

function parseCSVText(csvText) {
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

  if (result.length === 0) return [];
  
  const headers = result[0].map(h => h.trim());
  const rows = [];
  for (let i = 1; i < result.length; i++) {
    const row = result[i];
    if (row.length === 1 && row[0] === '') continue;
    const obj = {};
    headers.forEach((h, index) => {
      obj[h] = row[index] || '';
    });
    rows.push(obj);
  }
  return rows;
}

const worksheetText = fs.readFileSync('C:\\Users\\rahul\\OneDrive\\Desktop\\workshop\\temp\\derby_export\\worksheets.csv', 'utf-8');
const worksheetRows = parseCSVText(worksheetText);
console.log('Worksheets parsed:', worksheetRows.length);
if (worksheetRows.length > 0) {
  console.log('Sample worksheet row:');
  console.log(worksheetRows[0]);
  
  const sourceId = worksheetRows[0]['Id'] || worksheetRows[0]['id'] || worksheetRows[0]['JobCardID'] || worksheetRows[0]['InvoiceID'] || worksheetRows[0]['JobCard Number'] || worksheetRows[0]['Invoice Number'] || '';
  console.log('Computed sourceId:', sourceId);
}
