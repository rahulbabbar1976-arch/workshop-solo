import { prisma } from "@/lib/db";
import { EstimatePrintClient } from "./EstimatePrintClient";
import { notFound } from "next/navigation";

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
    return notFound();
  }

  return <EstimatePrintClient estimate={estimate} workshopProfile={workshopProfile} />;
}
