import Link from "next/link";
import { Home, ClipboardList, Car, Settings, Plus } from "lucide-react";
import { BottomNav } from "./BottomNav";

export default function SoloLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-100 pb-16 font-outfit">
      {/* Main Content Area */}
      <main className="flex-1 w-full overflow-y-auto">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
