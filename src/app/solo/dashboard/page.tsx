import { ClipboardList, PlusCircle, Car, TrendingUp, AlertCircle, Clock, Search, ChevronRight, Zap, Menu } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

export default async function SoloDashboardPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('workshop_user_id')?.value;
  
  let tenantId: string | null = null;
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    tenantId = user?.tenantId || null;
  }

  // Fetch real stats
  const activeJobs = await prisma.jobCard.count({
    where: { tenantId: tenantId || undefined, status: "IN_PROGRESS" }
  });
  
  const pendingEstimates = await prisma.jobCard.count({
    where: { tenantId: tenantId || undefined, status: "WAITING_FOR_ESTIMATE" }
  });

  const rawJobs = await prisma.jobCard.findMany({
    where: { tenantId: tenantId || undefined },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      customer: true,
      vehicle: true,
    }
  });

  const stats = {
    activeJobs,
    pendingEstimates,
    todayRevenue: 0, // Requires invoice table logic
  };

  const recentJobs = rawJobs.map(job => ({
    id: job.jobCardNumber,
    customer: job.customer.displayName,
    vehicle: job.vehicle.registrationNumberNormalized || 'UNKNOWN',
    make: job.vehicle.model || 'Unknown',
    status: job.status,
    time: job.createdAt.toLocaleDateString()
  }));

  return (
    <div className="bg-gray-100 min-h-screen pb-24 font-[Outfit]">
      <div className="max-w-lg mx-auto w-full px-6 py-10 space-y-6">
        
        {/* Floating Header Card */}
        <div className="bg-teal-500 rounded-xl shadow-md p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-10 -mt-10 pointer-events-none"></div>
          
          <div className="flex justify-between items-center mb-6 relative z-10">
            <button className="text-white p-1 hover:bg-white/10 rounded-md transition-colors">
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-bold text-white uppercase tracking-wider">Dashboard</h1>
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center text-white text-sm font-bold border border-white/40 shadow-sm">
              RA
            </div>
          </div>

          {/* Revenue Section Inside Header */}
          <div className="bg-teal-600/50 border border-teal-400/50 p-5 rounded-lg text-white shadow-inner flex justify-between items-center relative z-10">
            <div>
              <p className="text-teal-50 text-xs font-semibold mb-1 uppercase tracking-wider flex items-center">
                <TrendingUp className="w-4 h-4 mr-1" /> Today's Revenue
              </p>
              <h2 className="text-3xl font-bold tracking-tight">₹{stats.todayRevenue.toLocaleString()}</h2>
            </div>
            <div className="p-3 bg-amber-400 rounded-full shadow-lg text-white transform hover:scale-105 transition-transform">
              <Zap className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-xl shadow-sm flex flex-col justify-between border-b-4 border-teal-500">
            <div className="flex justify-between items-start mb-3">
              <div className="p-2 bg-teal-50 text-teal-500 rounded-lg">
                <ClipboardList className="h-6 w-6" />
              </div>
              <span className="text-2xl font-bold text-gray-800">{stats.activeJobs}</span>
            </div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Active Jobs</p>
          </div>
          
          <div className="bg-white p-5 rounded-xl shadow-sm flex flex-col justify-between border-b-4 border-amber-400">
            <div className="flex justify-between items-start mb-3">
              <div className="p-2 bg-amber-50 text-amber-500 rounded-lg">
                <AlertCircle className="h-6 w-6" />
              </div>
              <span className="text-2xl font-bold text-gray-800">{stats.pendingEstimates}</span>
            </div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Pending Est.</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/solo/jobcards/new" className="flex flex-col items-center justify-center py-6 px-4 bg-amber-400 hover:bg-amber-500 transition-colors rounded-xl shadow-sm text-center">
            <div className="text-white mb-2">
              <PlusCircle className="h-8 w-8" />
            </div>
            <span className="text-sm font-bold text-white uppercase tracking-wider">New Jobcard</span>
          </Link>
          
          <Link href="/solo/vehicles/new" className="flex flex-col items-center justify-center py-6 px-4 bg-white hover:bg-gray-50 transition-colors rounded-xl shadow-sm text-center border border-gray-100">
            <div className="p-2 bg-teal-50 text-teal-500 rounded-full mb-2">
              <Car className="h-6 w-6" />
            </div>
            <span className="text-sm font-bold text-teal-600 uppercase tracking-wider">Add Vehicle</span>
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <div className="bg-teal-500 px-5 py-4 flex justify-between items-center">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Recent Jobs</h2>
            <Link href="/solo/jobcards" className="text-xs font-bold text-teal-50 bg-teal-600/50 px-3 py-1 rounded-full flex items-center hover:bg-teal-600 transition-colors">
                View All <ChevronRight className="w-3 h-3 ml-1" />
            </Link>
          </div>
          
          <div className="divide-y divide-gray-100">
            {recentJobs.map((job) => (
              <Link key={job.id} href={`/solo/jobcards/${job.id}`} className="block p-5 active:bg-gray-50 transition-colors relative hover:bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-gray-800 text-lg">{job.vehicle}</span>
                  <span className="text-xs font-bold text-teal-600 bg-teal-50 border border-teal-100 px-2 py-1 rounded-md">{job.id}</span>
                </div>
                <div className="text-sm font-medium text-gray-500 mb-4">{job.make} • {job.customer}</div>
                
                <div className="flex justify-between items-center">
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-md ${
                    job.status === "In Progress" ? "bg-teal-100 text-teal-700 border border-teal-200" : "bg-amber-100 text-amber-700 border border-amber-200"
                  }`}>
                    {job.status}
                  </span>
                  <div className="flex items-center text-gray-400 text-xs font-bold">
                    <Clock className="w-4 h-4 mr-1" /> {job.time}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
        
      </div>
    </div>
  );
}
