import Papa from 'papaparse';
import fs from 'fs';

const fileContent = fs.readFileSync('C:/Users/rahul/OneDrive/Desktop/JobCard-2-Windows (1)/JobCard-2-Windows/program/problem.csv', 'utf8');
Papa.parse(fileContent, {
  header: false,
  skipEmptyLines: true,
  complete: (results) => {
    const data = results.data;
    console.log('Total problems:', data.length);
    console.log('First problem:', data[0]);
    console.log('Row 0:', data[0][0]); // PROBLEM_ID
    console.log('Row 5:', data[0][5]); // WORKSHEET_ID
    console.log('Row 8:', data[0][8]); // DESCRIPTION
  }
});
