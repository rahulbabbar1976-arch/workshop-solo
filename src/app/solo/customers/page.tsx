import { prisma } from "@/lib/db";
import { User } from "lucide-react";

export const revalidate = 0; // Ensure data is always fresh

export default async function CustomersPage() {
  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50 // limit for now
  });

  return (
    <div className="bg-gray-100 min-h-screen pb-32 font-outfit">
      <div className="bg-gray-900 px-5 pt-8 pb-4 shadow-md relative z-10">
        <h1 className="text-xl font-bold text-white uppercase tracking-wider flex items-center">
          <User className="w-5 h-5 mr-2 text-orange-500" />
          Customers
        </h1>
      </div>
      
      <div className="px-5 mt-6">
        {customers.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-md shadow-sm border border-gray-200">
            <p className="text-gray-500 font-medium">No customers found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {customers.map(c => (
              <div key={c.id} className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
                <h3 className="font-bold text-gray-800 text-lg">{c.displayName}</h3>
                <div className="flex flex-col mt-2 gap-1 text-sm text-gray-600">
                  {c.primaryMobile && <span><span className="font-semibold text-gray-400">Mobile:</span> {c.primaryMobile}</span>}
                  {c.addressLine1 && <span><span className="font-semibold text-gray-400">Address:</span> {c.addressLine1}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
