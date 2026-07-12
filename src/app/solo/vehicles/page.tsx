import { prisma } from "@/lib/db";
import { Car } from "lucide-react";

export const revalidate = 0;

export default async function VehiclesPage() {
  const vehicles = await prisma.vehicle.findMany({
    orderBy: { createdAt: 'desc' },
    include: { currentCustomer: true },
    take: 50 // limit for now
  });

  return (
    <div className="bg-gray-100 min-h-screen pb-32 font-outfit">
      <div className="bg-gray-900 px-5 pt-8 pb-4 shadow-md relative z-10">
        <h1 className="text-xl font-bold text-white uppercase tracking-wider flex items-center">
          <Car className="w-5 h-5 mr-2 text-orange-500" />
          Vehicles
        </h1>
      </div>
      <div className="px-5 mt-6">
        {vehicles.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-md shadow-sm border border-gray-200">
            <p className="text-gray-500 font-medium">No vehicles found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {vehicles.map(v => (
              <div key={v.id} className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
                <h3 className="font-bold text-gray-800 text-lg uppercase">{v.registrationNumberNormalized || v.registrationNumberRaw}</h3>
                <div className="flex flex-col mt-2 gap-1 text-sm text-gray-600">
                  <span><span className="font-semibold text-gray-400">Make/Model:</span> {v.manufacturer || "-"} {v.model || ""}</span>
                  <span><span className="font-semibold text-gray-400">Owner:</span> {v.currentCustomer?.displayName || "-"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
