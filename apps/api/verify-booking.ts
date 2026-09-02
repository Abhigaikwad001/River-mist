import 'dotenv/config';
import { PrismaClient, EventType, BookingStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { BookingsService } from './src/bookings/bookings.service';

import { CapacityService } from './src/capacity/capacity.service';

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/rivermist';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const capacityService = new CapacityService(prisma as any);
const notificationsServiceMock = {
  sendBookingRequested: async () => {},
  sendBookingStatusUpdated: async () => {}
};
const bookingsService = new BookingsService(prisma as any, capacityService, notificationsServiceMock as any);

async function runTest() {
  console.log('Testing booking engine...');

  const pkg = await prisma.package.findFirst();
  if (!pkg) {
    console.log('No package found');
    return;
  }

  try {
    const booking = await bookingsService.createBooking({
      date: new Date().toISOString(),
      type: EventType.WEDDING,
      packageId: pkg.id,
      headCountAdult: 50,
      headCountChild: 0,
      notes: 'Test Booking'
    } as any, undefined);

    console.log('Booking created successfully:', booking.id);
    console.log('Calculated Total Amount:', booking.totalAmount);
    console.log('Calculated Advance Required:', booking.advanceRequired);

    try {
      await bookingsService.updateBookingStatus(booking.id, BookingStatus.CONFIRMED);
      console.log('ERROR: Booking successfully confirmed without payment! This should have failed.');
    } catch (err: any) {
      console.log('SUCCESS: Prevented confirming unpaid booking ->', err.message);
    }
  } catch (err) {
    console.error('Error in creating booking:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
