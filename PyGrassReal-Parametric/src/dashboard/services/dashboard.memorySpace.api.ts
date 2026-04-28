import { supabase } from '../../lib/supabaseClient';
import { throwQueryError } from '../utils';

export interface UserMemory {
  id: string;
  user_id: string;
  content: string;
  memory_enabled: boolean;
  created_at: string;
}

interface UserMemoryRow {
  id: string;
  user_id: string;
  content: string;
  memory_enabled: boolean | null;
  created_at: string;
}

interface ProfileMemoryRow {
  memory_enabled: boolean | null;
}

const normalizeUserMemory = (row: UserMemoryRow): UserMemory => ({
  id: row.id,
  user_id: row.user_id,
  content: typeof row.content === 'string' ? row.content : '',
  memory_enabled: row.memory_enabled ?? true,
  created_at: row.created_at,
});

export async function getUserMemories(userId: string): Promise<UserMemory[]> {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId || normalizedUserId === 'local-user' || normalizedUserId.length < 20) {
    return [];
  }

  const { data, error } = await supabase
    .from('user_memories')
    .select('id, user_id, content, memory_enabled, created_at')
    .eq('user_id', normalizedUserId)
    .order('created_at', { ascending: false });

  if (error) {
    throwQueryError('Failed to fetch user memories', error, { user_id: normalizedUserId });
  }

  return ((data ?? []) as UserMemoryRow[]).map(normalizeUserMemory);
}

export async function deleteUserMemory(memoryId: string): Promise<void> {
  const normalizedMemoryId = memoryId.trim();
  if (!normalizedMemoryId || normalizedMemoryId === 'local-user' || normalizedMemoryId.length < 20) {
    return;
  }

  const { error } = await supabase
    .from('user_memories')
    .delete()
    .eq('id', normalizedMemoryId);

  if (error) {
    throwQueryError('Failed to delete user memory', error, { request_id: `del-memory-${normalizedMemoryId}` });
  }
}

export async function getMemoryEnabled(userId: string): Promise<boolean> {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId || normalizedUserId === 'local-user' || normalizedUserId.length < 20) {
    return true;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('memory_enabled')
    .eq('id', normalizedUserId)
    .maybeSingle<ProfileMemoryRow>();

  if (error) {
    throwQueryError('Failed to fetch memory toggle', error, { user_id: normalizedUserId });
  }

  return data?.memory_enabled ?? true;
}

export async function setMemoryEnabled(userId: string, enabled: boolean): Promise<boolean> {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId || normalizedUserId === 'local-user' || normalizedUserId.length < 20) {
    return enabled;
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ memory_enabled: enabled })
    .eq('id', normalizedUserId)
    .select('memory_enabled')
    .maybeSingle<ProfileMemoryRow>();

  if (error) {
    throwQueryError('Failed to update memory toggle', error, { user_id: normalizedUserId });
  }

  return data?.memory_enabled ?? enabled;
}
