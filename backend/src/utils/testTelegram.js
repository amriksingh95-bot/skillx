require('dotenv').config();
const { sendTelegramAlert } = require('./whatsappNotify.js');

sendTelegramAlert('🔔 SkillXT Admin Alert Test - New Merchant Registration: Test Business, Owner: Test Owner, Mobile: 9999999999, City: Ludhiana, Category: Retail - Action Required!')
  .catch((err) => console.error('Test error:', err));