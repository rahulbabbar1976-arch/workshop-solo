import * as xlsx from 'xlsx';

const baseDir = `C:\\Users\\rahul\\OneDrive\\Documents\\jc transfer`;
console.log("Partners.xls Rows 0-5:");
const wb1 = xlsx.readFile(baseDir + '\\Partners.xls');
const data1 = xlsx.utils.sheet_to_json(wb1.Sheets[wb1.SheetNames[0]], {header: 1});
for(let i=0; i<5; i++) console.log(`Row ${i}:`, data1[i]);
