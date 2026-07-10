const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(file => {
    let filepath = path.join(dir, file);
    let stat = fs.statSync(filepath);
    if (stat.isDirectory()) {
      walk(filepath, callback);
    } else {
      callback(filepath);
    }
  });
}

walk('src', (filepath) => {
  if (filepath.endsWith('.ts') || filepath.endsWith('.tsx')) {
    let content = fs.readFileSync(filepath, 'utf8');
    let original = content;
    
    // Replace customerGstNumber with customerTaxId
    content = content.replace(/customerGstNumber/g, 'customerTaxId');
    // Replace gstNumber with taxId
    content = content.replace(/gstNumber/g, 'taxId');
    // Replace setCustomerGst with setCustomerTaxId
    content = content.replace(/setCustomerGst/g, 'setCustomerTaxId');
    // Replace customerGst with customerTaxId (be careful if it conflicts)
    content = content.replace(/customerGst/g, 'customerTaxId');
    // Replace customerEditGst with customerEditTaxId
    content = content.replace(/customerEditGst/g, 'customerEditTaxId');

    if (content !== original) {
      fs.writeFileSync(filepath, content, 'utf8');
      console.log('Updated', filepath);
    }
  }
});
