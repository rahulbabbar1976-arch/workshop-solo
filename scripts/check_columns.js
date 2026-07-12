const fs = require('fs');
const content = fs.readFileSync('C:/Users/rahul/OneDrive/Desktop/JobCard-2-Windows (1)/JobCard-2-Windows/program/master_item.csv', 'utf8');
const lines = content.split('\n');

const col2 = new Set();
const col3 = new Set();
const col5 = new Set();
const col7 = new Set();
const col8 = new Set();

for(let i=0; i<lines.length; i++) {
  if(!lines[i].trim()) continue;
  const cols = lines[i].split(',');
  if(cols[2]) col2.add(cols[2]);
  if(cols[3]) col3.add(cols[3]);
  if(cols[5]) col5.add(cols[5]);
  if(cols[7]) col7.add(cols[7]);
  if(cols[8]) col8.add(cols[8]);
}

console.log('Col2:', Array.from(col2).slice(0, 5));
console.log('Col3:', Array.from(col3).slice(0, 5));
console.log('Col5:', Array.from(col5).slice(0, 5));
console.log('Col7:', Array.from(col7).slice(0, 5));
console.log('Col8:', Array.from(col8).slice(0, 5));
