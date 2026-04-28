import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
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
  updateWorkflowName,
} from '../services/workflows.api';
import { useDebounce } from './useDebounce';
import { logStructured, isAbortError, sanitizeInput } from '../utils';
import { localizeText, useLanguage } from '../../i18n/language';
import { DASHBOARD_TOAST_UI } from '../data/dashboardData';

interface UseWorkflowsProps {
  pushToast: (message: string, tone?: 'success' | 'error') => void;
  getErrorMessage: (error: unknown) => string;
  disableThrottle?: boolean;
}

/**
 * Custom hook to manage the lifecycle of user workflows in the dashboard.
 * Provides functionality for listing, creating, updating, duplicating, and deleting workflows.
 * 
 * Features:
 * - Automatic owner identification via Supabase session.
 * - Server-side search, sort, and filtering.
 * - Optimistic UI updates for name changes.
 * - Client-side rate limiting (cooldowns) for write operations.
 * - Ownership verification before mutation.
 * 
 * @param props - Configuration for the hook.
 * @param props.pushToast - Function to display UI notifications.
 * @param props.getErrorMessage - Helper to format error objects into strings.
 * @param props.disableThrottle - If true, security cooldowns are bypassed (useful for tests).
 * 
 * @example
 * const { workflows, handleCreate } = useWorkflows({ pushToast, getErrorMessage });
 * await handleCreate('My New Project');
 */
