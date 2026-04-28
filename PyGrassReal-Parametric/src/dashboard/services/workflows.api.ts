/**
 * Workflows API Service
 * Handles data interactions between the Dashboard and Supabase 'workflows' table.
 * Includes built-in sanitization and parameter validation.
 */

import { supabase } from '../../lib/supabaseClient';
import type {
  Workflow,
  WorkflowListResult,
  WorkflowQueryParams,
  WorkflowStatus,
} from '../types/workflow.types';
import { isRecord, throwQueryError, sanitizeInput } from '../utils';
import { MOCK_WORKFLOWS } from './mockWorkflows';

const BUNNY_3D_STORAGE_ZONE = import.meta.env.VITE_BUNNY_3D_STORAGE_ZONE as string;
const BUNNY_3D_HOSTNAME = import.meta.env.VITE_BUNNY_3D_STORAGE_HOSTNAME as string;
const BUNNY_3D_API_KEY = import.meta.env.VITE_BUNNY_3D_STORAGE_API_KEY as string;
const BUNNY_3D_CDN_URL = import.meta.env.VITE_BUNNY_3D_PULL_ZONE_URL as string;

type WorkflowRow = {
  id: string;
  name: string | null;
  status: string | null;
  owner_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  definition: unknown;
  bunny_base_url: string | null;
};

const FALLBACK_OWNER_ID = 'local-user';

/**
 * Normalizes the status string from DB to WorkflowStatus type.
 */
const normalizeStatus = (status: string | null): WorkflowStatus => {
  return status === 'inactive' ? 'inactive' : 'active';
};

/**
 * Converts a raw database row into a clean Workflow object.
 */
const normalizeWorkflow = (row: WorkflowRow): Workflow => ({
  id: row.id,
  name: row.name?.trim() || 'Untitled',
  status: normalizeStatus(row.status),
  owner_id: row.owner_id,
  created_at: row.created_at,
  updated_at: row.updated_at,
  definition: isRecord(row.definition) ? row.definition : null,
  bunny_base_url: row.bunny_base_url,
});

/**
 * Resolves the owner ID from the provided value or the current session.
 */
const resolveOwnerId = async (ownerId: string | null): Promise<string | null> => {
  if (ownerId) return ownerId;
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data?.session?.user?.id ?? null;
  } catch (err) {
    console.warn('Could not resolve owner session:', err);
    return null;
  }
};

// Toggle this to false when the Supabase 'workflows' table is ready
const USE_MOCK = false;

/**
 * Retrieves the current user's ID from the session.
 * @returns UUID string or null if not authenticated.
 */
export async function getCurrentOwnerId(): Promise<string | null> {
  return resolveOwnerId(null);
}

/**
 * Fetches a paginated list of workflows based on provided filters and search criteria.
 * Includes strict validation for query parameters to prevent manipulation.
 * 
 * @param params - Query options (page, perPage, search, status, etc.)
 * @returns Result object with items array and total count.
 */
export async function listWorkflows({
  page: rawPage = 1,
  perPage: rawPerPage = 6,
  search: rawSearch = '',
  status: rawStatus,
  sortBy: rawSortBy,
  ownerFilter: rawOwnerFilter,
  ownerId,
  signal,
}: WorkflowQueryParams): Promise<WorkflowListResult> {
  const page = Math.max(1, rawPage);
  const perPage = Math.max(1, Math.min(100, rawPerPage));
  const search = sanitizeInput(rawSearch);

  // Parameter Validation
  const status = ['active', 'inactive', 'all'].includes(rawStatus) ? rawStatus : 'all';
  const sortBy = ['updated_desc', 'created_desc', 'name_asc'].includes(rawSortBy) ? rawSortBy : 'updated_desc';
  const ownerFilter = ['mine', 'all'].includes(rawOwnerFilter) ? rawOwnerFilter : 'mine';

  if (USE_MOCK) {
    console.info('Using mock workflows data (Development Mode)');
    const filtered = MOCK_WORKFLOWS.filter(item =>
      !search || item.name.toLowerCase().includes(search.toLowerCase())
    );

    return {
      items: filtered,
      total: filtered.length,
    };
  }

  let query = supabase.from('workflows').select('*', { count: 'exact' });

  if (search) query = query.ilike('name', `%${search}%`);
  if (status !== 'all') query = query.eq('status', status);
  if (ownerFilter === 'mine' && ownerId) query = query.eq('owner_id', ownerId);

  const sortColMap: Record<string, string> = {
    updated_desc: 'updated_at',
    created_desc: 'created_at',
    name_asc: 'name',
  };
  const sortColumn = sortColMap[sortBy] || 'updated_at';

  const { data, count, error } = await query
    .order(sortColumn, { ascending: sortBy.endsWith('_asc') })
    .range((page - 1) * perPage, page * perPage - 1)
    .abortSignal(signal);

  if (error) {
    if (error.code === 'ABORT') return { items: [], total: 0 };
    throwQueryError('Failed to list workflows', error, { user_id: ownerId });
  }

  return {
    items: (data as WorkflowRow[]).map(normalizeWorkflow),
    total: count ?? 0,
  };
}

