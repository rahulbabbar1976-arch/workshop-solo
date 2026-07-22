import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { IntakeViewClient } from "./IntakeViewClient";

export const dynamic = "force-dynamic";

export default async function PublicIntakePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // Fetch JobCard acting as Intake
  const jobCard = await prisma.jobCard.findUnique({
    where: { id },
    include: {
      customer: true,
      vehicle: true,
      complaints: true,
      media: true,
    }
  });

  const workshopProfile = await prisma.workshopProfile.findFirst();

  if (!jobCard) {
    return notFound();
  }

  return <IntakeViewClient jobCard={jobCard} workshopProfile={workshopProfile} />;
}
