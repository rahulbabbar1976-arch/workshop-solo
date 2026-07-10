import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET: Retrieve pre-bookings / reservations
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const advisorId = searchParams.get('advisorId');
    const driverId = searchParams.get('driverId');
    const status = searchParams.get('status');
    const regNo = searchParams.get('regNo');

    // If querying previous advisor for a vehicle registration number
    if (regNo) {
      const normReg = regNo.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const lastJobCard = await prisma.jobCard.findFirst({
        where: {
          vehicle: {
            registrationNumberNormalized: normReg
          }
        },
        orderBy: { dateIn: 'desc' },
        select: {
          advisorId: true
        }
      });

      if (lastJobCard && lastJobCard.advisorId) {
        const advisor = await prisma.user.findUnique({
          where: { id: lastJobCard.advisorId },
          select: { id: true, fullName: true, team: true }
        });
        return NextResponse.json({ success: true, lastAdvisor: advisor });
      }
      return NextResponse.json({ success: true, lastAdvisor: null });
    }

    const where: any = {};
    if (advisorId) where.advisorId = advisorId;
    if (driverId) where.driverId = driverId;
    if (status) where.status = status;

    const bookings = await prisma.preBooking.findMany({
      where,
      orderBy: { bookingDate: 'asc' }
    });

    // Load user names for advisor and driver
    const users = await prisma.user.findMany({
      select: { id: true, fullName: true, team: true }
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    const enrichedBookings = bookings.map(b => {
      const adv = b.advisorId ? userMap.get(b.advisorId) : null;
      const drv = b.driverId ? userMap.get(b.driverId) : null;
      return {
        ...b,
        advisorName: adv ? adv.fullName : null,
        driverName: drv ? drv.fullName : null,
        assignedTeam: b.team || (adv ? adv.team : null)
      };
    });

    return NextResponse.json({ success: true, bookings: enrichedBookings });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST: Register a new pre-booking
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      customerName, 
      customerMobile, 
      customerEmail, 
      regNo, 
      make, 
      model, 
      year, 
      bookingType, 
      bookingDate,
      advisorId,
      team,
      driverId,
      notes
    } = body;

    if (!customerName || !customerMobile || !regNo || !bookingType || !bookingDate) {
      return NextResponse.json({ success: false, error: 'Required fields missing' }, { status: 400 });
    }

    const normReg = regNo.toUpperCase().replace(/[^A-Z0-9]/g, '');

    // Generate unique booking number
    const count = await prisma.preBooking.count();
    const bookingNumber = `RES-${1000 + count + 1}`;

    // Intelligent auto-assignment logic:
    // If no advisor is pre-selected, look up the last advisor assigned to this vehicle normalization regNo
    let finalAdvisorId = advisorId || null;
    let finalTeam = team || null;

    if (!finalAdvisorId) {
      const lastJobCard = await prisma.jobCard.findFirst({
        where: {
          vehicle: {
            registrationNumberNormalized: normReg
          }
        },
        orderBy: { dateIn: 'desc' },
        select: { advisorId: true }
      });

      if (lastJobCard && lastJobCard.advisorId) {
        finalAdvisorId = lastJobCard.advisorId;
        // Load the advisor's team
        const advUser = await prisma.user.findUnique({
          where: { id: finalAdvisorId },
          select: { team: true }
        });
        if (advUser) {
          finalTeam = advUser.team;
        }
      }
    }

    const booking = await prisma.preBooking.create({
      data: {
        bookingNumber,
        customerName,
        customerMobile,
        customerEmail: customerEmail || null,
        regNo: normReg,
        make,
        model,
        year: year || null,
        bookingType,
        bookingDate: new Date(bookingDate),
        advisorId: finalAdvisorId,
        team: finalTeam,
        driverId: driverId || null,
        status: 'pending',
        notes: notes || null
      }
    });

    return NextResponse.json({ success: true, booking, message: 'Reservation created successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PUT: Update reservation status and allocations
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { 
      id,
      advisorId,
      team,
      driverId,
      status,
      notes,
      bookingDate
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Booking ID is required' }, { status: 400 });
    }

    const current = await prisma.preBooking.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
    }

    // If advisor is changing, load the new advisor's team
    let finalTeam = team;
    if (advisorId && advisorId !== current.advisorId && !team) {
      const advUser = await prisma.user.findUnique({
        where: { id: advisorId },
        select: { team: true }
      });
      if (advUser) {
        finalTeam = advUser.team;
      }
    }

    const updated = await prisma.preBooking.update({
      where: { id },
      data: {
        advisorId: advisorId !== undefined ? advisorId : current.advisorId,
        team: finalTeam !== undefined ? finalTeam : current.team,
        driverId: driverId !== undefined ? driverId : current.driverId,
        status: status !== undefined ? status : current.status,
        notes: notes !== undefined ? notes : current.notes,
        bookingDate: bookingDate ? new Date(bookingDate) : current.bookingDate
      }
    });

    return NextResponse.json({ success: true, booking: updated, message: 'Booking details updated successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
