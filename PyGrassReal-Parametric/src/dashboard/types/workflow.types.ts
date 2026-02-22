export type WorkflowStatus = 'active' | 'inactive';

export type WorkflowSort = 'updated_desc' | 'created_desc' | 'name_asc';

export type WorkflowOwnerFilter = 'mine' | 'all';

export interface WorkflowDefinition {
  thumbnail?: string;
  nodes?: any[];
  connections?: any[];
  [key: string]: any;
}

export interface Workflow {
  id: string;
  name: string;
  status: WorkflowStatus;
  owner_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  definition: WorkflowDefinition | null;
}

export interface WorkflowQueryParams {
  page: number;
  perPage: number;
  search: string;
  status: WorkflowStatus | 'all';
  sortBy: WorkflowSort;
  ownerFilter: WorkflowOwnerFilter;
  ownerId: string | null;
}

export interface WorkflowListResult {
  items: Workflow[];
  total: number;
}
