import { localizeText, type LanguageCode } from '../i18n/language';
import type { NodeDocCategory } from './data/docsContent';

/** Case-insensitive substring matcher used in lightweight UI filters. */
export const includesIgnoreCase = (value: string, query: string): boolean => {
  return value.toLowerCase().includes(query.toLowerCase());
};

/**
 * Normalizes free-text queries for deterministic matching:
 * - trims leading/trailing spaces
 * - lowercases
 * - collapses repeated whitespace
 */
export const normalizeSearchQuery = (value: string): string => {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
};

const FNV1A_64_OFFSET_BASIS = 0xcbf29ce484222325n;
const FNV1A_64_PRIME = 0x100000001b3n;
const FNV1A_64_MASK = 0xffffffffffffffffn;

const toUtf8Bytes = (value: string): number[] => {
  if (typeof TextEncoder !== 'undefined') {
    return Array.from(new TextEncoder().encode(value));
  }

  const fallbackBytes: number[] = [];
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint <= 0x7f) {
      fallbackBytes.push(codePoint);
      continue;
    }

    if (codePoint <= 0x7ff) {
      fallbackBytes.push(0xc0 | (codePoint >> 6));
      fallbackBytes.push(0x80 | (codePoint & 0x3f));
      continue;
    }

    if (codePoint <= 0xffff) {
      fallbackBytes.push(0xe0 | (codePoint >> 12));
      fallbackBytes.push(0x80 | ((codePoint >> 6) & 0x3f));
      fallbackBytes.push(0x80 | (codePoint & 0x3f));
      continue;
    }

    fallbackBytes.push(0xf0 | (codePoint >> 18));
    fallbackBytes.push(0x80 | ((codePoint >> 12) & 0x3f));
    fallbackBytes.push(0x80 | ((codePoint >> 6) & 0x3f));
    fallbackBytes.push(0x80 | (codePoint & 0x3f));
  }

  return fallbackBytes;
};

/** Fast non-cryptographic FNV-1a (64-bit) hash used to avoid logging raw queries. */
export const hashQuery = (value: string): string => {
  let hash = FNV1A_64_OFFSET_BASIS;
  const bytes = toUtf8Bytes(value);
  for (const byte of bytes) {
    hash ^= BigInt(byte);
    hash = (hash * FNV1A_64_PRIME) & FNV1A_64_MASK;
  }

  return `q_${hash.toString(16).padStart(16, '0')}`;
};

export interface LocalizedNodeDocCategory {
  id: string;
  title: string;
  description: string;
  items: string[];
}

export interface NodeDocSearchIndexEntry {
  category: LocalizedNodeDocCategory;
  normalizedTitle: string;
  normalizedDescription: string;
  normalizedCategoryText: string;
  normalizedItems: string[];
}

/** Converts multilingual static docs content into resolved language strings. */
export const localizeNodeDocCategories = (
  language: LanguageCode,
  categories: readonly NodeDocCategory[]
): LocalizedNodeDocCategory[] => {
  return categories.map((category) => ({
    id: category.id,
    title: localizeText(language, category.title),
    description: localizeText(language, category.description),
    items: category.items.map((item) => localizeText(language, item)),
  }));
};

/**
 * Pre-computes normalized fields to make per-query filtering cheaper.
 * Complexity: O(n * m) during index build, where n=categories and m=text fields per category.
 */
export const buildNodeDocSearchIndex = (
  categories: readonly LocalizedNodeDocCategory[]
): NodeDocSearchIndexEntry[] => {
  return categories.map((category) => {
    const normalizedTitle = normalizeSearchQuery(category.title);
    const normalizedDescription = normalizeSearchQuery(category.description);
    const normalizedItems = category.items.map((item) => normalizeSearchQuery(item));

    return {
      category,
      normalizedTitle,
      normalizedDescription,
      normalizedCategoryText: `${normalizedTitle} ${normalizedDescription}`.trim(),
      normalizedItems,
    };
  });
};

/**
 * Filters category index by query while preserving category grouping semantics.
 * - category title/description match => return full category
 * - item-only match => return category with matched item subset
 * Complexity: O(n + k) where n=categories and k=total items scanned.
 */
export const filterNodeDocCategories = (
  index: readonly NodeDocSearchIndexEntry[],
  normalizedQuery: string
): LocalizedNodeDocCategory[] => {
  if (!normalizedQuery) {
    return index.map((entry) => entry.category);
  }

  return index
    .map((entry) => {
      if (entry.normalizedCategoryText.includes(normalizedQuery)) {
        return entry.category;
      }

      const matchedItems = entry.category.items.filter((item, itemIndex) =>
        entry.normalizedItems[itemIndex].includes(normalizedQuery)
      );

      if (matchedItems.length === 0) {
        return null;
      }

      return {
        ...entry.category,
        items: matchedItems,
      };
    })
    .filter((category): category is LocalizedNodeDocCategory => category !== null);
};
