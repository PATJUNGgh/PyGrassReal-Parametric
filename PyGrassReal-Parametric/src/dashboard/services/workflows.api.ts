import { supabase } from '../../lib/supabaseClient';
import type {
  Workflow,
  WorkflowListResult,
  WorkflowQueryParams,
  WorkflowStatus,
} from '../types/workflow.types';
import { isRecord, throwQueryError } from '../utils';
import { MOCK_WORKFLOWS } from './mockWorkflows';

type WorkflowRow = {
  id: string;
  name: string | null;
  status: string | null;
  owner_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  definition: unknown;
};

const FALLBACK_OWNER_ID = 'local-user';

const normalizeStatus = (status: string | null): WorkflowStatus => {
  return status === 'inactive' ? 'inactive' : 'active';
};

const normalizeWorkflow = (row: WorkflowRow): Workflow => {
  return {
    id: row.id,
    name: row.name?.trim() || 'Untitled workflow',
    status: normalizeStatus(row.status),
    owner_id: row.owner_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    definition: isRecord(row.definition) ? row.definition : null,
  };
};

const resolveOwnerId = async (ownerId: string | null): Promise<string | null> => {
  if (ownerId) return ownerId;
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
};

// Toggle this to false when the Supabase 'workflows' table is ready
const USE_MOCK = true;

export async function getCurrentOwnerId(): Promise<string | null> {
  return resolveOwnerId(null);
}

export async function listWorkflows(params: WorkflowQueryParams): Promise<WorkflowListResult> {
  if (USE_MOCK) {
    console.info('Using mock workflows data (Development Mode)');
    const filtered = MOCK_WORKFLOWS.filter(item => 
      !params.search || item.name.toLowerCase().includes(params.search.toLowerCase())
    );

    return {
      items: filtered,
      total: filtered.length,
    };
  }

  const search = params.search.trim();
  let query = supabase.from('workflows').select('*', { count: 'exact' });

  if (search) query = query.ilike('name', `%${search}%`);
  if (params.status !== 'all') query = query.eq('status', params.status);
  if (params.ownerFilter === 'mine' && params.ownerId) query = query.eq('owner_id', params.ownerId);

  const { data, count, error } = await query
    .order(params.sortBy.split('_')[0], { ascending: params.sortBy.endsWith('_asc') })
    .range((params.page - 1) * params.perPage, params.page * params.perPage - 1);

  if (error) throwQueryError('Failed to list workflows', error);

  return {
    items: (data as WorkflowRow[]).map(normalizeWorkflow),
    total: count ?? 0,
  };
}

export async function createWorkflow(name: string, ownerId: string | null): Promise<Workflow> {
  const resolvedOwnerId = ownerId ?? (await resolveOwnerId(null)) ?? FALLBACK_OWNER_ID;
  const { data, error } = await supabase
    .from('workflows')
    .insert([
      {
        name: name.trim() || 'Untitled workflow',
        status: 'active',
        owner_id: resolvedOwnerId,
        definition: { nodes: [], connections: [] },
      },
    ])
    .select('*')
    .single();

  if (error) throwQueryError('Failed to create workflow', error);
  return normalizeWorkflow(data as WorkflowRow);
}

export async function updateWorkflowName(id: string, name: string): Promise<Workflow> {
  const { data, error } = await supabase
    .from('workflows')
    .update({ name: name.trim() || 'Untitled workflow', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throwQueryError('Failed to update workflow name', error);
  return normalizeWorkflow(data as WorkflowRow);
}

export async function toggleWorkflowStatus(id: string, status: WorkflowStatus): Promise<Workflow> {
  const { data, error } = await supabase
    .from('workflows')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throwQueryError('Failed to update workflow status', error);
  return normalizeWorkflow(data as WorkflowRow);
}

export async function deleteWorkflow(id: string): Promise<void> {
  const { error } = await supabase.from('workflows').delete().eq('id', id);
  if (error) throwQueryError('Failed to delete workflow', error);
}

export async function duplicateWorkflow(sourceWorkflow: Workflow, ownerId: string | null): Promise<Workflow> {
  const resolvedOwnerId = ownerId ?? (await resolveOwnerId(null)) ?? FALLBACK_OWNER_ID;
  const { data, error } = await supabase
    .from('workflows')
    .insert([
      {
        name: `${sourceWorkflow.name} (Copy)`,
        status: sourceWorkflow.status,
        owner_id: resolvedOwnerId,
        definition: sourceWorkflow.definition ?? { nodes: [], connections: [] },
      },
    ])
    .select('*')
    .single();

  if (error) throwQueryError('Failed to duplicate workflow', error);
  return normalizeWorkflow(data as WorkflowRow);
}
