const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

async function main() {
  console.log('=== VERIFY REFERRAL BONUS DELAY & BLACKLIST ===');

  // 1. Setup a referrer
  let referrer = await prisma.customer.findFirst({
    where: { name: 'Test Referrer' }
  });
  if (!referrer) {
    // check if user already exists
    let user = await prisma.user.findUnique({
      where: { mobile: '9999999999' }
    });
    if (!user) {
      user = await prisma.user.create({
        data: {
          mobile: '9999999999',
          password: 'password',
          role: 'customer'
        }
      });
    }
    referrer = await prisma.customer.create({
      data: {
        userId: user.id,
        name: 'Test Referrer',
        qrCode: 'TEST-QR-REFERRER',
        referralCode: 'SKXTREF1234'
      }
    });
    console.log('Created Test Referrer:', referrer.id);
  } else {
    console.log('Found Test Referrer:', referrer.id, 'Code:', referrer.referralCode);
  }

  // 2. Clear out any previous test customer with mobile '9999999991'
  const prevUser = await prisma.user.findFirst({
    where: { mobile: '9999999991' },
    include: { customer: true }
  });
  if (prevUser) {
    if (prevUser.customer) {
      await prisma.pointsLedger.deleteMany({ where: { customerId: prevUser.customer.id } });
      await prisma.transaction.deleteMany({ where: { customerId: prevUser.customer.id } });
      await prisma.customer.delete({ where: { id: prevUser.customer.id } });
    }
    await prisma.refreshToken.deleteMany({ where: { userId: prevUser.id } });
    await prisma.user.delete({ where: { id: prevUser.id } });
    console.log('Cleaned up previous test user');
  }

  // Clear blacklist entry if exists for 9999999991
  const mobHash = crypto.createHash('sha256').update('9999999991').digest('hex');
  await prisma.usedReferralIdentifier.deleteMany({
    where: { mobileHash: mobHash }
  });

  // 3. Simulate registering a user with referral code
  console.log('\n--- Registering new customer (referred by Test Referrer) ---');
  // Normally the OTP verified record must exist, but we mock the db call or we create one
  await prisma.oTPVerification.create({
    data: {
      mobile: '9999999991',
      otp: '123456',
      verified: true,
      expiresAt: new Date(Date.now() + 600000)
    }
  });

  // We can call register controller directly
  const req = {
    body: {
      name: 'Test Referee',
      mobile: '9999999991',
      email: 'referee@test.com',
      password: 'password',
      otp: '123456',
      referralCode: 'SKXTREF1234'
    },
    ip: '127.0.0.1'
  };

  const res = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.data = data;
      return this;
    }
  };

  const next = (err) => {
    if (err) {
      console.error('Registration failed:', err);
      throw err;
    }
  };

  const authController = require('./src/controllers/authController');
  await authController.register(req, res, next);

  console.log('Registration Response Status:', res.statusCode);
  console.log('Registration Response Data:', JSON.stringify(res.data, null, 2));

  // Verify that referee record is created with referredBy, but no transactions
  const referee = await prisma.customer.findFirst({
    where: { name: 'Test Referee' }
  });
  console.log('Referee record:', referee ? 'FOUND' : 'NOT FOUND');
  console.log('Referred By ID:', referee.referredBy);

  const refereeTxs = await prisma.transaction.findMany({
    where: { customerId: referee.id }
  });
  console.log('Referee Transactions Count:', refereeTxs.length);
  if (refereeTxs.length > 0) {
    console.error('FAIL: Referee received immediate points!');
  } else {
    console.log('PASS: No immediate points awarded at signup.');
  }

  // 4. Issue first earn transaction
  console.log('\n--- Issuing first real earn transaction ---');
  const merchant = await prisma.merchant.findFirst({
    where: { isActive: true }
  });
  if (!merchant) {
    console.error('No active merchant found for testing!');
    return;
  }
  console.log('Using active merchant:', merchant.businessName, '(', merchant.id, ')');

  // Let's call merchantController.earn
  const earnReq = {
    body: {
      customerId: referee.id,
      purchaseAmount: 100
    },
    user: {
      id: merchant.userId,
      merchantId: merchant.id
    },
    ip: '127.0.0.1'
  };

  const earnRes = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.data = data;
      return this;
    }
  };

  const merchantController = require('./src/controllers/merchantController');
  await merchantController.earn(earnReq, earnRes, next);

  console.log('Earn Response Status:', earnRes.statusCode);
  console.log('Earn Response Data:', JSON.stringify(earnRes.data, null, 2));

  // Verify that the referral bonus has now been awarded
  const newRefereeTxs = await prisma.transaction.findMany({
    where: { customerId: referee.id }
  });
  console.log('Referee Transactions Count after Earn:', newRefereeTxs.length);
  newRefereeTxs.forEach(t => {
    console.log(`  Tx Type: ${t.type}, Points: ${t.points}, Remarks: ${t.remarks}`);
  });

  const referrerTxs = await prisma.transaction.findMany({
    where: {
      customerId: referrer.id,
      remarks: { contains: 'Referral Bonus' }
    }
  });
  console.log('Referrer Referral Bonus Transactions:', referrerTxs.length);
  referrerTxs.forEach(t => {
    console.log(`  Tx Type: ${t.type}, Points: ${t.points}, Remarks: ${t.remarks}`);
  });

  const refereeBonus = newRefereeTxs.find(t => t.remarks.includes('Referral Bonus (Referee)'));
  const referrerBonus = referrerTxs.find(t => t.remarks.includes('Referral Bonus (Referrer)'));

  if (refereeBonus && referrerBonus) {
    console.log('PASS: Both referee and referrer received their 20 points referral bonus!');
  } else {
    console.error('FAIL: Referral bonus not awarded correctly!');
  }

  // 5. Test Blacklist / Duplicate Registration Prevention
  console.log('\n--- Testing Blacklist / Re-registration Prevention ---');
  // First, let's anonymize the customer referee we just created
  console.log('Anonymizing Referee...');
  // We'll run the anonymizeUser.js script via child_process
  const { execSync } = require('child_process');
  execSync(`node scripts/anonymizeUser.js 9999999991`, { stdio: 'inherit' });

  // Now, verify that a UsedReferralIdentifier record exists with referee's hashed mobile
  const usedRef = await prisma.usedReferralIdentifier.findFirst({
    where: { mobileHash: mobHash }
  });
  if (usedRef) {
    console.log('PASS: UsedReferralIdentifier record created for anonymized mobile:', usedRef.mobileHash);
  } else {
    console.error('FAIL: UsedReferralIdentifier record NOT created!');
  }

  // Now try to register a new user with the same phone number 9999999991 and referral code
  console.log('\n--- Registering new customer with anonymized mobile ---');
  await prisma.oTPVerification.create({
    data: {
      mobile: '9999999991',
      otp: '654321',
      verified: true,
      expiresAt: new Date(Date.now() + 600000)
    }
  });

  const req2 = {
    body: {
      name: 'Test Referee 2',
      mobile: '9999999991',
      email: 'referee2@test.com',
      password: 'password',
      otp: '654321',
      referralCode: 'SKXTREF1234'
    },
    ip: '127.0.0.1'
  };

  const res2 = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.data = data;
      return this;
    }
  };

  await authController.register(req2, res2, next);

  console.log('Second Registration Response Status:', res2.statusCode);
  console.log('Second Registration Response Data:', JSON.stringify(res2.data, null, 2));

  // Verify that the second referee is created, but referredBy is null!
  const referee2 = await prisma.customer.findFirst({
    where: { name: 'Test Referee 2' }
  });
  console.log('Referee 2 record:', referee2 ? 'FOUND' : 'NOT FOUND');
  console.log('Referee 2 Referred By ID:', referee2.referredBy);
  if (referee2.referredBy === null) {
    console.log('PASS: Re-registration detected, referral relationship blocked (referredBy is null).');
  } else {
    console.error('FAIL: Referral relationship was NOT blocked for re-registering mobile!');
  }

  // Cleanup referee 2
  if (referee2) {
    await prisma.pointsLedger.deleteMany({ where: { customerId: referee2.id } });
    await prisma.transaction.deleteMany({ where: { customerId: referee2.id } });
    await prisma.customer.delete({ where: { id: referee2.id } });
    const user2 = await prisma.user.findFirst({ where: { mobile: '9999999991' } });
    if (user2) {
      await prisma.refreshToken.deleteMany({ where: { userId: user2.id } });
      await prisma.user.delete({ where: { id: user2.id } });
    }
  }

  // Cleanup used referral identifier
  await prisma.usedReferralIdentifier.deleteMany({
    where: { mobileHash: mobHash }
  });

  console.log('\nVerification complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
