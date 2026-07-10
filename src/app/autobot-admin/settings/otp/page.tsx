"use client";

import { useState } from "react";
import {
  MessageSquare, Save, Eye, EyeOff, CheckCircle2, XCircle,
  Zap, Link2, Key, Globe, RefreshCw, AlertTriangle, ChevronDown, Send
} from "lucide-react";

type ProviderKey = "twilio" | "msg91" | "fast2sms" | "textlocal" | "custom";

interface Provider {
  key: ProviderKey;
  name: string;
  logo: string;
  description: string;
  fields: { key: string; label: string; placeholder: string; secret?: boolean }[];
  webhookUrl?: string;
  docsUrl: string;
}

const PROVIDERS: Provider[] = [
  {
    key: "twilio",
    name: "Twilio",
    logo: "🔴",
    description: "Industry-leading SMS & voice platform. Global reach, reliable delivery.",
    docsUrl: "https://www.twilio.com/docs/sms",
    fields: [
      { key: "accountSid", label: "Account SID", placeholder: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" },
      { key: "authToken",  label: "Auth Token",  placeholder: "your_auth_token", secret: true },
      { key: "fromNumber", label: "From Number", placeholder: "+1234567890" },
    ],
  },
  {
    key: "msg91",
    name: "MSG91",
    logo: "🟠",
    description: "India's top OTP & transactional SMS provider. Ideal for Indian numbers.",
    docsUrl: "https://docs.msg91.com/",
    fields: [
      { key: "authKey",    label: "Auth Key",    placeholder: "your_msg91_auth_key", secret: true },
      { key: "templateId", label: "Template ID", placeholder: "Template ID from MSG91 panel" },
      { key: "senderId",   label: "Sender ID",   placeholder: "AUTBOT" },
    ],
  },
  {
    key: "fast2sms",
    name: "Fast2SMS",
    logo: "🟡",
    description: "Affordable Indian SMS gateway with DLT-registered sender IDs.",
    docsUrl: "https://www.fast2sms.com/docs",
    fields: [
      { key: "apiKey", label: "API Key", placeholder: "your_fast2sms_api_key", secret: true },
      { key: "senderId", label: "Sender ID", placeholder: "AUTBTS" },
    ],
  },
  {
    key: "textlocal",
    name: "Textlocal",
    logo: "🟢",
    description: "UK-based SMS provider. Good for UK & European numbers.",
    docsUrl: "https://api.textlocal.in/docs",
    fields: [
      { key: "apiKey",   label: "API Key",   placeholder: "your_textlocal_api_key", secret: true },
      { key: "sender",   label: "Sender",    placeholder: "TXTLCL" },
    ],
  },
  {
    key: "custom",
    name: "Custom / Self-hosted",
    logo: "⚙️",
    description: "Use your own SMS gateway or a provider not listed above via a custom webhook.",
    docsUrl: "#",
    fields: [
      { key: "webhookUrl",   label: "Webhook URL",    placeholder: "https://your-sms-api.com/send" },
      { key: "apiKey",       label: "API Key / Token", placeholder: "Bearer token or API key", secret: true },
      { key: "phoneParam",   label: "Phone Param Name", placeholder: "to" },
      { key: "messageParam", label: "Message Param Name", placeholder: "message" },
    ],
  },
];

type FieldValues = Record<string, string>;

export default function OtpSettingsPage() {
  const [selected, setSelected] = useState<ProviderKey>("msg91");
  const [fieldValues, setFieldValues] = useState<Record<ProviderKey, FieldValues>>({
    twilio: {}, msg91: {}, fast2sms: {}, textlocal: {}, custom: {},
  });
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [otpLength, setOtpLength] = useState("6");
  const [otpExpiry, setOtpExpiry] = useState("10");
  const [maxAttempts, setMaxAttempts] = useState("3");
  const [testPhone, setTestPhone] = useState("");
  const [testStatus, setTestStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const provider = PROVIDERS.find(p => p.key === selected)!;
  const values = fieldValues[selected];

  const setField = (key: string, val: string) => {
    setFieldValues(prev => ({
      ...prev,
      [selected]: { ...prev[selected], [key]: val }
    }));
  };

  const toggleSecret = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaveStatus("saving");
    // Simulate API call — replace with real fetch to /api/admin/settings/otp
    await new Promise(r => setTimeout(r, 1200));
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 3000);
  };

  const handleTestOtp = async () => {
    if (!testPhone) return;
    setTestStatus("sending");
    // Simulate OTP send — replace with real fetch
    await new Promise(r => setTimeout(r, 2000));
    setTestStatus("success");
    setTimeout(() => setTestStatus("idle"), 4000);
  };

  return (
    <div className="max-w-5xl mx-auto">

      {/* Page Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-1 flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <MessageSquare className="w-6 h-6" />
            </div>
            OTP Provider Settings
          </h1>
          <p className="text-slate-500 font-medium">Configure SMS delivery for login verification codes.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saveStatus === "saving"}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-md shadow-indigo-200 transition-all disabled:opacity-70 text-sm"
        >
          {saveStatus === "saving" ? (
            <><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</>
          ) : saveStatus === "saved" ? (
            <><CheckCircle2 className="w-4 h-4 text-green-300" /> Saved!</>
          ) : (
            <><Save className="w-4 h-4" /> Save Settings</>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT — Provider Picker */}
        <div className="lg:col-span-1 space-y-3">
          <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest px-1 mb-3">Select Provider</p>
          {PROVIDERS.map(p => (
            <button
              key={p.key}
              onClick={() => setSelected(p.key)}
              className={`w-full text-left flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all font-medium text-sm ${
                selected === p.key
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200"
                  : "bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
              }`}
            >
              <span className="text-xl">{p.logo}</span>
              <div className="flex-1">
                <span className="font-bold block">{p.name}</span>
                {selected === p.key && (
                  <span className="text-indigo-200 text-xs">Currently selected</span>
                )}
              </div>
              {selected === p.key && <CheckCircle2 className="w-4 h-4 text-indigo-200" />}
            </button>
          ))}
        </div>

        {/* RIGHT — Config Panel */}
        <div className="lg:col-span-2 space-y-5">

          {/* Provider Info Banner */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
            <span className="text-4xl">{provider.logo}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-extrabold text-slate-900">{provider.name}</h2>
                <a
                  href={provider.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-500 flex items-center gap-1 hover:underline font-bold"
                >
                  <Link2 className="w-3 h-3" /> Docs
                </a>
              </div>
              <p className="text-sm text-slate-500">{provider.description}</p>
            </div>
          </div>

          {/* API Credentials */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <Key className="w-4 h-4 text-slate-400" />
              <h3 className="font-extrabold text-slate-800 text-sm">API Credentials</h3>
            </div>
            <div className="p-6 space-y-4">
              {provider.fields.map(field => (
                <div key={field.key}>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    {field.label}
                  </label>
                  <div className="relative">
                    <input
                      type={field.secret && !showSecrets[field.key] ? "password" : "text"}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-mono focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all pr-12"
                      placeholder={field.placeholder}
                      value={values[field.key] || ""}
                      onChange={e => setField(field.key, e.target.value)}
                      autoComplete="off"
                    />
                    {field.secret && (
                      <button
                        type="button"
                        onClick={() => toggleSecret(field.key)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showSecrets[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* OTP Behaviour */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <Globe className="w-4 h-4 text-slate-400" />
              <h3 className="font-extrabold text-slate-800 text-sm">OTP Behaviour</h3>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">OTP Length</label>
                <div className="relative">
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-bold appearance-none focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={otpLength}
                    onChange={e => setOtpLength(e.target.value)}
                  >
                    <option value="4">4 digits</option>
                    <option value="6">6 digits</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Expiry (minutes)</label>
                <input
                  type="number"
                  min={1} max={60}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={otpExpiry}
                  onChange={e => setOtpExpiry(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Max Attempts</label>
                <input
                  type="number"
                  min={1} max={10}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={maxAttempts}
                  onChange={e => setMaxAttempts(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Test OTP */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <Send className="w-4 h-4 text-slate-400" />
              <h3 className="font-extrabold text-slate-800 text-sm">Send Test OTP</h3>
            </div>
            <div className="p-6">
              <p className="text-xs text-slate-500 mb-4 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Save your settings first, then send a test to verify the integration works.
              </p>
              <div className="flex gap-3">
                <input
                  type="tel"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="+91 98765 43210"
                  value={testPhone}
                  onChange={e => setTestPhone(e.target.value)}
                />
                <button
                  onClick={handleTestOtp}
                  disabled={!testPhone || testStatus === "sending"}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all ${
                    testStatus === "success"
                      ? "bg-emerald-500 text-white"
                      : testStatus === "error"
                      ? "bg-red-500 text-white"
                      : "bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-50"
                  }`}
                >
                  {testStatus === "sending" ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" /> Sending…</>
                  ) : testStatus === "success" ? (
                    <><CheckCircle2 className="w-4 h-4" /> Sent!</>
                  ) : testStatus === "error" ? (
                    <><XCircle className="w-4 h-4" /> Failed</>
                  ) : (
                    <><Zap className="w-4 h-4" /> Send Test</>
                  )}
                </button>
              </div>
              {testStatus === "success" && (
                <p className="text-xs text-emerald-600 font-bold mt-2 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> OTP delivered successfully to {testPhone}
                </p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
