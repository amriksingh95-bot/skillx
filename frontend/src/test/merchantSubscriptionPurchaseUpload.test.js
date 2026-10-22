import { describe, it, expect } from 'vitest';
import { getPurchaseUploadPath, validatePurchaseProofFile } from '../pages/merchant/MerchantSubscription';

const SUB_ID = '82765814-be76-4fac-acdb-38cb17b116b7';

describe('getPurchaseUploadPath (which endpoint each status uses)', () => {
  it('uses renewal upload when a subscription record exists (active/grace_period/expired)', () => {
    expect(getPurchaseUploadPath(SUB_ID)).toBe('/api/merchant/subscription/renewal/upload-screenshot');
  });

  it('uses the activation upload path when there is no subscription record (status none)', () => {
    expect(getPurchaseUploadPath(undefined)).toBe('/api/merchant/subscription/upload-screenshot');
    expect(getPurchaseUploadPath(null)).toBe('/api/merchant/subscription/upload-screenshot');
  });
});

describe('validatePurchaseProofFile', () => {
  it('rejects a missing file', () => {
    expect(validatePurchaseProofFile(null)).toBeTruthy();
    expect(validatePurchaseProofFile(undefined)).toBeTruthy();
  });

  it('rejects files that are not image or PDF', () => {
    expect(validatePurchaseProofFile(new File(['x'], 'note.txt', { type: 'text/plain' }))).toBeTruthy();
  });

  it('accepts images and PDFs at or under 5 MB', () => {
    expect(validatePurchaseProofFile(new File(['x'], 'proof.png', { type: 'image/png' }))).toBeNull();
    expect(validatePurchaseProofFile(new File(['x'], 'proof.pdf', { type: 'application/pdf' }))).toBeNull();
  });

  it('rejects PDFs larger than the backend 5 MB limit', () => {
    const bigPdf = new File([new ArrayBuffer(5 * 1024 * 1024 + 1)], 'big.pdf', { type: 'application/pdf' });
    expect(validatePurchaseProofFile(bigPdf)).toBeTruthy();
  });
});
