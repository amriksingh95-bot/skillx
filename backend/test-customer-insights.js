const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testInsights() {
  console.log('--- Starting Customer Insights Integration Test ---');

  // 1. Find the merchant "Spice Bistro" (SKXTSPIC7464)
  const merchant = await prisma.merchant.findFirst({
    where: { merchantCode: 'SKXTSPIC7464' }
  });

  if (!merchant) {
    throw new Error('Merchant Spice Bistro not found in the seeded database.');
  }

  console.log(`Merchant ID: ${merchant.id}, Code: ${merchant.merchantCode}`);

  // Count before
  const initialByMe = await prisma.customer.count({
    where: { signedUpViaMerchantId: merchant.id }
  });
  console.log(`Initial customer count signed up by me: ${initialByMe}`);

  // Create a dummy customer via transaction simulation (matching authController behavior)
  const testMobile = '9111111111';
  // Delete if exists
  const existingTestUser = await prisma.user.findFirst({ where: { mobile: testMobile } });
  if (existingTestUser) {
    await prisma.pointsLedger.deleteMany({ where: { customer: { userId: existingTestUser.id } } });
    await prisma.transaction.deleteMany({ where: { customer: { userId: existingTestUser.id } } });
    await prisma.customer.deleteMany({ where: { userId: existingTestUser.id } });
    await prisma.user.delete({ where: { id: existingTestUser.id } });
  }

  const user = await prisma.user.create({
    data: {
      mobile: testMobile,
      password: 'dummyPasswordHash',
      role: 'customer'
    }
  });

  const customer = await prisma.customer.create({
    data: {
      userId: user.id,
      name: 'Test Insights Customer',
      qrCode: `SKILLXT-${testMobile}`,
      referralCode: 'SKXTTEST1234',
      signedUpViaMerchantId: merchant.id
    }
  });

  console.log(`Created test customer with signedUpViaMerchantId: ${customer.signedUpViaMerchantId}`);

  // Count after signup
  const postSignupByMe = await prisma.customer.count({
    where: { signedUpViaMerchantId: merchant.id }
  });
  console.log(`Post-signup customer count signed up by me: ${postSignupByMe}`);

  if (postSignupByMe !== initialByMe + 1) {
    throw new Error('Verification failed: signedUpByMe count did not increment!');
  }
  console.log('✔ Signup association verification PASSED');

  // Let's test the "fromNetwork" logic.
  // We need a customer who was signed up by another merchant (or null) but has a completed earn transaction with Spice Bistro.
  // Let's create a customer signed up by another source
  const networkMobile = '9222222222';
  const existingNetworkUser = await prisma.user.findFirst({ where: { mobile: networkMobile } });
  if (existingNetworkUser) {
    await prisma.pointsLedger.deleteMany({ where: { customer: { userId: existingNetworkUser.id } } });
    await prisma.transaction.deleteMany({ where: { customer: { userId: existingNetworkUser.id } } });
    await prisma.customer.deleteMany({ where: { userId: existingNetworkUser.id } });
    await prisma.user.delete({ where: { id: existingNetworkUser.id } });
  }

  const netUser = await prisma.user.create({
    data: {
      mobile: networkMobile,
      password: 'dummyPasswordHash',
      role: 'customer'
    }
  });

  const netCustomer = await prisma.customer.create({
    data: {
      userId: netUser.id,
      name: 'Network Shopper Customer',
      qrCode: `SKILLXT-${networkMobile}`,
      referralCode: 'SKXTNET9999',
      signedUpViaMerchantId: null // registered directly
    }
  });

  // Check initial network shopper count
  const earnTransactionsInit = await prisma.transaction.findMany({
    where: { merchantId: merchant.id, type: 'earn', status: 'completed' },
    select: { customerId: true }
  });
  const shopperCustomerIdsInit = [...new Set(earnTransactionsInit.map(tx => tx.customerId))];
  const initialFromNetwork = await prisma.customer.count({
    where: {
      id: { in: shopperCustomerIdsInit },
      OR: [
        { signedUpViaMerchantId: null },
        { signedUpViaMerchantId: { not: merchant.id } }
      ]
    }
  });
  console.log(`Initial shoppers from network: ${initialFromNetwork}`);

  // Create a completed 'earn' transaction for this network shopper at Spice Bistro
  const tx = await prisma.transaction.create({
    data: {
      customerId: netCustomer.id,
      merchantId: merchant.id,
      type: 'earn',
      points: 50,
      status: 'completed'
    }
  });

  console.log(`Simulated earn transaction ${tx.id} for network shopper at merchant`);

  // Count network shoppers after transaction
  const earnTransactionsPost = await prisma.transaction.findMany({
    where: { merchantId: merchant.id, type: 'earn', status: 'completed' },
    select: { customerId: true }
  });
  const shopperCustomerIdsPost = [...new Set(earnTransactionsPost.map(tx => tx.customerId))];
  const postFromNetwork = await prisma.customer.count({
    where: {
      id: { in: shopperCustomerIdsPost },
      OR: [
        { signedUpViaMerchantId: null },
        { signedUpViaMerchantId: { not: merchant.id } }
      ]
    }
  });
  console.log(`Post-transaction shoppers from network: ${postFromNetwork}`);

  if (postFromNetwork !== initialFromNetwork + 1) {
    throw new Error('Verification failed: fromNetwork count did not increment!');
  }
  console.log('✔ Network shoppers count verification PASSED');

  // Clean up
  await prisma.pointsLedger.deleteMany({ where: { customerId: { in: [customer.id, netCustomer.id] } } });
  await prisma.transaction.deleteMany({ where: { customerId: { in: [customer.id, netCustomer.id] } } });
  await prisma.customer.deleteMany({ where: { id: { in: [customer.id, netCustomer.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [user.id, netUser.id] } } });

  console.log('--- All Customer Insights Integration Tests PASSED! ---');
}

testInsights()
  .catch((e) => {
    console.error('Test failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
