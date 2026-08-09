const path = require('path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const QRCode = require('qrcode');
const prisma = require('../lib/prisma');

const TEMPLATE_PATH = path.join(__dirname, '..', 'assets', 'final_skillxt_poster_upscaled_A4_300dpi.png');
const TEMPLATE_W = 2480;
const TEMPLATE_H = 3508;

const QR_X = 714;
const QR_Y = 800;
const QR_SIZE = 1050;

const NAME_ZONE = { x: 700, y: 2095, w: 1080, h: 100 };
const CODE_ZONE = { x: 760, y: 2215, w: 960, h: 110 };

async function generatePosterBuffer(merchant) {
  const qrValue = `${process.env.FRONTEND_URL}/register?mcode=${merchant.merchantCode}`;

  const qrBuffer = await QRCode.toBuffer(qrValue, {
    type: 'png',
    width: QR_SIZE,
    margin: 0,
    color: { dark: '#000000', light: '#FFFFFF' },
  });

  const template = await loadImage(TEMPLATE_PATH);
  const qrImage = await loadImage(qrBuffer);

  const canvas = createCanvas(TEMPLATE_W, TEMPLATE_H);
  const ctx = canvas.getContext('2d');

  ctx.drawImage(template, 0, 0, TEMPLATE_W, TEMPLATE_H);
  ctx.drawImage(qrImage, QR_X, QR_Y, QR_SIZE, QR_SIZE);

  // Business name — auto-shrink to fit zone
  const name = merchant.businessName || '';
  let fontSize = 72;
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.fillStyle = '#0a1a3a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const nameCx = NAME_ZONE.x + NAME_ZONE.w / 2;
  const nameCy = NAME_ZONE.y + NAME_ZONE.h / 2;
  while (fontSize > 20 && ctx.measureText(name).width > NAME_ZONE.w) {
    fontSize -= 2;
    ctx.font = `bold ${fontSize}px sans-serif`;
  }
  ctx.fillText(name, nameCx, nameCy);

  // Merchant code
  const codeText = `Code: ${merchant.merchantCode}`;
  const codeFontSize = 56;
  ctx.font = `bold ${codeFontSize}px sans-serif`;
  ctx.fillStyle = '#0a1a3a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const codeCx = CODE_ZONE.x + CODE_ZONE.w / 2;
  const codeCy = CODE_ZONE.y + CODE_ZONE.h / 2;
  ctx.fillText(codeText, codeCx, codeCy);

  return canvas.toBuffer('image/png');
}

module.exports = { generatePosterBuffer };
