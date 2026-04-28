import { describe, expect, it } from 'vitest';
import { getTopbarNavigation, isTopbarItemActive } from './navigation';

describe('documentation navigation', () => {
  it('merges docs and developer into one documentation item', () => {
    const items = getTopbarNavigation('landing', 'en', false);

    expect(items.find((item) => item.path === '/developer')).toBeUndefined();
    expect(items.find((item) => item.path === '/about')).toBeUndefined();

    const documentationItem = items.find((item) => item.path === '/docs');
    expect(documentationItem?.label).toBe('Documentation');
  });

  it('treats developer and legal routes as active under the documentation menu', () => {
    const documentationItem = getTopbarNavigation('landing', 'en', false).find((item) => item.path === '/docs');

    expect(documentationItem).toBeDefined();
    expect(isTopbarItemActive('/about', documentationItem!)).toBe(true);
    expect(isTopbarItemActive('/docs', documentationItem!)).toBe(true);
    expect(isTopbarItemActive('/developer', documentationItem!)).toBe(true);
    expect(isTopbarItemActive('/integration-extension', documentationItem!)).toBe(true);
    expect(isTopbarItemActive('/legal/terms', documentationItem!)).toBe(true);
  });

  it('removes topbar navigation items on documentation section pages', () => {
    const items = getTopbarNavigation('docs', 'en', false);

    expect(items.map((item) => item.path)).toEqual([]);
  });

  it('reuses documentation item for legal menu and hides standalone legal button', () => {
    const legalItems = getTopbarNavigation('legal', 'en', false);

    expect(legalItems.find((item) => item.path === '/legal/terms')).toBeUndefined();
    expect(legalItems.map((item) => item.path)).toContain('/docs');
  });
});
