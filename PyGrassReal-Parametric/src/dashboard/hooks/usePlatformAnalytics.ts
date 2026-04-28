import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchPlatformAnalyticsSnapshot,
  updateOpenRouterSettlement,
  type OpenRouterSettlementStatus,
  type PlatformAnalyticsHourlyRow,
  type PlatformAnalyticsSnapshot,
} from '../services/platformAnalytics.api';

export const PLATFORM_ANALYTICS_AUTO_REFRESH_MS = 60 * 60 * 1000;

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unable to load platform revenue.';
};

export function usePlatformAnalytics(hours = 24) {
  const [snapshot, setSnapshot] = useState<PlatformAnalyticsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settlementUpdatingBucket, setSettlementUpdatingBucket] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const loadSnapshot = useCallback(async (background = false) => {
    if (background) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const nextSnapshot = await fetchPlatformAnalyticsSnapshot(hours);
      if (!isMountedRef.current) {
        return;
      }
      setSnapshot(nextSnapshot);
      setError(null);
    } catch (err) {
      if (!isMountedRef.current) {
        return;
      }
      setError(toErrorMessage(err));
    } finally {
      if (!isMountedRef.current) {
        return;
      }
      if (background) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [hours]);

  const setOpenRouterSettlementStatus = useCallback(async (
    row: PlatformAnalyticsHourlyRow,
    status: Exclude<OpenRouterSettlementStatus, 'not_required'>
  ) => {
    setSettlementUpdatingBucket(row.bucketStart);
    try {
      const result = await updateOpenRouterSettlement({
        bucketStart: row.bucketStart,
        status,
        customerPaidUsd: row.customerPaidUsd,
        openRouterCostUsd: row.openRouterCostUsd,
        platformRevenueUsd: row.platformRevenueUsd,
      });

      if (!isMountedRef.current) {
        return;
      }

      setSnapshot((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          isFallback: current.isFallback || result.isFallback,
          hourly: current.hourly.map((item) => (
            item.bucketStart === row.bucketStart
              ? {
                  ...item,
                  openRouterStatus: status,
                  openRouterPaidAt: status === 'paid' ? result.paidAt : null,
                }
              : item
          )),
        };
      });
      setError(null);
    } catch (err) {
      if (isMountedRef.current) {
        setError(toErrorMessage(err));
      }
    } finally {
      if (isMountedRef.current) {
        setSettlementUpdatingBucket(null);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    void loadSnapshot(false);
    const intervalId = window.setInterval(() => {
      void loadSnapshot(true);
    }, PLATFORM_ANALYTICS_AUTO_REFRESH_MS);

    return () => {
      isMountedRef.current = false;
      window.clearInterval(intervalId);
    };
  }, [loadSnapshot]);

  return {
    snapshot,
    loading,
    refreshing,
    settlementUpdatingBucket,
    error,
    autoRefreshMs: PLATFORM_ANALYTICS_AUTO_REFRESH_MS,
    refetch: () => loadSnapshot(true),
    setOpenRouterSettlementStatus,
  };
}
