"use client";

import { useState, useEffect } from "react";

export type LocalizationSettings = {
  countryCode: string;
  currency: string;
  currencySymbol: string;
  distanceUnit: "km" | "mi";
  language: string;
  isReady: boolean;
};

const defaultSettings: LocalizationSettings = {
  countryCode: "US",
  currency: "USD",
  currencySymbol: "$",
  distanceUnit: "mi",
  language: "en",
  isReady: false,
};

export function useAutoLocalization() {
  const [settings, setSettings] = useState<LocalizationSettings>(defaultSettings);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if we already have settings in local memory (IndexedDB/localStorage)
    const cached = localStorage.getItem("solo_localization");
    if (cached) {
      setSettings({ ...JSON.parse(cached), isReady: true });
      return;
    }

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setSettings(s => ({ ...s, isReady: true }));
      return;
    }

    // Auto-detect based on GPS coordinates
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          // In a real app, you would pass these coords to a reverse-geocoding API.
          // For this PWA, we will simulate a lightweight timezone-based detection fallback
          // since free geocoding APIs have harsh rate limits on client side.
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          
          let derivedSettings = { ...defaultSettings };

          if (tz.includes("Asia/Kolkata")) {
            derivedSettings = {
              countryCode: "IN",
              currency: "INR",
              currencySymbol: "₹",
              distanceUnit: "km",
              language: "hi", // Hindi or English
              isReady: true,
            };
          } else if (tz.includes("Europe")) {
            derivedSettings = {
              countryCode: "EU",
              currency: "EUR",
              currencySymbol: "€",
              distanceUnit: "km",
              language: "es", // Spanish as default for European example, or check navigator.language
              isReady: true,
            };
          } else if (tz.includes("America")) {
             derivedSettings = {
              countryCode: "US",
              currency: "USD",
              currencySymbol: "$",
              distanceUnit: "mi",
              language: "en",
              isReady: true,
            };
          }

          // Use the browser's exact language preference if available
          if (navigator.language) {
            derivedSettings.language = navigator.language.split('-')[0];
          }

          setSettings(derivedSettings);
          localStorage.setItem("solo_localization", JSON.stringify(derivedSettings));
          
        } catch (err) {
          console.error("Localization failed", err);
          setSettings(s => ({ ...s, isReady: true }));
        }
      },
      (err) => {
        setError(err.message);
        setSettings(s => ({ ...s, isReady: true }));
      }
    );
  }, []);

  return { settings, error };
}
