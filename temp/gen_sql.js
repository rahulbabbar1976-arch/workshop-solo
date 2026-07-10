const fs = require('fs');
const outDir = 'C:\\Users\\rahul\\OneDrive\\Desktop\\workshop\\temp\\derby_export';
const dbPath = 'C:\\Users\\rahul\\OneDrive\\Desktop\\workshop\\temp\\wdg_inspect\\database';

fs.mkdirSync(outDir, { recursive: true });

const tables = [
  ['CUSTOMER',    'customers.csv'],
  ['WORKSHEET',   'worksheets.csv'],
  ['INVOICE_ITEM','invoice_items.csv'],
  ['INVOICE',     'invoices.csv'],
  ['ITEM',        'parts.csv'],
  ['MASTER_ITEM', 'master_items.csv'],
  ['THING',       'vehicles.csv'],
  ['PROBLEM',     'problems.csv'],
  ['ADDRESS',     'addresses.csv'],
];

const lines = [
  "connect 'jdbc:derby:" + dbPath + "';",
  ...tables.map(([t, f]) =>
    "CALL SYSCS_UTIL.SYSCS_EXPORT_TABLE(null,'" + t + "','" + outDir + "\\" + f + "',',','\"','UTF-8');"
  ),
  "exit;"
];

fs.writeFileSync('C:\\Users\\rahul\\OneDrive\\Desktop\\workshop\\temp\\derby_export.sql', lines.join('\n'));
console.log('Written:');
console.log(lines.join('\n'));
