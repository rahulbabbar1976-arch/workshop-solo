"use client";

import { useState } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn, Calendar, User, Car, Wrench, FileText, Camera, Printer, Download } from "lucide-react";

export function IntakeViewClient({ jobCard, workshopProfile }: { jobCard: any, workshopProfile: any }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Use photos from jobcard media if available. If they were previously using vehicle images, we might need to fetch those.
  // Assuming jobCard.media has the intake photos.
  const photos = jobCard.media?.filter((m: any) => m.type === 'intake') || [];

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

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = document.getElementById('intake-printable-area');
      const opt = {
        margin:       10,
        filename:     `Intake_${jobCard.jobNumber || jobCard.id.substring(0, 8)}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      html2pdf().from(element).set(opt).save();
    } catch (error) {
      console.error("Error generating PDF", error);
      alert("Failed to generate PDF. You can still use the Print button to Save as PDF.");
    }
  };

  const formatDate = (dateStr: string | Date | null) => {
    if (!dateStr) return "Not specified";
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div id="intake-printable-area" className="bg-gray-50 min-h-screen pb-12 font-sans print:bg-white print:pb-0">
      
      {/* Action Buttons (Hidden when printing) */}
      <div className="print:hidden max-w-3xl mx-auto flex justify-end gap-3 pt-4 px-4">
        <button 
          onClick={handlePrint}
          className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-2 px-4 rounded shadow-sm flex items-center transition-colors text-sm"
        >
          <Printer className="w-4 h-4 mr-2" /> Print
        </button>
        <button 
          onClick={handleDownloadPDF}
          className="bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 px-4 rounded shadow-sm flex items-center transition-colors text-sm"
        >
          <Download className="w-4 h-4 mr-2" /> Download PDF
        </button>
      </div>

      {/* Workshop Header */}
      <div className="bg-white p-6 shadow-sm border-b print:shadow-none print:border-b-2">
        <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center justify-between text-center md:text-left gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 uppercase tracking-tight">
              {workshopProfile?.name || "Babbarsons"}
            </h1>
            <p className="text-sm text-gray-500 mt-1">{workshopProfile?.addressLine1}</p>
            <p className="text-sm text-gray-500">{workshopProfile?.contactPhone} | {workshopProfile?.contactEmail}</p>
          </div>
          <div className="bg-teal-50 text-teal-800 px-4 py-2 rounded-md border border-teal-200 inline-block text-sm font-semibold">
            Vehicle Intake Form
            <div className="text-xs text-teal-600 font-normal mt-1">
              Date: {formatDate(jobCard.createdAt)}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto mt-6 px-4 space-y-6 print:mt-4 print:space-y-4">
        
        {/* Customer Details */}
        <section className="bg-white rounded-xl p-5 shadow-sm border print:shadow-none print:border-gray-300">
          <h2 className="text-sm font-bold uppercase text-gray-500 mb-3 flex items-center gap-2 border-b pb-2">
            <User className="w-4 h-4" /> Customer Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm">
            <div>
              <span className="text-gray-500 text-xs block">Name</span>
              <span className="font-semibold text-gray-800">{jobCard.customer?.displayName || "N/A"}</span>
            </div>
            <div>
              <span className="text-gray-500 text-xs block">Phone</span>
              <span className="font-semibold text-gray-800">{jobCard.customer?.primaryMobile || "N/A"}</span>
            </div>
            <div>
              <span className="text-gray-500 text-xs block">Email</span>
              <span className="font-semibold text-gray-800">{jobCard.customer?.email || "N/A"}</span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-gray-500 text-xs block">Address</span>
              <span className="font-semibold text-gray-800">{jobCard.customer?.addressLine1 || "N/A"}</span>
            </div>
          </div>
        </section>

        {/* Vehicle Details */}
        <section className="bg-white rounded-xl p-5 shadow-sm border print:shadow-none print:border-gray-300">
          <h2 className="text-sm font-bold uppercase text-gray-500 mb-3 flex items-center gap-2 border-b pb-2">
            <Car className="w-4 h-4" /> Vehicle Details
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4 text-sm">
            <div className="col-span-2 sm:col-span-3">
              <span className="text-gray-500 text-xs block">Registration No.</span>
              <span className="font-bold text-lg text-gray-800 bg-yellow-100 px-2 py-0.5 rounded border border-yellow-300 inline-block">
                {jobCard.vehicle?.registrationNumberRaw || "N/A"}
              </span>
            </div>
            <div>
              <span className="text-gray-500 text-xs block">Make & Model</span>
              <span className="font-semibold text-gray-800">{jobCard.vehicle?.manufacturer} {jobCard.vehicle?.model}</span>
            </div>
            <div>
              <span className="text-gray-500 text-xs block">Year</span>
              <span className="font-semibold text-gray-800">{jobCard.vehicle?.year || "N/A"}</span>
            </div>
            <div>
              <span className="text-gray-500 text-xs block">Color</span>
              <span className="font-semibold text-gray-800">{jobCard.vehicle?.color || "N/A"}</span>
            </div>
            <div>
              <span className="text-gray-500 text-xs block">VIN / Chassis</span>
              <span className="font-semibold text-gray-800">{jobCard.vehicle?.vin || "N/A"}</span>
            </div>
            <div>
              <span className="text-gray-500 text-xs block">Mileage</span>
              <span className="font-semibold text-gray-800">{jobCard.intakeOdometer ? `${jobCard.intakeOdometer} km` : "N/A"}</span>
            </div>
            <div>
              <span className="text-gray-500 text-xs block">Fuel Type</span>
              <span className="font-semibold text-gray-800">{jobCard.vehicle?.fuelType || "N/A"}</span>
            </div>
          </div>
        </section>

        {/* Complaints & Notes */}
        <section className="bg-white rounded-xl p-5 shadow-sm border print:shadow-none print:border-gray-300">
          <h2 className="text-sm font-bold uppercase text-gray-500 mb-3 flex items-center gap-2 border-b pb-2">
            <Wrench className="w-4 h-4" /> Reported Problems
          </h2>
          {jobCard.complaints && jobCard.complaints.length > 0 ? (
            <ul className="list-disc pl-5 space-y-1 text-sm text-gray-800 font-medium">
              {jobCard.complaints.map((c: any) => (
                <li key={c.id}>{c.description}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 italic">No specific problems reported.</p>
          )}

          {jobCard.externalNotes && (
            <div className="mt-4 pt-4 border-t">
              <h3 className="text-xs font-bold uppercase text-gray-500 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Additional Notes
              </h3>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{jobCard.externalNotes}</p>
            </div>
          )}
        </section>

        {/* Estimates & Delivery */}
        <section className="bg-white rounded-xl p-5 shadow-sm border print:shadow-none print:border-gray-300">
          <h2 className="text-sm font-bold uppercase text-gray-500 mb-3 flex items-center gap-2 border-b pb-2">
            <Calendar className="w-4 h-4" /> Estimates
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm">
            <div>
              <span className="text-gray-500 text-xs block">Estimated Delivery Date</span>
              <span className="font-semibold text-gray-800">{formatDate(jobCard.estimatedCompletionDate)}</span>
            </div>
            <div>
              <span className="text-gray-500 text-xs block">Estimated Cost</span>
              <span className="font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                To be confirmed after inspection
              </span>
            </div>
          </div>
        </section>

        {/* Vehicle Photos */}
        {photos.length > 0 && (
          <section className="bg-white rounded-xl p-5 shadow-sm border print:hidden">
            <h2 className="text-sm font-bold uppercase text-gray-500 mb-3 flex items-center gap-2 border-b pb-2">
              <Camera className="w-4 h-4" /> Intake Photos
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {photos.map((photo: any, index: number) => (
                <div 
                  key={photo.id} 
                  className="aspect-square rounded-lg overflow-hidden border cursor-pointer relative group"
                  onClick={() => openLightbox(index)}
                >
                  <img src={photo.url} alt={`Intake photo ${index + 1}`} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                    <ZoomIn className="text-white opacity-0 group-hover:opacity-100 w-6 h-6 drop-shadow-md" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>

      {/* Fullscreen Lightbox */}
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
            className="max-w-full max-h-[85vh] object-contain transition-transform" 
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
