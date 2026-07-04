const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('Test@123', 10);
  const result = await p.merchant.create({
    data: {
      businessName: 'Test Pending Shop',
      ownerName: 'Test Owner',
      email: 'testpending@skillxt.com',
      city: 'Ludhiana',
      category: 'Everyday',
      status: 'pending',
      pointsBalance: 0,
      merchantCode: 'TESTPEND01',
      user: {
        create: {
          mobile: '9500000200',
          email: 'testpending@skillxt.com',
          password: hash,
          role: 'merchant',
          isActive: true
        }
      }
    }
  });
  console.log('Created:', result.id);
}

main().catch(console.error).finally(() => p.$disconnect());