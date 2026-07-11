import Papa from 'papaparse';
import fs from 'fs';

const EXPORT_DIR = 'C:/Users/rahul/OneDrive/Desktop/JobCard-2-Windows (1)/JobCard-2-Windows/program';

function inspectHeaders(file: string) {
    const content = fs.readFileSync(`${EXPORT_DIR}/${file}`, 'utf8');
    Papa.parse(content, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
            console.log(`\n--- Headers for ${file} ---`);
            console.log(results.meta.fields);
        }
    });
}

inspectHeaders('customer.csv');
inspectHeaders('thing.csv');
inspectHeaders('worksheet.csv');
