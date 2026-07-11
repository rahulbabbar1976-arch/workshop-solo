import Link from "next/link";
import { Search, Filter, Clock } from "lucide-react";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

export default async function SoloJobcardsPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('workshop_user_id')?.value;
  
  let tenantId: string | null = null;
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    tenantId = user?.tenantId || null;
  }

  const rawJobs = await prisma.jobCard.findMany({
    where: { tenantId: tenantId || undefined },
    orderBy: { createdAt: "desc" },
    include: {
      customer: true,
      vehicle: true,
    }
  });

  const jobs = rawJobs.map(job => ({
    id: job.jobcardNumber,
    customer: job.customer.displayName,
    vehicle: job.vehicle.registrationNumberNormalized || 'UNKNOWN',
    make: job.vehicle.model || 'Unknown',
    status: job.status,
    date: job.createdAt.toLocaleDateString(),
    amount: 0 // Placeholder until invoices are ready
  }));

  return (
    <div className="bg-[#f8fafc] min-h-screen pb-32">
      {/* Premium Header */}
      <div className="bg-white px-5 pt-12 pb-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border-b border-gray-100 relative z-10">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Job Cards</h1>
        </div>

        {/* Search & Filter */}
        <div className="flex space-x-3">
          <div className="relative flex-1 group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-600 text-slate-400">
              <Search className="h-5 w-5" />
            </div>
            <input
              type="text"
              className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all font-medium text-slate-700 placeholder:text-slate-400"
              placeholder="Search reg no or customer..."
              name="searchQuery"
            />
          </div>
          <button className="flex items-center justify-center px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm text-slate-600 hover:bg-slate-100 hover:text-blue-600 active:scale-95 transition-all">
            <Filter className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Job List */}
      <div className="px-5 mt-6 space-y-4 relative z-0">
        {jobs.length === 0 && (
          <div className="text-center py-10 text-slate-500">No job cards found.</div>
        )}
        {jobs.map((job) => (
          <Link key={job.id} href={`/solo/jobcards/${job.id}`} className="block bg-white p-5 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-100 active:scale-[0.98] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-slate-300 transition-all group relative overflow-hidden">
            
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-blue-500 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            <div className="flex justify-between items-start mb-2">
              <div className="flex flex-col">
                <span className="font-extrabold text-slate-900 text-xl tracking-tight">{job.vehicle}</span>
                <span className="text-sm font-bold text-slate-500">{job.make}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs font-extrabold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg mb-1 tracking-wider">
                  {job.id}
                </span>
                <span className="text-xs font-bold text-slate-400 flex items-center">
                   <Clock className="w-3 h-3 mr-1" /> {job.date}
                </span>
              </div>
            </div>
            
            <div className="flex items-center text-sm font-medium text-slate-600 mt-3 mb-4">
               <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mr-3 text-slate-500 font-bold">
                  {job.customer.charAt(0)}
               </div>
               {job.customer}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
              <span className={`text-xs font-extrabold px-3 py-1.5 rounded-xl flex items-center ${
                job.status === "IN_PROGRESS" ? "bg-blue-50 text-blue-700 border border-blue-100" : 
                job.status === "COMPLETED" || job.status === "DELIVERED" ? "bg-green-50 text-green-700 border border-green-100" :
                "bg-amber-50 text-amber-700 border border-amber-100"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full mr-2 ${
                  job.status === "IN_PROGRESS" ? "bg-blue-600" : 
                  job.status === "COMPLETED" || job.status === "DELIVERED" ? "bg-green-500" :
                  "bg-amber-500"
                }`}></span>
                {job.status.replace(/_/g, ' ')}
              </span>
              {job.amount > 0 ? (
                 <span className="text-base font-extrabold text-slate-900 tracking-tight">₹{job.amount.toLocaleString()}</span>
              ) : (
                 <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md">Est. Pending</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
