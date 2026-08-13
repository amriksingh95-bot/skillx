require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function generateMerchantCode(businessName) {
  const namePart = (businessName || '').replace(/[^a-zA-Z]/g, '').padEnd(4, 'X').substring(0, 4).toUpperCase();
  let merchantCodeGenerated = '';
  let isUnique = false;
  let attempts = 0;
  while (!isUnique && attempts < 10) {
    const digitsPart = Math.floor(1000 + Math.random() * 9000).toString();
    merchantCodeGenerated = `SKXT${namePart}${digitsPart}`;
    const existing = await prisma.merchant.findUnique({
      where: { merchantCode: merchantCodeGenerated }
    });
    if (!existing) {
      isUnique = true;
    }
    attempts++;
  }
  return merchantCodeGenerated;
}

async function main() {
  const dMerchants = await prisma.merchant.findMany({
    where: {
      businessName: { startsWith: 'D-' },
    },
    select: { id: true, businessName: true, merchantCode: true },
  });

  const affected = dMerchants.filter((m) => /^9[0-9]{9}$/.test(m.merchantCode || ''));

  console.log(`Found ${affected.length} demo merchants with phone-number merchantCode.\n`);

  for (const merchant of affected) {
    const code = await generateMerchantCode(merchant.businessName);
    await prisma.merchant.update({
      where: { id: merchant.id },
      data: { merchantCode: code },
    });
    console.log(`Updated: ${merchant.businessName} -> ${merchant.merchantCode} -> ${code}`);
  }

  console.log('\nBackfill complete.');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Error:', e);
  await prisma.$disconnect();
  process.exit(1);
});