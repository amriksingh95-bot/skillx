const { validationResult } = require('express-validator');
const { body } = require('express-validator');

const adCreationValidators = [
  body('title').trim().notEmpty().withMessage('Title is required.').isLength({ max: 100 }).withMessage('Title must be at most 100 characters.'),
  body('description').trim().notEmpty().withMessage('Description is required.').isLength({ max: 150 }).withMessage('Description must be at most 150 characters.'),
  body('ctaText').trim().notEmpty().withMessage('CTA text is required.').isLength({ max: 50 }).withMessage('CTA text must be at most 50 characters.'),
  body('ctaLink').trim().optional({ checkFalsy: true }).isURL().withMessage('CTA link must be a valid URL.'),
  body('bg').trim().notEmpty().withMessage('Theme is required.'),
  body('accent').trim().notEmpty().withMessage('Theme accent is required.'),
  body('icon').trim().notEmpty().withMessage('Business icon is required.'),
  body('package').isIn(['starter', 'growth', 'premium']).withMessage('Package must be starter, growth, or premium.')
];

async function runValidators(bodyObj) {
  const req = { body: bodyObj };
  for (const v of adCreationValidators) {
    await v.run(req);
  }
  return validationResult(req);
}

describe('Ad Creation Validators', () => {
  it('accepts a fully valid ad', async () => {
    const errors = await runValidators({
      title: 'Summer Sale',
      description: '50% off all items!',
      ctaText: 'Buy Now',
      ctaLink: 'https://example.com',
      bg: '#ffffff',
      accent: '#ff0000',
      icon: 'store',
      package: 'growth'
    });
    expect(errors.isEmpty()).toBe(true);
  });

  it('accepts ad with optional ctaLink omitted', async () => {
    const errors = await runValidators({
      title: 'Summer Sale',
      description: '50% off all items!',
      ctaText: 'Buy Now',
      bg: '#ffffff',
      accent: '#ff0000',
      icon: 'store',
      package: 'starter'
    });
    expect(errors.isEmpty()).toBe(true);
  });

  it('accepts ad with optional ctaLink empty (checkFalsy)', async () => {
    const errors = await runValidators({
      title: 'Summer Sale',
      description: '50% off all items!',
      ctaText: 'Buy Now',
      ctaLink: '',
      bg: '#ffffff',
      accent: '#ff0000',
      icon: 'store',
      package: 'premium'
    });
    expect(errors.isEmpty()).toBe(true);
  });

  it('rejects empty description', async () => {
    const errors = await runValidators({
      title: 'Summer Sale',
      description: '',
      ctaText: 'Buy Now',
      bg: '#ffffff',
      accent: '#ff0000',
      icon: 'store',
      package: 'growth'
    });
    expect(errors.isEmpty()).toBe(false);
    const msgs = errors.array().map(e => e.msg);
    expect(msgs).toContain('Description is required.');
  });

  it('rejects missing description', async () => {
    const errors = await runValidators({
      title: 'Summer Sale',
      ctaText: 'Buy Now',
      bg: '#ffffff',
      accent: '#ff0000',
      icon: 'store',
      package: 'growth'
    });
    expect(errors.isEmpty()).toBe(false);
    const msgs = errors.array().map(e => e.msg);
    expect(msgs).toContain('Description is required.');
  });

  it('rejects description exceeding 150 chars', async () => {
    const errors = await runValidators({
      title: 'Summer Sale',
      description: 'x'.repeat(151),
      ctaText: 'Buy Now',
      bg: '#ffffff',
      accent: '#ff0000',
      icon: 'store',
      package: 'growth'
    });
    expect(errors.isEmpty()).toBe(false);
    const msgs = errors.array().map(e => e.msg);
    expect(msgs).toContain('Description must be at most 150 characters.');
  });

  it('rejects empty ctaText', async () => {
    const errors = await runValidators({
      title: 'Summer Sale',
      description: '50% off all items!',
      ctaText: '',
      bg: '#ffffff',
      accent: '#ff0000',
      icon: 'store',
      package: 'growth'
    });
    expect(errors.isEmpty()).toBe(false);
    const msgs = errors.array().map(e => e.msg);
    expect(msgs).toContain('CTA text is required.');
  });

  it('rejects ctaText exceeding 50 chars', async () => {
    const errors = await runValidators({
      title: 'Summer Sale',
      description: '50% off all items!',
      ctaText: 'x'.repeat(51),
      bg: '#ffffff',
      accent: '#ff0000',
      icon: 'store',
      package: 'growth'
    });
    expect(errors.isEmpty()).toBe(false);
    const msgs = errors.array().map(e => e.msg);
    expect(msgs).toContain('CTA text must be at most 50 characters.');
  });

  it('rejects invalid ctaLink URL', async () => {
    const errors = await runValidators({
      title: 'Summer Sale',
      description: '50% off all items!',
      ctaText: 'Buy Now',
      ctaLink: 'not-a-url',
      bg: '#ffffff',
      accent: '#ff0000',
      icon: 'store',
      package: 'growth'
    });
    expect(errors.isEmpty()).toBe(false);
    const msgs = errors.array().map(e => e.msg);
    expect(msgs).toContain('CTA link must be a valid URL.');
  });

  it('rejects empty bg', async () => {
    const errors = await runValidators({
      title: 'Summer Sale',
      description: '50% off all items!',
      ctaText: 'Buy Now',
      bg: '',
      accent: '#ff0000',
      icon: 'store',
      package: 'growth'
    });
    expect(errors.isEmpty()).toBe(false);
    const msgs = errors.array().map(e => e.msg);
    expect(msgs).toContain('Theme is required.');
  });

  it('rejects empty accent', async () => {
    const errors = await runValidators({
      title: 'Summer Sale',
      description: '50% off all items!',
      ctaText: 'Buy Now',
      bg: '#ffffff',
      accent: '',
      icon: 'store',
      package: 'growth'
    });
    expect(errors.isEmpty()).toBe(false);
    const msgs = errors.array().map(e => e.msg);
    expect(msgs).toContain('Theme accent is required.');
  });

  it('rejects empty icon', async () => {
    const errors = await runValidators({
      title: 'Summer Sale',
      description: '50% off all items!',
      ctaText: 'Buy Now',
      bg: '#ffffff',
      accent: '#ff0000',
      icon: '',
      package: 'growth'
    });
    expect(errors.isEmpty()).toBe(false);
    const msgs = errors.array().map(e => e.msg);
    expect(msgs).toContain('Business icon is required.');
  });

  it('rejects invalid package', async () => {
    const errors = await runValidators({
      title: 'Summer Sale',
      description: '50% off all items!',
      ctaText: 'Buy Now',
      bg: '#ffffff',
      accent: '#ff0000',
      icon: 'store',
      package: 'invalid'
    });
    expect(errors.isEmpty()).toBe(false);
    const msgs = errors.array().map(e => e.msg);
    expect(msgs).toContain('Package must be starter, growth, or premium.');
  });

  it('trims whitespace before validating (spaces-only becomes empty)', async () => {
    const errors = await runValidators({
      title: 'Summer Sale',
      description: '   ',
      ctaText: 'Buy Now',
      bg: '#ffffff',
      accent: '#ff0000',
      icon: 'store',
      package: 'growth'
    });
    expect(errors.isEmpty()).toBe(false);
    const msgs = errors.array().map(e => e.msg);
    expect(msgs).toContain('Description is required.');
  });

  it('rejects multiple missing fields at once', async () => {
    const errors = await runValidators({
      title: 'Summer Sale',
      package: 'growth'
    });
    expect(errors.isEmpty()).toBe(false);
    const msgs = errors.array().map(e => e.msg);
    expect(msgs).toContain('Description is required.');
    expect(msgs).toContain('CTA text is required.');
    expect(msgs).toContain('Theme is required.');
    expect(msgs).toContain('Theme accent is required.');
    expect(msgs).toContain('Business icon is required.');
  });
});
