import 'dotenv/config';
import { PrismaClient, Role, BookingStatus, PaymentStatus, EventType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/rivermist';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter }); 

async function main() {
  console.log('Seeding database...');

  // 1. Create Users
  const passwordHash = await bcrypt.hash('password123', 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@rivermist.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'admin@rivermist.com',
      passwordHash,
      role: Role.SUPER_ADMIN,
    },
  });

  const normalUser = await prisma.user.upsert({
    where: { email: 'guest@example.com' },
    update: {},
    create: {
      name: 'John Guest',
      email: 'guest@example.com',
      passwordHash,
      role: Role.USER,
    },
  });

  console.log('Users seeded.');

  // 2. Create Resources
  const resources = [
    { name: 'General Day Tourism', type: 'CAPACITY', capacity: 500, description: 'Overall capacity for day visitors' },
    { name: 'Wedding Lawn', type: 'VENUE', capacity: 1000, description: 'Lush green lawn for grand weddings' },
    { name: 'Wedding Hall', type: 'VENUE', capacity: 500, description: 'Indoor air-conditioned hall' },
    { name: 'Main Dining', type: 'VENUE', capacity: 200, description: 'Main dining area' },
    { name: 'Parking', type: 'FACILITY', capacity: 200, description: 'Vehicle parking slots' }
  ];

  for (const res of resources) {
    let existing = await prisma.resource.findFirst({ where: { name: res.name } });
    if (!existing) {
      await prisma.resource.create({ data: res });
    }
  }

  console.log('Resources seeded.');

  // 3. Create Packages
  // We do not invent prices here. We set to 0 and let admin configure them.
  const packages = [
    { name: 'Standard Day Visit', slug: 'day-visit-standard', description: 'A full day of fun, food, and activities.', experienceType: EventType.DAY_TOURISM, minGuests: 1 },
    { name: 'Premium Day Visit', slug: 'day-visit-premium', description: 'Includes premium lunch and VIP pool access.', experienceType: EventType.DAY_TOURISM, minGuests: 1 },
    { name: 'Royal Destination Wedding', slug: 'wedding-royal', description: 'Complete 2-day wedding package.', experienceType: EventType.DESTINATION_WEDDING, minGuests: 50, maxGuests: 500 },
    { name: 'Corporate Team Retreat', slug: 'corporate-retreat', description: 'Full day AC hall access with meals.', experienceType: EventType.CORPORATE_EVENT, minGuests: 20 },
    { name: 'Private Gala Party', slug: 'private-party-gala', description: 'Exclusive lawn booking for private events.', experienceType: EventType.OTHER_EVENT, minGuests: 30 }
  ];

  for (const pkg of packages) {
    await prisma.package.upsert({
      where: { slug: pkg.slug },
      update: {},
      create: {
        name: pkg.name,
        slug: pkg.slug,
        description: pkg.description,
        experienceType: pkg.experienceType,
        priceAdult: 0,
        priceChild: 0,
        minGuests: pkg.minGuests,
        maxGuests: pkg.maxGuests
      },
    });
  }
  
  console.log('Packages seeded.');

  // 4. Create Activities
  const activities = [
    'Swimming Pool', 'Rain Dance', 'Kids Play Area', 'Sports Area', 
    'Adventure Activities', 'Farm/Agro Experience', 'Riverside Walking', 
    'Bonfire', 'DJ/Music', 'Tractor/Bullock-Cart Ride', 'Archery', 
    'Cycling', 'Camping'
  ];

  for (const act of activities) {
    let existing = await prisma.activity.findFirst({ where: { name: act } });
    if (!existing) {
      await prisma.activity.create({
        data: {
          name: act,
          description: act,
          price: 0, 
          pricingType: 'PER_PERSON',
        },
      });
    }
  }

  console.log('Activities seeded.');

  // 5. Create Food Categories
  const foods = [
    { name: 'Breakfast', meal: 'BREAKFAST', isVeg: true },
    { name: 'Lunch', meal: 'LUNCH', isVeg: true },
    { name: 'Evening Snacks', meal: 'SNACKS', isVeg: true },
    { name: 'Dinner Veg', meal: 'DINNER', isVeg: true },
    { name: 'Dinner Non-Veg', meal: 'DINNER', isVeg: false }
  ];

  for (const food of foods) {
    let existing = await prisma.menuItem.findFirst({ where: { name: food.name } });
    if (!existing) {
      await prisma.menuItem.create({
        data: {
          name: food.name,
          meal: food.meal,
          isVeg: food.isVeg,
          description: `Standard ${food.name} offerings`
        }
      });
    }
  }

  console.log('Food Categories seeded.');

  // 6. Development Seeding
  if (process.env.NODE_ENV === 'development') {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dayVisitPackage = await prisma.package.findUnique({ where: { slug: 'day-visit-standard' } });
    if (dayVisitPackage) {
      const booking = await prisma.booking.upsert({
        where: { bookingNumber: 'RM-TEST-0001' },
        update: {},
        create: {
          bookingNumber: 'RM-TEST-0001',
          date: tomorrow,
          type: EventType.DAY_TOURISM,
          status: BookingStatus.CONFIRMED,
          userId: normalUser.id,
          packageId: dayVisitPackage.id,
          headCountAdult: 2,
          headCountChild: 1,
          totalAmount: 3200, 
          advanceRequired: 1600,
          amountPaid: 3200,
          balanceAmount: 0,
          notes: 'Test booking for development',
          payments: {
            create: {
              amount: 3200,
              method: 'CASH',
              status: PaymentStatus.CAPTURED,
            },
          },
        },
      });
      console.log('Sample dev booking seeded.');
    }
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
