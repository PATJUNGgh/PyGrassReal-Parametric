import { useEffect, useMemo, useState } from 'react';
import './dashboard.css';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';
import { CreateWorkflowModal } from './components/CreateWorkflowModal';
import { DashboardHeader } from './components/DashboardHeader';
import { PaginationBar } from './components/PaginationBar';
import { ToolbarSearchSort } from './components/ToolbarSearchSort';
import { WorkflowList } from './components/WorkflowList';
import { DashboardEmptyState } from './components/DashboardEmptyState';
import { ToastStack } from './components/ToastStack';
import type { Workflow } from './types/workflow.types';
import { useToasts } from './hooks/useToasts';
import { useWorkflows } from './hooks/useWorkflows';
import { getEntitlementByUserId, resolvePricingUserId } from '../pricing/services/entitlement.api';
import type { SubscriptionEntitlement } from '../pricing/types/pricing.types';

interface DashboardPageProps {
  onOpenWorkflowEditor: (workflow: Workflow) => void;
  onUpgradePlan: () => void;
}

const formatPlanStatus = (entitlement: SubscriptionEntitlement | null): string => {
  if (!entitlement) return 'Free Plan';
  const normalizedPlan = `${entitlement.plan_id.slice(0, 1).toUpperCase()}${entitlement.plan_id.slice(1)}`;
  return `${normalizedPlan} Active`;
};

export default function DashboardPage({ onOpenWorkflowEditor, onUpgradePlan }: DashboardPageProps) {
  const { toasts, pushToast, getErrorMessage } = useToasts();

  const {
    workflows, total, loading, isCreating, isDeleting,
    query, filters,
    handleCreate, handleUpdateName, handleDuplicate, handleDelete
  } = useWorkflows({ pushToast, getErrorMessage });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Workflow | null>(null);
  const [entitlement, setEntitlement] = useState<SubscriptionEntitlement | null>(null);
  const [isEntitlementLoading, setIsEntitlementLoading] = useState(true);
  const userId = useMemo(() => resolvePricingUserId(), []);

  useEffect(() => {
    let cancelled = false;

    const loadEntitlement = async () => {
      setIsEntitlementLoading(true);
      const data = await getEntitlementByUserId(userId);
      if (!cancelled) {
        setEntitlement(data);
        setIsEntitlementLoading(false);
      }
    };

    void loadEntitlement();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleCreateConfirm = async (name: string) => {
    const created = await handleCreate(name);
    if (created) {
      setShowCreateModal(false);
      onOpenWorkflowEditor(created);
    }
  };

  const handleDeleteConfirm = async () => {
    if (pendingDelete) {
      await handleDelete(pendingDelete.id);
      setPendingDelete(null);
    }
  };

  return (
    <>
      <div className="dashboard-overview-stack">
        <DashboardHeader
          rightMeta={(
            <div className="dashboard-plan-meta">
              <span className={`dashboard-plan-pill ${entitlement ? 'is-active' : ''}`}>
                {isEntitlementLoading ? 'Checking plan...' : formatPlanStatus(entitlement)}
              </span>
              <button type="button" className="dashboard-upgrade-button" onClick={onUpgradePlan}>
                Upgrade plan
              </button>
            </div>
          )}
        >
          <div className="dashboard-header-copy">
            <h1 className="dashboard-title">3D-Edit</h1>
            <p className="dashboard-subtitle">
              Manage and edit your parametric 3D models. Create new workflows or continue where you left off.
            </p>
          </div>
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
          <div className="dashboard-list-head">
            <p>
              {loading
                ? 'Refreshing workflow list...'
                : `Showing ${workflows.length} item${workflows.length === 1 ? '' : 's'} in the current view.`}
            </p>
          </div>

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
      </div >

      <CreateWorkflowModal
        key={showCreateModal ? 'create-open' : 'create-closed'}
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
