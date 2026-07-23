const fs = require('fs');
const path = require('path');

try {
  const p = path.join(__dirname, '..', 'node_modules', 'pdfjs-dist');
  if (fs.existsSync(p)) {
    console.log('pdfjs-dist folders:', fs.readdirSync(p));
    const legacyBuild = path.join(p, 'legacy', 'build');
    if (fs.existsSync(legacyBuild)) {
      console.log('legacy build content:', fs.readdirSync(legacyBuild));
    }
  } else {
    console.log('pdfjs-dist folder does not exist');
  }
} catch (e) {
  console.error(e);
}
