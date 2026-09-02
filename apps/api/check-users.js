const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findMany().then(users => {
  console.log(users.map(u => ({ id: u.id, email: u.email, role: u.role })));
}).finally(() => {
  prisma.$disconnect();
});
