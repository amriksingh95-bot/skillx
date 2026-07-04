const { PrismaClient } = require('./backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const results = await prisma.$queryRaw`
    SELECT t.type, t.remarks as description, t.points, t."createdAt"
    FROM "Transaction" t
    JOIN "Customer" c ON c.id = t."customerId"
    ORDER BY t."createdAt" DESC
    LIMIT 10;
  `;
  console.log(JSON.stringify(results, null, 2));
  await prisma.disconnect();
}
check().catch(e => { console.error(e); process.exit(1); });
