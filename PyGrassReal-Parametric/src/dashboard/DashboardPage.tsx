import { useState, useCallback, useMemo } from 'react';
import { Plus } from 'lucide-react';
import './dashboard.css';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';
import { CreateWorkflowModal } from './components/CreateWorkflowModal';
import { DashboardHeader } from './components/DashboardHeader';
import { PaginationBar } from './components/PaginationBar';
import { ToolbarSearchSort } from './components/ToolbarSearchSort';
import { WorkflowList } from './components/WorkflowList';
import { DashboardEmptyState } from './components/DashboardEmptyState';
import { ToastStack } from './components/ToastStack';
import { PlanMeta, StatusInfo } from './components/DashboardStatusMeta';
import type { Workflow } from './types/workflow.types';
import { useToasts } from './hooks/useToasts';
import { useWorkflows } from './hooks/useWorkflows';
import { useUserEntitlement } from './hooks/useUserEntitlement';
import { localizeText, useLanguage } from '../i18n/language';
import { DASHBOARD_UI, MODAL_UI } from './data/dashboardData';

interface DashboardPageProps {
  onOpenWorkflowEditor: (workflow: Workflow) => void;
  onUpgradePlan: () => void;
}

export default function DashboardPage({ onOpenWorkflowEditor, onUpgradePlan }: DashboardPageProps) {
  const { language } = useLanguage();
  const { toasts, pushToast, getErrorMessage } = useToasts();

  const {
    workflows, total, loading, isCreating, isDeleting,
    query, filters,
    handleCreate, handleUpdateName, handleDuplicate, handleDelete
  } = useWorkflows({ pushToast, getErrorMessage });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Workflow | null>(null);
  const { entitlement } = useUserEntitlement();

  const handleCreateConfirm = useCallback(async (name: string) => {
    const created = await handleCreate(name);
    if (created) {
      setShowCreateModal(false);
      onOpenWorkflowEditor(created);
    }
  }, [handleCreate, onOpenWorkflowEditor]);

  const handleDeleteConfirm = useCallback(async () => {
    if (pendingDelete) {
      await handleDelete(pendingDelete.id);
      setPendingDelete(null);
    }
  }, [handleDelete, pendingDelete]);

  const headerCopy = useMemo(() => (
    <div className="dashboard-header-copy">
      <h1 className="dashboard-title">{localizeText(language, DASHBOARD_UI.title)}</h1>
      <p className="dashboard-subtitle">{localizeText(language, DASHBOARD_UI.subtitle)}</p>
    </div>
  ), [language]);

  const headerRightMeta = useMemo(() => (
    <div className="dashboard-header-right-actions">
      <PlanMeta entitlement={entitlement} onUpgradePlan={onUpgradePlan} showUpgradeButton={false} />
      <button
        type="button"
        className="dashboard-primary-button dashboard-header-create-btn"
        onClick={() => setShowCreateModal(true)}
      >
        <Plus size={18} />
        {localizeText(language, MODAL_UI.create)}
      </button>
    </div>
  ), [entitlement, language, onUpgradePlan]);

  return (
    <>
      <div className="dashboard-overview-stack">
        <DashboardHeader rightMeta={headerRightMeta}>
          {headerCopy}
        </DashboardHeader>

        <ToolbarSearchSort
          searchTerm={query.searchTerm}
          onSearchChange={filters.setSearchTerm}
          sortBy={query.sortBy}
          onSortByChange={filters.setSortBy}
          statusFilter={query.statusFilter}
          onStatusFilterChange={filters.setStatusFilter}
          ownerFilter={query.ownerFilter}
          onOwnerFilterChange={filters.setOwnerFilter}
        />

        <section className="dashboard-content-panel">
          <StatusInfo loading={loading} count={workflows.length} />

          {!loading && workflows.length === 0 ? (
            <DashboardEmptyState onCreateClick={() => setShowCreateModal(true)} />
          ) : (
            <WorkflowList
              workflows={workflows}
              loading={loading}
              onOpen={onOpenWorkflowEditor}
              onUpdateName={handleUpdateName}
              onDuplicate={handleDuplicate}
              onDeleteRequest={setPendingDelete}
            />
          )}
        </section>

        <PaginationBar
          total={total}
          page={query.page}
          perPage={query.perPage}
          onPageChange={filters.setPage}
          onPerPageChange={filters.setPerPage}
        />
      </div>

      <CreateWorkflowModal
        open={showCreateModal}
        isSubmitting={isCreating}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateConfirm}
      />

      <ConfirmDeleteModal
        workflow={pendingDelete}
        isDeleting={isDeleting}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDeleteConfirm}
      />

      <ToastStack toasts={toasts} />
    </>
  );
}
