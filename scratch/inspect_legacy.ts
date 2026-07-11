import Papa from 'papaparse';
import fs from 'fs';

const EXPORT_DIR = 'C:/Users/rahul/OneDrive/Desktop/JobCard-2-Windows (1)/JobCard-2-Windows/program';

function inspectFile(file: string, targetRow: number = 0) {
    const content = fs.readFileSync(`${EXPORT_DIR}/${file}`, 'utf8');
    Papa.parse(content, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
            const row = results.data[targetRow];
            if (!row) return;
            console.log(`\n--- Inspecting ${file} row ${targetRow} ---`);
            row.forEach((col: string, idx: number) => {
                if (col && col.trim() !== '' && col !== '0' && col !== '0.0000') {
                    console.log(`Index ${idx}: ${col.substring(0, 50).replace(/\n/g, ' ')}`);
                }
            });
        }
    });
}

inspectFile('customer.csv', 2);
inspectFile('thing.csv', 1);
inspectFile('worksheet.csv', 2);
