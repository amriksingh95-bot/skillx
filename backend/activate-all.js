const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Activating all users and merchants...');
  
  await prisma.user.updateMany({
    data: {
      isActive: true
    }
  });

  await prisma.merchant.updateMany({
    data: {
      isActive: true,
      status: 'active'
    }
  });

  await prisma.customer.updateMany({
    data: {
      isActive: true
    }
  });

  console.log('All users, merchants, and customers activated successfully.');
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
