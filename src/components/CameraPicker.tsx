"use client";

import React, { useState, useEffect, useRef } from "react";
import { Camera, Upload, Image as ImageIcon, Loader2 } from "lucide-react";

interface CameraPickerProps {
  onPhotosSelected: (files: File[]) => void;
  label?: string;
  className?: string;
  isUploading?: boolean;
  multiple?: boolean;
}

export function CameraPicker({
  onPhotosSelected,
  label,
  className = "",
  isUploading = false,
  multiple = true,
}: CameraPickerProps) {
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Detect mobile or tablet device
    const checkDevice = () => {
      if (typeof window === "undefined") return false;
      const ua = navigator.userAgent || "";
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
      const isTouch = navigator.maxTouchPoints > 0;
      return isMobile || (isTouch && window.innerWidth <= 1024);
    };
    setIsMobileOrTablet(checkDevice());
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      onPhotosSelected(selectedFiles);
      // Reset input value so the same file can be selected again
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const triggerPicker = () => {
    if (inputRef.current) {
      inputRef.current.click();
    }
  };

  return (
    <div className={`inline-block ${className}`}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={isMobileOrTablet ? false : multiple}
        // Direct rear camera capture on mobile & tablet
        capture={isMobileOrTablet ? "environment" : undefined}
        onChange={handleChange}
        className="hidden"
      />

      <button
        type="button"
        onClick={triggerPicker}
        disabled={isUploading}
        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-medium text-sm rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isUploading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isMobileOrTablet ? (
          <Camera className="w-4 h-4" />
        ) : (
          <Upload className="w-4 h-4" />
        )}
        <span>
          {label || (isMobileOrTablet ? "Take Photo (Rear Camera)" : "Upload Vehicle Photos")}
        </span>
      </button>
    </div>
  );
}
