import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import Link from "next/link";
import dayjs from "dayjs";
import { ArrowLeft, MapPin, Phone } from "lucide-react";

export default async function ServiceDuePage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('workshop_user_id')?.value;
  
  let tenantId: string | null = null;
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    tenantId = user?.tenantId || null;
  }

  // Get vehicles where nextServiceDate or nextOilChangeDate is set, ordered by nextServiceDate asc
  const vehicles = await prisma.vehicle.findMany({
    where: {
      tenantId: tenantId || undefined,
      OR: [
        { nextServiceDate: { not: null } },
        { nextOilChangeDate: { not: null } }
      ]
    },
    include: {
      currentCustomer: true
    },
    orderBy: {
      nextServiceDate: 'asc'
    },
    take: 100
  });

  return (
    <div className="content bg-gray-100 min-h-screen pb-32">
      <div className="bg-orange-500 px-5 pt-8 pb-4 shadow-sm relative z-10 flex items-center">
        <Link href="/solo/reports" className="mr-3 p-2 -ml-2 hover:bg-orange-600 rounded-full transition-colors text-white">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white tracking-wider">Service Due</h1>
          <p className="text-orange-100 text-sm">Vehicles requiring attention soon</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {vehicles.length === 0 ? (
          <div className="text-center p-8 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-500">No vehicles have upcoming service dates set.</p>
          </div>
        ) : (
          vehicles.map(v => (
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
                    {v.nextServiceDate ? dayjs(v.nextServiceDate).format("MMM DD, YYYY") : "No Date"}
                  </div>
                  <div className="text-xs text-gray-400 font-mono mt-1">Next Service</div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-3 mt-3">
                <div className="text-sm font-bold text-gray-800">{v.currentCustomer?.displayName}</div>
                <div className="text-sm text-gray-600 flex items-center mt-1">
                  <Phone className="w-4 h-4 mr-2 text-gray-400" />
                  {v.currentCustomer?.primaryMobile || "No Mobile"}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
