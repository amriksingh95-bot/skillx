require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const MONTHLY_PLAN_ID = 'b5e0d07c-5ace-460a-98c4-2d10bf40ab39';

const merchantIds = [
  '092fe170-0b7a-4e50-acfa-1b957d7fd6c9', // FreshMart Grocery
  '39314060-9c79-4e80-ba2a-9835f30c54d6', // MediPlus Pharmacy
  '1479e77c-9867-4f27-a0e3-f79738c437d1', // BrewBeans Cafe
  '107ae426-dad2-43c7-9682-fc313316cb0b', // TechZone Electronics
  'f35d9d2f-44dd-4232-ad70-2e5b8ecd8122', // StyleHub Fashion
  '69a517ad-546d-4ad8-bba0-ab8ba71c5ddf', // QuickStop General
];

async function backfill() {
  const startDate = new Date(); // today, 2026-07-06
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 30);
  const gracePeriodEnd = new Date(endDate);
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 15); // GRACE_PERIOD_DAYS = 15

  for (const merchantId of merchantIds) {
    const existing = await prisma.merchantSubscription.findFirst({ where: { merchantId } });
    if (existing) {
      console.log(`SKIP — ${merchantId} already has a subscription.`);
      continue;
    }
    const sub = await prisma.merchantSubscription.create({
      data: {
        merchantId,
        planId: MONTHLY_PLAN_ID,
        startDate,
        endDate,
        status: 'active',
        gracePeriodEnd,
        paymentRef: 'BACKFILL-DEMO',
      },
    });
    console.log(`CREATED — ${merchantId} → subscriptionId ${sub.id}`);
  }
  await prisma.$disconnect();
}

backfill().catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
