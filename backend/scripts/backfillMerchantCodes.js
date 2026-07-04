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
  const merchants = await prisma.merchant.findMany({
    where: { merchantCode: null },
    select: { id: true, businessName: true }
  });

  console.log(`Found ${merchants.length} merchants with null merchantCode\n`);

  for (const merchant of merchants) {
    const code = await generateMerchantCode(merchant.businessName);
    await prisma.merchant.update({
      where: { id: merchant.id },
      data: { merchantCode: code }
    });
    console.log(`Updated: ${merchant.businessName} -> ${code}`);
  }

  console.log('\nBackfill complete.');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Error:', e);
  await prisma.$disconnect();
  process.exit(1);
});
