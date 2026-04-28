import { useEffect, useState } from 'react';
import type { AiProfile } from '../components/AiProfileCard';
import type { RoadmapItem } from '../components/RoadmapCard';
import {
  loadAiProfiles,
  loadFeatureItems,
  loadNodeDocCategories,
  loadRoadmapItems,
  loadUseCaseItems,
} from '../data/contentLoaders';
import type { NodeDocCategory } from '../data/docsContent';
import type { FeatureItem, UseCaseItem } from '../data/siteContent';

interface PageDataState<TDataItem> {
  /** Loaded data payload (empty array when not yet resolved). */
  data: readonly TDataItem[];
  /** Indicates whether the first load attempt is in progress. */
  isLoading: boolean;
}

type AsyncDataLoader<TDataItem> = () => Promise<readonly TDataItem[]>;

const INITIAL_DATA: readonly [] = [];

/**
 * Shared lazy-loader hook used by page data entry points.
 *
 * Side effects:
 * - Invokes dynamic import loader on mount.
 * - Cancels state updates after unmount.
 */
function useCachedPageData<TDataItem>(
  loader: AsyncDataLoader<TDataItem>
): PageDataState<TDataItem> {
  const [state, setState] = useState<PageDataState<TDataItem>>({
    data: INITIAL_DATA as readonly TDataItem[],
    isLoading: true,
  });

  useEffect(() => {
    let isMounted = true;

    void loader()
      .then((loadedData) => {
        if (!isMounted) {
          return;
        }
        setState({
          data: loadedData,
          isLoading: false,
        });
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }
        setState((previousState) => ({
          data: previousState.data,
          isLoading: false,
        }));
      });

    return () => {
      isMounted = false;
    };
  }, [loader]);

  return state;
}

/** Loads and caches localized node documentation categories. */
export const useNodeCategories = (): PageDataState<NodeDocCategory> =>
  useCachedPageData(loadNodeDocCategories);

/** Loads and caches feature card content for the landing page. */
export const useFeatureItems = (): PageDataState<FeatureItem> =>
  useCachedPageData(loadFeatureItems);

/** Loads and caches use-case card content for the landing page. */
export const useUseCaseItems = (): PageDataState<UseCaseItem> =>
  useCachedPageData(loadUseCaseItems);

/** Loads and caches AI profile cards. */
export const useAiProfiles = (): PageDataState<AiProfile> =>
  useCachedPageData(loadAiProfiles);

/** Loads and caches roadmap timeline entries. */
export const useRoadmapItems = (): PageDataState<RoadmapItem> =>
  useCachedPageData(loadRoadmapItems);
