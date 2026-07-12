"use client";

import { useState } from "react";
import { UserCircle, Upload, CheckCircle } from "lucide-react";
import { uploadAvatarAction } from "@/app/actions/userActions";

export function AvatarUpload() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (e.g. max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage("File is too large. Max 5MB.");
      return;
    }

    setLoading(true);
    setMessage("");

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        // Resize using Canvas to save DB space
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 250;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Convert to Base64 JPEG
        const base64 = canvas.toDataURL("image/jpeg", 0.8);

        try {
          await uploadAvatarAction(base64);
          setMessage("Avatar updated successfully! Refresh to see changes.");
        } catch (error: any) {
          setMessage("Failed to upload avatar.");
        } finally {
          setLoading(false);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-gray-900 rounded-xl shadow-sm border border-gray-700 overflow-hidden text-white">
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <h2 className="font-bold flex items-center tracking-wide uppercase text-orange-500">
          <UserCircle className="w-5 h-5 mr-2" /> Profile Avatar
        </h2>
      </div>
      <div className="p-5">
        <p className="text-sm text-gray-400 mb-4">Upload a profile picture from your camera or local storage.</p>
        
        <label className="flex items-center justify-center w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg uppercase tracking-wider cursor-pointer transition-colors relative overflow-hidden">
          {loading ? "Processing..." : (
            <>
              <Upload className="w-5 h-5 mr-2" /> Select Image
            </>
          )}
          <input 
            type="file" 
            accept="image/*" 
            className="absolute inset-0 opacity-0 cursor-pointer" 
            onChange={handleFileChange}
            disabled={loading}
          />
        </label>
        
        {message && (
          <div className="mt-4 flex items-center text-sm font-medium text-emerald-400">
            <CheckCircle className="w-4 h-4 mr-2" /> {message}
          </div>
        )}
      </div>
    </div>
  );
}
