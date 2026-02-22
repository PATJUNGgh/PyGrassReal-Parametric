import { ArrowUpDown, Filter, Search } from 'lucide-react';
import type {
  WorkflowOwnerFilter,
  WorkflowSort,
  WorkflowStatus,
} from '../types/workflow.types';

interface ToolbarSearchSortProps {
  searchTerm: string;
  onSearchChange: (next: string) => void;
  sortBy: WorkflowSort;
  onSortByChange: (next: WorkflowSort) => void;
  statusFilter: WorkflowStatus | 'all';
  onStatusFilterChange: (next: WorkflowStatus | 'all') => void;
  ownerFilter: WorkflowOwnerFilter;
  onOwnerFilterChange: (next: WorkflowOwnerFilter) => void;
}

export function ToolbarSearchSort({
  searchTerm,
  onSearchChange,
  sortBy,
  onSortByChange,
  statusFilter,
  onStatusFilterChange,
  ownerFilter,
  onOwnerFilterChange,
}: ToolbarSearchSortProps) {
  return (
    <section className="dashboard-toolbar">
      <label className="dashboard-search">
        <Search size={16} />
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search workflows"
          aria-label="Search workflows"
        />
      </label>

      <div className="dashboard-toolbar-controls">
        <div className="dashboard-chip">
          <Filter size={14} />
          Filters
        </div>

        <label className="dashboard-select">
          <ArrowUpDown size={14} />
          <span>Sort</span>
          <select
            value={sortBy}
            onChange={(event) => onSortByChange(event.target.value as WorkflowSort)}
            aria-label="Sort workflows"
          >
            <option value="updated_desc">Updated (latest)</option>
            <option value="created_desc">Created (latest)</option>
            <option value="name_asc">Name A-Z</option>
          </select>
        </label>

        <label className="dashboard-select">
          <span>Status</span>
          <select
            value={statusFilter}
            onChange={(event) =>
              onStatusFilterChange(event.target.value as WorkflowStatus | 'all')
            }
            aria-label="Filter by status"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>

        <label className="dashboard-select">
          <span>Owner</span>
          <select
            value={ownerFilter}
            onChange={(event) => onOwnerFilterChange(event.target.value as WorkflowOwnerFilter)}
            aria-label="Filter by owner"
          >
            <option value="mine">My workflows</option>
            <option value="all">All owners</option>
          </select>
        </label>
      </div>
    </section>
  );
}
