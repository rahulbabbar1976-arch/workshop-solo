import { prisma } from "@/lib/db";
import { EstimatePrintClient } from "./EstimatePrintClient";

export const dynamic = "force-dynamic";

export default async function PrintEstimatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // Fetch Estimate (by Estimate ID or latest for JobCard ID)
  const estimate = await prisma.estimate.findFirst({
    where: { 
      OR: [
        { id },
        { jobCardId: id }
      ]
    },
    orderBy: {
      createdAt: 'desc'
    },
    include: {
      jobCard: {
        include: {
          customer: true,
          billingCustomer: true,
          vehicle: true,
          complaints: true
        }
      }
    }
  });

  // Fetch Workshop Profile
  const workshopProfile = await prisma.workshopProfile.findFirst();

  if (!estimate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Estimate Not Found</h2>
          <p className="text-gray-600 mb-6">We could not find an estimate for this ID. It may not have been created yet, or it was deleted.</p>
          <a href="/solo/dashboard" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors inline-block">
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <EstimatePrintClient estimate={estimate} workshopProfile={workshopProfile} />;
}
