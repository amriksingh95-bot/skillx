function isWhatsAppConfigured() {
  return !!(
    process.env.WHATSAPP_ACCESS_TOKEN &&
    !process.env.WHATSAPP_ACCESS_TOKEN.includes('your_whatsapp_temporary_or_permanent_access_token') &&
    process.env.WHATSAPP_PHONE_NUMBER_ID &&
    !process.env.WHATSAPP_PHONE_NUMBER_ID.includes('your_whatsapp_phone_number_id') &&
    process.env.WHATSAPP_TEMPLATE_NAME &&
    !process.env.WHATSAPP_TEMPLATE_NAME.includes('your_approved_template_name')
  );
}

/**
 * Sends OTP via WhatsApp Cloud API using an approved Meta template.
 * @param {string} mobile - recipient's mobile number
 * @param {string} otp - 6 digit OTP code
 * @param {string} purpose - OTP purpose ('register', 'reset', etc.)
 * @returns {Promise<{success: boolean, reason?: string}>}
 */
async function sendWhatsAppOTP(mobile, otp, purpose) {
  if (!isWhatsAppConfigured()) {
    return { success: false, reason: 'WhatsApp service not configured' };
  }

  // Format recipient number to E.164
  let formattedMobile = mobile.trim();
  // Strip spaces, dashes, or non-numeric characters (except leading +)
  formattedMobile = formattedMobile.replace(/[^\d+]/g, '');

  if (!formattedMobile.startsWith('+')) {
    if (formattedMobile.startsWith('91') && formattedMobile.length === 12) {
      formattedMobile = `+${formattedMobile}`;
    } else {
      formattedMobile = `+91${formattedMobile}`;
    }
  }

  try {
    const url = `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: formattedMobile,
        type: 'template',
        template: {
          name: process.env.WHATSAPP_TEMPLATE_NAME,
          language: {
            code: 'en_US'
          },
          components: [
            {
              type: 'body',
              parameters: [
                {
                  type: 'text',
                  text: otp
                }
              ]
            }
          ]
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errMsg = errorData.error?.message || `HTTP error! status: ${response.status}`;
      throw new Error(errMsg);
    }

    return { success: true };
  } catch (error) {
    console.warn(`[WhatsApp Service Warning]: Meta API failed to send WhatsApp message: ${error.message}`);
    return { success: false, reason: error.message };
  }
}

module.exports = {
  sendWhatsAppOTP,
  isWhatsAppConfigured
};
