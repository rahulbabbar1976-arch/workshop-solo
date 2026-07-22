import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { IntakeViewClient } from "./IntakeViewClient";

export const dynamic = "force-dynamic";

export default async function PublicIntakePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // Fetch JobCard with all data needed for the customer intake copy
  const jobCard = await prisma.jobCard.findUnique({
    where: { id },
    include: {
      customer: true,
      vehicle: {
        include: {
          photos: {
            orderBy: { capturedAt: 'asc' }
          }
        }
      },
      complaints: {
        include: { icons: true }
      },
      media: {
        orderBy: { createdAt: 'asc' }
      },
      snapshot: true,
    }
  });

  const workshopProfile = await prisma.workshopProfile.findFirst();

  if (!jobCard) {
    return notFound();
  }

  return <IntakeViewClient jobCard={jobCard} workshopProfile={workshopProfile} />;
}