export function useWorkflows({ pushToast, getErrorMessage, disableThrottle }: UseWorkflowsProps) {
  const { language } = useLanguage();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [total, setTotal] = useState(0);
  
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
  const lastActionTimeRef = useRef<number>(0);

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

  const loadWorkflows = useCallback(async (signal?: AbortSignal) => {
    if (!ownerReady) return;
    
    setLoading(true);
    try {
      const result = await listWorkflows({
        page: queryOpts.page,
        perPage: queryOpts.perPage,
        search: sanitizeInput(debouncedSearch),
        sortBy: queryOpts.sortBy,
        status: queryOpts.statusFilter,
        ownerFilter: queryOpts.ownerFilter,
        ownerId,
        signal,
      });
      
      setWorkflows(result.items);
      setTotal(result.total);
      logStructured('Workflows loaded successfully', { user_id: ownerId, count: result.items.length, page: queryOpts.page });
    } catch (error) {
      if (isAbortError(error)) return;
      
      const errorStr = String(error);
      if (!errorStr.includes('404') && !errorStr.includes('PGRST116')) {
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

  const loadWorkflowsRef = useRef(loadWorkflows);
  useEffect(() => {
    loadWorkflowsRef.current = loadWorkflows;
  }, [loadWorkflows]);

  useEffect(() => {
    const controller = new AbortController();
    loadWorkflows(controller.signal);
    return () => controller.abort();
  }, [loadWorkflows]);

  const handleCreate = useCallback(async (name: string) => {
    if (!ownerId) {
      pushToast('Authorization required', 'error');
      return null;
    }

    const now = Date.now();
    if (!disableThrottle && now - lastActionTimeRef.current < 2000) return null;

    const cleanName = sanitizeInput(name, 100);
    if (!cleanName) return null;

    lastActionTimeRef.current = now;
    setIsCreating(true);
    try {
      const created = await createWorkflow(cleanName, ownerId);
      if (created) {
        pushToast(localizeText(language, DASHBOARD_TOAST_UI.successCreated));
        logStructured('Workflow created', { user_id: ownerId, workflow_id: created.id, name: cleanName });
        await loadWorkflowsRef.current();
      }
      return created;
    } catch (error) {
      pushToast(getErrorMessage(error), 'error');
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [ownerId, pushToast, getErrorMessage, language]);

  const optimisticUpdate = useCallback(async (
    workflowId: string,
    updates: Partial<Workflow>,
    rollbackValue: Partial<Workflow>,
    apiCall: () => Promise<unknown>
  ) => {
    const timestamp = new Date().toISOString();
    setWorkflows(prev => prev.map(w => w.id === workflowId ? { ...w, ...updates, updated_at: timestamp } : w));

    try {
      await apiCall();
    } catch (error) {
      setWorkflows(prev => prev.map(w => w.id === workflowId ? { ...w, ...rollbackValue } : w));
      throw error;
    }
  }, []);

  const handleUpdateName = useCallback(async (workflow: Workflow, nextName: string) => {
    if (!ownerId || workflow.owner_id !== ownerId) {
      pushToast('Action not allowed', 'error');
      return;
    }

    const now = Date.now();
    if (!disableThrottle && now - lastActionTimeRef.current < 1000) return;

    const cleanName = sanitizeInput(nextName, 100);
    if (!cleanName || cleanName === workflow.name) return;

    lastActionTimeRef.current = now;
    try {
      await optimisticUpdate(workflow.id, { name: cleanName }, { name: workflow.name }, () => updateWorkflowName(workflow.id, cleanName));
      pushToast(localizeText(language, DASHBOARD_TOAST_UI.successUpdated));
    } catch (error) {
      pushToast(getErrorMessage(error), 'error');
    }
  }, [ownerId, optimisticUpdate, pushToast, getErrorMessage, language, disableThrottle]);

  const handleDuplicate = useCallback(async (workflow: Workflow) => {
    if (!ownerId) {
      pushToast('Authorization required', 'error');
      return;
    }

    const now = Date.now();
    if (!disableThrottle && now - lastActionTimeRef.current < 2000) return;

    lastActionTimeRef.current = now;
    try {
      await duplicateWorkflow(workflow, ownerId);
      pushToast(localizeText(language, DASHBOARD_TOAST_UI.successDuplicated));
      setQueryOpts(prev => ({ ...prev, page: 1 }));
      await loadWorkflowsRef.current();
    } catch (error) {
      pushToast(getErrorMessage(error), 'error');
    }
  }, [ownerId, pushToast, getErrorMessage, language, disableThrottle]);

  const handleDelete = useCallback(async (workflowId: string) => {
    if (!ownerId) {
      pushToast('Authorization required', 'error');
      return;
    }

    const now = Date.now();
    if (!disableThrottle && now - lastActionTimeRef.current < 1000) return;

    // Verify ownership before deleting
    const target = workflows.find(w => w.id === workflowId);
    if (!target || target.owner_id !== ownerId) {
      pushToast('Action not allowed', 'error');
      return;
    }

    lastActionTimeRef.current = now;
    setIsDeleting(true);
    try {
      await deleteWorkflow(workflowId);
      pushToast(localizeText(language, DASHBOARD_TOAST_UI.successDeleted));
      if (workflows.length === 1 && queryOpts.page > 1) {
        setQueryOpts(prev => ({ ...prev, page: prev.page - 1 }));
      } else {
        await loadWorkflowsRef.current();
      }
    } catch (error) {
      pushToast(getErrorMessage(error), 'error');
    } finally {
      setIsDeleting(false);
    }
  }, [ownerId, workflows, queryOpts.page, pushToast, getErrorMessage, language, disableThrottle]);

  const filters = useMemo(() => {
    const update = (patch: Partial<typeof queryOpts>) => setQueryOpts(prev => ({ ...prev, ...patch, page: 1 }));
    return {
      setPage: (page: number) => setQueryOpts(prev => ({ ...prev, page: Math.max(1, page) })),
      setPerPage: (perPage: number) => update({ perPage: Math.max(1, perPage) }),
      setSearchTerm: (searchTerm: string) => update({ searchTerm }),
      setSortBy: (sortBy: WorkflowSort) => update({ sortBy }),
      setStatusFilter: (statusFilter: WorkflowStatus | 'all') => update({ statusFilter }),
      setOwnerFilter: (ownerFilter: WorkflowOwnerFilter) => update({ ownerFilter }),
    };
  }, []);

  return useMemo(() => ({ 
    workflows, total, loading, isCreating, isDeleting, 
    query: queryOpts, filters, 
    handleCreate, handleUpdateName, handleDuplicate, handleDelete 
  }), [
    workflows, total, loading, isCreating, isDeleting, 
    queryOpts, filters, 
    handleCreate, handleUpdateName, handleDuplicate, handleDelete
  ]);
}