/**
 * Creates a new workflow entry in the database.
 * @param name - Initial name for the workflow (will be sanitized).
 * @param ownerId - UUID of the owner (retrieved from session if null).
 * @returns The newly created Workflow object.
 */
export async function createWorkflow(name: string, ownerId: string | null): Promise<Workflow> {
  const resolvedOwnerId = ownerId ?? (await resolveOwnerId(null)) ?? FALLBACK_OWNER_ID;
  const cleanName = sanitizeInput(name, 100) || 'Untitled';

  const { data, error } = await supabase
    .from('workflows')
    .insert([
      {
        name: cleanName,
        status: 'active',
        owner_id: resolvedOwnerId,
        definition: { nodes: [], connections: [] },
      },
    ])
    .select('*')
    .single();

  if (error) throwQueryError('Failed to create workflow', error, { user_id: resolvedOwnerId });

  const workflowRow = data as WorkflowRow;

  // Initialize empty folder logic in Bunny.net
  if (BUNNY_3D_API_KEY && BUNNY_3D_HOSTNAME && BUNNY_3D_STORAGE_ZONE) {
    try {
      const remotePath = `${resolvedOwnerId}/${workflowRow.id}/.keep`;
      const uploadUrl = `https://${BUNNY_3D_HOSTNAME}/${BUNNY_3D_STORAGE_ZONE}/${remotePath}`;
      const cdnUrl = `${BUNNY_3D_CDN_URL}/${resolvedOwnerId}/${workflowRow.id}`;

      await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          AccessKey: BUNNY_3D_API_KEY,
          'Content-Type': 'text/plain',
        },
        body: 'Project created',
      });

      // Update base URL in backend
      const { data: updatedData } = await supabase
        .from('workflows')
        .update({ bunny_base_url: cdnUrl })
        .eq('id', workflowRow.id)
        .select('*')
        .single();

      if (updatedData) {
        return normalizeWorkflow(updatedData as WorkflowRow);
      }
    } catch (err) {
      console.warn('Could not auto-create Bunny folder for new project', err);
    }
  }

  return normalizeWorkflow(workflowRow);
}

/**
 * Updates the name of an existing workflow.
 * @param id - Workflow UUID.
 * @param name - New name (will be sanitized).
 * @returns Updated Workflow object.
 */
export async function updateWorkflowName(id: string, name: string): Promise<Workflow> {
  const cleanName = sanitizeInput(name, 100) || 'Untitled';

  const { data, error } = await supabase
    .from('workflows')
    .update({ name: cleanName, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throwQueryError('Failed to update workflow name', error, { request_id: `upd-name-${id}` });
  return normalizeWorkflow(data as WorkflowRow);
}

/**
 * Toggles the status of a workflow between 'active' and 'inactive'.
 * @param id - Workflow UUID.
 * @param status - Target status.
 * @returns Updated Workflow object.
 */
export async function toggleWorkflowStatus(id: string, status: WorkflowStatus): Promise<Workflow> {
  const { data, error } = await supabase
    .from('workflows')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throwQueryError('Failed to update workflow status', error, { request_id: `tgl-status-${id}` });
  return normalizeWorkflow(data as WorkflowRow);
}

/**
 * Permanently deletes a workflow from the database.
 * @param id - Workflow UUID.
 */
export async function deleteWorkflow(id: string): Promise<void> {
  const { error } = await supabase.from('workflows').delete().eq('id', id);
  if (error) throwQueryError('Failed to delete workflow', error);
}

/**
 * Creates a duplicate of an existing workflow.
 * @param sourceWorkflow - The workflow object to copy.
 * @param ownerId - UUID of the owner.
 * @returns The newly created duplicate Workflow object.
 */
export async function duplicateWorkflow(sourceWorkflow: Workflow, ownerId: string | null): Promise<Workflow> {
  const resolvedOwnerId = ownerId ?? (await resolveOwnerId(null)) ?? FALLBACK_OWNER_ID;

  // Ensure the name doesn't exceed common DB limits when appending " - Copy"
  const baseName = sourceWorkflow.name.slice(0, 90);
  const newName = `${baseName} - Copy`;

  const { data, error } = await supabase
    .from('workflows')
    .insert([
      {
        name: newName,
        status: sourceWorkflow.status,
        owner_id: resolvedOwnerId,
        definition: sourceWorkflow.definition ?? { nodes: [], connections: [] },
      },
    ])
    .select('*')
    .single();

  if (error) throwQueryError('Failed to duplicate workflow', error, { user_id: resolvedOwnerId });
  return normalizeWorkflow(data as WorkflowRow);
}
