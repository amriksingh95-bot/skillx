const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function generateUniqueReferralCode(tx) {
  let code = '';
  let unique = false;
  let attempts = 0;
  while (!unique && attempts < 10) {
    const suffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    code = `REF${suffix}`;
    const existing = await tx.merchant.findUnique({ where: { merchantReferralCode: code } });
    if (!existing) {
      unique = true;
    }
    attempts++;
  }
  return code;
}

async function main() {
  const merchants = await prisma.merchant.findMany({
    where: { merchantReferralCode: null },
    select: { id: true, businessName: true, merchantCode: true }
  });

  console.log(`Found ${merchants.length} merchants with null merchantReferralCode.\n`);

  if (merchants.length === 0) {
    console.log('Nothing to backfill.');
    return;
  }

  let fixed = 0;
  for (const m of merchants) {
    const code = await generateUniqueReferralCode(prisma);
    if (!code) {
      console.log(`  SKIP ${m.id} (${m.businessName}) — failed to generate unique code`);
      continue;
    }
    await prisma.merchant.update({
      where: { id: m.id },
      data: { merchantReferralCode: code }
    });
    fixed++;
    console.log(`  ${m.businessName || 'Unknown'} (${m.id}) → ${code}`);
  }

  console.log(`\nDone. ${fixed} / ${merchants.length} merchants updated.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
