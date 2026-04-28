import type { Workflow } from '../types/workflow.types';

export const MOCK_WORKFLOWS: Workflow[] = [
  {
    id: 'mock-1',
    name: 'Smart City Parametric Plan',
    status: 'active',
    owner_id: 'local-user',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
    definition: { nodes: [], connections: [] }
  },
  {
    id: 'mock-2',
    name: 'Modular Housing System',
    status: 'active',
    owner_id: 'local-user',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 43200000).toISOString(),
    definition: { nodes: [], connections: [] }
  },
  {
    id: 'mock-3',
    name: 'Bridge Structural Analysis',
    status: 'inactive',
    owner_id: 'local-user',
    created_at: new Date(Date.now() - 259200000).toISOString(),
    updated_at: new Date(Date.now() - 172800000).toISOString(),
    definition: { nodes: [], connections: [] }
  }
];
