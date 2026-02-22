import { useState, useCallback, useEffect, useMemo } from 'react';
import type {
  Workflow,
  WorkflowOwnerFilter,
  WorkflowSort,
  WorkflowStatus,
} from '../types/workflow.types';
import {
  createWorkflow,
  deleteWorkflow,
  duplicateWorkflow,
  getCurrentOwnerId,
  listWorkflows,
  toggleWorkflowStatus,
  updateWorkflowName,
} from '../services/workflows.api';
import { useDebounce } from './useDebounce';

interface UseWorkflowsProps {
  pushToast: (message: string, tone?: 'success' | 'error') => void;
  getErrorMessage: (error: unknown) => string;
}

export function useWorkflows({ pushToast, getErrorMessage }: UseWorkflowsProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [total, setTotal] = useState(0);
  
  // Consolidate filter and pagination states
  const [queryOpts, setQueryOpts] = useState({
    page: 1,
    perPage: 6,
    searchTerm: '',
    sortBy: 'updated_desc' as WorkflowSort,
    statusFilter: 'all' as WorkflowStatus | 'all',
    ownerFilter: 'mine' as WorkflowOwnerFilter,
  });

  const debouncedSearch = useDebounce(queryOpts.searchTerm, 300);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [ownerReady, setOwnerReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Resolve Owner (Run once)
  useEffect(() => {
    let alive = true;
    const resolveOwner = async () => {
      try {
        const id = await getCurrentOwnerId();
        if (alive) {
          setOwnerId(id);
          setOwnerReady(true);
        }
      } catch {
        if (alive) setOwnerReady(true);
      }
    };
    resolveOwner();
    return () => { alive = false; };
  }, []);

  const loadWorkflows = useCallback(async () => {
    if (!ownerReady) return;
    
    setLoading(true);
    try {
      const result = await listWorkflows({
        page: queryOpts.page,
        perPage: queryOpts.perPage,
        search: debouncedSearch,
        sortBy: queryOpts.sortBy,
        status: queryOpts.statusFilter,
        ownerFilter: queryOpts.ownerFilter,
        ownerId,
      });
      setWorkflows(result.items);
      setTotal(result.total);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (!errorMsg.includes('404')) {
        pushToast(getErrorMessage(error), 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [
    ownerReady, 
    queryOpts.page, 
    queryOpts.perPage, 
    queryOpts.sortBy, 
    queryOpts.statusFilter, 
    queryOpts.ownerFilter, 
    debouncedSearch, 
    ownerId, 
    pushToast, 
    getErrorMessage
  ]);

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  const handleCreate = useCallback(async (name: string) => {
    setIsCreating(true);
    try {
      const created = await createWorkflow(name, ownerId);
      if (created) {
        pushToast('Workflow created');
        await loadWorkflows();
      }
      return created;
    } catch (error) {
      pushToast(getErrorMessage(error), 'error');
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [ownerId, loadWorkflows, pushToast, getErrorMessage]);

  const handleUpdateName = useCallback(async (workflow: Workflow, nextName: string) => {
    const optimisticUpdatedAt = new Date().toISOString();
    setWorkflows(prev => prev.map(item => 
      item.id === workflow.id ? { ...item, name: nextName, updated_at: optimisticUpdatedAt } : item
    ));

    try {
      await updateWorkflowName(workflow.id, nextName);
      pushToast('Workflow updated');
    } catch (error) {
      setWorkflows(prev => prev.map(item => item.id === workflow.id ? workflow : item));
      pushToast(getErrorMessage(error), 'error');
    }
  }, [pushToast, getErrorMessage]);

  const handleToggleStatus = useCallback(async (workflow: Workflow, nextStatus: WorkflowStatus) => {
    const original = { ...workflow };
    setWorkflows(prev => prev.map(item => 
      item.id === workflow.id ? { ...item, status: nextStatus, updated_at: new Date().toISOString() } : item
    ));

    try {
      await toggleWorkflowStatus(workflow.id, nextStatus);
      pushToast(`Workflow set to ${nextStatus}`);
    } catch (error) {
      setWorkflows(prev => prev.map(item => item.id === workflow.id ? original : item));
      pushToast(getErrorMessage(error), 'error');
    }
  }, [pushToast, getErrorMessage]);

  const handleDuplicate = useCallback(async (workflow: Workflow) => {
    try {
      await duplicateWorkflow(workflow, ownerId);
      pushToast('Workflow duplicated');
      setQueryOpts(prev => ({ ...prev, page: 1 }));
      await loadWorkflows();
    } catch (error) {
      pushToast(getErrorMessage(error), 'error');
    }
  }, [ownerId, loadWorkflows, pushToast, getErrorMessage]);

  const handleDelete = useCallback(async (workflowId: string) => {
    setIsDeleting(true);
    try {
      await deleteWorkflow(workflowId);
      pushToast('Workflow deleted');
      if (workflows.length === 1 && queryOpts.page > 1) {
        setQueryOpts(prev => ({ ...prev, page: prev.page - 1 }));
      } else {
        await loadWorkflows();
      }
    } catch (error) {
      pushToast(getErrorMessage(error), 'error');
    } finally {
      setIsDeleting(false);
    }
  }, [workflows.length, queryOpts.page, loadWorkflows, pushToast, getErrorMessage]);

  const filters = useMemo(() => ({
    setPage: (page: number) => setQueryOpts(prev => ({ ...prev, page })),
    setPerPage: (perPage: number) => setQueryOpts(prev => ({ ...prev, perPage, page: 1 })),
    setSearchTerm: (searchTerm: string) => setQueryOpts(prev => ({ ...prev, searchTerm, page: 1 })),
    setSortBy: (sortBy: WorkflowSort) => setQueryOpts(prev => ({ ...prev, sortBy, page: 1 })),
    setStatusFilter: (statusFilter: WorkflowStatus | 'all') => setQueryOpts(prev => ({ ...prev, statusFilter, page: 1 })),
    setOwnerFilter: (ownerFilter: WorkflowOwnerFilter) => setQueryOpts(prev => ({ ...prev, ownerFilter, page: 1 })),
  }), []);

  return {
    workflows,
    total,
    loading,
    isCreating,
    isDeleting,
    query: queryOpts,
    filters,
    handleCreate,
    handleUpdateName,
    handleToggleStatus,
    handleDuplicate,
    handleDelete
  };
}
