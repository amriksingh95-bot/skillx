const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  console.log('Clearing old seed data...');
  // Delete in reverse order of relationships
  await prisma.pointsLedger.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.advertisement.deleteMany({});
  await prisma.complaint.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.merchantSubscription.deleteMany({});
  await prisma.subscriptionPlan.deleteMany({});
  await prisma.pointsTopUp.deleteMany({});
  await prisma.merchant.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.rewardSettings.deleteMany({});
  await prisma.oTPVerification.deleteMany({});
  await prisma.oTPAttempt.deleteMany({});
  await prisma.milestoneBonus.deleteMany({});

  console.log('Seeding RewardSettings...');
  await prisma.rewardSettings.create({
    data: {
      pointsPerRupee: 0.10,  // Rs. 10 = 1 point
      rupeesPerPoint: 0.10,  // 100 points = Rs. 10
      minRedeemPoints: 100,
      pointsExpiryDays: 365,  // Points expire after 1 year
      redemptionFeePercent: 5.00  // 5% platform fee on redemptions
    }
  });

  console.log('Seeding SubscriptionPlans...');
  await prisma.subscriptionPlan.createMany({
    data: [
      {
        name: 'monthly',
        displayName: 'Monthly Plan',
        price: 399,
        durationDays: 30,
        features: JSON.stringify(['Basic support', 'Unlimited transactions', 'Standard analytics'])
      },
      {
        name: 'quarterly',
        displayName: 'Quarterly Plan',
        price: 1099,
        durationDays: 90,
        features: JSON.stringify(['Priority support', 'Unlimited transactions', 'Advanced analytics', 'Save ₹98 vs monthly'])
      },
      {
        name: 'annual',
        displayName: 'Annual Plan',
        price: 3999,
        durationDays: 365,
        features: JSON.stringify(['Premium support', 'Unlimited transactions', 'Full analytics suite', '25% savings vs monthly'])
      }
    ]
  });

  console.log('Seeding MilestoneBonus...');
  await prisma.milestoneBonus.createMany({
    data: [
      { spendTarget: 5000, bonusPoints: 100 },
      { spendTarget: 10000, bonusPoints: 300 },
      { spendTarget: 25000, bonusPoints: 1000 }
    ]
  });

  console.log('Seeding Super Admin...');
  const adminPasswordHash = await bcrypt.hash('Admin@123456', 10);
  await prisma.user.create({
    data: {
      email: 'admin@skillxt.com',
      mobile: '9999999999',
      password: adminPasswordHash,
      role: 'super_admin'
    }
  });

  console.log('Seeding Dummy Password...');
  const dummyPasswordHash = await bcrypt.hash('dummy@123', 10);

  console.log('Seeding Dummy Merchants...');
  const merchantPassword = await bcrypt.hash('dummy@123', 10);

  const merchantData = [
    { business: 'FreshMart Grocery', owner: 'Amrik Singh', email: 'freshmartgrocery@skillxt.com', mobile: '9000000001', category: 'Grocery' },
    { business: 'MediPlus Pharmacy', owner: 'Rahul Sharma', email: 'medipluspharmacy@skillxt.com', mobile: '9000000002', category: 'Pharmacy' },
    { business: 'BrewBeans Cafe', owner: 'Priya Singh', email: 'brewbeanscafe@skillxt.com', mobile: '9000000003', category: 'Cafe' },
    { business: 'Dr. Sharma Clinic', owner: 'Dr. Sharma', email: 'drsharmaclinic@skillxt.com', mobile: '9000000004', category: 'Clinic' },
    { business: 'TechZone Electronics', owner: 'Vikram Patel', email: 'techzoneelectronics@skillxt.com', mobile: '9000000005', category: 'Electronics' },
    { business: 'StyleHub Fashion', owner: 'Neha Gupta', email: 'stylehubfashion@skillxt.com', mobile: '9000000006', category: 'Fashion' },
    { business: 'QuickStop General', owner: 'Suresh Kumar', email: 'quickstopgeneral@skillxt.com', mobile: '9000000007', category: 'General' },
  ];

  for (const m of merchantData) {
    const merchantUser = await prisma.user.create({
      data: {
        email: m.email,
        mobile: m.mobile,
        password: merchantPassword,
        role: 'merchant',
        isActive: true,
      }
    });
    await prisma.merchant.create({
      data: {
        userId: merchantUser.id,
        businessName: m.business,
        ownerName: m.owner,
        email: m.email,
        category: m.category,
        city: 'Ludhiana',
        address: 'Ludhiana, Punjab',
        status: 'active',
        pointsBalance: 1000,
        merchantCode: m.mobile,
      }
    });
  }

  console.log('Seeding Dummy Customers...');
  const customerPassword = await bcrypt.hash('dummy@123', 10);

  for (let i = 1; i <= 20; i++) {
    const mobile = `800000000${i.toString().padStart(1, '0')}`;
    const paddedMobile = `80000000${i.toString().padStart(2, '0')}`;
    const customerUser = await prisma.user.create({
      data: {
        email: `customer${i}@skillxt.com`,
        mobile: paddedMobile,
        password: customerPassword,
        role: 'customer',
        isActive: true,
      }
    });
    await prisma.customer.create({
      data: {
        userId: customerUser.id,
        name: `Customer ${i}`,
        qrCode: `SKILLXT-${paddedMobile}`,
        referralCode: `REF-${paddedMobile.substring(5)}`,
      }
    });
  }

  console.log('Seeding successfully completed!');
}

main()
  .catch((e) => {
    console.error('Seed execution error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
