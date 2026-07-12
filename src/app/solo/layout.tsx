"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ClipboardList, Car, Settings, Plus } from "lucide-react";
import { BottomNav } from "./BottomNav";

export default function SoloLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "";
  const isAuthRoute = pathname.includes("/solo/login") || pathname.includes("/solo/register") || pathname.includes("/solo/setup");

  if (isAuthRoute) {
    return (
      <main className="flex flex-col min-h-screen font-outfit">
        {children}
      </main>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 print:bg-white pb-16 print:pb-0 font-outfit">
      {/* Main Content Area */}
      <main className="flex-1 w-full overflow-y-auto">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
