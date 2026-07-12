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
        
        <Link href="/solo/jobcards/new" className="flex flex-col items-center justify-center w-full h-full bg-orange-500 text-white hover:bg-orange-600 transition-colors">
           <Plus className="w-8 h-8" />
        </Link>
        
        <Link href="/solo/vehicles" className="flex flex-col items-center justify-center w-full h-full hover:text-white transition-colors">
          <Car className="h-6 w-6" />
        </Link>
        
        <Link href="/solo/settings" className="flex flex-col items-center justify-center w-full h-full hover:text-white transition-colors">
          <Settings className="h-6 w-6" />
        </Link>
      </div>
    </nav>
  );
}
