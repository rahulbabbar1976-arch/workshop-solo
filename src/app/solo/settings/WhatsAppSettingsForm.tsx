"use client";

import { useState, useEffect } from "react";
import { Save, MessageCircle, Info } from "lucide-react";
import { getWhatsAppSettingsAction, saveWhatsAppSettingsAction } from "./actions";

export default function WhatsAppSettingsForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [formData, setFormData] = useState({
    whatsappMethod: "click_to_chat",
    whatsappServiceDueTemplate: "Hi {{customer_name}}, your vehicle {{vehicle_no}} is due for its regular service. Please book an appointment with us.",
    whatsappJobcardIntakeTemplate: "Hi {{customer_name}}, a jobcard has been created for your vehicle {{vehicle_no}} at our workshop.",
    whatsappEstimateApprovalTemplate: "Hi {{customer_name}}, the repair estimate for your vehicle {{vehicle_no}} is ready. The estimated amount is {{amount}}. Please approve to proceed.",
    whatsappReadyForDeliveryTemplate: "Hi {{customer_name}}, your vehicle {{vehicle_no}} is ready for delivery!",
    whatsappInvoiceTemplate: "Hi {{customer_name}}, your vehicle {{vehicle_no}} has been serviced. The total invoice amount is {{amount}}.",
    whatsappCustomTemplate: ""
  });

  useEffect(() => {
    async function load() {
      try {
        const settings = await getWhatsAppSettingsAction();
        if (settings) {
          setFormData({
            whatsappMethod: settings.whatsappMethod || "click_to_chat",
            whatsappServiceDueTemplate: settings.whatsappServiceDueTemplate || formData.whatsappServiceDueTemplate,
            whatsappJobcardIntakeTemplate: settings.whatsappJobcardIntakeTemplate || formData.whatsappJobcardIntakeTemplate,
            whatsappEstimateApprovalTemplate: settings.whatsappEstimateApprovalTemplate || formData.whatsappEstimateApprovalTemplate,
            whatsappReadyForDeliveryTemplate: settings.whatsappReadyForDeliveryTemplate || formData.whatsappReadyForDeliveryTemplate,
            whatsappInvoiceTemplate: settings.whatsappInvoiceTemplate || formData.whatsappInvoiceTemplate,
            whatsappCustomTemplate: settings.whatsappCustomTemplate || ""
          });
        }
      } catch (e: any) {
        console.error("WhatsAppSettings Error:", e);
        setMessage({ type: "error", text: "Failed to load WhatsApp settings: " + (e.message || String(e)) });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await saveWhatsAppSettingsAction(formData);
      setMessage({ type: "success", text: "WhatsApp templates saved successfully!" });
    } catch (e: any) {
      setMessage({ type: "error", text: e.message || "Failed to save settings." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 text-center text-gray-500">Loading templates...</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
      <div className="bg-green-500 px-5 py-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center">
          <MessageCircle className="w-5 h-5 mr-2" /> WhatsApp Settings & Templates
        </h2>
      </div>

      <div className="p-5">
        {message && (
          <div className={`mb-4 p-3 rounded-lg text-sm flex items-center ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            <Info className="w-4 h-4 mr-2" /> {message.text}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">WhatsApp Sending Method</label>
            <select
              name="whatsappMethod"
              value={formData.whatsappMethod}
              onChange={handleChange}
              className="w-full p-3 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
            >
              <option value="click_to_chat">Click-to-Chat (wa.me) - Opens WhatsApp App/Web (Free)</option>
              <option value="cloud_api">WhatsApp Cloud API (Requires Meta Business Account & API Key)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Currently, Click-to-Chat is recommended as it requires no setup.</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600 mb-4">
            <strong>Supported Variables:</strong> <code>{"{{customer_name}}"}</code>, <code>{"{{vehicle_no}}"}</code>, <code>{"{{amount}}"}</code>, <code>{"{{date}}"}</code>, <code>{"{{jobcard_no}}"}</code>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Service Due Reminder</label>
              <textarea
                name="whatsappServiceDueTemplate"
                value={formData.whatsappServiceDueTemplate}
                onChange={handleChange}
                rows={3}
                className="w-full p-3 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Jobcard Intake</label>
              <textarea
                name="whatsappJobcardIntakeTemplate"
                value={formData.whatsappJobcardIntakeTemplate}
                onChange={handleChange}
                rows={3}
                className="w-full p-3 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Estimate Approval Request</label>
              <textarea
                name="whatsappEstimateApprovalTemplate"
                value={formData.whatsappEstimateApprovalTemplate}
                onChange={handleChange}
                rows={3}
                className="w-full p-3 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Ready for Delivery</label>
              <textarea
                name="whatsappReadyForDeliveryTemplate"
                value={formData.whatsappReadyForDeliveryTemplate}
                onChange={handleChange}
                rows={3}
                className="w-full p-3 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Invoice / Final Bill</label>
              <textarea
                name="whatsappInvoiceTemplate"
                value={formData.whatsappInvoiceTemplate}
                onChange={handleChange}
                rows={3}
                className="w-full p-3 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Custom Message (Default Fallback)</label>
              <textarea
                name="whatsappCustomTemplate"
                value={formData.whatsappCustomTemplate}
                onChange={handleChange}
                rows={3}
                className="w-full p-3 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg flex items-center transition-colors disabled:opacity-50">
              <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save Templates"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
