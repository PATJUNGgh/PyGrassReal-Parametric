import {
  buildNodeDocSearchIndex,
  filterNodeDocCategories,
  normalizeSearchQuery,
  type LocalizedNodeDocCategory,
} from './docsSearchUtils';

const CATEGORY_COUNT = 140;
const ITEMS_PER_CATEGORY = 36;
const STRESS_QUERY_COUNT = 90;

const THAI_WORDS = ['โหนด', 'เรขาคณิต', 'ผิววัสดุ', 'ความสูง', 'แกน', 'เชื่อมต่อ', 'แสง', 'พื้น'];
const EN_WORDS = ['node', 'geometry', 'mesh', 'material', 'height', 'axis', 'connect', 'light'];

const createStressCategories = (): LocalizedNodeDocCategory[] => {
  const categories: LocalizedNodeDocCategory[] = [];
  for (let categoryIndex = 0; categoryIndex < CATEGORY_COUNT; categoryIndex += 1) {
    const items: string[] = [];
    for (let itemIndex = 0; itemIndex < ITEMS_PER_CATEGORY; itemIndex += 1) {
      const thai = THAI_WORDS[(categoryIndex + itemIndex) % THAI_WORDS.length];
      const english = EN_WORDS[(categoryIndex * 3 + itemIndex) % EN_WORDS.length];
      items.push(`${thai} ${english} ${categoryIndex}-${itemIndex}`);
    }

    categories.push({
      id: `stress-${categoryIndex}`,
      title: `${THAI_WORDS[categoryIndex % THAI_WORDS.length]} ${EN_WORDS[categoryIndex % EN_WORDS.length]}`,
      description: `ชุดทดสอบ worker stress category ${categoryIndex}`,
      items,
    });
  }

  return categories;
};

const createStressQueries = (): string[] => {
  const queries: string[] = [];
  for (let index = 0; index < STRESS_QUERY_COUNT; index += 1) {
    const thai = THAI_WORDS[index % THAI_WORDS.length];
    const english = EN_WORDS[(index * 5) % EN_WORDS.length];
    queries.push(normalizeSearchQuery(`${thai} ${english} ${index % 10}`));
  }

  return queries;
};

describe('docs search worker stress baseline', () => {
  it('keeps mixed-language filtering latency in acceptable range under heavy synthetic load', () => {
    const categories = createStressCategories();
    const index = buildNodeDocSearchIndex(categories);
    const queries = createStressQueries();
    const latencies: number[] = [];

    let totalMatchedCategories = 0;
    for (const query of queries) {
      const startTime = performance.now();
      const results = filterNodeDocCategories(index, query);
      const durationMs = performance.now() - startTime;
      latencies.push(durationMs);
      totalMatchedCategories += results.length;
    }

    const maxLatency = Math.max(...latencies);
    const averageLatency = latencies.reduce((sum, latency) => sum + latency, 0) / latencies.length;

    expect(totalMatchedCategories).toBeGreaterThan(0);
    expect(averageLatency).toBeLessThan(120);
    expect(maxLatency).toBeLessThan(350);
  });
});
