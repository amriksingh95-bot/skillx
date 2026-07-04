const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function backfill() {
  console.log('Starting merchantCode backfill script...');

  const merchants = await prisma.merchant.findMany({
    where: {
      merchantCode: null
    }
  });

  console.log(`Found ${merchants.length} merchants needing a code.`);

  for (const m of merchants) {
    const businessName = m.businessName;
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

    if (!isUnique) {
      console.error(`Failed to generate unique code for merchant ID ${m.id} (${m.businessName}) after 10 attempts.`);
      continue;
    }

    await prisma.merchant.update({
      where: { id: m.id },
      data: { merchantCode: merchantCodeGenerated }
    });

    console.log(`Updated merchant ID ${m.id} (${m.businessName}) -> ${merchantCodeGenerated}`);
  }

  console.log('Backfill script finished successfully!');
}

backfill()
  .catch((e) => {
    console.error('Backfill script failed:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
