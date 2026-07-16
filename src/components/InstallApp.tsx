"use client";

import { useState, useEffect } from "react";
import { Download, Share, PlusSquare } from "lucide-react";

export function InstallApp() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
      return;
    }

    // Check for iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  if (isStandalone) {
    return null; // Already installed
  }

  return (
    <div className="mt-8 pt-6 border-t border-gray-800 text-center">
      <h3 className="text-gray-400 text-sm font-medium mb-4 uppercase tracking-wider">Get the App</h3>
      
      {deferredPrompt ? (
        <button
          onClick={handleInstallClick}
          type="button"
          className="mx-auto flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-full text-sm font-medium transition-colors"
        >
          <Download className="w-4 h-4" />
          Install Workshop App
        </button>
      ) : isIOS ? (
        <div className="text-left text-sm text-gray-400 bg-gray-900/50 p-4 rounded-xl border border-gray-800 flex flex-col gap-2">
          <p className="flex items-center gap-2 text-white font-medium">
            <Download className="w-4 h-4 text-blue-500" />
            Install on iOS
          </p>
          <p className="text-xs">
            1. Tap the <Share className="w-3 h-3 inline mx-1" /> Share button below
          </p>
          <p className="text-xs">
            2. Scroll down and tap <PlusSquare className="w-3 h-3 inline mx-1" /> &quot;Add to Home Screen&quot;
          </p>
        </div>
      ) : (
        <p className="text-xs text-gray-500">
          Open this page on your mobile device to install the app.
        </p>
      )}
    </div>
  );
}
