import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
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
    const cookieStore = await cookies();
    const permissionsCookie = cookieStore.get('workshop_permissions');
    const permissions = permissionsCookie ? JSON.parse(permissionsCookie.value) : null;
    return <JobCardDetailClient jobCard={legacyJobCard} profile={profile} permissions={permissions} />;
  }

  const profile = await prisma.workshopProfile.findFirst();
  const cookieStore = await cookies();
  const permissionsCookie = cookieStore.get('workshop_permissions');
  const permissions = permissionsCookie ? JSON.parse(permissionsCookie.value) : null;
  
  return <JobCardDetailClient jobCard={jobCard} profile={profile} permissions={permissions} />;
}
