import { notFound } from 'next/navigation';
import prisma from '@/lib/db';

const SECTION_LABELS: Record<string, string> = {
  HEADER: 'Header',
  CUSTOMER_VEHICLE: 'Customer & Vehicle Details',
  TIMELINES: 'Timelines & Assignments',
  COMPLAINTS: 'Complaints & Internal Notes',
  INTAKE_PICTURES: 'Vehicle Intake Pictures',
  LABOUR_TABLE: 'Service / Labour Table',
  PARTS_TABLE: 'Parts / Material Table',
  SIGNATURES: 'Signatures & Sign-offs'
};

export default async function PrintDocumentPage({ params }: { params: Promise<{ documentType: string, id: string }> }) {
  const { documentType: docTypeRaw, id } = await params;
  const documentType = docTypeRaw.toUpperCase();
  
  if (!['JOBCARD', 'ESTIMATE', 'INVOICE', 'DELIVERY_SLIP'].includes(documentType)) {
    return notFound();
  }

  const activeJob = await prisma.jobCard.findUnique({
    where: { id },
    include: {
      customer: true,
      vehicle: true,
      snapshot: true,
      mechanics: true,
      media: true,
      partLines: true,
      labourLines: true
    }
  });

  if (!activeJob) return notFound();

  // Fetch the active profile to get the template
  const profile = await prisma.workshopProfile.findFirst();
  let template = null;
  if (profile) {
    template = await prisma.documentTemplate.findUnique({
      where: {
        workshopProfileId_documentType: {
          workshopProfileId: profile.id,
          documentType: documentType
        }
      }
    });
  }

  let printSettings = null;
  if (profile) {
    printSettings = await prisma.printSettings.findFirst({
      where: { workshopProfileId: profile.id }
    });
  }
  const totalIncludesTax = printSettings?.totalIncludesTax ?? true;

  // Fallback defaults if no template
  const layoutConfigRaw = template?.layoutConfig ? JSON.parse(template.layoutConfig as string) : [
    { id: "HEADER", enabled: true },
    { id: "CUSTOMER_VEHICLE", enabled: true },
    { id: "TIMELINES", enabled: true },
    { id: "COMPLAINTS", enabled: true },
    { id: "INTAKE_PICTURES", enabled: true },
    { id: "LABOUR_TABLE", enabled: true },
    { id: "PARTS_TABLE", enabled: true },
    { id: "SUMMARY", enabled: true },
    { id: "SIGNATURES", enabled: true }
  ];

  let layoutConfig = (Array.isArray(layoutConfigRaw) && typeof layoutConfigRaw[0] === 'string')
    ? layoutConfigRaw.map(id => ({ id, enabled: true }))
    : Array.isArray(layoutConfigRaw) ? layoutConfigRaw : [
        { id: "HEADER", enabled: true },
        { id: "CUSTOMER_VEHICLE", enabled: true },
        { id: "TIMELINES", enabled: true },
        { id: "COMPLAINTS", enabled: true },
        { id: "INTAKE_PICTURES", enabled: true },
        { id: "LABOUR_TABLE", enabled: true },
        { id: "PARTS_TABLE", enabled: true },
        { id: "SUMMARY", enabled: true },
        { id: "SIGNATURES", enabled: true }
      ];

  // Override visibility with printSettings
  if (printSettings) {
    layoutConfig = layoutConfig.map((section: any) => {
      if (section.id === "CUSTOMER_VEHICLE") section.enabled = printSettings.showCustomerDetails || printSettings.showVehicleDetails;
      if (section.id === "SUMMARY") section.enabled = printSettings.showSummary;
      if (section.id === "SIGNATURES") section.enabled = printSettings.showSignatureSection;
      return section;
    });
  }

  const columnsConfig = template?.columnsConfig ? JSON.parse(template.columnsConfig as string) : {
    labour: ["description", "qty", "rate", "tax", "total"],
    parts: ["partName", "partNo", "brand", "qty", "rate", "tax", "total"]
  };

  const globalStyle = template ? {
    fontFamily: template.fontFamily,
    baseFontSize: parseInt(template.baseFontSize) || 9,
    primaryColor: template.primaryColor
  } : {
    fontFamily: 'Inter',
    baseFontSize: 9,
    primaryColor: '#0f172a'
  };

  // Helper object for visibility checks
  const printCols = {
    partName: true, // Always show description
    partNo: printSettings?.showColPartNo ?? true,
    brand: printSettings?.showColPartBrand ?? true,
    qty: printSettings?.showColQty ?? true,
    rate: printSettings?.showColRate ?? true,
    tax: printSettings?.showColTaxRate ?? true,
    discount: printSettings?.showColDiscount ?? true,
    total: printSettings?.showColTotal ?? true,
    description: true, // Always show description for labour
  };

  // Fetch users for Advisor and Mechanic names
  let advisorName = 'Unassigned';
  let advisorMobile = 'N/A';
  let mechanicName = 'Unassigned';
  const userIds = [activeJob.advisorId, activeJob.primaryMechanicId].filter(Boolean) as string[];
  
  if (userIds.length > 0) {
    const users = await prisma.user.findMany({ where: { id: { in: userIds } } });
    if (activeJob.advisorId) {
      const adv = users.find(u => u.id === activeJob.advisorId);
      if (adv) {
        advisorName = adv.fullName;
        if (adv.mobile) advisorMobile = adv.mobile;
      }
    }
    if (activeJob.primaryMechanicId) {
      const mech = users.find(u => u.id === activeJob.primaryMechanicId);
      if (mech) mechanicName = mech.fullName;
    }
  }

  const intakeMedia = activeJob.media.filter(m => m.mediaType === 'intake_photo' || (m.phase === 'intake' && m.mediaType !== 'signature'));
  const signatureMedia = activeJob.media.find(m => m.mediaType === 'signature');

  return (
    <main style={{ 
      color: '#000', 
      fontFamily: globalStyle.fontFamily === 'Inter' ? '"Inter", sans-serif' : 
                  globalStyle.fontFamily === 'Outfit' ? '"Outfit", sans-serif' : 
                  globalStyle.fontFamily === 'Roboto' ? '"Roboto", sans-serif' : 
                  '"Arial", sans-serif',
      fontSize: `${globalStyle.baseFontSize}pt`,
      background: '#fff',
      padding: '5px 10px',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; margin: 0; padding: 0; }
          * {
            color: black !important;
            background: transparent !important;
            box-shadow: none !important;
          }
          .no-print { display: none !important; }
        }
        table { border-collapse: collapse; width: 100%; font-size: ${globalStyle.baseFontSize - 1}pt; }
        th, td { border: 0.5px solid #cbd5e1; padding: 4px 6px; text-align: left; }
        th { background: #f8fafc; font-weight: 500; color: ${globalStyle.primaryColor}; }
        .text-right { text-align: right !important; }
        .grid-header { font-size: ${globalStyle.baseFontSize}pt; margin: 0 0 2px 0; border-bottom: 0.5px solid ${globalStyle.primaryColor}; font-weight: 500; color: ${globalStyle.primaryColor}; text-transform: uppercase; }
      `}} />

      {layoutConfig.map((section: any, idx: number) => {
        if (!section.enabled) return null;
        
        switch (section.id) {
          case 'HEADER':
            const showWorkshopHeader = columnsConfig.showWorkshopHeader ?? true;
            return (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `0.5px solid ${globalStyle.primaryColor}`, paddingBottom: '2px', marginBottom: '4px' }}>
                <div>
                  {showWorkshopHeader && (
                    <>
                      <h1 style={{ fontSize: `${globalStyle.baseFontSize + 4}pt`, margin: 0, fontWeight: 500, color: globalStyle.primaryColor }}>{profile?.workshopName || 'Autobots Multibrand Repair'}</h1>
                      <p style={{ fontSize: `${globalStyle.baseFontSize - 1}pt`, color: '#475569', margin: '4px 0 0 0', lineHeight: '1.4' }}>
                        {profile?.email ? `Email: ${profile.email}` : 'Email: info@workshop.com'} |{' '}
                        {profile?.mobile ? `Ph: ${profile.mobile}` : 'Ph: +91-9876543210'}
                      </p>
                    </>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h2 style={{ fontSize: `${globalStyle.baseFontSize + 2}pt`, margin: 0, textTransform: 'uppercase', color: globalStyle.primaryColor, fontWeight: 500 }}>
                    {documentType.replace('_', ' ')}
                  </h2>
                  <p style={{ fontSize: `${globalStyle.baseFontSize}pt`, margin: '4px 0 0 0', lineHeight: '1.4' }}>
                    <strong>Job No:</strong> {activeJob.jobcardNumber}<br />
                    <strong>Date:</strong> {new Date().toLocaleDateString()}<br />
                    <strong>Status:</strong> {activeJob.status.replace('_', ' ').toUpperCase()}
                  </p>
                </div>
              </div>
            );

          case 'CUSTOMER_VEHICLE':
            return (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '4px' }}>
                <div>
                  <h3 className="grid-header">CUSTOMER DETAILS</h3>
                  <div style={{ padding: '4px', background: '#f8fafc', border: '0.5px solid #cbd5e1', lineHeight: '1.2' }}>
                    <strong>Name:</strong> {activeJob.snapshot?.customerName || activeJob.customer?.displayName}<br />
                    <strong>Phone:</strong> {activeJob.snapshot?.customerMobile || activeJob.customer?.primaryMobile}
                  </div>
                </div>
                <div>
                  <h3 className="grid-header">VEHICLE & INTAKE DETAILS</h3>
                  <div style={{ padding: '4px', background: '#f8fafc', border: '0.5px solid #cbd5e1', lineHeight: '1.2' }}>
                    <strong>Reg No:</strong> {activeJob.snapshot?.vehicleRegistrationNumber || activeJob.vehicle?.registrationNumberRaw}<br />
                    <strong>Make/Model:</strong> {activeJob.vehicle?.manufacturer} {activeJob.vehicle?.model}<br />
                    <strong>Odometer:</strong> {activeJob.intakeOdometer ? `${activeJob.intakeOdometer} KM` : 'N/A'}<br />
                    <strong>Fuel Level:</strong> {activeJob.fuelLevel || 'N/A'}
                  </div>
                </div>
              </div>
            );

          case 'TIMELINES':
            return (
              <div key={idx} style={{ marginBottom: '4px' }}>
                <h3 className="grid-header">TIMELINES & ASSIGNMENTS</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '4px', padding: '2px 4px', border: '0.5px solid #cbd5e1' }}>
                  <div><strong>Arrival:</strong> {new Date(activeJob.dateIn).toLocaleString()}</div>
                  <div><strong>Est. Delivery:</strong> {activeJob.expectedDeliveryAt ? new Date(activeJob.expectedDeliveryAt).toLocaleString() : 'Not Scheduled'}</div>
                  <div><strong>Advisor:</strong> {advisorName} ({advisorMobile})</div>
                </div>
              </div>
            );

          case 'COMPLAINTS':
            return (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '4px' }}>
                <div>
                  <h3 className="grid-header">CUSTOMER COMPLAINTS</h3>
                  <div style={{ padding: '2px 4px', border: '0.5px solid #cbd5e1', minHeight: '40px', fontSize: `${globalStyle.baseFontSize - 1}pt`, whiteSpace: 'pre-wrap' }}>
                    {activeJob.externalNotes || 'None'}
                  </div>
                </div>
                <div>
                  <h3 className="grid-header">INTERNAL NOTES</h3>
                  <div style={{ padding: '2px 4px', border: '0.5px solid #cbd5e1', minHeight: '20px', whiteSpace: 'pre-wrap' }}>
                    {activeJob.internalNotes || 'None'}
                  </div>
                </div>
              </div>
            );

          case 'INTAKE_PICTURES':
            if (intakeMedia.length === 0) return null;
            return (
              <div key={idx} style={{ marginBottom: '4px', pageBreakInside: 'avoid' }}>
                <h3 className="grid-header">VEHICLE INTAKE PICTURES</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginTop: '4px' }}>
                  {intakeMedia.map((m, i) => (
                    <div key={m.id} style={{ border: '0.5px solid #cbd5e1', padding: '2px', textAlign: 'center' }}>
                      <img src={m.fileUrl} alt={`Intake ${i}`} style={{ width: '100%', height: '80px', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              </div>
            );

          case 'LABOUR_TABLE':
            if (activeJob.labourLines.length === 0) return null;
            return (
              <div key={idx} style={{ marginBottom: '4px' }}>
                <h3 className="grid-header">LABOUR / SERVICES</h3>
                <table>
                  <thead>
                    <tr>
                      {printCols.description && <th style={{ width: '50%' }}>Service Description</th>}
                      {printCols.qty && <th className="text-right">Hours/Qty</th>}
                      {printCols.rate && <th className="text-right">Rate</th>}
                      {printCols.tax && <th className="text-right">Tax %</th>}
                      {printCols.discount && <th className="text-right">Discount</th>}
                      {printCols.total && <th className="text-right">Total</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {activeJob.labourLines.map(l => {
                      const qty = l.quantity || 0;
                      const rate = l.sellingPrice || 0;
                      const tax = l.taxRate || 0;
                      const discount = l.discountType === 'percent' ? (rate * qty * (l.discountValue || 0) / 100) : (l.discountValue || 0);
                      const baseAmount = (qty * rate) - discount;
                      const taxAmount = baseAmount * (tax / 100);
                      const lineTotal = totalIncludesTax ? (baseAmount + taxAmount) : baseAmount;

                      return (
                        <tr key={l.id}>
                          {printCols.description && <td>{l.labourName}</td>}
                          {printCols.qty && <td className="text-right">{qty}</td>}
                          {printCols.rate && <td className="text-right">{rate.toFixed(2)}</td>}
                          {printCols.tax && <td className="text-right">{tax}%</td>}
                          {printCols.discount && <td className="text-right">{discount.toFixed(2)}</td>}
                          {printCols.total && <td className="text-right">{lineTotal.toFixed(2)}</td>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );

          case 'PARTS_TABLE':
            if (activeJob.partLines.length === 0) return null;
            return (
              <div key={idx} style={{ marginBottom: '4px' }}>
                <h3 className="grid-header">PARTS / MATERIALS</h3>
                <table>
                  <thead>
                    <tr>
                      {printCols.partName && <th style={{ width: '40%' }}>Part Name / Description</th>}
                      {printCols.partNo && <th>Part No</th>}
                      {printCols.brand && <th>Brand</th>}
                      {printCols.qty && <th className="text-right">Qty</th>}
                      {printCols.rate && <th className="text-right">Rate</th>}
                      {printCols.tax && <th className="text-right">Tax %</th>}
                      {printCols.discount && <th className="text-right">Discount</th>}
                      {printCols.total && <th className="text-right">Total</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {activeJob.partLines.map(p => {
                      const qty = p.quantityRequested || 0;
                      const rate = p.sellingPrice || 0;
                      const tax = p.taxRate || 0;
                      const discount = p.discountType === 'percent' ? (rate * qty * (p.discountValue || 0) / 100) : (p.discountValue || 0);
                      const baseAmount = (qty * rate) - discount;
                      const taxAmount = baseAmount * (tax / 100);
                      const lineTotal = totalIncludesTax ? (baseAmount + taxAmount) : baseAmount;

                      return (
                        <tr key={p.id}>
                          {printCols.partName && <td>{p.partName || p.partNumber}</td>}
                          {printCols.partNo && <td>{p.partNumber}</td>}
                          {printCols.brand && <td>{p.brand}</td>}
                          {printCols.qty && <td className="text-right">{qty}</td>}
                          {printCols.rate && <td className="text-right">{rate.toFixed(2)}</td>}
                          {printCols.tax && <td className="text-right">{tax}%</td>}
                          {printCols.discount && <td className="text-right">{discount.toFixed(2)}</td>}
                          {printCols.total && <td className="text-right">{lineTotal.toFixed(2)}</td>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );

          case 'SUMMARY':
            let subtotal = 0;
            let totalDiscount = 0;
            let totalTax = 0;

            activeJob.labourLines.forEach(l => {
              const qty = l.quantity || 0;
              const rate = l.sellingPrice || 0;
              const tax = l.taxRate || 0;
              const discount = l.discountType === 'percent' ? (rate * qty * (l.discountValue || 0) / 100) : (l.discountValue || 0);
              const base = (qty * rate);
              subtotal += base;
              totalDiscount += discount;
              totalTax += (base - discount) * (tax / 100);
            });

            activeJob.partLines.forEach(p => {
              const qty = p.quantityRequested || 0;
              const rate = p.sellingPrice || 0;
              const tax = p.taxRate || 0;
              const discount = p.discountType === 'percent' ? (rate * qty * (p.discountValue || 0) / 100) : (p.discountValue || 0);
              const base = (qty * rate);
              subtotal += base;
              totalDiscount += discount;
              totalTax += (base - discount) * (tax / 100);
            });

            const overallDiscount = activeJob.overallDiscountType === 'percent' 
              ? ((subtotal - totalDiscount) * (activeJob.overallDiscountValue || 0) / 100)
              : (activeJob.overallDiscountValue || 0);
            
            totalDiscount += overallDiscount;
            const grandTotal = subtotal - totalDiscount + totalTax;

            return (
              <div key={idx} style={{ marginTop: '12px', marginBottom: '12px', display: 'flex', justifyContent: 'flex-end', pageBreakInside: 'avoid' }}>
                <div style={{ width: '300px' }}>
                  <h3 className="grid-header">SUMMARY</h3>
                  <table style={{ border: 'none' }}>
                    <tbody>
                      <tr>
                        <td style={{ border: 'none', padding: '2px', fontWeight: 500 }}>Subtotal:</td>
                        <td className="text-right" style={{ border: 'none', padding: '2px' }}>{subtotal.toFixed(2)}</td>
                      </tr>
                      {totalDiscount > 0 && (
                        <tr>
                          <td style={{ border: 'none', padding: '2px', fontWeight: 500 }}>Total Discount:</td>
                          <td className="text-right" style={{ border: 'none', padding: '2px', color: '#16a34a' }}>-{totalDiscount.toFixed(2)}</td>
                        </tr>
                      )}
                      <tr>
                        <td style={{ border: 'none', padding: '2px', fontWeight: 500 }}>Total Tax (GST):</td>
                        <td className="text-right" style={{ border: 'none', padding: '2px' }}>{totalTax.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td style={{ border: 'none', padding: '2px', fontWeight: 'bold', borderTop: '1px solid #cbd5e1', fontSize: `${globalStyle.baseFontSize + 2}pt` }}>Grand Total:</td>
                        <td className="text-right" style={{ border: 'none', padding: '2px', fontWeight: 'bold', borderTop: '1px solid #cbd5e1', fontSize: `${globalStyle.baseFontSize + 2}pt` }}>
                          {activeJob.currency || '₹'} {grandTotal.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            );

          case 'SIGNATURES':
            return (
              <div key={idx} style={{ marginTop: '10px', paddingTop: '4px', borderTop: '0.5px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', pageBreakInside: 'avoid' }}>
                <div style={{ textAlign: 'center', width: '200px' }}>
                  {signatureMedia ? (
                    <img src={signatureMedia.fileUrl} alt="Signature" style={{ maxHeight: '60px', marginBottom: '8px' }} />
                  ) : (
                    <div style={{ height: '60px', marginBottom: '8px' }}></div>
                  )}
                  <div style={{ borderTop: '0.5px solid #000', paddingTop: '8px' }}>Customer Signature</div>
                </div>
                <div style={{ textAlign: 'center', width: '250px' }}>
                  <div style={{ height: '60px', marginBottom: '8px' }}></div>
                  <div style={{ borderTop: '0.5px solid #000', paddingTop: '8px' }}>Authorized Signatory</div>
                </div>
              </div>
            );

          default:
            return null;
        }
      })}

      <div className="no-print" style={{ textAlign: 'center', marginTop: '3rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
        <button id="printBtn" style={{ padding: '10px 20px', background: globalStyle.primaryColor, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>
          Print Document
        </button>
      </div>

      <script dangerouslySetInnerHTML={{ __html: 'window.onload = function() { window.print(); }; document.getElementById("printBtn").onclick = function() { window.print(); };' }} />
    </main>
  );
}
