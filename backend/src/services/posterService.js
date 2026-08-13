const path = require('path');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const QRCode = require('qrcode');
const prisma = require('../lib/prisma');

const TEMPLATE_PATH = path.join(__dirname, '..', 'assets', 'final_skillxt_poster_upscaled_A4_300dpi.png');
const TEMPLATE_W = 2480;
const TEMPLATE_H = 3508;

const FONT_PATH = path.join(__dirname, '..', 'assets', 'fonts', 'DejaVuSans-Bold.ttf');
const FONT_FAMILY = 'SkillXTFont';
let fontRegistered = false;

function ensureFontRegistered() {
  if (fontRegistered) return;
  const ok = GlobalFonts.registerFromPath(FONT_PATH, FONT_FAMILY);
  if (!ok) throw new Error(`Failed to register poster font: ${FONT_PATH}`);
  fontRegistered = true;
}

const QR_X = 714;
const QR_Y = 800;
const QR_SIZE = 1050;

const NAME_ZONE = { x: 700, y: 2095, w: 1080, h: 100 };
const CODE_ZONE = { x: 760, y: 2215, w: 960, h: 110 };

async function generatePosterBuffer(merchant) {
  ensureFontRegistered();

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

  // Business name — erase baked placeholder text, then draw real name auto-shrunk to fit zone
  const name = merchant.businessName || '';
  ctx.fillStyle = 'rgb(251, 251, 251)';
  ctx.fillRect(NAME_ZONE.x, NAME_ZONE.y, NAME_ZONE.w, NAME_ZONE.h);

  let fontSize = 72;
  ctx.font = `bold ${fontSize}px ${FONT_FAMILY}`;
  ctx.fillStyle = '#0a1a3a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const nameCx = NAME_ZONE.x + NAME_ZONE.w / 2;
  const nameCy = NAME_ZONE.y + NAME_ZONE.h / 2;
  while (fontSize > 28 && ctx.measureText(name).width > NAME_ZONE.w) {
    fontSize -= 2;
    ctx.font = `bold ${fontSize}px ${FONT_FAMILY}`;
  }
  ctx.fillText(name, nameCx, nameCy);

  // Merchant code — erase baked placeholder text, then draw real code in white (visible on navy band)
  const codeText = `Code: ${merchant.merchantCode}`;
  const codeFontSize = 56;
  ctx.fillStyle = 'rgb(0, 17, 38)';
  ctx.fillRect(770, 2240, 950, 75);
  ctx.font = `bold ${codeFontSize}px ${FONT_FAMILY}`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const codeCx = CODE_ZONE.x + CODE_ZONE.w / 2;
  const codeCy = CODE_ZONE.y + CODE_ZONE.h / 2;
  ctx.fillText(codeText, codeCx, codeCy);

  return canvas.toBuffer('image/png');
}

module.exports = { generatePosterBuffer };
