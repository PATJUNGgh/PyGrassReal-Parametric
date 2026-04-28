import { slugify } from './sectionUtils';

describe('slugify', () => {
  it('normalizes text to lowercase kebab-case', () => {
    expect(slugify('  Roadmap 2026  ')).toBe('roadmap-2026');
    expect(slugify('AI + Product @ Scale')).toBe('ai-product-scale');
  });

  it('removes leading and trailing separators', () => {
    expect(slugify('***Docs***')).toBe('docs');
    expect(slugify('---')).toBe('');
  });
});
