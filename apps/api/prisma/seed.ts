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
  const packages = [
    { name: 'Standard Day Visit', slug: 'day-visit-standard', description: 'A full day of fun, food, and activities.', experienceType: EventType.DAY_TOURISM, minGuests: 1, priceAdult: 1200, priceChild: 800 },
    { name: 'Premium Day Visit', slug: 'day-visit-premium', description: 'Includes premium lunch and VIP pool access.', experienceType: EventType.DAY_TOURISM, minGuests: 1, priceAdult: 1800, priceChild: 1000 },
    { name: 'Royal Destination Wedding', slug: 'wedding-royal', description: 'Complete 2-day wedding package.', experienceType: EventType.DESTINATION_WEDDING, minGuests: 50, maxGuests: 500, priceAdult: 500000, priceChild: 0 },
    { name: 'Corporate Team Retreat', slug: 'corporate-retreat', description: 'Full day AC hall access with meals.', experienceType: EventType.CORPORATE_EVENT, minGuests: 20, priceAdult: 2000, priceChild: 0 },
    { name: 'Private Gala Party', slug: 'private-party-gala', description: 'Exclusive lawn booking for private events.', experienceType: EventType.OTHER_EVENT, minGuests: 30, priceAdult: 1500, priceChild: 800 }
  ];

  for (const pkg of packages) {
    await prisma.package.upsert({
      where: { slug: pkg.slug },
      update: {
        priceAdult: pkg.priceAdult,
        priceChild: pkg.priceChild
      },
      create: {
        name: pkg.name,
        slug: pkg.slug,
        description: pkg.description,
        experienceType: pkg.experienceType,
        priceAdult: pkg.priceAdult,
        priceChild: pkg.priceChild,
        minGuests: pkg.minGuests,
        maxGuests: pkg.maxGuests
      },
    });
  }
  
  console.log('Packages seeded.');

  // 4. Create Activities
  const activities = [
    { name: 'Swimming Pool', price: 0 }, 
    { name: 'Rain Dance', price: 200 }, 
    { name: 'Kids Play Area', price: 0 }, 
    { name: 'Sports Area', price: 0 }, 
    { name: 'Adventure Activities', price: 0 }, 
    { name: 'Farm/Agro Experience', price: 0 }, 
    { name: 'Riverside Walking', price: 0 }, 
    { name: 'Bonfire', price: 0 }, 
    { name: 'DJ/Music', price: 0 }, 
    { name: 'Tractor/Bullock-Cart Ride', price: 0 }, 
    { name: 'Archery', price: 0 }, 
    { name: 'Cycling', price: 0 }, 
    { name: 'Camping', price: 0 }
  ];

  for (const act of activities) {
    let existing = await prisma.activity.findFirst({ where: { name: act.name } });
    if (existing) {
      await prisma.activity.update({
        where: { id: existing.id },
        data: { price: act.price }
      });
    } else {
      await prisma.activity.create({
        data: {
          name: act.name,
          description: act.name,
          price: act.price, 
          pricingType: 'PER_PERSON',
        },
      });
    }
  }

  console.log('Activities seeded.');

  // 5. Create Food & Thalis Catalog
  const foods = [
    { 
      name: 'Maharashtrian Thali', 
      meal: 'LUNCH', 
      category: 'THALI',
      isVeg: true,
      isSeasonal: false,
      seasonalBadge: null,
      tags: ['Authentic', 'Traditional', 'Local'],
      description: 'Authentic regional flavors prepared with locally sourced ingredients. A timeless family recipe featuring hot bhakris, spiced gravies, pitla, and traditional sweets.',
      image: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&q=80&w=1000',
      displayOrder: 1
    },
    { 
      name: 'Hurda Thali', 
      meal: 'LUNCH', 
      category: 'THALI',
      isVeg: true,
      isSeasonal: true,
      seasonalBadge: 'Seasonal Harvest Special',
      tags: ['Seasonal', 'Rustic', 'Traditional'],
      description: 'Our winter harvest specialty featuring tender, freshly roasted Jowar (Hurda) from the coal pits, served with fiery garlic chutney, sweet jaggery, Shengdana chutney, and Zunka Bhakar.',
      image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&q=80&w=1000',
      displayOrder: 2
    },
    { 
      name: 'Royal Maratha Feast Thali', 
      meal: 'DINNER', 
      category: 'THALI',
      isVeg: false,
      isSeasonal: false,
      seasonalBadge: null,
      tags: ['Royal', 'Non-Veg', 'Spiced'],
      description: 'A grand non-vegetarian feast with traditional Saoji & Malvani style chicken/mutton gravies, bhakri, indrayani rice, and authentic solkadhi.',
      image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&q=80&w=1000',
      displayOrder: 3
    },
    { 
      name: 'Agro Farm Breakfast Feast', 
      meal: 'BREAKFAST', 
      category: 'THALI',
      isVeg: true,
      isSeasonal: false,
      seasonalBadge: null,
      tags: ['Farm Fresh', 'Breakfast', 'Healthy'],
      description: 'Fresh farm-style morning breakfast with Kanda Poha, Ukadpeni, hot Jalebis, fresh cow milk, and herbal chai.',
      image: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&q=80&w=1000',
      displayOrder: 4
    }
  ];

  for (const food of foods) {
    let existing = await prisma.menuItem.findFirst({ where: { name: food.name } });
    if (existing) {
      await prisma.menuItem.update({
        where: { id: existing.id },
        data: food
      });
    } else {
      await prisma.menuItem.create({
        data: food
      });
    }
  }

  console.log('Food & Thalis Catalog seeded.');

  // 6. Create Default SiteContent Entries
  const siteContents = [
    { key: 'home.hero.title', title: 'River Mist Resort', category: 'HERO', content: 'Resort' },
    { key: 'home.hero.subtitle', title: 'Welcome to', category: 'HERO', content: 'Welcome to River Mist' },
    { key: 'home.hero.description', title: 'Home Hero Description', category: 'HERO', content: 'Where untouched nature meets unmatched luxury. Experience the perfect getaway for day visits, hurda parties, and weddings.' },
    { key: 'home.cta.title', title: 'Ready to Escape?', category: 'GENERAL', content: 'Ready to Escape?' },
    { key: 'home.cta.description', title: 'Home CTA Description', category: 'GENERAL', content: 'Book your day visit, event, or stay with us and experience the perfect blend of nature and luxury.' },
    { key: 'about.hero.title', title: 'About River Mist', category: 'ABOUT', content: 'About River Mist' },
    { key: 'about.hero.description', title: 'About Hero Description', category: 'ABOUT', content: 'River Mist is a premium agro-tourism resort dedicated to offering a sanctuary of luxury within the heart of nature.' },
    { key: 'about.vision', title: 'Our Vision', category: 'ABOUT', content: 'To be the leading destination for eco-luxury, where every guest experiences the profound beauty of nature.' },
    { key: 'about.mission', title: 'Our Mission', category: 'ABOUT', content: 'To deliver unforgettable memories through personalized service, sustainable practices, and cultural experiences.' },
    { key: 'about.sustainability', title: 'Rooted in Sustainability', category: 'ABOUT', content: 'We believe that true luxury is sustainable. Sourcing local ingredients for authentic thalis.' },
    { key: 'contact.phone', title: 'Phone Number', category: 'CONTACT', content: '+91 9322759343, +91 9876543210' },
    { key: 'contact.email', title: 'Email Address', category: 'CONTACT', content: 'info@rivermist.in, bookings@rivermist.in' },
    { key: 'contact.address', title: 'Our Location', category: 'CONTACT', content: 'River Road, Agro Valley, Maharashtra, India' },
    { key: 'contact.hours', title: 'Working Hours', category: 'CONTACT', content: 'Mon - Sun: 9:00 AM to 6:00 PM' },
    { key: 'policies.checkin', title: 'Check-in & Check-out', category: 'POLICIES', content: 'Standard check-in time is 12:00 PM. Standard check-out time is 10:00 AM. Government-issued ID is mandatory.' },
    { key: 'policies.cancellation', title: 'Payment & Cancellation', category: 'POLICIES', content: 'A 100% advance is required for day outings. Weddings require a 25% non-refundable advance.' },
    { key: 'policies.guidelines', title: 'Property Guidelines', category: 'POLICIES', content: 'Outside food and alcohol are strictly prohibited on the premises.' },
    { key: 'weddings.hero.title', title: "Celebrate Love In Nature's Embrace", category: 'WEDDINGS', content: "Celebrate Love In Nature's Embrace" },
    { key: 'weddings.hero.subtitle', title: 'River Mist Weddings', category: 'WEDDINGS', content: 'River Mist Weddings' },
    { key: 'weddings.hero.description', title: 'Weddings Hero Description', category: 'WEDDINGS', content: 'From dreamy ceremonies to joyful celebrations, we create unforgettable wedding experiences.' }
  ];

  for (const sc of siteContents) {
    await prisma.siteContent.upsert({
      where: { key: sc.key },
      update: { title: sc.title, content: sc.content, category: sc.category },
      create: { key: sc.key, title: sc.title, content: sc.content, category: sc.category, active: true }
    });
  }

  console.log('SiteContent entries seeded.');

  // 7. Development Seeding

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
