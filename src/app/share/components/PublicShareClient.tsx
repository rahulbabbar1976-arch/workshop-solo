"use client";

import React, { useState } from 'react';
import { Lock, FileText, Download, Printer } from 'lucide-react';
import Image from 'next/image';

export default function PublicShareClient({ id, docType }: { id: string, docType: string }) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<any>(null);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/public/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, docType, pin })
      });
      
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.error || 'Failed to unlock');
      }
      
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-outfit">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="mx-auto w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-teal-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Secure Document Access
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please enter the 4-digit PIN to access your {docType === 'estimate' ? 'Estimate' : 'Jobcard'}.
            <br/><span className="text-gray-500 text-xs">Hint: It is the last 4 digits of your registered mobile number.</span>
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">
            <form className="space-y-6" onSubmit={handleUnlock}>
              <div>
                <label htmlFor="pin" className="block text-sm font-medium text-gray-700">
                  4-Digit PIN
                </label>
                <div className="mt-1">
                  <input
                    id="pin"
                    name="pin"
                    type="password"
                    maxLength={4}
                    required
                    className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-lg text-center tracking-[1em]"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                  />
                </div>
                {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50"
                >
                  {loading ? 'Unlocking...' : 'Unlock Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Render the Document directly if unlocked
  const { jobCard, estimate, printSettings } = data;
  const config = printSettings?.layoutConfig ? JSON.parse(printSettings.layoutConfig) : [];
  const isEnabled = (id: string) => {
    const item = config.find((c: any) => c.id === id);
    return item ? item.enabled : true;
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8 font-outfit print:bg-white print:p-0">
      {/* Viewer Header - Hidden when printing */}
      <div className="max-w-4xl mx-auto mb-6 bg-white rounded-lg shadow-sm p-4 flex justify-between items-center print:hidden border border-gray-200">
        <div>
          <h1 className="text-xl font-bold text-gray-800">
            {docType === 'estimate' ? `Estimate #${estimate.estimateNumber}` : `Jobcard #${jobCard.jobcardNumber}`}
          </h1>
          <p className="text-sm text-gray-500">Secure Digital Copy</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-md hover:bg-teal-700 font-medium text-sm transition-colors">
            <Printer className="w-4 h-4" /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* Document Body */}
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-8 sm:p-12 print:shadow-none print:rounded-none border border-gray-200 print:border-none">
        
        {/* Header Section */}
        {isEnabled('HEADER') && (
          <div className="flex justify-between items-start border-b-2 border-gray-800 pb-6 mb-6">
            <div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">
                {docType === 'estimate' ? 'ESTIMATE' : 'JOBCARD'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">Date: {new Date(jobCard.createdAt).toLocaleDateString()}</p>
            </div>
            {printSettings?.showLogo && (
              <div className="text-right">
                <h3 className="font-bold text-xl text-teal-700">Workshop</h3>
                <p className="text-sm text-gray-600">contact@workshop.com</p>
              </div>
            )}
          </div>
        )}

        {/* Customer & Vehicle Info */}
        {isEnabled('CUSTOMER_VEHICLE') && (
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-100 pb-1">Bill To</h4>
              <p className="font-bold text-gray-800 text-lg">{jobCard.customer?.displayName}</p>
              <p className="text-sm text-gray-600">{jobCard.customer?.primaryMobile}</p>
              <p className="text-sm text-gray-600">{jobCard.customer?.addressLine1}</p>
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-100 pb-1">Vehicle Details</h4>
              <p className="font-bold text-gray-800 text-lg">{jobCard.vehicle?.registrationNumberRaw}</p>
              <p className="text-sm text-gray-600">{jobCard.vehicle?.manufacturer} {jobCard.vehicle?.model}</p>
              <p className="text-sm text-gray-600">Odo: {jobCard.intakeOdometer || jobCard.vehicle?.currentOdometer || 'N/A'} KM</p>
            </div>
          </div>
        )}

        {/* Complaints */}
        {isEnabled('COMPLAINTS') && jobCard.complaints?.length > 0 && (
          <div className="mb-8">
            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-100 pb-1">Reported Issues</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              {jobCard.complaints.filter((c: any) => c.isActive).map((c: any, i: number) => (
                <li key={i} className="text-sm">{c.customerComplaintText || c.complaintText}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer Section */}
        <div className="mt-16 pt-8 border-t-2 border-gray-200">
          <p className="text-center text-sm text-gray-500">
            Thank you for your business. For any queries, please contact us.
          </p>
        </div>

      </div>
    </div>
  );
}
