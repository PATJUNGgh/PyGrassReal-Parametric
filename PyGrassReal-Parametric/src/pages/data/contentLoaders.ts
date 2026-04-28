import type { AiProfile } from '../components/AiProfileCard';
import type { RoadmapItem } from '../components/RoadmapCard';
import type { NodeDocCategory } from './docsContent';
import type { FeatureItem, UseCaseItem } from './siteContent';

/**
 * Lazy content module cache.
 *
 * Strategy:
 * - Keep large static arrays split across dedicated modules (`docsContent`, `siteContent`).
 * - Load them via dynamic import on first demand.
 * - Reuse module promises to avoid duplicate network/parse work.
 */
let nodeCategoriesPromise: Promise<readonly NodeDocCategory[]> | null = null;
let featuresPromise: Promise<readonly FeatureItem[]> | null = null;
let useCasesPromise: Promise<readonly UseCaseItem[]> | null = null;
let aiProfilesPromise: Promise<readonly AiProfile[]> | null = null;
let roadmapItemsPromise: Promise<readonly RoadmapItem[]> | null = null;

/** Loads and memoizes docs categories from the split `docsContent` chunk. */
export const loadNodeDocCategories = (): Promise<readonly NodeDocCategory[]> => {
  if (!nodeCategoriesPromise) {
    nodeCategoriesPromise = import('./docsContent').then((module) => module.NODE_CATEGORIES);
  }

  return nodeCategoriesPromise;
};

/** Loads and memoizes feature cards from `siteContent`. */
export const loadFeatureItems = (): Promise<readonly FeatureItem[]> => {
  if (!featuresPromise) {
    featuresPromise = import('./siteContent').then((module) => module.FEATURES);
  }

  return featuresPromise;
};

/** Loads and memoizes use-case cards from `siteContent`. */
export const loadUseCaseItems = (): Promise<readonly UseCaseItem[]> => {
  if (!useCasesPromise) {
    useCasesPromise = import('./siteContent').then((module) => module.USE_CASES);
  }

  return useCasesPromise;
};

/** Loads and memoizes AI profile metadata from `siteContent`. */
export const loadAiProfiles = (): Promise<readonly AiProfile[]> => {
  if (!aiProfilesPromise) {
    aiProfilesPromise = import('./siteContent').then((module) => module.AI_PROFILES);
  }

  return aiProfilesPromise;
};

/** Loads and memoizes roadmap timeline entries from `siteContent`. */
export const loadRoadmapItems = (): Promise<readonly RoadmapItem[]> => {
  if (!roadmapItemsPromise) {
    roadmapItemsPromise = import('./siteContent').then((module) => module.ROADMAP_ITEMS);
  }

  return roadmapItemsPromise;
};
