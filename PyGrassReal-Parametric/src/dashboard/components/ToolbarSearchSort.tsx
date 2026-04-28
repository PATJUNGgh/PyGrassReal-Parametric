import React, { useMemo } from 'react';
import { ArrowUpDown, Filter, Search } from 'lucide-react';
import type {
  WorkflowOwnerFilter,
  WorkflowSort,
  WorkflowStatus,
} from '../types/workflow.types';
import { localizeText, useLanguage } from '../../i18n/language';
import { TOOLBAR_UI } from '../data/dashboardData';

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

interface ToolbarSelectProps<T extends string> {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
  icon?: React.ReactNode;
  ariaLabel: string;
}

function ToolbarSelect<T extends string>({
  label, value, onChange, options, icon, ariaLabel
}: ToolbarSelectProps<T>) {
  return (
    <label className="dashboard-select">
      {icon}
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        aria-label={ariaLabel}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </label>
  );
}

export const ToolbarSearchSort = React.memo(({
  searchTerm,
  onSearchChange,
  sortBy,
  onSortByChange,
  statusFilter,
  onStatusFilterChange,
  ownerFilter,
  onOwnerFilterChange,
}: ToolbarSearchSortProps) => {
  const { language: lang } = useLanguage();

  const sortOptions = useMemo(() => [
    { value: 'updated_desc' as const, label: localizeText(lang, TOOLBAR_UI.sortOptions.updated_desc) },
    { value: 'created_desc' as const, label: localizeText(lang, TOOLBAR_UI.sortOptions.created_desc) },
    { value: 'name_asc' as const, label: localizeText(lang, TOOLBAR_UI.sortOptions.name_asc) },
  ], [lang]);

  const statusOptions = useMemo(() => [
    { value: 'all' as const, label: localizeText(lang, TOOLBAR_UI.statusOptions.all) },
    { value: 'active' as const, label: localizeText(lang, TOOLBAR_UI.statusOptions.active) },
    { value: 'inactive' as const, label: localizeText(lang, TOOLBAR_UI.statusOptions.inactive) },
  ], [lang]);

  const ownerOptions = useMemo(() => [
    { value: 'mine' as const, label: localizeText(lang, TOOLBAR_UI.ownerOptions.mine) },
    { value: 'all' as const, label: localizeText(lang, TOOLBAR_UI.ownerOptions.all) },
  ], [lang]);

  return (
    <section className="dashboard-toolbar">
      <label className="dashboard-search">
        <Search size={16} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={localizeText(lang, TOOLBAR_UI.searchPlaceholder)}
          aria-label={localizeText(lang, TOOLBAR_UI.searchPlaceholder)}
          maxLength={100}
        />
      </label>

      <div className="dashboard-toolbar-controls">
        <div className="dashboard-chip">
          <Filter size={14} />
          {localizeText(lang, TOOLBAR_UI.filters)}
        </div>

        <ToolbarSelect
          label={localizeText(lang, TOOLBAR_UI.sort)}
          value={sortBy}
          onChange={onSortByChange}
          icon={<ArrowUpDown size={14} />}
          ariaLabel="Sort workflows"
          options={sortOptions}
        />

        <ToolbarSelect
          label={localizeText(lang, TOOLBAR_UI.status)}
          value={statusFilter}
          onChange={onStatusFilterChange}
          ariaLabel="Filter by status"
          options={statusOptions}
        />

        <ToolbarSelect
          label={localizeText(lang, TOOLBAR_UI.owner)}
          value={ownerFilter}
          onChange={onOwnerFilterChange}
          ariaLabel="Filter by owner"
          options={ownerOptions}
        />
      </div>
    </section>
  );
});

ToolbarSearchSort.displayName = 'ToolbarSearchSort';
