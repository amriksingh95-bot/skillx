/**
 * Canonical merchant category definitions — Frontend copy.
 *
 * Mirrors backend/src/constants/categories.js.
 * Import from here in all frontend components.
 */

export const CATEGORIES = [
  { code: 'grocery',     label: 'Grocery' },
  { code: 'medical',     label: 'Pharmacy' },
  { code: 'doctor',      label: 'Clinic' },
  { code: 'cafe',        label: 'Cafe' },
  { code: 'restaurant',  label: 'Restaurant' },
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
export const CATEGORY_CODES = CATEGORIES.map(c => c.code);

/** Code -> label lookup, e.g. { grocery: 'Grocery', medical: 'Pharmacy', ... } */
export const CATEGORY_LABEL_MAP = Object.fromEntries(
  CATEGORIES.map(c => [c.code, c.label])
);

/**
 * Map legacy / user-entered category strings to the canonical code.
 * Returns the canonical code if recognized, or the lowercased trimmed
 * input as-is (for custom "other" values stored by admins).
 */
export function normalizeCategory(raw) {
  if (!raw || typeof raw !== 'string') return '';
  const v = raw.trim().toLowerCase();
  if (CATEGORY_CODES.includes(v)) return v;

  const ALIASES = {
    pharmacy:            'medical',
    clinic:              'doctor',
    salon:               'beauty',
    boutique:            'fashion',
    general:             'other',
    'departmental store': 'other',
    everyday:            'grocery',
    lifestyle:           'beauty',
    premium:             'electronics',
  };

  return ALIASES[v] || v;
}
