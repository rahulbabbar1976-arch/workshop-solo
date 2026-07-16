import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import Link from "next/link";
import dayjs from "dayjs";
import { ArrowLeft, MapPin, Phone, MessageCircle, ArrowDownUp } from "lucide-react";

export default async function ServiceDuePage({ searchParams }: { searchParams: Promise<{ sort?: string }> }) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('workshop_user_id')?.value;
  const { sort } = await searchParams;
  const sortOrder = sort === 'desc' ? 'desc' : 'asc';
  
  let tenantId: string | null = null;
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    tenantId = user?.tenantId || null;
  }

  const twoYearsAgo = dayjs().subtract(2, 'year').toDate();

  // Get vehicles where nextServiceDate or nextOilChangeDate is set, ordered by nextServiceDate
  // Exclude those due more than 2 years ago
  const vehicles = await prisma.vehicle.findMany({
    where: {
      tenantId: tenantId || undefined,
      OR: [
        { nextServiceDate: { gte: twoYearsAgo } },
        { nextOilChangeDate: { gte: twoYearsAgo } }
      ]
    },
    include: {
      currentCustomer: true,
      jobCards: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    },
    orderBy: {
      nextServiceDate: sortOrder
    },
    take: 100
  });

  return (
    <div className="content bg-gray-100 min-h-screen pb-32">
      <div className="bg-orange-500 px-5 pt-8 pb-4 shadow-sm relative z-10 flex flex-col">
        <div className="flex items-center mb-3">
          <Link href="/solo/reports" className="mr-3 p-2 -ml-2 hover:bg-orange-600 rounded-full transition-colors text-white">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wider">Service Due</h1>
            <p className="text-orange-100 text-sm">Vehicles requiring attention</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Link 
            href={`/solo/reports/service-due?sort=${sortOrder === 'asc' ? 'desc' : 'asc'}`} 
            className="flex items-center px-3 py-1.5 bg-orange-600 text-white text-sm font-bold rounded-lg shadow-sm hover:bg-orange-700 transition-colors border border-orange-400"
          >
            <ArrowDownUp className="w-4 h-4 mr-2" /> Sort Date ({sortOrder === 'asc' ? 'Ascending' : 'Descending'})
          </Link>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {vehicles.length === 0 ? (
          <div className="text-center p-8 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-500">No vehicles have upcoming service dates set within the last 2 years.</p>
          </div>
        ) : (
          vehicles.map(v => {
            const nextDate = v.nextServiceDate || v.nextOilChangeDate;
            const lastJobCard = v.jobCards?.[0];
            const lastServiceDate = lastJobCard ? dayjs(lastJobCard.createdAt).format("MMM DD, YYYY") : "Unknown";
            const nextServiceDateStr = nextDate ? dayjs(nextDate).format("MMM DD, YYYY") : "Unknown";
            
            const message = `Hello ${v.currentCustomer?.displayName},\n\nThis is a friendly reminder from our workshop that your vehicle (${v.registrationNumberNormalized}) is due for service.\n\nLast Service: ${lastServiceDate}\nNext Service Due: ${nextServiceDateStr}\n\nPlease contact us to book an appointment!`;
            const waUrl = `https://wa.me/91${v.currentCustomer?.primaryMobile}?text=${encodeURIComponent(message)}`;

            return (
              <div key={v.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <Link href={`/solo/vehicles/${v.id}`} className="text-lg font-bold text-gray-900 hover:text-orange-500 transition-colors">
                      {v.registrationNumberNormalized || v.registrationNumberRaw}
                    </Link>
                    <div className="text-sm text-gray-500">{v.manufacturer} {v.model}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-orange-600">
                      {nextDate ? dayjs(nextDate).format("MMM DD, YYYY") : "No Date"}
                    </div>
                    <div className="text-xs text-gray-400 font-mono mt-1">Next Service</div>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-3 mt-3 flex justify-between items-end">
                  <div>
                    <div className="text-sm font-bold text-gray-800">{v.currentCustomer?.displayName}</div>
                    <div className="text-sm text-gray-600 flex items-center mt-1">
                      <Phone className="w-4 h-4 mr-2 text-gray-400" />
                      {v.currentCustomer?.primaryMobile || "No Mobile"}
                    </div>
                  </div>
                  {v.currentCustomer?.primaryMobile && (
                    <a 
                      href={waUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center px-3 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-sm font-bold border border-green-200 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4 mr-1.5" /> Remind
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
