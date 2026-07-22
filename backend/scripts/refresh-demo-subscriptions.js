require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const merchantIds = [
  '092fe170-0b7a-4e50-acfa-1b957d7fd6c9', // D-FreshMart Grocery
  'a00d36e1-7da6-4c20-a808-91b9269b8e8f', // D-Dr. Sharma Clinic
];

(async () => {
  try {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 30);
    const gracePeriodEnd = new Date(endDate);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 15);

    console.log('=== DATES ===');
    console.log('startDate:      ', now.toISOString());
    console.log('endDate:        ', endDate.toISOString());
    console.log('gracePeriodEnd: ', gracePeriodEnd.toISOString());
    console.log('');

    for (const merchantId of merchantIds) {
      const existing = await prisma.merchantSubscription.findFirst({ where: { merchantId } });
      if (existing) {
        await prisma.merchantSubscription.update({
          where: { id: existing.id },
          data: { startDate: now, endDate, gracePeriodEnd, status: 'active' },
        });
        console.log(`UPDATED  ${merchantId} (sub ${existing.id.slice(0,8)}...)`);
      } else {
        console.log(`SKIPPED  ${merchantId} (no subscription record)`);
      }
    }

    console.log('\n=== VERIFICATION ===');
    const subs = await prisma.merchantSubscription.findMany({
      where: { merchantId: { in: merchantIds } },
      select: {
        merchantId: true,
        startDate: true,
        endDate: true,
        gracePeriodEnd: true,
        status: true,
        paymentRef: true,
      },
      orderBy: { merchantId: 'asc' },
    });

    for (const s of subs) {
      const start = s.startDate.toISOString().slice(0, 10);
      const end = s.endDate.toISOString().slice(0, 10);
      const grace = s.gracePeriodEnd ? s.gracePeriodEnd.toISOString().slice(0, 10) : 'null';
      console.log(`${s.merchantId} | status=${s.status} | start=${start} | end=${end} | grace=${grace} | ref=${s.paymentRef}`);
    }

    console.log(`\nTotal records found: ${subs.length} (expected 6)`);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
