import Link from "next/link";
import { Home, ClipboardList, Car, Settings, Plus } from "lucide-react";

export default function SoloLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-100 pb-16 font-[Outfit]">
      {/* Main Content Area */}
      <main className="flex-1 w-full overflow-y-auto">
        {children}
      </main>

      {/* Flat Bottom Navigation matching the Yellow/Amber design */}
      <nav className="fixed bottom-0 left-0 right-0 bg-amber-400 text-white z-50">
        <div className="flex justify-around items-center h-16">
          
          <Link href="/solo/dashboard" className="flex flex-col items-center justify-center w-full h-full hover:bg-amber-500 transition-colors">
            <Home className="h-6 w-6" />
          </Link>
          
          <Link href="/solo/jobcards" className="flex flex-col items-center justify-center w-full h-full hover:bg-amber-500 transition-colors">
            <ClipboardList className="h-6 w-6" />
          </Link>
          
          {/* Flat Center Action Button */}
          <Link href="/solo/jobcards/new" className="flex flex-col items-center justify-center w-full h-full bg-teal-500 hover:bg-teal-600 transition-colors">
             <Plus className="w-8 h-8 text-white" />
          </Link>
          
          <Link href="/solo/vehicles" className="flex flex-col items-center justify-center w-full h-full hover:bg-amber-500 transition-colors">
            <Car className="h-6 w-6" />
          </Link>
          
          <Link href="/solo/settings" className="flex flex-col items-center justify-center w-full h-full hover:bg-amber-500 transition-colors">
            <Settings className="h-6 w-6" />
          </Link>
        </div>
      </nav>
    </div>
  );
}
