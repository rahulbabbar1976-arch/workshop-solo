import { prisma } from "@/lib/db";
import { EstimatePrintClient } from "./EstimatePrintClient";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PrintEstimatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // Fetch Estimate
  const estimate = await prisma.estimate.findUnique({
    where: { id },
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
