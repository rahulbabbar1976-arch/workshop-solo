'use client';

import React, { useState, useRef } from 'react';
import Papa from 'papaparse';

const IMPORT_TYPES = [
  { id: 'customers', name: 'Customers', fields: ['displayName', 'customerCode', 'primaryMobile', 'secondaryMobile', 'email', 'addressLine1', 'addressLine2', 'city', 'state', 'pincode', 'taxId'] },
  { id: 'vehicles', name: 'Vehicles', fields: ['registrationNumber', 'make', 'model', 'variant', 'year', 'vin', 'engineNumber', 'fuelType', 'customerMobile'] },
  { id: 'parts', name: 'Parts Inventory', fields: ['partNumber', 'partName', 'description', 'brand', 'category', 'sellingPrice', 'purchasePrice', 'currentStock', 'reorderLevel', 'hsnCode'] },
];

export default function MigrationsPage() {
  const [importType, setImportType] = useState(IMPORT_TYPES[0].id);
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({}); // ourField -> csvHeader
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setImportResult(null);

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.meta.fields) {
          setCsvHeaders(results.meta.fields);
        }
        setCsvData(results.data);
        
        // Auto-map where possible
        const targetFields = IMPORT_TYPES.find(t => t.id === importType)?.fields || [];
        const initialMap: Record<string, string> = {};
        targetFields.forEach(field => {
          const match = results.meta.fields?.find(h => h.toLowerCase().replace(/[^a-z0-9]/g, '') === field.toLowerCase());
          if (match) initialMap[field] = match;
        });
        setMapping(initialMap);
      }
    });
  };

  const handleMapChange = (targetField: string, csvHeader: string) => {
    setMapping(prev => ({
      ...prev,
      [targetField]: csvHeader
    }));
  };

  const executeImport = async () => {
    setIsImporting(true);
    setImportResult(null);

    // Transform data according to mapping
    const mappedData = csvData.map(row => {
      const obj: any = {};
      Object.entries(mapping).forEach(([targetField, csvHeader]) => {
        if (csvHeader && row[csvHeader] !== undefined) {
          obj[targetField] = row[csvHeader];
        }
      });
      return obj;
    });

    try {
      const res = await fetch('/api/migrations/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: importType,
          data: mappedData
        })
      });

      const result = await res.json();
      setImportResult(result);
      if (res.ok && fileInputRef.current) {
        fileInputRef.current.value = '';
        setFile(null);
        setCsvHeaders([]);
      }
    } catch (e: any) {
      setImportResult({ success: 0, failed: mappedData.length, errors: [e.message] });
    }
    
    setIsImporting(false);
  };

  const selectedTypeDef = IMPORT_TYPES.find(t => t.id === importType);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Data Migration</h1>
      <p className="text-gray-600 mb-8">Import your existing data from other software using CSV files.</p>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        
        {/* Step 1: Select Type */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">1. What are you importing?</h2>
          <div className="flex gap-4">
            {IMPORT_TYPES.map(t => (
              <button
                key={t.id}
                onClick={() => { setImportType(t.id); setFile(null); setCsvHeaders([]); }}
                className={`px-4 py-2 rounded-md font-medium border ${importType === t.id ? 'bg-blue-50 border-blue-600 text-blue-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Upload File */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">2. Upload CSV File</h2>
          <input 
            type="file" 
            accept=".csv" 
            onChange={handleFileUpload} 
            ref={fileInputRef}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
          {file && <p className="text-sm text-green-600 mt-2">File loaded: {file.name} ({csvData.length} records found)</p>}
        </div>

        {/* Step 3: Column Mapping */}
        {csvHeaders.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4 border-b pb-2">3. Map Columns</h2>
            <p className="text-sm text-gray-500 mb-4">Match your CSV columns to our database fields. We've auto-matched fields with similar names.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
              {selectedTypeDef?.fields.map(field => (
                <div key={field} className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 mb-1">{field}</label>
                  <select 
                    value={mapping[field] || ''} 
                    onChange={(e) => handleMapChange(field, e.target.value)}
                    className="border border-gray-300 rounded-md p-2 text-sm bg-white"
                  >
                    <option value="">-- Do not import --</option>
                    {csvHeaders.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            
            <div className="mt-8 flex items-center gap-4">
              <button 
                onClick={executeImport}
                disabled={isImporting || Object.keys(mapping).length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md shadow-sm disabled:opacity-50"
              >
                {isImporting ? 'Importing...' : `Import ${csvData.length} Records`}
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {importResult && (
          <div className={`mt-6 p-4 rounded-md border ${importResult.failed > 0 ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
            <h3 className="font-semibold text-lg mb-2">Import Complete</h3>
            <p><strong>Success:</strong> {importResult.success} records</p>
            <p><strong>Failed:</strong> {importResult.failed} records</p>
            {importResult.errors && importResult.errors.length > 0 && (
              <div className="mt-3">
                <p className="font-medium text-sm text-red-600 mb-1">Errors:</p>
                <ul className="list-disc pl-5 text-sm text-red-600 max-h-32 overflow-y-auto">
                  {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
