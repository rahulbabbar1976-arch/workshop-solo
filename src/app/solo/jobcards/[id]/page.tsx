import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { JobCardDetailClient } from "./JobCardDetailClient";

export const dynamic = "force-dynamic";

export default async function JobCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // Fetch JobCard with all relations
  const jobCard = await prisma.jobCard.findUnique({
    where: { id },
    include: {
      customer: true,
      vehicle: true,
      partLines: true,
      labourLines: true,
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
        partLines: true,
        labourLines: true,
        complaints: true
      }
    });
    
    if (!legacyJobCard) {
      return notFound();
    }
    const profile = await prisma.workshopProfile.findFirst();
    return <JobCardDetailClient jobCard={legacyJobCard} profile={profile} />;
  }

  const profile = await prisma.workshopProfile.findFirst();
  return <JobCardDetailClient jobCard={jobCard} profile={profile} />;
}
