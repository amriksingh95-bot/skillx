/**
 * Canonical merchant category definitions.
 * Single source of truth for both backend and frontend.
 *
 * Each category has:
 *   code  – lowercase string stored in the database and sent over the wire
 *   label – human-friendly label shown in UI
 */

const CATEGORIES = [
  { code: 'grocery',     label: 'Grocery' },
  { code: 'medical',     label: 'Pharmacy' },
  { code: 'doctor',      label: 'Clinic' },
  { code: 'cafe',        label: 'Cafe' },
  { code: 'electronics', label: 'Electronics' },
  { code: 'fashion',     label: 'Fashion' },
  { code: 'beauty',      label: 'Salon' },
  { code: 'stationery',  label: 'Stationery' },
  { code: 'gym',         label: 'Gym' },
  { code: 'hotel',       label: 'Hotel' },
  { code: 'education',   label: 'Education' },
  { code: 'other',       label: 'Other' },
];

/** Flat array of valid codes, e.g. ['grocery', 'medical', ...] */
const CATEGORY_CODES = CATEGORIES.map(c => c.code);

/** Code -> label lookup, e.g. { grocery: 'Grocery', medical: 'Pharmacy', ... } */
const CATEGORY_LABEL_MAP = Object.fromEntries(
  CATEGORIES.map(c => [c.code, c.label])
);

/**
 * Map legacy / user-entered category strings to the canonical code.
 * Returns the canonical code if recognized, or the lowercased trimmed
 * input as-is (for custom "other" values stored by admins).
 */
function normalizeCategory(raw) {
  if (!raw || typeof raw !== 'string') return '';
  const v = raw.trim().toLowerCase();
  if (CATEGORY_CODES.includes(v)) return v;

  // Legacy aliases from old dropdown / seed data
  const ALIASES = {
    pharmacy:          'medical',
    clinic:            'doctor',
    salon:             'beauty',
    boutique:          'fashion',
    restaurant:        'cafe',
    general:           'other',
    'departmental store': 'other',
    grocery:           'grocery',
    everyday:          'grocery',   // old signup grouping
    lifestyle:         'beauty',    // old signup grouping
    premium:           'electronics', // old signup grouping
  };

  return ALIASES[v] || v;
}

module.exports = {
  CATEGORIES,
  CATEGORY_CODES,
  CATEGORY_LABEL_MAP,
  normalizeCategory,
};
