import { hashQuery, includesIgnoreCase, normalizeSearchQuery } from './docsSearchUtils';

describe('DocsPage utility helpers', () => {
  it('checks substring matches ignoring case', () => {
    expect(includesIgnoreCase('Prompt Builder', 'prompt')).toBe(true);
    expect(includesIgnoreCase('Prompt Builder', 'builder')).toBe(true);
    expect(includesIgnoreCase('Prompt Builder', 'BOOLEAN')).toBe(false);
  });

  it('normalizes search query spacing and case', () => {
    expect(normalizeSearchQuery('   Boolean   Prompt   Scale   ')).toBe('boolean prompt scale');
    expect(normalizeSearchQuery('')).toBe('');
  });

  it('hashes queries deterministically with stable prefix', () => {
    const first = hashQuery('boolean prompt');
    const second = hashQuery('boolean prompt');
    const third = hashQuery('boolean prompt 2');

    expect(first).toMatch(/^q_[a-f0-9]+$/);
    expect(first).toBe(second);
    expect(first).not.toBe(third);
  });
});
