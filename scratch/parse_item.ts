import Papa from 'papaparse';
import fs from 'fs';

const fileContent = fs.readFileSync('C:/Users/rahul/OneDrive/Desktop/JobCard-2-Windows (1)/JobCard-2-Windows/program/item.csv', 'utf8');
Papa.parse(fileContent, {
  header: false,
  skipEmptyLines: true,
  complete: (results) => {
    const data = results.data;
    console.log('Total items:', data.length);
    console.log('First item:', data[0]);
    console.log('Row 0 (ITEM_ID):', data[0][0]); 
    console.log('Row 7 (WORKSHEET_ID):', data[0][7]);
    console.log('Row 22 (DESCRIPTION):', data[0][22]);
    console.log('Row 24 (QTY?):', data[0][24]);
    console.log('Row 31 (PRICE?):', data[0][31]);
    console.log('Row 32 (PRICE?):', data[0][32]);
    
    // Find a known Labour item to test keywords
    const pricedItem = data.find(r => parseFloat(r[32] || '0') > 0 || parseFloat(r[33] || '0') > 0 || parseFloat(r[34] || '0') > 0);
    if (pricedItem) {
      console.log('Priced item row:', pricedItem.filter((v: string) => v.trim() !== ''));
    }
  }
});
