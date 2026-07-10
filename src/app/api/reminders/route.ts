import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const vehicles = await prisma.vehicle.findMany({
      where: {
        OR: [
          { insuranceExpiryDate: { not: null } },
          { emissionInspectionExpiryDate: { not: null } },
          { nextServiceDate: { not: null } }
        ],
        isActive: true
      },
      include: {
        currentCustomer: true
      }
    });

    const reminders: any[] = [];

    for (const v of vehicles) {
      const make = v.manufacturer || 'Vehicle';
      const model = v.model || '';
      const reg = v.registrationNumberRaw;
      const custName = v.currentCustomer?.displayName || 'Customer';
      const custMobile = v.currentCustomer?.primaryMobile || '';
      const cleanMobile = custMobile ? custMobile.replace(/\D/g, '') : '';
      const waMobile = cleanMobile ? (cleanMobile.startsWith('91') ? cleanMobile : `91${cleanMobile}`) : '';

      // 1. Insurance Expiry (within 30 days)
      if (v.insuranceExpiryDate) {
        const insDate = new Date(v.insuranceExpiryDate);
        insDate.setHours(0, 0, 0, 0);
        const diffTime = insDate.getTime() - today.getTime();
        const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (daysLeft <= 30) {
          const dateStr = insDate.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
          const text = `Hello ${custName},\n\nThis is a friendly reminder from Autobots Multibrand Repair that the insurance policy for your vehicle *${make} ${model}* (${reg}) is expiring on *${dateStr}*.\n\nPlease renew it soon to avoid any coverage lapse. Let us know if you need assistance with renewal!\n\nThank you!`;
          const whatsappUrl = waMobile ? `https://wa.me/${waMobile}?text=${encodeURIComponent(text)}` : '';

          reminders.push({
            id: `ins-${v.id}`,
            vehicleId: v.id,
            customerId: v.currentCustomerId,
            customerName: custName,
            customerMobile: custMobile,
            registrationNumber: reg,
            vehicleName: `${make} ${model}`,
            type: 'insurance',
            dueDate: v.insuranceExpiryDate,
            daysLeft,
            status: daysLeft < 0 ? 'expired' : 'upcoming',
            whatsappUrl,
            messageText: text
          });
        }
      }

      // 2. PUC Expiry (within 30 days)
      if (v.emissionInspectionExpiryDate) {
        const pucDate = new Date(v.emissionInspectionExpiryDate);
        pucDate.setHours(0, 0, 0, 0);
        const diffTime = pucDate.getTime() - today.getTime();
        const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (daysLeft <= 30) {
          const dateStr = pucDate.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
          const text = `Hello ${custName},\n\nThis is a friendly reminder from Autobots Multibrand Repair that the PUC (Pollution Under Control) certificate for your vehicle *${make} ${model}* (${reg}) expires on *${dateStr}*.\n\nPlease get it checked to avoid traffic fines. You can visit our workshop to get your PUC certified quickly!\n\nThank you!`;
          const whatsappUrl = waMobile ? `https://wa.me/${waMobile}?text=${encodeURIComponent(text)}` : '';

          reminders.push({
            id: `puc-${v.id}`,
            vehicleId: v.id,
            customerId: v.currentCustomerId,
            customerName: custName,
            customerMobile: custMobile,
            registrationNumber: reg,
            vehicleName: `${make} ${model}`,
            type: 'puc',
            dueDate: v.emissionInspectionExpiryDate,
            daysLeft,
            status: daysLeft < 0 ? 'expired' : 'upcoming',
            whatsappUrl,
            messageText: text
          });
        }
      }

      // 3. Service Due (within 30 days)
      if (v.nextServiceDate) {
        const serviceDate = new Date(v.nextServiceDate);
        serviceDate.setHours(0, 0, 0, 0);
        const diffTime = serviceDate.getTime() - today.getTime();
        const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (daysLeft <= 30) {
          const dateStr = serviceDate.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
          const odoStr = v.nextServiceOdometer ? ` or at ${v.nextServiceOdometer.toLocaleString()} KM` : '';
          const text = `Hello ${custName},\n\nThis is a friendly reminder from Autobots Multibrand Repair that the scheduled service for your vehicle *${make} ${model}* (${reg}) is due on *${dateStr}*${odoStr}.\n\nRegular maintenance keeps your vehicle in top condition. Book your service slot with us today!\n\nThank you!`;
          const whatsappUrl = waMobile ? `https://wa.me/${waMobile}?text=${encodeURIComponent(text)}` : '';

          reminders.push({
            id: `srv-${v.id}`,
            vehicleId: v.id,
            customerId: v.currentCustomerId,
            customerName: custName,
            customerMobile: custMobile,
            registrationNumber: reg,
            vehicleName: `${make} ${model}`,
            type: 'service',
            dueDate: v.nextServiceDate,
            daysLeft,
            status: daysLeft < 0 ? 'expired' : 'upcoming',
            whatsappUrl,
            messageText: text
          });
        }
      }
    }

    reminders.sort((a, b) => a.daysLeft - b.daysLeft);

    return NextResponse.json({
      success: true,
      reminders
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
