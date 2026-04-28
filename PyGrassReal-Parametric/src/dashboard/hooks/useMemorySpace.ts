import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
  deleteUserMemory,
  getMemoryEnabled,
  getUserMemories,
  setMemoryEnabled as persistMemoryEnabled,
  type UserMemory,
} from '../services/dashboard.memorySpace.api';

const DEFAULT_MEMORY_ENABLED = true;

const resolveCurrentUserId = async (): Promise<string | null> => {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }
  return data.user?.id ?? null;
};

export function useMemorySpace() {
  const [memories, setMemories] = useState<UserMemory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [memoryEnabled, setMemoryEnabledState] = useState(DEFAULT_MEMORY_ENABLED);
  const [userId, setUserId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const activeUserId = await resolveCurrentUserId();
      setUserId(activeUserId);

      if (!activeUserId) {
        setMemories([]);
        setMemoryEnabledState(DEFAULT_MEMORY_ENABLED);
        return;
      }

      const [memoryItems, enabled] = await Promise.all([
        getUserMemories(activeUserId),
        getMemoryEnabled(activeUserId),
      ]);

      setMemories(memoryItems);
      setMemoryEnabledState(enabled);
    } catch (error) {
      console.error('Failed to load memory space data', error);
      setMemories([]);
      setMemoryEnabledState(DEFAULT_MEMORY_ENABLED);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggleMemory = useCallback(async () => {
    const activeUserId = userId ?? (await resolveCurrentUserId());
    if (!activeUserId) {
      return;
    }

    if (!userId) {
      setUserId(activeUserId);
    }

    const nextValue = !memoryEnabled;
    setMemoryEnabledState(nextValue);

    try {
      const persistedValue = await persistMemoryEnabled(activeUserId, nextValue);
      setMemoryEnabledState(persistedValue);
    } catch (error) {
      console.error('Failed to toggle memory setting', error);
      setMemoryEnabledState((prev) => !prev);
    }
  }, [memoryEnabled, userId]);

  const deleteMemory = useCallback(async (memoryId: string) => {
    if (!memoryId.trim()) {
      return;
    }

    const previousMemories = memories;
    setMemories((prev) => prev.filter((memory) => memory.id !== memoryId));

    try {
      await deleteUserMemory(memoryId);
    } catch (error) {
      console.error('Failed to delete memory', error);
      setMemories(previousMemories);
    }
  }, [memories]);

  return useMemo(() => ({
    memories,
    isLoading,
    memoryEnabled,
    toggleMemory,
    deleteMemory,
    refresh,
  }), [memories, isLoading, memoryEnabled, toggleMemory, deleteMemory, refresh]);
}
