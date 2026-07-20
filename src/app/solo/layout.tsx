"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, ClipboardList, Car, Users, Package, Wrench, User, BarChart, Calendar, Settings, LogOut } from "lucide-react";
import { BottomNav } from "./BottomNav";
import { TopNav } from "./TopNav"; // Can be adapted or kept as is, but we'll put it inside the screen
import { ShieldAlert } from "lucide-react";

export default function SoloLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const isAuthRoute = pathname.includes("/solo/login") || pathname.includes("/solo/register") || pathname.includes("/solo/setup");

  if (isAuthRoute) {
    return (
      <main className="flex flex-col min-h-screen">
        {children}
      </main>
    );
  }

  const handleLogout = async () => {
    document.cookie = "workshop_user_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push("/solo/login");
  };

  return (
    <div className="stage">
      <div className="frame">
        <div className="screen">
          {/* Tablet/Desktop Rail */}
          <div className="rail overflow-y-auto custom-scrollbar">
            <div className="railbrand">B</div>
            <Link href="/solo/dashboard" className={`railitem ${pathname === '/solo/dashboard' ? 'active' : ''}`}>
              <Home className="w-6 h-6 mb-1" />
              Home
            </Link>
            <Link href="/solo/jobcards" className={`railitem ${pathname.includes('/solo/jobcards') ? 'active' : ''}`}>
              <ClipboardList className="w-6 h-6 mb-1" />
              Tickets
            </Link>
            <Link href="/solo/vehicles" className={`railitem ${pathname.includes('/solo/vehicles') ? 'active' : ''}`}>
              <Car className="w-6 h-6 mb-1" />
              Vehicles
            </Link>
            <Link href="/solo/customers" className={`railitem ${pathname.includes('/solo/customers') ? 'active' : ''}`}>
              <Users className="w-6 h-6 mb-1" />
              Clients
            </Link>

            <div className="w-8 border-t border-gray-200 my-2 mx-auto"></div>

            <Link href="/solo/inventory/parts" className={`railitem ${pathname.includes('/solo/inventory/parts') ? 'active' : ''}`}>
              <Package className="w-5 h-5 mb-1" />
              <span className="text-[10px]">Parts</span>
            </Link>
            <Link href="/solo/inventory/labor" className={`railitem ${pathname.includes('/solo/inventory/labor') ? 'active' : ''}`}>
              <Wrench className="w-5 h-5 mb-1" />
              <span className="text-[10px]">Labor</span>
            </Link>
            
            <div className="w-8 border-t border-gray-200 my-2 mx-auto"></div>

            <Link href="/solo/bookings" className={`railitem ${pathname.includes('/solo/bookings') ? 'active' : ''}`}>
              <Calendar className="w-5 h-5 mb-1" />
              <span className="text-[10px]">Bookings</span>
            </Link>
            <Link href="/solo/employees" className={`railitem ${pathname.includes('/solo/employees') ? 'active' : ''}`}>
              <Users className="w-5 h-5 mb-1" />
              <span className="text-[10px]">Staff</span>
            </Link>
            <Link href="/solo/roles" className={`railitem ${pathname.includes('/solo/roles') ? 'active' : ''}`}>
              <ShieldAlert className="w-5 h-5 mb-1" />
              <span className="text-[10px]">Roles</span>
            </Link>
            <Link href="/solo/profile" className={`railitem ${pathname === '/solo/profile' ? 'active' : ''}`}>
              <User className="w-5 h-5 mb-1" />
              <span className="text-[10px]">Profile</span>
            </Link>
            <Link href="/solo/reports" className={`railitem ${pathname === '/solo/reports' ? 'active' : ''}`}>
              <BarChart className="w-5 h-5 mb-1" />
              <span className="text-[10px]">Reports</span>
            </Link>
            <Link href="/solo/reports/service-due" className={`railitem ${pathname.includes('/solo/reports/service-due') ? 'active' : ''}`}>
              <Calendar className="w-5 h-5 mb-1" />
              <span className="text-[10px]">Due</span>
            </Link>
            <Link href="/solo/settings" className={`railitem ${pathname.includes('/solo/settings') ? 'active' : ''}`}>
              <Settings className="w-5 h-5 mb-1" />
              <span className="text-[10px]">Settings</span>
            </Link>
            
            <button onClick={handleLogout} className="railitem text-red-500 hover:text-red-600 bg-transparent border-none">
              <LogOut className="w-5 h-5 mb-1" />
              <span className="text-[10px]">Logout</span>
            </button>
          </div>
          
          <div className="tabletmain">
            <TopNav />
            {children}
            <BottomNav />
          </div>
        </div>
      </div>
    </div>
  );
}
