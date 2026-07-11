import Papa from 'papaparse';
import fs from 'fs';

const EXPORT_DIR = 'C:/Users/rahul/OneDrive/Desktop/JobCard-2-Windows (1)/JobCard-2-Windows/program';

function dumpFirst10(file: string) {
    const content = fs.readFileSync(`${EXPORT_DIR}/${file}`, 'utf8');
    Papa.parse(content, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
            console.log(`\n--- Dump of ${file} ---`);
            for(let i=0; i<10; i++) {
                if (results.data[i]) {
                    console.log(`Row ${i}:`, JSON.stringify(results.data[i]));
                }
            }
        }
    });
}

dumpFirst10('thing.csv');
dumpFirst10('worksheet.csv');
