const { PrismaClient } = require('@prisma/client');
const { getBonusForPosition } = require('../src/services/subscriptionService');

const prisma = new PrismaClient();

async function main() {
  console.log('=== getBonusForPosition unit check ===');
  for (let i = 0; i <= 5; i++) {
    console.log(`  position ${i} → ${getBonusForPosition(i)} pts`);
  }

  console.log('\n=== Seed merchant state ===');
  // Pick BrewBeans Cafe (seed merchant)
  const merchant = await prisma.merchant.findFirst({
    where: { businessName: 'BrewBeans Cafe' },
    select: { id: true, businessName: true, pointsBalance: true, status: true }
  });
  if (!merchant) { console.log('BrewBeans Cafe not found'); return; }
  console.log(`  ${merchant.businessName} (${merchant.id})`);
  console.log(`  status: ${merchant.status}, pointsBalance: ${merchant.pointsBalance}`);

  const subs = await prisma.merchantSubscription.findMany({
    where: { merchantId: merchant.id },
    select: { id: true, status: true, startDate: true, endDate: true },
    orderBy: { createdAt: 'asc' }
  });
  console.log(`  subscriptions: ${subs.length}`);
  subs.forEach((s, i) => console.log(`    [${i}] ${s.id} status=${s.status} end=${s.endDate.toISOString().slice(0,10)}`));

  // Save original state for restore
  const origBalance = merchant.pointsBalance;
  const origSubIds = subs.map(s => s.id);

  console.log('\n=== Simulate Path C (createMerchantSubscriptionRecord) ===');
  // We'll simulate the logic inline to avoid actually mutating the DB.
  // Instead, let's trace what WOULD happen at each position.

  console.log('  (dry-run — no DB writes)\n');

  // Simulate: a merchant with N existing subscriptions gets a new one created.
  // Position = subscriptionCount (taken before insert).
  for (let existingCount = 0; existingCount <= 4; existingCount++) {
    const bonus = getBonusForPosition(existingCount);
    console.log(`  existingCount=${existingCount} → position=${existingCount} → bonus=${bonus} pts`);
  }

  console.log('\n=== Simulate Path B (confirmRenewalPayment) ===');
  // subscriptionCount taken AFTER update, so position = count - 1.
  for (let countAfter = 1; countAfter <= 5; countAfter++) {
    const bonus = getBonusForPosition(countAfter - 1);
    console.log(`  countAfter=${countAfter} → position=${countAfter - 1} → bonus=${bonus} pts`);
  }

  console.log('\n=== Summary of expected values ===');
  console.log('  Activation (position 0): 1500 pts');
  console.log('  Renewal 1   (position 1):  500 pts');
  console.log('  Renewal 2   (position 2):  500 pts');
  console.log('  Renewal 3+  (position 3+):    0 pts');

  // Now actually test with a real merchant by creating a temporary subscription,
  // checking the bonus, then cleaning up.
  console.log('\n=== Live test with BrewBeans Cafe ===');

  // Create a fake subscription to trigger the count logic
  const testSub = await prisma.merchantSubscription.create({
    data: {
      merchantId: merchant.id,
      planId: (await prisma.subscriptionPlan.findFirst({ where: { isActive: true } })).id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 86400000),
      status: 'active',
      paymentRef: 'TEST-BONUS-VERIFICATION'
    }
  });
  console.log(`  Created test subscription: ${testSub.id}`);

  // Now count AFTER insert (like Path B does)
  const countAfter = await prisma.merchantSubscription.count({ where: { merchantId: merchant.id } });
  const bonusB = getBonusForPosition(countAfter - 1);
  console.log(`  Path B would give: countAfter=${countAfter}, position=${countAfter - 1}, bonus=${bonusB} pts`);

  // Count BEFORE would be countAfter - 1 (like Path C does, but we already inserted)
  const countBefore = countAfter - 1;
  const bonusC = getBonusForPosition(countBefore);
  console.log(`  Path C would give: countBefore=${countBefore}, position=${countBefore}, bonus=${bonusC} pts`);

  // Clean up: remove the test subscription
  await prisma.merchantSubscription.delete({ where: { id: testSub.id } });
  console.log(`  Cleaned up test subscription ${testSub.id}`);

  // Verify merchant state unchanged
  const after = await prisma.merchant.findUnique({
    where: { id: merchant.id },
    select: { pointsBalance: true }
  });
  console.log(`  Merchant pointsBalance after cleanup: ${after.pointsBalance} (was ${origBalance})`);
  console.log(`  State restored: ${after.pointsBalance === origBalance ? 'YES' : 'NO — MANUAL RESTORE NEEDED'}`);

  console.log('\nDone.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
