import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { Car, MapPin, Phone, User, Calendar, Settings, ArrowLeft } from "lucide-react";
import Link from "next/link";
import TransferOwnershipForm from "./TransferOwnershipForm";
import VehicleBatteryEditor from "./VehicleBatteryEditor";
import dayjs from "dayjs";

export default async function VehicleDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: {
      currentCustomer: true,
      ownershipHistory: {
        orderBy: { fromDate: 'desc' },
        include: { customer: true }
      },
      jobCards: {
        orderBy: { dateIn: 'desc' },
        take: 5
      }
    }
  });

  if (!vehicle) {
    notFound();
  }

  const { currentCustomer } = vehicle;

  return (
    <div className="content bg-gray-100 min-h-screen pb-32">
      <div className="bg-amber-400 px-5 pt-8 pb-4 shadow-sm relative z-10 flex items-center">
        <Link href="/solo/vehicles" className="mr-3 p-2 -ml-2 hover:bg-amber-500 rounded-full transition-colors text-white">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white tracking-wider">{vehicle.registrationNumberNormalized || vehicle.registrationNumberRaw}</h1>
          <p className="text-amber-100 text-sm">{vehicle.manufacturer} {vehicle.model}</p>
        </div>
      </div>

      <div className="p-5 space-y-6">
        
        {/* Vehicle Specs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="font-bold text-gray-800 border-b border-gray-100 pb-2 mb-3 flex items-center">
            <Car className="w-5 h-5 mr-2 text-gray-400" /> Vehicle Details
          </h2>
          <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
            <div>
              <p className="text-gray-500 font-medium">Make</p>
              <p className="font-bold text-gray-800">{vehicle.manufacturer || "N/A"}</p>
            </div>
            <div>
              <p className="text-gray-500 font-medium">Model</p>
              <p className="font-bold text-gray-800">{vehicle.model || "N/A"}</p>
            </div>
            <div>
              <p className="text-gray-500 font-medium">Year</p>
              <p className="font-bold text-gray-800">{vehicle.manufactureYear || "N/A"}</p>
            </div>
            <div>
              <p className="text-gray-500 font-medium">Odometer</p>
              <p className="font-bold text-gray-800">{vehicle.currentOdometer ? `${vehicle.currentOdometer} km` : "N/A"}</p>
            </div>
            <div>
              <p className="text-gray-500 font-medium">VIN</p>
              <p className="font-bold text-gray-800">{vehicle.vin || "N/A"}</p>
            </div>
            <div>
              <p className="text-gray-500 font-medium">Color</p>
              <p className="font-bold text-gray-800">{vehicle.color || "N/A"}</p>
            </div>
            <div>
              <p className="text-gray-500 font-medium">Next Service</p>
              <p className="font-bold text-orange-600">
                {vehicle.nextServiceDate ? dayjs(vehicle.nextServiceDate).format("DD MMM YYYY") : "N/A"}
                {vehicle.nextServiceOdometer && ` / ${vehicle.nextServiceOdometer} km`}
              </p>
            </div>
            <div>
              <p className="text-gray-500 font-medium">Next Oil Change</p>
              <p className="font-bold text-orange-600">
                {vehicle.nextOilChangeDate ? dayjs(vehicle.nextOilChangeDate).format("DD MMM YYYY") : "N/A"}
                {vehicle.nextOilChangeDistance && ` / ${vehicle.nextOilChangeDistance} km`}
              </p>
            </div>
          </div>
        </div>

        {/* Battery Editor Component */}
        <VehicleBatteryEditor vehicle={vehicle} />

        {/* Current Owner */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="font-bold text-gray-800 border-b border-gray-100 pb-2 mb-3 flex items-center">
            <User className="w-5 h-5 mr-2 text-gray-400" /> Current Owner
          </h2>
          {currentCustomer ? (
            <div className="space-y-3">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-lg mr-3">
                  {currentCustomer.displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-lg">
                    <Link href={`/solo/customers/${currentCustomer.id}`} className="hover:text-orange-500 transition-colors">
                      {currentCustomer.displayName}
                    </Link>
                  </p>
                  <p className="text-gray-500 text-sm">{currentCustomer.customerType.toUpperCase()}</p>
                </div>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Phone className="w-4 h-4 mr-2 text-gray-400" />
                {currentCustomer.primaryMobile || "No Mobile"}
              </div>
              <div className="flex items-start text-sm text-gray-600">
                <MapPin className="w-4 h-4 mr-2 text-gray-400 mt-0.5" />
                <span className="flex-1">{currentCustomer.addressLine1 || "No Address"}</span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 italic">No owner assigned.</p>
          )}
        </div>

        {/* Transfer Ownership Component */}
        <TransferOwnershipForm vehicleId={vehicle.id} currentCustomerId={vehicle.currentCustomerId} />

        {/* Ownership History */}
        {vehicle.ownershipHistory.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="font-bold text-gray-800 border-b border-gray-100 pb-2 mb-3">Ownership History</h2>
            <div className="space-y-4">
              {vehicle.ownershipHistory.map((history) => (
                <div key={history.id} className="text-sm">
                  <p className="font-bold text-gray-800">{history.customer.displayName}</p>
                  <p className="text-gray-500 text-xs">
                    {history.fromDate ? dayjs(history.fromDate).format("MMM DD, YYYY") : "Unknown"} - {history.toDate ? dayjs(history.toDate).format("MMM DD, YYYY") : "Present"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
