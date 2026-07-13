"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ClipboardList, Car, Users } from "lucide-react";
import { BottomNav } from "./BottomNav";
import { TopNav } from "./TopNav"; // Can be adapted or kept as is, but we'll put it inside the screen

export default function SoloLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "";
  const isAuthRoute = pathname.includes("/solo/login") || pathname.includes("/solo/register") || pathname.includes("/solo/setup");

  if (isAuthRoute) {
    return (
      <main className="flex flex-col min-h-screen">
        {children}
      </main>
    );
  }

  return (
    <div className="stage">
      <div className="frame">
        <div className="screen">
          {/* Tablet/Desktop Rail */}
          <div className="rail">
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
