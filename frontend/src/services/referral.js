/**
 * Shared referral link helper.
 * Single source of truth for generating referral URLs across the application.
 */

/**
 * Build the absolute referral sign-up URL for a given referral code.
 * Uses VITE_APP_URL when available, falls back to window.location.origin.
 *
 * @param {string} referralCode - The customer's unique referral code.
 * @returns {string} The full referral URL (e.g. "https://skillxt.com/register?ref=SKXTJOHN1234").
 */
export function buildReferralUrl(referralCode) {
  const base = import.meta.env.VITE_APP_URL || window.location.origin;
  return `${base}/register?ref=${encodeURIComponent(referralCode)}`;
}

/**
 * Build the WhatsApp share text containing the referral link.
 *
 * @param {string} referralCode - The customer's unique referral code.
 * @returns {string} The URL-encoded WhatsApp message.
 */
export function buildWhatsAppShareText(referralCode) {
  const url = buildReferralUrl(referralCode);
  const text = `🎁 *Join SkillXT Rewards!*

I'm inviting you to earn loyalty points at your favourite local stores in Ludhiana.

🎉 We both get *20 bonus points* instantly on signup!

👉 *Referral Code:*
${referralCode}

📲 *Click to join:*
${url}`;
  return encodeURIComponent(text);
}

/**
 * Share the referral link via the native Web Share API or fall back to clipboard.
 *
 * @param {string} referralCode - The customer's unique referral code.
 * @returns {Promise<void>}
 */
export async function shareReferralLink(referralCode) {
  const url = buildReferralUrl(referralCode);

  if (navigator.share) {
    await navigator.share({
      title: 'Join SkillXT Rewards',
      text: `Use my referral code ${referralCode} to get 20 points on sign up!`,
      url,
    });
  } else {
    await secureCopy(url);
  }
}

function fallbackCopy(text) {
  return new Promise((resolve, reject) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand('copy');
      resolve();
    } catch {
      reject(new Error('Copy failed'));
    } finally {
      document.body.removeChild(textarea);
    }
  });
}

async function secureCopy(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
  } else {
    await fallbackCopy(text);
  }
}

/**
 * Copy the raw referral code to the clipboard.
 *
 * @param {string} referralCode - The customer's unique referral code.
 * @returns {Promise<void>}
 */
export async function copyReferralCode(referralCode) {
  await secureCopy(referralCode);
}

/**
 * Copy the full referral URL to the clipboard.
 *
 * @param {string} referralCode - The customer's unique referral code.
 * @returns {Promise<void>}
 */
export async function copyReferralUrl(referralCode) {
  await secureCopy(buildReferralUrl(referralCode));
}
