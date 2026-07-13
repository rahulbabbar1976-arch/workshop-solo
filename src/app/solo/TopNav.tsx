"use client";

import { useState } from "react";
import Link from "next/link";
import { User, Package, Wrench, Settings, LogOut } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

export function TopNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname() || "";

  const handleLogout = async () => {
    document.cookie = "workshop_user_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push("/solo/login");
  };

  let title = "Autobots";
  if (pathname.includes("/solo/dashboard")) title = "Dashboard";
  else if (pathname.includes("/solo/jobcards")) title = "Tickets";
  else if (pathname.includes("/solo/vehicles")) title = "Vehicles";
  else if (pathname.includes("/solo/customers")) title = "Clients";
  else if (pathname.includes("/solo/inventory")) title = "Inventory";

  return (
    <div className="appbar">
      <h1>{title}</h1>
      <div className="relative">
        <div 
          className="avatar cursor-pointer"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          R
        </div>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)}></div>
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl overflow-hidden z-50 border border-gray-100">
              <div className="p-3 border-b border-gray-100 bg-gray-50">
                <p className="text-sm font-bold text-gray-800">My Profile</p>
              </div>
              <div className="py-1">
                <Link href="/solo/inventory/parts" onClick={() => setMenuOpen(false)} className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600">
                  <Package className="w-4 h-4 mr-3" /> Parts Master
                </Link>
                <Link href="/solo/inventory/labor" onClick={() => setMenuOpen(false)} className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600">
                  <Wrench className="w-4 h-4 mr-3" /> Labor Master
                </Link>
                <Link href="/solo/settings" onClick={() => setMenuOpen(false)} className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600">
                  <Settings className="w-4 h-4 mr-3" /> Settings
                </Link>
                <div className="border-t border-gray-100 my-1"></div>
                <button onClick={handleLogout} className="w-full flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 text-left">
                  <LogOut className="w-4 h-4 mr-3" /> Logout
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
