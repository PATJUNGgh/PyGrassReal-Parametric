import { hashQuery, normalizeSearchQuery } from './docsSearchUtils';

const SAMPLE_SIZE = 6000;

const createSeededRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let result = Math.imul(state ^ (state >>> 15), 1 | state);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
};

const THAI_TERMS = [
  'โหนด',
  'เรขาคณิต',
  'พื้นผิว',
  'พารามิเตอร์',
  'ความสูง',
  'สี',
  'วัสดุ',
  'ตัวคูณ',
  'เชื่อมต่อ',
  'เวิร์กโฟลว์',
];

const ENGLISH_TERMS = [
  'node',
  'geometry',
  'mesh',
  'material',
  'subdivision',
  'boolean',
  'height',
  'offset',
  'workflow',
  'profile',
];

const legacyDjb2Hash = (value: string): string => {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }

  return `q_${(hash >>> 0).toString(16)}`;
};

const createMixedQueryCorpus = (): string[] => {
  const random = createSeededRandom(20260225);
  const queries: string[] = [];
  for (let index = 0; index < SAMPLE_SIZE; index += 1) {
    const thaiA = THAI_TERMS[Math.floor(random() * THAI_TERMS.length)];
    const thaiB = THAI_TERMS[Math.floor(random() * THAI_TERMS.length)];
    const englishA = ENGLISH_TERMS[Math.floor(random() * ENGLISH_TERMS.length)];
    const englishB = ENGLISH_TERMS[Math.floor(random() * ENGLISH_TERMS.length)];
    const variant = Math.floor(random() * 3);
    if (variant === 0) {
      queries.push(`${thaiA} ${englishA} ${index}`);
      continue;
    }

    if (variant === 1) {
      queries.push(`${englishA}-${thaiA}-${englishB}-${index % 97}`);
      continue;
    }

    queries.push(`${thaiA}${thaiB} ${englishA} ${englishB} ${index % 53}`);
  }

  return queries.map((query) => normalizeSearchQuery(query));
};

const calculateCollisionStats = (
  values: readonly string[],
  hashFn: (value: string) => string
): { collisions: number; collisionRate: number } => {
  const seen = new Set<string>();
  let collisions = 0;
  for (const value of values) {
    const hash = hashFn(value);
    if (seen.has(hash)) {
      collisions += 1;
      continue;
    }
    seen.add(hash);
  }

  return {
    collisions,
    collisionRate: collisions / values.length,
  };
};

describe('docsSearch hash collision analysis', () => {
  it('keeps collision rate low for mixed-language corpus above 5,000 samples', () => {
    const corpus = createMixedQueryCorpus();
    const stats = calculateCollisionStats(corpus, hashQuery);

    expect(corpus.length).toBeGreaterThanOrEqual(5000);
    expect(stats.collisionRate).toBeLessThan(0.005);
  });

  it('matches or improves legacy djb2 collision count on the same dataset', () => {
    const corpus = createMixedQueryCorpus();
    const modern = calculateCollisionStats(corpus, hashQuery);
    const legacy = calculateCollisionStats(corpus, legacyDjb2Hash);

    expect(modern.collisions).toBeLessThanOrEqual(legacy.collisions);
  });
});
