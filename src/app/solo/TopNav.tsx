"use client";

import { useState } from "react";
import Link from "next/link";
import { User, Package, Wrench, Settings, LogOut, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";

export function TopNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    // Basic logout logic
    document.cookie = "workshop_user_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push("/solo/login");
  };

  return (
    <div className="bg-teal-600 text-white shadow-md relative z-50 print:hidden font-outfit">
      <div className="max-w-lg mx-auto w-full px-4 py-3 flex justify-between items-center">
        <Link href="/solo/dashboard" className="font-bold text-lg tracking-wider">
          WORKSHOP
        </Link>
        
        <div className="relative">
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center space-x-2 bg-teal-700/50 hover:bg-teal-700 rounded-full py-1.5 px-3 transition-colors focus:outline-none"
          >
            <div className="w-7 h-7 bg-white text-teal-700 rounded-full flex items-center justify-center font-bold text-sm">
              <User className="w-4 h-4" />
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
          </button>

          {menuOpen && (
            <>
              {/* Overlay to close menu when clicking outside */}
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setMenuOpen(false)}
              ></div>
              
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl overflow-hidden z-50 border border-gray-100 animate-in fade-in slide-in-from-top-2">
                <div className="p-3 border-b border-gray-100 bg-gray-50">
                  <p className="text-sm font-bold text-gray-800">My Profile</p>
                </div>
                <div className="py-1">
                  <Link 
                    href="/solo/inventory/parts" 
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-teal-50 hover:text-teal-700 transition-colors"
                  >
                    <Package className="w-4 h-4 mr-3" /> Parts Master
                  </Link>
                  <Link 
                    href="/solo/inventory/labor" 
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-teal-50 hover:text-teal-700 transition-colors"
                  >
                    <Wrench className="w-4 h-4 mr-3" /> Labor Master
                  </Link>
                  <Link 
                    href="/solo/settings" 
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-teal-50 hover:text-teal-700 transition-colors"
                  >
                    <Settings className="w-4 h-4 mr-3" /> Settings
                  </Link>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4 mr-3" /> Logout
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
