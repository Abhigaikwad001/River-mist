const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Getting admins...");
  const admins = await prisma.user.findMany({
    where: { role: { not: 'USER' } }
  });
  console.log(admins.map(a => ({ email: a.email, role: a.role })));
  
  console.log("Getting packages...");
  const pkgs = await prisma.package.findMany({ take: 2 });
  console.log(pkgs.map(p => ({ id: p.id, type: p.type })));
  
  await prisma.$disconnect();
}

main().catch(console.error);
