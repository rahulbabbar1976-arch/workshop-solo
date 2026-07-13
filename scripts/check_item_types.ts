import 'dotenv/config';
import * as xlsx from 'xlsx';

async function main() {
  const filePath = 'C:/Users/rahul/OneDrive/Desktop/Items.xls';
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet, { range: 2 });
  
  const types = new Set();
  data.forEach((row: any) => {
    types.add(row.Type);
  });
  console.log("Types found:", Array.from(types));
}

main().catch(console.error);
