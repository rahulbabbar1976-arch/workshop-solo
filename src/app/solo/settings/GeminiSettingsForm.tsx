"use client";

import { useState, useEffect } from "react";
import { Sparkles, Check, Key, ExternalLink } from "lucide-react";
import { getWorkshopProfileInfoAction, saveGeminiApiKeyAction, saveOpenRouterApiKeyAction } from "./actions";

export default function GeminiSettingsForm() {
  const [loading, setLoading] = useState(false);
  const [geminiKey, setGeminiKey] = useState("");
  const [openRouterKey, setOpenRouterKey] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    getWorkshopProfileInfoAction().then(res => {
      setGeminiKey(res.geminiApiKey);
      setOpenRouterKey(res.openRouterApiKey || "");
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setMessage("");
      await saveGeminiApiKeyAction(geminiKey);
      await saveOpenRouterApiKeyAction(openRouterKey);
      setMessage("API Keys saved successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage("Failed to save API Keys.");
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
          <p className="text-sm text-gray-500 mt-1">Configure AI for bill scanning & smart features.</p>
        </div>
      </div>
      <div className="p-5">
        <form onSubmit={handleSave} className="space-y-5">

          {/* OpenRouter Section - Recommended */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-green-800 text-sm flex items-center">
                  <span className="bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded mr-2">FREE</span>
                  OpenRouter API Key (Recommended)
                </h3>
                <p className="text-xs text-green-700 mt-1">
                  100% free, no credit card needed. Supports Gemini, Llama, Mistral & more.
                </p>
              </div>
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-xs text-green-700 font-bold hover:underline whitespace-nowrap ml-2"
              >
                Get Free Key <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center">
                <Key className="w-3 h-3 mr-1 text-gray-400" /> OpenRouter Key
              </label>
              <input
                type="password"
                value={openRouterKey}
                onChange={e => setOpenRouterKey(e.target.value)}
                placeholder="sk-or-v1-..."
                className="w-full p-3 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-sm bg-white"
              />
            </div>
            <ol className="text-xs text-green-700 mt-2 space-y-0.5 list-decimal list-inside">
              <li>Go to <strong>openrouter.ai</strong> → sign up free with Google</li>
              <li>Click <strong>Keys → Create Key</strong></li>
              <li>Paste it above and save</li>
            </ol>
          </div>

          {/* Gemini Section - Optional */}
          <div className="border border-gray-200 rounded-xl p-4">
            <h3 className="font-bold text-gray-700 text-sm flex items-center mb-1">
              <span className="bg-gray-200 text-gray-600 text-xs font-bold px-2 py-0.5 rounded mr-2">OPTIONAL</span>
              Google Gemini API Key
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              Used as a backup if OpenRouter is not configured. Requires Google billing for most regions.
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center">
                <Key className="w-3 h-3 mr-1 text-gray-400" /> Gemini Key
              </label>
              <input
                type="password"
                value={geminiKey}
                onChange={e => setGeminiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="py-2 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors flex items-center"
            >
              {loading ? "Saving..." : <><Check className="w-4 h-4 mr-2" /> Save Keys</>}
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
