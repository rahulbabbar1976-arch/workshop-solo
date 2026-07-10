// Tally XML Generation Library

export interface TallyLedger {
  name: string;
  group: string; // e.g., "Sundry Debtors"
  mobile?: string;
  address?: string;
  state?: string;
  gstin?: string;
}

export interface TallyVoucher {
  voucherType: string; // e.g., "Sales", "Purchase"
  date: string; // YYYYMMDD
  voucherNumber: string;
  partyLedgerName: string;
  ledgerEntries: {
    ledgerName: string;
    amount: number;
    isDeemedPositive: 'Yes' | 'No'; // Yes = Debit, No = Credit
  }[];
  inventoryEntries?: {
    itemName: string;
    quantity: string;
    rate: string;
    amount: number; // Negative for Sales (credit)
  }[];
  narration?: string;
}

export function generateTallyLedgerXml(ledgers: TallyLedger[]): string {
  let xml = `<ENVELOPE>\n<HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>\n<BODY><IMPORTDATA>\n`;
  xml += `<REQUESTDESC><REPORTNAME>All Masters</REPORTNAME></REQUESTDESC>\n<REQUESTDATA>\n`;

  for (const ledger of ledgers) {
    xml += `
      <TALLYMESSAGE xmlns:UDF="TallyUDF">
        <LEDGER NAME="${escapeXml(ledger.name)}" ACTION="Create">
          <NAME.LIST>
            <NAME>${escapeXml(ledger.name)}</NAME>
          </NAME.LIST>
          <PARENT>${escapeXml(ledger.group)}</PARENT>
          <ISBILLWISEON>Yes</ISBILLWISEON>
          ${ledger.mobile ? `<LEDGERMOBILE>${escapeXml(ledger.mobile)}</LEDGERMOBILE>` : ''}
          ${ledger.address ? `<ADDRESS.LIST><ADDRESS>${escapeXml(ledger.address)}</ADDRESS></ADDRESS.LIST>` : ''}
          ${ledger.state ? `<LEDGERSTATE>${escapeXml(ledger.state)}</LEDGERSTATE>` : ''}
          ${ledger.gstin ? `<PARTYGSTIN>${escapeXml(ledger.gstin)}</PARTYGSTIN>` : ''}
        </LEDGER>
      </TALLYMESSAGE>
    `;
  }

  xml += `</REQUESTDATA>\n</IMPORTDATA></BODY>\n</ENVELOPE>`;
  return xml;
}

export function generateTallyVoucherXml(vouchers: TallyVoucher[]): string {
  let xml = `<ENVELOPE>\n<HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>\n<BODY><IMPORTDATA>\n`;
  xml += `<REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME></REQUESTDESC>\n<REQUESTDATA>\n`;

  for (const v of vouchers) {
    xml += `
      <TALLYMESSAGE xmlns:UDF="TallyUDF">
        <VOUCHER VCHTYPE="${escapeXml(v.voucherType)}" ACTION="Create">
          <DATE>${v.date}</DATE>
          <VOUCHERTYPENAME>${escapeXml(v.voucherType)}</VOUCHERTYPENAME>
          <VOUCHERNUMBER>${escapeXml(v.voucherNumber)}</VOUCHERNUMBER>
          <PARTYLEDGERNAME>${escapeXml(v.partyLedgerName)}</PARTYLEDGERNAME>
          ${v.narration ? `<NARRATION>${escapeXml(v.narration)}</NARRATION>` : ''}
    `;

    for (const l of v.ledgerEntries) {
      xml += `
          <ALLLEDGERENTRIES.LIST>
            <LEDGERNAME>${escapeXml(l.ledgerName)}</LEDGERNAME>
            <ISDEEMEDPOSITIVE>${l.isDeemedPositive}</ISDEEMEDPOSITIVE>
            <AMOUNT>${l.amount}</AMOUNT>
          </ALLLEDGERENTRIES.LIST>
      `;
    }

    if (v.inventoryEntries) {
      for (const i of v.inventoryEntries) {
        xml += `
          <ALLINVENTORYENTRIES.LIST>
            <STOCKITEMNAME>${escapeXml(i.itemName)}</STOCKITEMNAME>
            <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
            <BILLEDQTY>${escapeXml(i.quantity)}</BILLEDQTY>
            <RATE>${escapeXml(i.rate)}</RATE>
            <AMOUNT>${i.amount}</AMOUNT>
          </ALLINVENTORYENTRIES.LIST>
        `;
      }
    }

    xml += `
        </VOUCHER>
      </TALLYMESSAGE>
    `;
  }

  xml += `</REQUESTDATA>\n</IMPORTDATA></BODY>\n</ENVELOPE>`;
  return xml;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
