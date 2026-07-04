const ADMIN_WHATSAPP_NUMBER = process.env.ADMIN_WHATSAPP_NUMBER;
const ADMIN_WHATSAPP_APIKEY = process.env.ADMIN_WHATSAPP_APIKEY;
const TELEGRAM_USER_ID = process.env.TELEGRAM_USER_ID;

async function sendWhatsAppAlert(message) {
  if (!ADMIN_WHATSAPP_NUMBER || !ADMIN_WHATSAPP_APIKEY) {
    console.warn('[WhatsApp] ADMIN_WHATSAPP_NUMBER or ADMIN_WHATSAPP_APIKEY not configured. Skipping alert.');
    return;
  }

  try {
    const phone = process.env.ADMIN_WHATSAPP_NUMBER.startsWith('+')
      ? process.env.ADMIN_WHATSAPP_NUMBER
      : '+' + process.env.ADMIN_WHATSAPP_NUMBER;
    const encodedMessage = encodeURIComponent(message);
    const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodedMessage}&apikey=${ADMIN_WHATSAPP_APIKEY}`;

    const response = await fetch(url);

    if (!response.ok) {
      console.error(`[WhatsApp] Failed to send alert. Status: ${response.status}`);
      return;
    }

    const text = await response.text();
    if (text.toLowerCase().includes('success')) {
      console.log('[WhatsApp] Alert sent successfully');
    } else {
      console.error(`[WhatsApp] CallMeBot returned: ${text}`);
    }
  } catch (error) {
    console.error('[WhatsApp] Error sending alert:', error.message);
  }
}

async function sendTelegramAlert(message) {
  if (!TELEGRAM_USER_ID) {
    console.warn('[Telegram] TELEGRAM_USER_ID not configured. Skipping alert.');
    return;
  }

  try {
    const normalizedMessage = message.replace(/%0A/g, '\n');
    const encodedMessage = encodeURIComponent(normalizedMessage);
    const url = `https://api.callmebot.com/text.php?user=@SkillXT&text=${encodedMessage}`;

    const response = await fetch(url);

    if (!response.ok) {
      console.error(`[Telegram] Failed to send alert. Status: ${response.status}`);
      return;
    }

    const text = await response.text();
    if (text.toLowerCase().includes('success')) {
      console.log('[Telegram] Alert sent successfully');
    } else {
      console.error(`[Telegram] CallMeBot returned: ${text}`);
    }
  } catch (error) {
    console.error('[Telegram] Error sending alert:', error.message);
  }
}

module.exports = {
  sendWhatsAppAlert,
  sendTelegramAlert
};
