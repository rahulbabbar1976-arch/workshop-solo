import fs from 'fs';
const content = fs.readFileSync('C:/Users/rahul/OneDrive/Desktop/workshop-solo/src/app/advisor/page.tsx', 'utf-8');
const lines = content.split('\n');
let activeTabLine = -1;
for(let i=0; i<lines.length; i++){
  if(lines[i].includes('const [activeTab, setActiveTab] = useState')) {
    activeTabLine = i;
    console.log(`Line ${i+1}: ${lines[i]}`);
  }
}

// look for customers fetch
for(let i=0; i<lines.length; i++){
  if(lines[i].includes('setCustomers(')) {
    console.log(`Line ${i+1}: setCustomers`);
  }
  if(lines[i].includes('const [customers, setCustomers] = useState')) {
    console.log(`Line ${i+1}: ${lines[i]}`);
  }
}
