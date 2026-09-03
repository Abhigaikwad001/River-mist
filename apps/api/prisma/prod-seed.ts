import 'dotenv/config';
import { PrismaClient, EventType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/rivermist';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter }); 

async function main() {
  console.log('Seeding production catalog data...');

  // 1. Create Resources
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

  // 2. Create Packages
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

  // 3. Create Activities
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

  // 4. Create Food Categories
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
  console.log('Production seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
