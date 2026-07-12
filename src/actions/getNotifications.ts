"use server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

export async function getNotifications() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('workshop_user_id')?.value;
  
  if (!userId) return [];

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const tenantId = user?.tenantId || undefined;

  const notifications = [];
  const now = new Date();
  
  // 1. Upcoming Bookings (next 2 days)
  const twoDaysFromNow = new Date();
  twoDaysFromNow.setDate(now.getDate() + 2);
  
  const upcomingBookings = await prisma.preBooking.findMany({
    where: {
      status: "pending",
      bookingDate: {
        gte: now,
        lte: twoDaysFromNow
      }
    },
    take: 5
  });

  upcomingBookings.forEach(booking => {
    notifications.push({
      id: `booking-${booking.id}`,
      type: "booking",
      title: "Upcoming Booking",
      message: `${booking.regNo} scheduled for ${booking.bookingDate.toLocaleDateString()}`,
      time: booking.createdAt.toISOString()
    });
  });

  // 2. Pending Parts
  const pendingParts = await prisma.jobCardPart.findMany({
    where: {
      status: { in: ["requested", "ordered"] },
      jobCard: { tenantId }
    },
    include: { jobCard: true },
    take: 5
  });

  pendingParts.forEach(part => {
    notifications.push({
      id: `part-${part.id}`,
      type: "part",
      title: "Pending Part",
      message: `${part.partName} for Job ${part.jobCard.jobcardNumber}`,
      time: part.createdAt.toISOString()
    });
  });

  // 3. Due for Delivery
  const dueDeliveries = await prisma.jobCard.findMany({
    where: {
      tenantId,
      status: "ready_for_delivery"
    },
    include: { vehicle: true },
    take: 5
  });

  dueDeliveries.forEach(job => {
    notifications.push({
      id: `delivery-${job.id}`,
      type: "delivery",
      title: "Ready for Delivery",
      message: `${job.vehicle.registrationNumberNormalized} is ready for customer pickup.`,
      time: job.updatedAt.toISOString()
    });
  });

  // 4. Service Reminders (Due in next 3 weeks)
  const threeWeeksFromNow = new Date();
  threeWeeksFromNow.setDate(now.getDate() + 21);
  
  const upcomingServices = await prisma.vehicle.findMany({
    where: {
      tenantId,
      nextServiceDate: {
        gte: now,
        lte: threeWeeksFromNow
      }
    },
    take: 5
  });

  upcomingServices.forEach(vehicle => {
    notifications.push({
      id: `service-${vehicle.id}`,
      type: "service",
      title: "Service Due",
      message: `${vehicle.registrationNumberNormalized} is due for service by ${vehicle.nextServiceDate?.toLocaleDateString()}`,
      time: now.toISOString()
    });
  });

  // Sort by most recent first
  return notifications.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
}
