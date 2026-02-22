import type { Workflow } from '../types/workflow.types';

export const MOCK_WORKFLOWS: Workflow[] = [
  {
    id: 'mock-1',
    name: 'Solar Panel Optimization',
    status: 'active',
    owner_id: 'local-user',
    created_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    updated_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    definition: { nodes: [], connections: [] }
  },
  {
    id: 'mock-2',
    name: 'Parametric Facade Design',
    status: 'active',
    owner_id: 'local-user',
    created_at: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    updated_at: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
    definition: { nodes: [], connections: [] }
  },
  {
    id: 'mock-3',
    name: 'Material Strength Analysis',
    status: 'inactive',
    owner_id: 'local-user',
    created_at: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
    updated_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    definition: { nodes: [], connections: [] }
  }
];
