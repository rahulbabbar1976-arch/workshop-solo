"use client";

import { useState, useEffect } from "react";
import { Sparkles, Check, Key } from "lucide-react";
import { getWorkshopProfileInfoAction, saveGeminiApiKeyAction } from "./actions";

export default function GeminiSettingsForm() {
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    getWorkshopProfileInfoAction().then(res => {
      setApiKey(res.geminiApiKey);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setMessage("");
      await saveGeminiApiKeyAction(apiKey);
      setMessage("API Key saved successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage("Failed to save API Key.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-indigo-200 overflow-hidden">
      <div className="p-5 border-b border-indigo-100 flex items-center justify-between bg-indigo-50/50">
        <div>
          <h2 className="font-bold text-indigo-700 text-lg flex items-center">
            <Sparkles className="w-5 h-5 mr-2" /> AI Integration
          </h2>
          <p className="text-sm text-gray-500 mt-1">Configure your Gemini API key to enable AI features.</p>
        </div>
      </div>
      <div className="p-5">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              <Key className="w-4 h-4 mr-1 text-gray-400" /> Gemini API Key
            </label>
            <input 
              type="password" 
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
            />
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              type="submit" 
              disabled={loading}
              className="py-2 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors flex items-center"
            >
              {loading ? "Saving..." : <><Check className="w-4 h-4 mr-2" /> Save Key</>}
            </button>
            {message && (
              <span className={`text-sm font-bold ${message.includes("success") ? "text-teal-600" : "text-red-600"}`}>
                {message}
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
