import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createPlatformSubscriber,
  deletePlatformSubscriber,
  fetchPlatformSubscribers,
  type CreatePlatformSubscriberInput,
  type CreatePlatformSubscriberResult,
  type PlatformSubscriber,
} from '../services/platformSubscribers.api';

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unable to manage subscribers.';
};

export function usePlatformSubscribers(enabled = true) {
  const [subscribers, setSubscribers] = useState<PlatformSubscriber[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const loadSubscribers = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchPlatformSubscribers();
      if (!isMountedRef.current) {
        return;
      }
      setSubscribers(rows);
      setError(null);
    } catch (err) {
      if (isMountedRef.current) {
        setError(toErrorMessage(err));
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const createSubscriber = useCallback(async (
    input: CreatePlatformSubscriberInput
  ): Promise<CreatePlatformSubscriberResult | null> => {
    setSaving(true);
    try {
      const result = await createPlatformSubscriber(input);
      if (!isMountedRef.current) {
        return null;
      }
      const rows = await fetchPlatformSubscribers();
      if (!isMountedRef.current) {
        return null;
      }
      setSubscribers(rows);
      setError(null);
      return result;
    } catch (err) {
      if (isMountedRef.current) {
        setError(toErrorMessage(err));
      }
      return null;
    } finally {
      if (isMountedRef.current) {
        setSaving(false);
      }
    }
  }, []);

  const removeSubscriber = useCallback(async (subscriber: PlatformSubscriber): Promise<boolean> => {
    setDeletingId(subscriber.id);
    try {
      await deletePlatformSubscriber(subscriber);
      if (!isMountedRef.current) {
        return false;
      }
      setSubscribers((current) => current.filter((item) => item.id !== subscriber.id));
      setError(null);
      return true;
    } catch (err) {
      if (isMountedRef.current) {
        setError(toErrorMessage(err));
      }
      return false;
    } finally {
      if (isMountedRef.current) {
        setDeletingId(null);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    if (enabled) {
      void loadSubscribers();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [enabled, loadSubscribers]);

  return {
    subscribers,
    loading,
    saving,
    deletingId,
    error,
    refetch: loadSubscribers,
    createSubscriber,
    removeSubscriber,
  };
}
