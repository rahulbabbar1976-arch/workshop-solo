"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ClipboardList, Car, Users, Plus } from "lucide-react";

export function BottomNav() {
  const pathname = usePathname() || "";
  
  if (pathname.includes("/solo/login") || pathname.includes("/solo/register") || pathname.includes("/solo/setup")) {
    return null;
  }
  return (
    <div className="bottomnav">
      <Link href="/solo/dashboard" className={`navitem ${pathname === '/solo/dashboard' ? 'active' : ''}`}>
        <Home className="h-6 w-6 mb-1" />
        Home
      </Link>
      
      <Link href="/solo/jobcards" className={`navitem ${pathname.includes('/solo/jobcards') ? 'active' : ''}`}>
        <ClipboardList className="h-6 w-6 mb-1" />
        Tickets
      </Link>
      
      <Link href="/solo/jobcards/new" className="navitem" style={{ color: 'var(--amber)' }}>
         <Plus className="w-8 h-8" />
         New
      </Link>
      
      <Link href="/solo/vehicles" className={`navitem ${pathname.includes('/solo/vehicles') ? 'active' : ''}`}>
        <Car className="h-6 w-6 mb-1" />
        Vehicles
      </Link>
      
      <Link href="/solo/customers" className={`navitem ${pathname.includes('/solo/customers') ? 'active' : ''}`}>
        <Users className="h-6 w-6 mb-1" />
        Clients
      </Link>
    </div>
  );
}
