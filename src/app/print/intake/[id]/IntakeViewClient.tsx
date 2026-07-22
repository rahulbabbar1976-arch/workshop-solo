"use client";

import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn, Calendar, User, Car, Wrench, FileText, Camera, Printer, Download, Shield, Battery, Fuel, Gauge, CheckCircle } from "lucide-react";

export function IntakeViewClient({ jobCard, workshopProfile }: { jobCard: any, workshopProfile: any }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [fontFamily, setFontFamily] = useState("Inter");

  useEffect(() => {
    fetch('/api/settings/print?documentType=JOBCARD')
      .then(res => res.json())
      .then(data => {
        if (data.template) {
          setFontFamily(data.template.fontFamily || "Inter");
        }
      })
      .catch(e => console.error(e));
  }, []);

  const photos = jobCard.media?.filter((m: any) => m.type === 'intake' || m.phase === 'intake') || [];

  const openLightbox = (index: number) => {
    setCurrentPhotoIndex(index);
    setLightboxOpen(true);
  };

  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPhotoIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  };

  const prevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPhotoIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  };

  const handlePrint = () => { window.print(); };

  const handleDownloadPDF = async () => {
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = document.getElementById('intake-printable-area');
      if (!element) return;
      const opt: any = {
        margin: 10,
        filename: `VehicleIntake_${jobCard.jobNumber || jobCard.id.substring(0, 8)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      html2pdf().from(element).set(opt).save();
    } catch (error) {
      console.error("Error generating PDF", error);
      alert("Failed to generate PDF. You can still use the Print button to Save as PDF.");
    }
  };

  const handleShareWhatsApp = () => {
    const customerPhone = jobCard.customer?.primaryMobile?.replace(/\D/g, '') || '';
    const vehicleReg = jobCard.vehicle?.registrationNumberRaw || 'your vehicle';
    const jobNum = jobCard.jobNumber || jobCard.id.substring(0, 8);
    const workshopName = workshopProfile?.workshopName || workshopProfile?.name || 'our workshop';
    const deliveryDate = jobCard.expectedDeliveryAt ? formatDate(jobCard.expectedDeliveryAt) : 'to be confirmed';
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const message = `🔧 *Vehicle Intake Confirmation*\n\nDear ${jobCard.customer?.displayName || 'Customer'},\n\nYour vehicle *${vehicleReg}* has been successfully received at *${workshopName}*.\n\n📋 Job Card: *${jobNum}*\n📅 Estimated Delivery: *${deliveryDate}*\n\nYou can view your intake form here:\n${url}\n\nThank you for choosing ${workshopName}!`;
    const phone = customerPhone.startsWith('91') ? customerPhone : customerPhone ? `91${customerPhone}` : '';
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const formatDate = (dateStr: string | Date | null | undefined) => {
    if (!dateStr) return "Not specified";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Not specified";
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const vehicle = jobCard.vehicle || {};
  const customer = jobCard.customer || {};

  return (
    <div
      id="intake-printable-area"
      className="bg-gray-50 min-h-screen pb-16 print:bg-white print:pb-0"
      style={{ fontFamily: fontFamily }}
    >

      {/* ─── Action Bar (print:hidden) ─── */}
      <div className="print:hidden sticky top-0 z-40 bg-white border-b shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-3 gap-3">
          <div className="text-sm font-bold text-gray-700">Vehicle Intake Receipt</div>
          <div className="flex gap-2">
            <button
              onClick={handleShareWhatsApp}
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Share
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-bold py-2 px-3 rounded-lg transition-colors"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" /> PDF
            </button>
          </div>
        </div>
      </div>

      <div className="hidden print:block w-full mx-auto px-8 pt-8 text-black" style={{ maxWidth: '210mm' }}>
        {/* 1.5 inches: Company details (Left) & JC Number (Right) */}
        <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-2" style={{ height: '1.5in', maxHeight: '1.5in', overflow: 'hidden' }}>
          <div className="text-left w-1/2">
            <h1 className="text-2xl font-black uppercase tracking-tight">{workshopProfile?.workshopName || workshopProfile?.name || "Workshop"}</h1>
            {workshopProfile?.addressLine1 && <p className="text-sm mt-1">{workshopProfile.addressLine1}{workshopProfile.addressLine2 ? `, ${workshopProfile.addressLine2}` : ''}</p>}
            {(workshopProfile?.city || workshopProfile?.state) && <p className="text-sm">{[workshopProfile.city, workshopProfile.state, workshopProfile.postalCode].filter(Boolean).join(', ')}</p>}
            {workshopProfile?.contactPhone && <p className="text-sm font-semibold mt-1">Ph: {workshopProfile.contactPhone}</p>}
            {workshopProfile?.gstNumber && <p className="text-xs mt-1">GSTIN: {workshopProfile.gstNumber}</p>}
          </div>
          <div className="text-right w-1/2 flex flex-col justify-start items-end">
            <div className="text-sm font-bold uppercase tracking-widest border border-black px-2 py-1 mb-1">Vehicle Intake Receipt</div>
            <div className="text-xl font-black">{jobCard.jobNumber || `JC-${jobCard.id.substring(0, 8).toUpperCase()}`}</div>
            <div className="text-sm mt-1">Date: {formatDate(jobCard.createdAt)}</div>
          </div>
        </div>

        {/* 2 inches: 3 Columns (Customer, Vehicle, Extended) */}
        <div className="flex border-b-2 border-black pb-2 mb-2" style={{ height: '2in', maxHeight: '2in', overflow: 'hidden' }}>
          <div className="w-1/3 pr-2 border-r border-gray-300">
            <h2 className="font-bold underline uppercase text-xs mb-2">Customer Details</h2>
            <div className="text-sm space-y-1">
              <p><span className="font-semibold">Name:</span> {customer.displayName || "N/A"}</p>
              <p><span className="font-semibold">Mobile:</span> {customer.primaryMobile || "N/A"}</p>
              {customer.email && <p><span className="font-semibold">Email:</span> {customer.email}</p>}
              {customer.addressLine1 && <p><span className="font-semibold">Address:</span> {customer.addressLine1}</p>}
              {customer.driverName && <p><span className="font-semibold">Driver:</span> {customer.driverName} {customer.driverMobile ? `(${customer.driverMobile})` : ''}</p>}
            </div>
          </div>
          <div className="w-1/3 px-2 border-r border-gray-300">
            <h2 className="font-bold underline uppercase text-xs mb-2">Vehicle Details</h2>
            <div className="text-sm space-y-1">
              <p><span className="font-semibold">Reg No:</span> <span className="font-black text-base ml-1">{vehicle.registrationNumberRaw || "N/A"}</span></p>
              <p><span className="font-semibold">Make/Model:</span> {vehicle.manufacturer || vehicle.make} {vehicle.model}</p>
              <p><span className="font-semibold">Year/Color:</span> {vehicle.year} / {vehicle.color}</p>
              <p><span className="font-semibold">Odometer:</span> {jobCard.intakeOdometer ? `${jobCard.intakeOdometer.toLocaleString()} km` : "N/A"}</p>
              <p><span className="font-semibold">Fuel Type:</span> {vehicle.fuelType}</p>
              <p><span className="font-semibold">Fuel Level:</span> {jobCard.fuelLevel}</p>
            </div>
          </div>
          <div className="w-1/3 pl-2">
            <h2 className="font-bold underline uppercase text-xs mb-2">Extended Details</h2>
            <div className="text-sm space-y-1">
              {vehicle.vin && <p><span className="font-semibold">VIN:</span> {vehicle.vin}</p>}
              {vehicle.engineNumber && <p><span className="font-semibold">Engine:</span> {vehicle.engineNumber}</p>}
              {vehicle.insurerName && <p><span className="font-semibold">Insurer:</span> {vehicle.insurerName}</p>}
              {vehicle.insurancePolicyNumber && <p><span className="font-semibold">Policy:</span> {vehicle.insurancePolicyNumber}</p>}
              {vehicle.emissionInspectionNumber && <p><span className="font-semibold">PUC No:</span> {vehicle.emissionInspectionNumber}</p>}
              {vehicle.batteryMake && <p><span className="font-semibold">Battery:</span> {vehicle.batteryMake}</p>}
            </div>
          </div>
        </div>

        {/* 6 inches: Problems, Notes */}
        <div className="border-b-2 border-black pb-2 mb-2 flex flex-col" style={{ height: '6in', maxHeight: '6in', overflow: 'hidden' }}>
          <h2 className="font-bold underline uppercase text-xs mb-2">Reported Problems & Requested Work</h2>
          <div className="flex-1 overflow-hidden">
            {jobCard.complaints && jobCard.complaints.length > 0 ? (
              <ul className="list-decimal pl-5 space-y-1 text-sm font-semibold">
                {jobCard.complaints.map((c: any, idx: number) => (
                  <li key={c.id || idx}>{c.description}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm italic">General service / as per workshop assessment.</p>
            )}
            
            {jobCard.externalNotes && (
              <div className="mt-4 pt-2 border-t border-dashed border-gray-300">
                <h3 className="font-bold underline uppercase text-xs mb-1">Additional Notes</h3>
                <p className="text-sm whitespace-pre-wrap">{jobCard.externalNotes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Estimate time and price */}
        <div className="flex justify-between items-center text-sm mb-6 border-b-2 border-black pb-4 font-semibold">
          <div>
            <span className="uppercase text-xs text-gray-500 mr-2">Estimated Delivery Date:</span> 
            {jobCard.expectedDeliveryAt ? formatDate(jobCard.expectedDeliveryAt) : (jobCard.estimatedCompletionDate ? formatDate(jobCard.estimatedCompletionDate) : "To be confirmed")}
          </div>
          <div className="text-right">
            <span className="uppercase text-xs text-gray-500 mr-2">Estimated Cost:</span> 
            To be confirmed after inspection
          </div>
        </div>

        {/* ─── Customer Acknowledgement & Signature (Print Only) ─── */}
        <div className="mt-8 page-break-inside-avoid border-2 border-gray-800 p-4 rounded-lg">
          <h2 className="text-xs font-bold uppercase text-gray-800 mb-3 flex items-center gap-2 border-b-2 border-gray-300 pb-2">
            <CheckCircle className="w-4 h-4" /> Customer Acknowledgement
          </h2>
          <div className="text-xs text-gray-800 space-y-1.5 mb-8">
            <p>I, the undersigned, hereby confirm and acknowledge the following:</p>
            <ul className="list-disc pl-4 space-y-1 mt-2">
              <li>I have handed over the above-mentioned vehicle to <strong>{workshopProfile?.workshopName || workshopProfile?.name || 'the workshop'}</strong> for the reported repairs/service.</li>
              <li>The vehicle condition and odometer reading noted above are accurate to the best of my knowledge.</li>
              <li>I authorize the workshop to proceed with the requested work and any additional necessary repairs (subject to prior approval for significant additional work).</li>
              <li>I understand that the estimated delivery date is indicative and subject to change based on parts availability and repair complexity.</li>
            </ul>
          </div>
          <div className="flex justify-between gap-12 px-4">
            <div className="text-center w-1/2">
              <div className="border-b-2 border-gray-800 h-16 mb-2"></div>
              <div className="text-xs font-bold text-gray-800 uppercase tracking-wide">Customer Signature</div>
              <div className="text-xs text-gray-600 mt-1">Name: {customer.displayName || '_____________________'}</div>
              <div className="text-xs text-gray-600 mt-1">Date: {formatDate(new Date())}</div>
            </div>
            <div className="text-center w-1/2">
              <div className="border-b-2 border-gray-800 h-16 mb-2 flex items-end justify-center pb-2">
                <span className="text-xs text-gray-400 italic">Official Stamp</span>
              </div>
              <div className="text-xs font-bold text-gray-800 uppercase tracking-wide">Workshop Representative</div>
              <div className="text-xs text-gray-600 mt-1">{workshopProfile?.workshopName || workshopProfile?.name || ''}</div>
              <div className="text-xs text-gray-600 mt-1">Date: {formatDate(new Date())}</div>
            </div>
          </div>
        </div>

        {/* Print Footer */}
        <div className="text-center text-xs text-gray-500 pt-6 mt-6 border-t border-gray-300">
          <p>This is a system-generated intake receipt. For queries, contact {workshopProfile?.contactPhone || ''}.</p>
        </div>

        {/* ─── Intake Photos — A4 Print Size ─── */}
        {photos.length > 0 && (
          <div className="w-full">
            {photos.map((photo: any, index: number) => (
              <div key={photo.id || index} className="break-before-page pt-8">
                <h2 className="text-xs font-bold uppercase text-gray-800 mb-4 border-b border-gray-800 pb-2">
                  Intake Photo {index + 1} of {photos.length}
                </h2>
                <div className="w-full border-2 border-gray-300 p-2">
                  <img src={photo.url} alt={`Intake photo ${index + 1}`} className="w-full h-auto max-h-[250mm] object-contain mx-auto" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="print:hidden max-w-3xl mx-auto px-4 pt-6">

        {/* ─── Workshop Header ─── */}
        <div className="bg-white rounded-xl shadow-sm border mb-6 p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              {workshopProfile?.logoUrl && (
                <img src={workshopProfile.logoUrl} alt="Workshop Logo" className="h-12 mb-2 mx-auto sm:mx-0" />
              )}
              <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                {workshopProfile?.workshopName || workshopProfile?.name || "Workshop"}
              </h1>
              {workshopProfile?.addressLine1 && <p className="text-xs text-gray-500 mt-0.5">{workshopProfile.addressLine1}{workshopProfile.addressLine2 ? `, ${workshopProfile.addressLine2}` : ''}</p>}
              {(workshopProfile?.city || workshopProfile?.state) && (
                <p className="text-xs text-gray-500">{[workshopProfile.city, workshopProfile.state, workshopProfile.postalCode].filter(Boolean).join(', ')}</p>
              )}
              {workshopProfile?.contactPhone && <p className="text-xs text-gray-500">📞 {workshopProfile.contactPhone}</p>}
              {workshopProfile?.gstNumber && <p className="text-xs text-gray-500">GSTIN: {workshopProfile.gstNumber}</p>}
            </div>
            <div className="text-center">
              <div className="bg-teal-600 text-white px-5 py-3 rounded-xl inline-block">
                <div className="text-xs font-bold uppercase tracking-widest opacity-80">Vehicle Intake Receipt</div>
                <div className="text-xl font-black mt-1">{jobCard.jobNumber || `JC-${jobCard.id.substring(0, 8).toUpperCase()}`}</div>
                <div className="text-xs opacity-80 mt-1">{formatDate(jobCard.createdAt)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5">

          {/* ─── Customer Details ─── */}
          <section className="bg-white rounded-xl p-5 shadow-sm border print:shadow-none print:border print:border-gray-300">
            <h2 className="text-xs font-bold uppercase text-gray-400 mb-3 flex items-center gap-2 border-b pb-2">
              <User className="w-3.5 h-3.5" /> Customer Details
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-6 text-sm">
              <div className="col-span-2">
                <span className="text-gray-400 text-xs block">Name</span>
                <span className="font-bold text-gray-800 text-base">{customer.displayName || "N/A"}</span>
              </div>
              <div>
                <span className="text-gray-400 text-xs block">Mobile</span>
                <span className="font-semibold text-gray-800">{customer.primaryMobile || "N/A"}</span>
              </div>
              {customer.alternateMobile && (
                <div>
                  <span className="text-gray-400 text-xs block">Alt. Mobile</span>
                  <span className="font-semibold text-gray-800">{customer.alternateMobile}</span>
                </div>
              )}
              {customer.email && (
                <div>
                  <span className="text-gray-400 text-xs block">Email</span>
                  <span className="font-semibold text-gray-800">{customer.email}</span>
                </div>
              )}
              {customer.addressLine1 && (
                <div className="col-span-2 sm:col-span-3">
                  <span className="text-gray-400 text-xs block">Address</span>
                  <span className="font-semibold text-gray-800">{customer.addressLine1}</span>
                </div>
              )}
              {(customer.driverName || customer.driverMobile) && (
                <div className="col-span-2 sm:col-span-3 bg-amber-50 rounded-lg p-2.5 border border-amber-100">
                  <span className="text-amber-700 text-xs font-bold block">Driver / Contact Person</span>
                  <span className="font-semibold text-gray-800">{customer.driverName} {customer.driverMobile ? `• ${customer.driverMobile}` : ''}</span>
                </div>
              )}
            </div>
          </section>

          {/* ─── Vehicle Details ─── */}
          <section className="bg-white rounded-xl p-5 shadow-sm border print:shadow-none print:border print:border-gray-300">
            <h2 className="text-xs font-bold uppercase text-gray-400 mb-3 flex items-center gap-2 border-b pb-2">
              <Car className="w-3.5 h-3.5" /> Vehicle Details
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6 text-sm">
              <div className="col-span-2 sm:col-span-3">
                <span className="text-gray-400 text-xs block">Registration Number</span>
                <span className="font-black text-xl text-gray-900 bg-yellow-100 px-3 py-1 rounded-lg border border-yellow-300 inline-block mt-1 tracking-widest">
                  {vehicle.registrationNumberRaw || "N/A"}
                </span>
              </div>
              <div>
                <span className="text-gray-400 text-xs block">Make</span>
                <span className="font-semibold text-gray-800">{vehicle.manufacturer || vehicle.make || "N/A"}</span>
              </div>
              <div>
                <span className="text-gray-400 text-xs block">Model</span>
                <span className="font-semibold text-gray-800">{vehicle.model || "N/A"}</span>
              </div>
              <div>
                <span className="text-gray-400 text-xs block">Year</span>
                <span className="font-semibold text-gray-800">{vehicle.year || "N/A"}</span>
              </div>
              <div>
                <span className="text-gray-400 text-xs block">Color</span>
                <span className="font-semibold text-gray-800">{vehicle.color || "N/A"}</span>
              </div>
              <div>
                <span className="text-gray-400 text-xs block flex items-center gap-1"><Fuel className="w-3 h-3"/>Fuel Type</span>
                <span className="font-semibold text-gray-800">{vehicle.fuelType || "N/A"}</span>
              </div>
              <div>
                <span className="text-gray-400 text-xs block flex items-center gap-1"><Gauge className="w-3 h-3"/>Intake Odometer</span>
                <span className="font-semibold text-gray-800">{jobCard.intakeOdometer ? `${jobCard.intakeOdometer.toLocaleString()} km` : "N/A"}</span>
              </div>
              {vehicle.vin && (
                <div className="col-span-2">
                  <span className="text-gray-400 text-xs block">VIN / Chassis No.</span>
                  <span className="font-semibold text-gray-800 font-mono text-xs">{vehicle.vin}</span>
                </div>
              )}
              {vehicle.engineNumber && (
                <div>
                  <span className="text-gray-400 text-xs block">Engine No.</span>
                  <span className="font-semibold text-gray-800 font-mono text-xs">{vehicle.engineNumber}</span>
                </div>
              )}
              {jobCard.fuelLevel && (
                <div>
                  <span className="text-gray-400 text-xs block">Fuel Level at Intake</span>
                  <span className="font-semibold text-gray-800">{jobCard.fuelLevel}</span>
                </div>
              )}
            </div>

            {/* Extended Vehicle Info */}
            {(vehicle.insurancePolicyNumber || vehicle.insurerName || vehicle.emissionInspectionNumber || vehicle.batteryMake || vehicle.nextServiceOdometer) && (
              <div className="mt-4 pt-4 border-t border-dashed border-gray-200">
                <div className="text-xs font-bold uppercase text-gray-400 mb-3">Extended Vehicle Information</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-6 text-sm">
                  {vehicle.insurerName && (
                    <div>
                      <span className="text-gray-400 text-xs flex items-center gap-1"><Shield className="w-3 h-3"/>Insurer</span>
                      <span className="font-semibold text-gray-800">{vehicle.insurerName}</span>
                    </div>
                  )}
                  {vehicle.insurancePolicyNumber && (
                    <div>
                      <span className="text-gray-400 text-xs block">Insurance Policy No.</span>
                      <span className="font-semibold text-gray-800">{vehicle.insurancePolicyNumber}</span>
                    </div>
                  )}
                  {vehicle.insuranceExpiryDate && (
                    <div>
                      <span className="text-gray-400 text-xs block">Insurance Expiry</span>
                      <span className={`font-semibold ${new Date(vehicle.insuranceExpiryDate) < new Date() ? 'text-red-600' : 'text-gray-800'}`}>
                        {formatDate(vehicle.insuranceExpiryDate)}
                      </span>
                    </div>
                  )}
                  {vehicle.emissionInspectionNumber && (
                    <div>
                      <span className="text-gray-400 text-xs block">PUC No.</span>
                      <span className="font-semibold text-gray-800">{vehicle.emissionInspectionNumber}</span>
                    </div>
                  )}
                  {vehicle.emissionInspectionExpiryDate && (
                    <div>
                      <span className="text-gray-400 text-xs block">PUC Expiry</span>
                      <span className={`font-semibold ${new Date(vehicle.emissionInspectionExpiryDate) < new Date() ? 'text-red-600' : 'text-gray-800'}`}>
                        {formatDate(vehicle.emissionInspectionExpiryDate)}
                      </span>
                    </div>
                  )}
                  {vehicle.batteryMake && (
                    <div>
                      <span className="text-gray-400 text-xs flex items-center gap-1"><Battery className="w-3 h-3"/>Battery</span>
                      <span className="font-semibold text-gray-800">{vehicle.batteryMake}{vehicle.batterySerialNumber ? ` • ${vehicle.batterySerialNumber}` : ''}</span>
                    </div>
                  )}
                  {vehicle.nextServiceOdometer && (
                    <div>
                      <span className="text-gray-400 text-xs block">Next Service At</span>
                      <span className="font-semibold text-teal-700">{vehicle.nextServiceOdometer.toLocaleString()} km</span>
                    </div>
                  )}
                  {vehicle.nextOilChangeDistance && (
                    <div>
                      <span className="text-gray-400 text-xs block">Next Oil Change</span>
                      <span className="font-semibold text-teal-700">{vehicle.nextOilChangeDistance.toLocaleString()} km</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* ─── Reported Problems / Complaints ─── */}
          <section className="bg-white rounded-xl p-5 shadow-sm border print:shadow-none print:border print:border-gray-300">
            <h2 className="text-xs font-bold uppercase text-gray-400 mb-3 flex items-center gap-2 border-b pb-2">
              <Wrench className="w-3.5 h-3.5" /> Reported Problems & Requested Work
            </h2>
            {jobCard.complaints && jobCard.complaints.length > 0 ? (
              <ul className="space-y-2">
                {jobCard.complaints.map((c: any, idx: number) => (
                  <li key={c.id || idx} className="flex items-start gap-2.5 text-sm">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold flex-shrink-0">{idx + 1}</span>
                    <span className="text-gray-800 font-medium">{c.description}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 italic">General service / as per workshop assessment.</p>
            )}

            {jobCard.externalNotes && (
              <div className="mt-4 pt-4 border-t border-dashed border-gray-200">
                <h3 className="text-xs font-bold uppercase text-gray-400 mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Additional Notes / Instructions
                </h3>
                <p className="text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 rounded-lg p-3 border">{jobCard.externalNotes}</p>
              </div>
            )}
          </section>

          {/* ─── Delivery & Estimate ─── */}
          <section className="bg-white rounded-xl p-5 shadow-sm border print:shadow-none print:border print:border-gray-300">
            <h2 className="text-xs font-bold uppercase text-gray-400 mb-3 flex items-center gap-2 border-b pb-2">
              <Calendar className="w-3.5 h-3.5" /> Delivery & Estimate
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-teal-50 rounded-xl p-4 border border-teal-100">
                <span className="text-teal-600 text-xs font-bold uppercase block mb-1">Estimated Delivery Date</span>
                <span className="font-black text-lg text-teal-800">
                  {jobCard.expectedDeliveryAt ? formatDate(jobCard.expectedDeliveryAt) : (jobCard.estimatedCompletionDate ? formatDate(jobCard.estimatedCompletionDate) : "To be confirmed")}
                </span>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <span className="text-gray-500 text-xs font-bold uppercase block mb-1">Estimated Cost</span>
                <span className="font-semibold text-gray-700 text-sm">To be confirmed after inspection</span>
              </div>
            </div>
          </section>

          {/* ─── Intake Photos — VISIBLE ON PRINT ─── */}
          {photos.length > 0 && (
            <section className="bg-white rounded-xl p-5 shadow-sm border print:shadow-none print:border print:border-gray-300">
              <h2 className="text-xs font-bold uppercase text-gray-400 mb-3 flex items-center gap-2 border-b pb-2">
                <Camera className="w-3.5 h-3.5" /> Intake Photos ({photos.length})
              </h2>
              {/* Screen grid with lightbox */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 print:hidden">
                {photos.map((photo: any, index: number) => (
                  <div
                    key={photo.id || index}
                    className="aspect-square rounded-lg overflow-hidden border cursor-pointer relative group bg-gray-100"
                    onClick={() => openLightbox(index)}
                  >
                    <img src={photo.url} alt={`Intake photo ${index + 1}`} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                      <ZoomIn className="text-white opacity-0 group-hover:opacity-100 w-5 h-5 drop-shadow-md" />
                    </div>
                  </div>
                ))}
            </section>
          )}

          {/* ─── Customer Acknowledgement & Signature ─── */}
          <section className="bg-white rounded-xl p-5 shadow-sm border border-gray-300 print:shadow-none print:border print:border-gray-400">
            <h2 className="text-xs font-bold uppercase text-gray-400 mb-4 flex items-center gap-2 border-b pb-2">
              <CheckCircle className="w-3.5 h-3.5" /> Customer Acknowledgement
            </h2>
            <div className="text-xs text-gray-600 space-y-1.5 mb-6 bg-gray-50 rounded-lg p-3 border">
              <p>I, the undersigned, hereby confirm and acknowledge the following:</p>
              <ul className="list-disc pl-4 space-y-1 mt-2">
                <li>I have handed over the above-mentioned vehicle to <strong>{workshopProfile?.workshopName || workshopProfile?.name || 'the workshop'}</strong> for the reported repairs/service.</li>
                <li>The vehicle condition and odometer reading noted above are accurate to the best of my knowledge.</li>
                <li>I authorize the workshop to proceed with the requested work and any additional necessary repairs (subject to prior approval for significant additional work).</li>
                <li>I understand that the estimated delivery date is indicative and subject to change based on parts availability and repair complexity.</li>
              </ul>
            </div>
            <div className="flex flex-col sm:flex-row justify-between gap-8 mt-4 px-2">
              <div className="text-center flex-1">
                <div className="border-b-2 border-gray-400 h-14 mb-2"></div>
                <div className="text-xs font-bold text-gray-600 uppercase tracking-wide">Customer Signature</div>
                <div className="text-xs text-gray-400 mt-0.5">Name: {customer.displayName || '_____________________'}</div>
                <div className="text-xs text-gray-400">Date: {formatDate(new Date())}</div>
              </div>
              <div className="text-center flex-1">
                <div className="border-b-2 border-gray-400 h-14 mb-2 flex items-end justify-center pb-1">
                  <span className="text-xs text-gray-300 italic">Official Stamp</span>
                </div>
                <div className="text-xs font-bold text-gray-600 uppercase tracking-wide">Workshop Representative</div>
                <div className="text-xs text-gray-400 mt-0.5">{workshopProfile?.workshopName || workshopProfile?.name || ''}</div>
                <div className="text-xs text-gray-400">Date: {formatDate(new Date())}</div>
              </div>
            </div>
          </section>

        </div>
      </div>

      {/* ─── Fullscreen Lightbox (screen only) ─── */}
      {lightboxOpen && photos.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center print:hidden">
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 rounded-full transition-all"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={photos[currentPhotoIndex].url}
            alt={`Intake photo ${currentPhotoIndex + 1}`}
            className="max-w-full max-h-[85vh] object-contain"
          />
          {photos.length > 1 && (
            <>
              <button
                onClick={prevPhoto}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 rounded-full transition-all"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button
                onClick={nextPhoto}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 rounded-full transition-all"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </>
          )}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm bg-black/50 px-4 py-1.5 rounded-full">
            {currentPhotoIndex + 1} of {photos.length}
          </div>
        </div>
      )}
    </div>
  );
}
