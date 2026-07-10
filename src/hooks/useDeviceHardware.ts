"use client";

import { useState, useCallback } from "react";

export function useDeviceHardware() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [audioError, setAudioError] = useState<string | null>(null);

  // --- CAMERA / PHOTO CAPTURE ---
  // In a PWA, the most reliable way to access the camera cross-platform
  // without asking for constant getUserMedia permissions is via the file input.
  const capturePhoto = useCallback((): Promise<File | null> => {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.capture = "environment"; // Forces rear camera on mobile

      input.onchange = (e) => {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
          resolve(target.files[0]);
        } else {
          resolve(null);
        }
      };

      input.oncancel = () => resolve(null);
      input.click();
    });
  }, []);

  // --- MICROPHONE / SPEECH TO TEXT ---
  const startVoiceDictation = useCallback(() => {
    // @ts-ignore - Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setAudioError("Speech Recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    
    // Automatically use the device's default language
    recognition.lang = navigator.language || 'en-US';

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const result = event.results[current][0].transcript;
      setTranscript(result);
    };

    recognition.onerror = (event: any) => {
      setAudioError(event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();

    return () => {
      recognition.stop();
    };
  }, []);

  // --- MEMORY / CACHE ---
  const saveToLocalMemory = useCallback((key: string, data: any) => {
    try {
      localStorage.setItem(`solo_mem_${key}`, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error("Local memory full", e);
      return false;
    }
  }, []);

  const getFromLocalMemory = useCallback((key: string) => {
    const data = localStorage.getItem(`solo_mem_${key}`);
    return data ? JSON.parse(data) : null;
  }, []);

  return {
    capturePhoto,
    startVoiceDictation,
    isListening,
    transcript,
    audioError,
    saveToLocalMemory,
    getFromLocalMemory
  };
}
