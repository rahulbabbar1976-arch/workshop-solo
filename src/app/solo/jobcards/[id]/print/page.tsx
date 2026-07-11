import { getPrismaForDb } from "@/lib/db";
import { PrintLayoutClient } from "./PrintLayoutClient";
import { notFound } from "next/navigation";

export default async function PrintJobCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // Create Prisma client (assuming dev.db for solo app)
  const prisma = getPrismaForDb("dev.db");
  
  // Fetch JobCard with all relations
  const jobCard = await prisma.jobCard.findUnique({
    where: { id },
    include: {
      customer: true,
      vehicle: true,
      parts: true,
      labour: true,
      complaints: true
    }
  });

  if (!jobCard) {
    // Try by jobcardNumber (e.g. LEGACY-1)
    const legacyJobCard = await prisma.jobCard.findUnique({
      where: { jobcardNumber: id },
      include: {
        customer: true,
        vehicle: true,
        parts: true,
        labour: true,
        complaints: true
      }
    });
    
    if (!legacyJobCard) {
      return notFound();
    }
    return <PrintLayoutClient jobCard={legacyJobCard} />;
  }

  return <PrintLayoutClient jobCard={jobCard} />;
}
