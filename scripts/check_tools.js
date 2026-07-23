const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Check if sharp is available
try {
  const sharp = require('sharp');
  console.log('sharp available:', require('./node_modules/sharp/package.json').version);
} catch (e) {
  console.log('sharp not available');
}

// Check if pdf-parse or pdfjs-dist is available
try {
  require('pdfjs-dist');
  console.log('pdfjs-dist available');
} catch (e) {
  console.log('pdfjs-dist not available');
}

try {
  require('canvas');
  console.log('canvas available');
} catch (e) {
  console.log('canvas not available');
}

// List what's in node_modules that could help with PDF
const nmPath = path.join(__dirname, 'node_modules');
const dirs = fs.readdirSync(nmPath).filter(d => 
  d.includes('pdf') || d.includes('canvas') || d.includes('sharp') || d.includes('jimp')
);
console.log('PDF/Image related packages:', dirs.join(', '));
