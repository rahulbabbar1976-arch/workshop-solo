"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ClipboardList, Car, Settings, Plus } from "lucide-react";

export function BottomNav() {
  const pathname = usePathname() || "";
  
  // Hide nav on login, register, and setup pages
  if (pathname.includes("/solo/login") || pathname.includes("/solo/register") || pathname.includes("/solo/setup")) {
    return null;
  }
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 text-gray-400 z-50 print:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-center h-[70px]">
        <Link href="/solo/dashboard" className="flex flex-col items-center justify-center w-full h-full hover:text-white transition-colors">
          <Home className="h-6 w-6" />
        </Link>
        
        <Link href="/solo/jobcards" className="flex flex-col items-center justify-center w-full h-full hover:text-white transition-colors">
          <ClipboardList className="h-6 w-6" />
        </Link>
        
        <div className="w-16"></div> {/* Spacer for FAB */}
        
        <Link href="/solo/vehicles" className="flex flex-col items-center justify-center w-full h-full hover:text-white transition-colors">
          <Car className="h-6 w-6" />
        </Link>
        
        <Link href="/solo/settings" className="flex flex-col items-center justify-center w-full h-full hover:text-white transition-colors">
          <Settings className="h-6 w-6" />
        </Link>
      </div>

      <div className="absolute left-1/2 -top-6 -translate-x-1/2">
        <Link href="/solo/jobcards/new" className="flex items-center justify-center w-14 h-14 rounded-full bg-orange-500 shadow-[0_4px_15px_rgba(249,115,22,0.4)] text-white hover:bg-orange-600 transition-transform active:scale-95">
           <Plus className="w-8 h-8" />
        </Link>
      </div>
    </nav>
  );
}
