const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, './.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function backfill() {
  console.log('Starting QR code backfill script...');
  const customers = await prisma.customer.findMany();
  console.log(`Found ${customers.length} customer records.`);
  
  let updatedCount = 0;
  for (const customer of customers) {
    const expectedQrCode = `SKILLXT-${customer.id}`;
    if (!customer.qrCode || customer.qrCode !== expectedQrCode) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { qrCode: expectedQrCode }
      });
      console.log(`Updated customer ${customer.name} (${customer.id}) with QR Code: ${expectedQrCode}`);
      updatedCount++;
    }
  }

  console.log(`Backfill completed. Updated ${updatedCount} customer(s).`);
}

backfill()
  .catch((e) => {
    console.error('Error in backfill script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
