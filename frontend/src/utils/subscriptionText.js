/**
 * Pure display helpers for subscription expiry text.
 * Kept free of React so they can be unit-tested directly.
 */

/**
 * "Expired N days ago" label, or null when there is no usable day count.
 * @param {number|null|undefined} daysExpired
 * @returns {string|null}
 */
export function expiredDaysAgoLabel(daysExpired) {
  if (daysExpired == null || Number.isNaN(daysExpired) || daysExpired < 0) return null;
  return `Expired ${daysExpired} days ago`;
}

/**
 * Prefix for the subscription end-date line: "Expired" only once the
 * subscription is past grace; every other status keeps "Expires".
 * @param {string|undefined|null} status
 * @returns {string}
 */
export function expiryDatePrefix(status) {
  return status === 'expired' ? 'Expired' : 'Expires';
}

/**
 * Bottom-ribbon text for a merchant subscription.
 * Expired-beyond-grace merchants see a days-ago message; all other statuses
 * keep the existing "expires on / expired on <date>" wording.
 * @param {{endDate?: Date|string|null, status?: string, daysExpired?: number|null}|null} subscription
 * @returns {string}
 */
export function ribbonSubscriptionText(subscription) {
  if (!subscription?.endDate) return '';

  if (subscription.status === 'expired') {
    const label = expiredDaysAgoLabel(subscription.daysExpired);
    if (label) {
      return `Your subscription ${label.toLowerCase()} — renew now`;
    }
  }

  const daysLeft = Math.ceil((new Date(subscription.endDate) - new Date()) / (1000 * 60 * 60 * 24));
  const expiryLabel = daysLeft <= 0 ? 'expired on' : 'expires on';
  const dateStr = new Date(subscription.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  return `Your subscription ${expiryLabel} ${dateStr} — renew now`;
}
