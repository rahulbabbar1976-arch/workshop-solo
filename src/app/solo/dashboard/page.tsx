import { Bell, Search, Plus } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import Image from "next/image";
import NotificationBell from "@/components/NotificationBell";

export default async function SoloDashboardPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('workshop_user_id')?.value;
  
  let user = null;
  if (userId) {
    user = await prisma.user.findUnique({ where: { id: userId } });
  }

  const tenantId = user?.tenantId || undefined;

  // Dynamic Greeting based on server time (or client time if hydration is used, but server time is okay for now)
  const hour = new Date().getHours();
  let greeting = "Good morning";
  if (hour >= 12 && hour < 17) greeting = "Good afternoon";
  else if (hour >= 17) greeting = "Good evening";

  // Fetch real stats
  const openJobs = await prisma.jobCard.count({
    where: { tenantId, status: { in: ["open", "in_progress"] } }
  });
  
  const awaitingOk = await prisma.jobCard.count({
    where: { tenantId, status: "waiting_for_approval" }
  });

  const readyJobs = await prisma.jobCard.count({
    where: { tenantId, status: "ready_for_delivery" }
  });

  const rawJobs = await prisma.jobCard.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      customer: true,
      vehicle: true,
    }
  });

  const recentJobs = rawJobs.map(job => ({
    id: job.jobcardNumber || 'UNKNOWN',
    customer: job.customer?.displayName || 'Unknown',
    plate: job.vehicle?.registrationNumberRaw || 'UNKNOWN',
    make: job.vehicle?.model || 'Unknown',
    status: job.status || 'UNKNOWN',
    opened: job.createdAt ? job.createdAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '-',
    due: job.expectedDeliveryAt ? job.expectedDeliveryAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '-'
  }));

  // Avatar Display
  const userInitials = user?.fullName ? user.fullName.substring(0, 2).toUpperCase() : "B";
  const firstName = user?.fullName ? user.fullName.split(' ')[0] : "Rahul";

  return (
    <div className="bg-gray-100 min-h-screen pb-24 font-outfit text-gray-900">
      
      {/* App Bar (Mobile-first, dark theme) */}
      <div className="bg-gray-900 text-white px-6 py-8 pb-10 flex items-center justify-between shadow-lg">
        <div>
          <h1 className="text-2xl font-bold tracking-wide">{greeting}, {firstName}</h1>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
          
          <Link href="/solo/settings" className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center overflow-hidden">
            {user?.profilePhotoUrl ? (
              <Image src={user.profilePhotoUrl} alt="Avatar" width={40} height={40} className="object-cover" />
            ) : (
              <span className="font-bold text-orange-500">{userInitials}</span>
            )}
          </Link>
        </div>
      </div>

      <div className="max-w-lg mx-auto w-full px-4 -mt-6 space-y-6">
        
        {/* Metric Boxes */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 flex flex-col items-center">
            <span className="text-3xl font-black text-gray-900 mb-1">{openJobs}</span>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">Open Jobs</span>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 flex flex-col items-center">
            <span className="text-3xl font-black text-orange-500 mb-1">{awaitingOk}</span>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">Awaiting OK</span>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 flex flex-col items-center">
            <span className="text-3xl font-black text-emerald-600 mb-1">{readyJobs}</span>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">Ready</span>
          </div>
        </div>

        {/* Section Header */}
        <div className="pt-2">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Today's Job Cards</h2>
          
          {/* Ticket Style Cards */}
          <div className="space-y-4">
            {recentJobs.map((job) => (
              <Link href={`/solo/jobcards/${job.id}`} key={job.id} className="block bg-white rounded-2xl p-4 shadow-sm border border-gray-200 hover:border-orange-500 transition-colors">
                
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-xs font-mono text-gray-500 mb-1">{job.id}</div>
                    <div className="text-xl font-mono font-bold tracking-widest text-gray-900">{job.plate}</div>
                    <div className="text-sm text-gray-500 mt-1">{job.make}</div>
                  </div>
                  <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                    job.status === "ready_for_delivery" ? "bg-emerald-100 text-emerald-700" :
                    job.status === "waiting_for_approval" ? "bg-orange-100 text-orange-700" :
                    "bg-blue-100 text-blue-700"
                  }`}>
                    {job.status.replace(/_/g, ' ')}
                  </span>
                </div>
                
                <div className="border-t border-gray-100 pt-3 flex justify-between items-center text-sm">
                  <div className="font-semibold text-gray-900">{job.customer}</div>
                  <div className="text-gray-400 font-mono text-xs">
                    opened {job.opened} &bull; due {job.due}
                  </div>
                </div>

              </Link>
            ))}
            
            {recentJobs.length === 0 && (
              <div className="text-center p-8 bg-white rounded-2xl border border-gray-200">
                <p className="text-gray-500">No active job cards.</p>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
