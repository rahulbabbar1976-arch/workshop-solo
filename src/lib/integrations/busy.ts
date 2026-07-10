// Busy Accounting Software Export

export function generateBusyLedgerCsv(ledgers: any[]): string {
  // Busy typically requires specific column headers for Ledger import
  let csv = 'Name,Alias,Print Name,Group,Opening Balance,Address 1,Address 2,Address 3,Mobile,Email,GSTIN\n';
  
  for (const l of ledgers) {
    const row = [
      escapeCsv(l.name),
      '', // Alias
      escapeCsv(l.name), // Print Name
      escapeCsv(l.group || 'Sundry Debtors'),
      '0', // Opening Balance
      escapeCsv(l.address || ''),
      '', // Address 2
      '', // Address 3
      escapeCsv(l.mobile || ''),
      escapeCsv(l.email || ''),
      escapeCsv(l.gstin || '')
    ];
    csv += row.join(',') + '\n';
  }
  return csv;
}

export function generateBusyItemCsv(items: any[]): string {
  let csv = 'Name,Alias,Print Name,Group,Unit,Opening Qty,Opening Value,Tax Category,HSN Code,Sale Price,Purchase Price\n';
  
  for (const i of items) {
    const row = [
      escapeCsv(i.name),
      escapeCsv(i.partNumber || ''), // Alias
      escapeCsv(i.name), // Print Name
      escapeCsv(i.group || 'General'),
      escapeCsv(i.unit || 'PCS'),
      '0', // Opening Qty
      '0', // Opening Value
      escapeCsv(i.taxCategory || 'GST 18%'),
      escapeCsv(i.hsnCode || ''),
      i.salePrice || 0,
      i.purchasePrice || 0
    ];
    csv += row.join(',') + '\n';
  }
  return csv;
}

export function generateBusyVoucherCsv(vouchers: any[]): string {
  // Busy Sales Voucher format
  let csv = 'Voucher Series,Date,Voucher No,Party Name,Item Name,Qty,Unit,Price,Amount,Tax Amount\n';

  for (const v of vouchers) {
    if (v.items && v.items.length > 0) {
      for (const item of v.items) {
        const row = [
          'Main', // Voucher Series
          v.date, // DD-MM-YYYY
          escapeCsv(v.voucherNo),
          escapeCsv(v.partyName),
          escapeCsv(item.name),
          item.quantity || 1,
          escapeCsv(item.unit || 'PCS'),
          item.price || 0,
          item.amount || 0,
          item.taxAmount || 0
        ];
        csv += row.join(',') + '\n';
      }
    } else {
      // Voucher with no items (Service only)
      const row = [
        'Main',
        v.date,
        escapeCsv(v.voucherNo),
        escapeCsv(v.partyName),
        'Service Charge',
        1,
        'PCS',
        v.totalAmount || 0,
        v.totalAmount || 0,
        v.taxAmount || 0
      ];
      csv += row.join(',') + '\n';
    }
  }
  
  return csv;
}

function escapeCsv(unsafe: string): string {
  if (!unsafe) return '';
  const str = String(unsafe).replace(/"/g, '""'); // escape double quotes
  // if string contains comma, newline, or quotes, wrap in quotes
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str}"`;
  }
  return str;
}
