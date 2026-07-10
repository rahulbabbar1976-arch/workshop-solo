const fs = require('fs');
const path = require('path');

function getFiles(dir, exts = ['.tsx', '.ts', '.json']) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && !['node_modules', '.next', 'generated'].includes(e.name)) {
      results = results.concat(getFiles(full, exts));
    } else if (exts.some(ext => e.name.endsWith(ext))) {
      results.push(full);
    }
  }
  return results;
}

const srcDir = path.join(__dirname, '../src');
const files = getFiles(srcDir);

const replacements = [
  [/Autosports/g, 'Autobots'],
  [/AUTOSPORTS/g, 'AUTOBOTS'],
  [/autosports/g, 'autobots'],
  [/AutoSports/g, 'Autobots'],
];

let changed = 0;
for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  let modified = content;
  for (const [from, to] of replacements) {
    modified = modified.replace(from, to);
  }
  if (modified !== content) {
    fs.writeFileSync(file, modified);
    console.log('Updated:', path.relative(path.join(__dirname, '..'), file));
    changed++;
  }
}

console.log(`\nBrand rename complete. Updated ${changed} files.`);
