import Papa from 'papaparse';
import fs from 'fs';

const fileContent = fs.readFileSync('C:/Users/rahul/OneDrive/Desktop/JobCard-2-Windows (1)/JobCard-2-Windows/program/worksheet.csv', 'utf8');
Papa.parse(fileContent, {
  header: false,
  skipEmptyLines: true,
  complete: (results) => {
    const data = results.data;
    console.log('Total worksheets:', data.length);
    console.log('First worksheet:', data[0]);
    console.log('Row 0:', data[0][0]); // WORKSHEET_ID
    console.log('Row 1:', data[0][1]); // CUSTOMER_ID
    console.log('Row 3:', data[0][3]); // THING_ID
    console.log('Row 7:', data[0][7]); // DATE_IN
    console.log('Row 9:', data[0][9]); // CLOSED_AT
    console.log('Row 14:', data[0][14]); // TOTAL_AMOUNT
  }
});
