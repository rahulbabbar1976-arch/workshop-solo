const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

let count = 0;
walkDir('./src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // We only care about replacing basic new Date(x).toLocaleDateString() calls with formatDate(x)
    // but the regex can be tricky. It's safer to just replace `.toLocaleDateString` instances where appropriate, or manually replace it.
    // Let's print out the exact occurrences first.
    let lines = content.split('\n');
    lines.forEach((line, i) => {
      if (line.includes('.toLocaleDateString')) {
        console.log(`${filePath}:${i + 1}: ${line.trim()}`);
        count++;
      }
    });
  }
});
console.log(`Total occurrences: ${count}`);
