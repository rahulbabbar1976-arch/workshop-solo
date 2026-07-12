const Papa = require('papaparse');
const fs = require('fs');

const content = fs.readFileSync('C:/Users/rahul/OneDrive/Desktop/JobCard-2-Windows (1)/JobCard-2-Windows/program/master_item.csv', 'utf8');

Papa.parse(content, {
  complete: function(results) {
    const data = results.data;
    
    let laborCount = 0;
    let partsCount = 0;
    
    const laborKeywords = ['labor', 'labour', 'service', 'repair', 'fitting', 'installation', 'checking', 'charges', 'wiring', 'removal'];

    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if(!row || row.length < 5) continue;
        
        const name = (row[5] || row[4] || '').toLowerCase(); // Note: actually column 5 has the text in the rows we dumped. Wait, Col 5? Let me re-check.
        // Wait, in my previous dump, it was row[5]. Let's check row[5] first, then row[4].
        // In my check_csv output:
        // Row 0: [ '1', '0', '1', '', '', 'AC compressor', ... ]
        // So the name is at index 5.
        const actualName = row[5] || '';
        const nameLower = actualName.toLowerCase();
        
        let isLabor = false;
        for (const word of laborKeywords) {
            if (nameLower.includes(word)) {
                isLabor = true;
                break;
            }
        }
        
        if (isLabor) {
            laborCount++;
        } else {
            partsCount++;
        }
    }
    
    console.log(`With keywords [${laborKeywords.join(', ')}]:`);
    console.log(`Labor items: ${laborCount}`);
    console.log(`Parts items: ${partsCount}`);
  }
});
