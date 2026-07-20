import { Bell, Search, Plus, Users, CalendarClock, Wrench } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import Image from "next/image";
import NotificationBell from "@/components/NotificationBell";
import ProfileDropdown from "@/components/ProfileDropdown";
import SortFilterBar from "@/components/ui/SortFilterBar";
import { formatDate } from "@/lib/dateUtils";

export default async function SoloDashboardPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const params = await searchParams;
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
    where: { tenantId, status: { not: "closed" } }
  });
  
  const awaitingOk = await prisma.jobCard.count({
    where: { tenantId, status: "waiting_for_approval" }
  });

  const readyJobs = await prisma.jobCard.count({
    where: { tenantId, status: "ready_for_delivery" }
  });

  const sortParam = params.sort || 'date-desc';
  const filterParam = params.filter || 'all';

  let orderBy: any = { createdAt: "desc" };
  if (sortParam === 'date-asc') orderBy = { createdAt: 'asc' };
  else if (sortParam === 'date-desc') orderBy = { createdAt: 'desc' };
  else if (sortParam === 'name-asc') orderBy = { customer: { displayName: 'asc' } };
  else if (sortParam === 'name-desc') orderBy = { customer: { displayName: 'desc' } };

  let whereClause: any = { tenantId };
  if (filterParam !== 'all') {
    whereClause.status = filterParam;
  }

  const rawJobs = await prisma.jobCard.findMany({
    where: whereClause,
    orderBy,
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
    opened: formatDate(job.createdAt),
    due: formatDate(job.expectedDeliveryAt),
    completed: formatDate(job.closedAt)
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
        <div className="flex items-center gap-4">
          <Link href="/solo/jobcards/new" className="bg-orange-500 hover:bg-orange-600 text-white p-3 rounded-xl flex items-center justify-center transition-colors shadow-lg">
            <Plus className="w-6 h-6" />
          </Link>
          <NotificationBell />
          
          <ProfileDropdown userInitials={userInitials} profilePhotoUrl={user?.profilePhotoUrl} />
        </div>
      </div>

      <div className="max-w-lg mx-auto w-full px-4 -mt-6 space-y-6">
        
        {/* Metric Boxes */}
        <div className="grid grid-cols-3 gap-3">
          <Link href="/solo/jobcards?status=open" className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 flex flex-col items-center hover:border-blue-500 transition-colors">
            <span className="text-3xl font-black text-gray-900 mb-1">{openJobs}</span>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">Open Jobs</span>
          </Link>
          <Link href="/solo/jobcards?status=waiting_for_approval" className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 flex flex-col items-center hover:border-orange-500 transition-colors">
            <span className="text-3xl font-black text-orange-500 mb-1">{awaitingOk}</span>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">Awaiting OK</span>
          </Link>
          <Link href="/solo/jobcards?status=ready_for_delivery" className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 flex flex-col items-center hover:border-emerald-500 transition-colors">
            <span className="text-3xl font-black text-emerald-600 mb-1">{readyJobs}</span>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">Ready</span>
          </Link>
        </div>

        {/* Quick Action Icons */}
        <div className="grid grid-cols-4 gap-2 pt-2">
          <Link href="/solo/jobcards/new" className="bg-white rounded-xl p-3 shadow-sm border border-gray-200 flex flex-col items-center hover:border-orange-500 transition-colors">
            <div className="bg-orange-100 p-2 rounded-full mb-2">
              <Plus className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wide text-center leading-tight">New Job</span>
          </Link>
          <Link href="/solo/vehicles/service-due" className="bg-white rounded-xl p-3 shadow-sm border border-gray-200 flex flex-col items-center hover:border-blue-500 transition-colors">
            <div className="bg-blue-100 p-2 rounded-full mb-2">
              <Wrench className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wide text-center leading-tight">Service Due</span>
          </Link>
          <Link href="/solo/bookings" className="bg-white rounded-xl p-3 shadow-sm border border-gray-200 flex flex-col items-center hover:border-emerald-500 transition-colors">
            <div className="bg-emerald-100 p-2 rounded-full mb-2">
              <CalendarClock className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wide text-center leading-tight">Bookings</span>
          </Link>
          <Link href="/solo/employees" className="bg-white rounded-xl p-3 shadow-sm border border-gray-200 flex flex-col items-center hover:border-purple-500 transition-colors relative">
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm border border-white">
              Staff Only
            </div>
            <div className="bg-purple-100 p-2 rounded-full mb-2">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wide text-center leading-tight">Staff</span>
          </Link>
        </div>

        {/* Section Header */}
        <div className="pt-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Recent Job Cards</h2>
          </div>
          
          <div className="mb-4">
            <SortFilterBar 
              sortOptions={[
                { label: 'Newest First', value: 'date-desc' },
                { label: 'Oldest First', value: 'date-asc' },
                { label: 'Customer A-Z', value: 'name-asc' },
                { label: 'Customer Z-A', value: 'name-desc' }
              ]}
              filterOptions={[
                { label: 'All Statuses', value: 'all' },
                { label: 'Open', value: 'open' },
                { label: 'Waiting Approval', value: 'waiting_for_approval' },
                { label: 'Ready', value: 'ready_for_delivery' },
                { label: 'Closed', value: 'closed' }
              ]}
            />
          </div>
          
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
                    opened {job.opened} &bull; {(job.status === 'closed' || job.status === 'ready_for_delivery') ? `completed ${job.completed || '-'}` : `due ${job.due || '-'}`}
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
