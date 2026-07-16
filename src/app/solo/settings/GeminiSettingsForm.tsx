"use client";

import { useState, useEffect, useCallback } from "react";
import { Sparkles, Check, Key, ExternalLink, RefreshCw, Zap, BarChart2 } from "lucide-react";
import { getWorkshopProfileInfoAction, saveGeminiApiKeyAction, saveOpenRouterApiKeyAction } from "./actions";

type OpenRouterStats = {
  label: string;
  usage: number;        // total credits used (in USD)
  limit: number | null; // key credit limit (null = unlimited)
  limit_remaining: number | null;
  is_free_tier: boolean;
  rate_limit: { requests: number; interval: string } | null;
};

export default function GeminiSettingsForm() {
  const [loading, setLoading] = useState(false);
  const [geminiKey, setGeminiKey] = useState("");
  const [openRouterKey, setOpenRouterKey] = useState("");
  const [message, setMessage] = useState("");
  const [stats, setStats] = useState<OpenRouterStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    getWorkshopProfileInfoAction().then(res => {
      setGeminiKey(res.geminiApiKey);
      const orKey = res.openRouterApiKey || "";
      setOpenRouterKey(orKey);
      if (orKey) fetchStats(orKey);
    });
  }, []);

  const fetchStats = useCallback(async (key: string) => {
    if (!key) return;
    setStatsLoading(true);
    setStatsError(null);
    try {
      // Fetch key info
      const [keyRes, creditsRes] = await Promise.all([
        fetch("https://openrouter.ai/api/v1/auth/key", {
          headers: { Authorization: `Bearer ${key}` }
        }),
        fetch("https://openrouter.ai/api/v1/credits", {
          headers: { Authorization: `Bearer ${key}` }
        })
      ]);

      const keyData = keyRes.ok ? await keyRes.json() : null;
      const creditsData = creditsRes.ok ? await creditsRes.json() : null;

      if (!keyData && !creditsData) {
        setStatsError("Could not fetch usage. Check your key is correct.");
        return;
      }

      const data = keyData?.data || keyData || {};
      const credits = creditsData?.data || creditsData || {};

      setStats({
        label: data.label || "API Key",
        usage: data.usage ?? credits.usage ?? 0,
        limit: data.limit ?? null,
        limit_remaining: data.limit_remaining ?? null,
        is_free_tier: data.is_free_tier ?? true,
        rate_limit: data.rate_limit ?? null,
      });
    } catch (e) {
      setStatsError("Network error fetching stats.");
    } finally {
      setStatsLoading(false);
    }
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
      if (openRouterKey) fetchStats(openRouterKey);
    } catch (err) {
      setMessage("Failed to save API Keys.");
    } finally {
      setLoading(false);
    }
  };

  const usagePercent = stats?.limit
    ? Math.min(100, (stats.usage / stats.limit) * 100)
    : null;

  const formatCredits = (val: number | null | undefined) => {
    if (val === null || val === undefined) return "∞";
    if (val === 0) return "$0.00";
    return `$${val.toFixed(4)}`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-indigo-200 overflow-hidden">
      <div className="p-5 border-b border-indigo-100 flex items-center justify-between bg-indigo-50/50">
        <div>
          <h2 className="font-bold text-indigo-700 text-lg flex items-center">
            <Sparkles className="w-5 h-5 mr-2" /> AI Integration
          </h2>
          <p className="text-sm text-gray-500 mt-1">Configure AI for bill scanning &amp; smart features.</p>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* === OpenRouter Usage Widget === */}
        {openRouterKey && (
          <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center">
                <BarChart2 className="w-4 h-4 text-indigo-500 mr-2" />
                <span className="font-bold text-gray-700 text-sm">OpenRouter Usage</span>
                {stats?.is_free_tier && (
                  <span className="ml-2 bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">Free Tier</span>
                )}
              </div>
              <button
                onClick={() => fetchStats(openRouterKey)}
                disabled={statsLoading}
                className="p-1.5 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
                title="Refresh usage"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${statsLoading ? "animate-spin" : ""}`} />
              </button>
            </div>

            {statsLoading && !stats && (
              <div className="p-4 text-center text-sm text-gray-400 animate-pulse">Loading usage data...</div>
            )}

            {statsError && (
              <div className="p-4 text-center text-sm text-red-500">{statsError}</div>
            )}

            {stats && (
              <div className="p-4 space-y-3">
                {/* Credit bar */}
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Credits Used</span>
                    <span className="font-bold">
                      {formatCredits(stats.usage)}
                      {stats.limit ? ` / ${formatCredits(stats.limit)}` : " (Unlimited)"}
                    </span>
                  </div>
                  {usagePercent !== null ? (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${usagePercent > 80 ? "bg-red-500" : usagePercent > 50 ? "bg-yellow-500" : "bg-green-500"}`}
                        style={{ width: `${usagePercent}%` }}
                      />
                    </div>
                  ) : (
                    <div className="w-full bg-green-100 rounded-full h-2">
                      <div className="h-2 w-full rounded-full bg-green-400 opacity-40" />
                    </div>
                  )}
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white rounded-lg p-2.5 border border-gray-100 text-center">
                    <div className="text-xs text-gray-400 mb-0.5">Total Used</div>
                    <div className="font-bold text-gray-800 text-sm">{formatCredits(stats.usage)}</div>
                  </div>
                  <div className="bg-white rounded-lg p-2.5 border border-gray-100 text-center">
                    <div className="text-xs text-gray-400 mb-0.5">Remaining</div>
                    <div className="font-bold text-green-600 text-sm">
                      {stats.limit_remaining !== null ? formatCredits(stats.limit_remaining) : "Unlimited"}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-2.5 border border-gray-100 text-center">
                    <div className="text-xs text-gray-400 mb-0.5">Rate Limit</div>
                    <div className="font-bold text-gray-800 text-sm">
                      {stats.rate_limit
                        ? `${stats.rate_limit.requests}/${stats.rate_limit.interval}`
                        : "Standard"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center text-xs text-gray-400">
                  <Zap className="w-3 h-3 mr-1 text-yellow-500" />
                  Free tier models cost $0.00 per request
                  <a href="https://openrouter.ai/activity" target="_blank" rel="noopener noreferrer" className="ml-auto flex items-center text-indigo-500 hover:underline">
                    Full Activity <ExternalLink className="w-3 h-3 ml-0.5" />
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          {/* OpenRouter Section */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-green-800 text-sm flex items-center">
                  <span className="bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded mr-2">FREE</span>
                  OpenRouter API Key (Recommended)
                </h3>
                <p className="text-xs text-green-700 mt-1">
                  100% free, no credit card needed. Supports Gemini, Llama, Mistral &amp; more.
                </p>
              </div>
              <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="flex items-center text-xs text-green-700 font-bold hover:underline whitespace-nowrap ml-2">
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

          {/* Gemini Section */}
          <div className="border border-gray-200 rounded-xl p-4">
            <h3 className="font-bold text-gray-700 text-sm flex items-center mb-1">
              <span className="bg-gray-200 text-gray-600 text-xs font-bold px-2 py-0.5 rounded mr-2">OPTIONAL</span>
              Google Gemini API Key
            </h3>
            <p className="text-xs text-gray-500 mb-3">Used as a backup if OpenRouter is not configured.</p>
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
            <button type="submit" disabled={loading} className="py-2 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors flex items-center">
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
