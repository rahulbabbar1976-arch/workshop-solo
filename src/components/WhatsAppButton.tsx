"use client";

import { MessageCircle } from "lucide-react";

interface WhatsAppButtonProps {
  phoneNumber: string | null | undefined;
  message: string;
  method?: string;
  label?: string;
  className?: string;
}

export default function WhatsAppButton({ 
  phoneNumber, 
  message, 
  method = "click_to_chat",
  label = "WhatsApp",
  className = "bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1 rounded-lg flex items-center transition-colors"
}: WhatsAppButtonProps) {
  
  const handleClick = (e: React.MouseEvent) => {
    if (!phoneNumber) {
      alert("No phone number available for this customer.");
      e.preventDefault();
      return;
    }

    if (method === "click_to_chat") {
      // Format number: remove all non-numeric chars. If no country code, default to India (+91) if 10 digits
      let formattedNum = phoneNumber.replace(/\D/g, "");
      if (formattedNum.length === 10) {
        formattedNum = "91" + formattedNum; // Default to India for now
      }
      const url = `https://wa.me/${formattedNum}?text=${encodeURIComponent(message)}`;
      window.open(url, "_blank");
    } else {
      // Cloud API Placeholder
      alert("Cloud API integration is pending credentials setup.");
    }
  };

  return (
    <button onClick={handleClick} className={className} title="Send WhatsApp Message">
      <MessageCircle className="w-5 h-5 " /> {label && <span>{label}</span>}
    </button>
  );
}
