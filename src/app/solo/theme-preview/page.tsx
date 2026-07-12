"use client";
import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function ThemePreviewPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white">
      {/* App Header / Navigation to go back */}
      <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <Link href="/solo" className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-semibold">Back to Live App</span>
          </Link>
        </div>
        <div>
          <h1 className="text-sm font-bold text-gray-400 uppercase tracking-widest">UI Theme Preview</h1>
        </div>
      </div>

      {/* The Mockup Frame */}
      <div className="flex-1 bg-black">
        <iframe 
          src="/mockup.html" 
          title="Autoshop Minimal SaaS Mockup"
          className="w-full h-full border-none"
        />
      </div>
    </div>
  );
}
