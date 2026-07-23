const fs = require('fs');
const path = require('path');

function walk(dir) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      files = files.concat(walk(fullPath));
    } else if (file.endsWith('.js') || file.endsWith('.mjs')) {
      files.push(fullPath);
    }
  }
  return files;
}

const pdfjsDir = path.join(__dirname, 'node_modules', 'pdfjs-dist');
console.log('Files in pdfjs-dist:', walk(pdfjsDir).slice(0, 20));
