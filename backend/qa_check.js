const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const http = require('http');
const prisma = new PrismaClient();

const JWT_SECRET = '250b30d6f03ae6676a6312f5cbd38789af367251e9522cd70f407557a8a7449205fdf6963458ebaa220afc2b842deb39c53f932044f27e4aaa2e040b65ad42a6';

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function getDirectionsUrl(ad) {
  const m = ad.merchant;
  if (!m) return null;
  if (m.googleMapsUrl) return m.googleMapsUrl;
  if (m.latitude && m.longitude) {
    return `https://www.google.com/maps/dir/?api=1&destination=${m.latitude},${m.longitude}`;
  }
  if (m.address || m.city) {
    const addr = [m.address, m.city].filter(Boolean).join(', ');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
  }
  return null;
}

async function main() {
  const customerToken = jwt.sign({ userId: 'c23be975-ff40-498f-b3e7-37b527ad733b', role: 'customer' }, JWT_SECRET, { expiresIn: '15m' });
  const merchantToken = jwt.sign({ userId: 'cdc887f4-8504-4820-ba89-a7a8ff16b61b', role: 'merchant' }, JWT_SECRET, { expiresIn: '15m' });
  const headers = { 'Authorization': `Bearer ${customerToken}` };

  // 1. GET /api/ads/active
  console.log('=== TEST 1: GET /api/ads/active ===');
  const activeRes = await request({
    hostname: 'localhost', port: 5000, path: '/api/ads/active', method: 'GET',
    headers
  });
  console.log('Status:', activeRes.status);
  if (activeRes.status === 200 && activeRes.data.success) {
    console.log('Active ads count:', activeRes.data.data.length);
    activeRes.data.data.forEach((ad, i) => {
      const dirUrl = getDirectionsUrl(ad);
      console.log(`Ad ${i+1}: ${ad.title}`);
      console.log(`  showDirections: ${ad.showDirections}`);
      console.log(`  merchant: ${ad.merchant?.businessName}`);
      console.log(`  address: ${ad.merchant?.address}`);
      console.log(`  city: ${ad.merchant?.city}`);
      console.log(`  lat/lng: ${ad.merchant?.latitude}, ${ad.merchant?.longitude}`);
      console.log(`  googleMapsUrl: ${ad.merchant?.googleMapsUrl}`);
      console.log(`  directionsUrl: ${dirUrl}`);
      console.log(`  clicks: ${ad.clicks}`);
      console.log(`  canShowDirections: ${ad.showDirections && dirUrl ? 'YES' : 'NO'}`);
    });
  } else {
    console.log('FAILED:', JSON.stringify(activeRes.data));
  }

  // 2. PATCH click on Ad A (FreshMart, showDirections=true, has lat/long)
  const adAId = '7b2a7b3f-1370-47d4-bb19-e1cbe7033502';
  console.log('\n=== TEST 2: PATCH /api/ads/:id/click on Ad A ===');
  const before = await prisma.advertisement.findUnique({ where: { id: adAId }, select: { clicks: true } });
  console.log('Clicks before:', before.clicks);

  const clickRes = await request({
    hostname: 'localhost', port: 5000, path: `/api/ads/${adAId}/click`, method: 'PATCH',
    headers
  });
  console.log('Click status:', clickRes.status);
  console.log('Click response:', JSON.stringify(clickRes.data));

  const after = await prisma.advertisement.findUnique({ where: { id: adAId }, select: { clicks: true } });
  console.log('Clicks after:', after.clicks);
  console.log('Clicks incremented by:', after.clicks - before.clicks);

  // 3. Edge case - Ad C (StyleHub, null location, showDirections=true)
  const adCId = '6be14e8b-0987-4a8a-8f1a-2e4d8e72d86a';
  console.log('\n=== TEST 3: Edge case - null location ===');
  const adC = await prisma.advertisement.findUnique({
    where: { id: adCId },
    include: { merchant: { select: { businessName: true, address: true, city: true, latitude: true, longitude: true, googleMapsUrl: true } } }
  });
  const dirUrlC = getDirectionsUrl(adC);
  console.log('Ad C title:', adC.title);
  console.log('showDirections:', adC.showDirections);
  console.log('Merchant:', JSON.stringify(adC.merchant, null, 2));
  console.log('directionsUrl:', dirUrlC);
  console.log('canShowDirections:', adC.showDirections && dirUrlC ? 'YES' : 'NO');
  console.log('Expected: NO because directionsUrl is null');

  // 4. Verify admin panel data structure
  console.log('\n=== TEST 4: Admin panel data check ===');
  const adminAds = await prisma.advertisement.findMany({
    include: { merchant: { select: { businessName: true } } },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  adminAds.forEach(ad => {
    console.log(`ID: ${ad.id}`);
    console.log(`  Title: ${ad.title}`);
    console.log(`  showDirections: ${ad.showDirections}`);
    console.log(`  Merchant: ${ad.merchant?.businessName}`);
    console.log(`  Admin table would show: ${ad.showDirections ? 'Show Directions (green)' : 'Awareness Only (slate)'}`);
  });

  // 5. Verify showDirections=false ad in active feed
  console.log('\n=== TEST 5: showDirections=false in active feed ===');
  const adBId = '9819c5d6-61cc-4966-8fb2-fa977de643fe';
  const adBInFeed = activeRes.data.data.find(a => a.id === adBId);
  if (adBInFeed) {
    console.log('Ad B found in active feed');
    console.log('  showDirections:', adBInFeed.showDirections);
    console.log('  canShowDirections:', adBInFeed.showDirections && getDirectionsUrl(adBInFeed) ? 'YES' : 'NO');
  } else {
    console.log('Ad B NOT found in active feed (unexpected)');
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
