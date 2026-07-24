'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Check, Loader2, X, Wrench, ShieldAlert } from 'lucide-react';

interface PartSuggestion {
  partDescription: string;
  estimatedPrice: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface LabourSuggestion {
  jobDescription: string;
  estimatedHours: number;
  hourlyRate: number;
}

interface AIIntelligenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobCardId?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  complaintsText?: string;
  onApplySuggestions: (parts: PartSuggestion[], labour: LabourSuggestion[]) => void;
}

export default function AIIntelligenceModal({
  isOpen,
  onClose,
  jobCardId,
  vehicleMake = '',
  vehicleModel = '',
  complaintsText = '',
  onApplySuggestions,
}: AIIntelligenceModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parts, setParts] = useState<(PartSuggestion & { selected: boolean })[]>([]);
  const [labour, setLabour] = useState<(LabourSuggestion & { selected: boolean })[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchSuggestions();
    }
  }, [isOpen]);

  const fetchSuggestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/estimates/intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobCardId,
          vehicleMake,
          vehicleModel,
          complaint: complaintsText,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setParts((data.data.parts || []).map((p: PartSuggestion) => ({ ...p, selected: true })));
        setLabour((data.data.labour || []).map((l: LabourSuggestion) => ({ ...l, selected: true })));
      } else {
        setError(data.error || 'Failed to generate AI diagnostic suggestions');
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching AI recommendations');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const togglePart = (idx: number) => {
    setParts(prev => prev.map((p, i) => i === idx ? { ...p, selected: !p.selected } : p));
  };

  const toggleLabour = (idx: number) => {
    setLabour(prev => prev.map((l, i) => i === idx ? { ...l, selected: !l.selected } : l));
  };

  const handleApply = () => {
    const selectedParts = parts.filter(p => p.selected).map(({ selected, ...rest }) => rest);
    const selectedLabour = labour.filter(l => l.selected).map(({ selected, ...rest }) => rest);
    onApplySuggestions(selectedParts, selectedLabour);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 p-5 text-white flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
              <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold">AI Diagnostic & Estimate Assistant</h2>
              <p className="text-xs text-purple-100">
                {vehicleMake || vehicleModel ? `${vehicleMake} ${vehicleModel}` : 'Vehicle'} Smart Recommendations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
              <p className="text-gray-600 text-sm font-medium">Analyzing vehicle complaints & predicting required repairs...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center space-x-3">
              <ShieldAlert className="w-6 h-6 flex-shrink-0" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          ) : (
            <>
              {/* Parts Suggestions */}
              <div>
                <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider mb-3 flex items-center">
                  <Wrench className="w-4 h-4 mr-2 text-indigo-600" />
                  Recommended Replacement Parts
                </h3>
                {parts.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No specific parts recommended.</p>
                ) : (
                  <div className="space-y-2">
                    {parts.map((p, idx) => (
                      <div
                        key={idx}
                        onClick={() => togglePart(idx)}
                        className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                          p.selected
                            ? 'border-indigo-500 bg-indigo-50/50 shadow-sm'
                            : 'border-gray-200 bg-gray-50/50 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                              p.selected
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'border-gray-300 bg-white'
                            }`}
                          >
                            {p.selected && <Check className="w-3.5 h-3.5" />}
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-900">{p.partDescription}</span>
                            <span
                              className={`ml-2 text-xs px-2 py-0.5 rounded-full font-semibold ${
                                p.priority === 'HIGH'
                                  ? 'bg-red-100 text-red-700'
                                  : p.priority === 'MEDIUM'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {p.priority}
                            </span>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-gray-900">
                          ₹{p.estimatedPrice?.toLocaleString('en-IN') || 0}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Labour Suggestions */}
              <div>
                <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider mb-3 flex items-center">
                  <Sparkles className="w-4 h-4 mr-2 text-indigo-600" />
                  Estimated Labour Operations
                </h3>
                {labour.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No specific labour operations recommended.</p>
                ) : (
                  <div className="space-y-2">
                    {labour.map((l, idx) => (
                      <div
                        key={idx}
                        onClick={() => toggleLabour(idx)}
                        className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                          l.selected
                            ? 'border-indigo-500 bg-indigo-50/50 shadow-sm'
                            : 'border-gray-200 bg-gray-50/50 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                              l.selected
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'border-gray-300 bg-white'
                            }`}
                          >
                            {l.selected && <Check className="w-3.5 h-3.5" />}
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-900">{l.jobDescription}</span>
                            <span className="ml-2 text-xs text-gray-500 font-medium">
                              ({l.estimatedHours} hrs @ ₹{l.hourlyRate}/hr)
                            </span>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-gray-900">
                          ₹{(l.estimatedHours * l.hourlyRate).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={loading || (parts.length === 0 && labour.length === 0)}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm shadow-md hover:shadow-indigo-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Apply Selected Recommendations</span>
          </button>
        </div>
      </div>
    </div>
  );
}
