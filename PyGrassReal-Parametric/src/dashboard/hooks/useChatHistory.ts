import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { ChatProject, HistoryItemData } from '../types/chat.types';
import { localizeText, useLanguage } from '../../i18n/language';
import { CHAT_UI, CHAT_LIMITS, CHAT_HISTORY_UI } from '../data/chatData';
import { sanitizeInput } from '../utils';
import { supabase } from '../../lib/supabaseClient';
import { getDashboardUserId } from '../services/dashboard.chat.api';

export function useChatHistory({
  pushToast,
  getErrorMessage,
  isOpen = true,
}: {
  pushToast?: (message: string, tone?: 'success' | 'error') => void;
  getErrorMessage?: (error: unknown) => string;
  isOpen?: boolean;
} = {}) {
  const { language } = useLanguage();
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [confirmingDeleteProjectId, setConfirmingDeleteProjectId] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const [projects, setProjects] = useState<ChatProject[]>([]);
  const [historyItems, setHistoryItems] = useState<HistoryItemData[]>([]);
  const lastActionTimeRef = useRef<number>(0);

  // Auto-reset for delete confirmations
  useEffect(() => {
    if (!confirmingDeleteId && !confirmingDeleteProjectId) return;

    const timer = setTimeout(() => {
      setConfirmingDeleteId(null);
      setConfirmingDeleteProjectId(null);
    }, CHAT_LIMITS.CONFIRM_DELETE_TIMEOUT);

    return () => clearTimeout(timer);
  }, [confirmingDeleteId, confirmingDeleteProjectId]);

  // Load from Supabase on mount and whenever history drawer is opened.
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isMounted = true;
    const userId = getDashboardUserId();

    const loadData = async () => {
      try {
        // Fetch Projects
        const { data: projData, error: projErr } = await supabase
          .from('chat_projects')
          .select('id, name')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!isMounted) return;
        if (projData) setProjects(projData as ChatProject[]);

        // Fetch Sessions
        const { data: sessData, error: sessErr } = await supabase
          .from('chat_sessions')
          .select('id, title, project_id, updated_at')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false });

        if (!isMounted) return;
        if (sessData) {
          const items: HistoryItemData[] = sessData.map(s => ({
            id: s.id,
            title: s.title,
            projectId: s.project_id,
            date: new Date(s.updated_at).toLocaleString()
          }));
          setHistoryItems(items);
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
      }
    };

    void loadData();
    return () => { isMounted = false; };
  }, [isOpen]);

  const executeWithConfirmation = useCallback((
    id: string,
    currentState: string | null,
    setState: (val: string | null) => void,
    onExecute: () => void,
    successMsg: any // Using any to avoid type check issues with LocalizedText
  ) => {
    if (currentState === id) {
      onExecute();
      setState(null);
      if (pushToast && successMsg) {
        pushToast(localizeText(language, successMsg));
      }
    } else {
      setState(id);
    }
  }, [language, pushToast]);

  const handleDelete = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const now = Date.now();
    if (now - lastActionTimeRef.current < 1000) return;

    executeWithConfirmation(
      id,
      confirmingDeleteId,
      setConfirmingDeleteId,
      () => {
        setHistoryItems(prev => prev.filter(item => item.id !== id));
        lastActionTimeRef.current = Date.now();
        supabase.from('chat_sessions').delete().eq('id', id).then();
      },
      CHAT_HISTORY_UI.successConversationDeleted
    );
  }, [confirmingDeleteId, executeWithConfirmation]);

  const handleDeleteProject = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const now = Date.now();
    if (now - lastActionTimeRef.current < 1000) return;

    executeWithConfirmation(
      id,
      confirmingDeleteProjectId,
      setConfirmingDeleteProjectId,
      () => {
        setHistoryItems(prev => prev.map(item => item.projectId === id ? { ...item, projectId: null } : item));
        setProjects(prev => prev.filter(p => p.id !== id));
        if (activeProjectId === id) setActiveProjectId(null);
        lastActionTimeRef.current = Date.now();
        supabase.from('chat_projects').delete().eq('id', id).then();
      },
      CHAT_HISTORY_UI.successProjectDeleted
    );
  }, [confirmingDeleteProjectId, activeProjectId, executeWithConfirmation]);

  const handleNewFile = useCallback((e: React.MouseEvent | null, projectId: string | null) => {
    if (e) e.stopPropagation();

    const now = Date.now();
    if (now - lastActionTimeRef.current < 2000) return;

    const newId = `session-${crypto.randomUUID?.() || Date.now()}`;
    const initialTitle = typeof CHAT_UI.untitled === 'object' ? (CHAT_UI.untitled as any)[language] || 'Untitled' : 'Untitled';

    setHistoryItems(prev => [
      {
        id: newId,
        title: initialTitle,
        date: new Date().toLocaleString(),
        projectId
      },
      ...prev,
    ]);

    lastActionTimeRef.current = now;

    supabase.from('chat_sessions').insert({
      id: newId,
      user_id: getDashboardUserId(),
      title: initialTitle,
      project_id: projectId
    }).then();

    pushToast?.(localizeText(language, CHAT_HISTORY_UI.successNewConversation));
  }, [language, pushToast]);

  const handleCreateNewProject = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPromptOpen(true);
    setNewProjectName('');
  }, []);

  const submitNewProject = useCallback(() => {
    const now = Date.now();
    if (now - lastActionTimeRef.current < 2000) return;

    const cleanName = sanitizeInput(newProjectName, CHAT_LIMITS.PROJECT_NAME_MAX_LENGTH);
    if (!cleanName) return;

    lastActionTimeRef.current = now;
    const newId = `project-${crypto.randomUUID?.() || Date.now()}`;

    setProjects(prev => [...prev, { id: newId, name: cleanName }]);

    supabase.from('chat_projects').insert({
      id: newId,
      user_id: getDashboardUserId(),
      name: cleanName
    }).then();

    setIsPromptOpen(false);
    setNewProjectName('');
    pushToast?.(localizeText(language, CHAT_HISTORY_UI.successProjectCreated));
  }, [newProjectName, language, pushToast]);

  const cancelNewProject = useCallback(() => {
    setIsPromptOpen(false);
    setNewProjectName('');
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('chatId', id);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetProjectId: string | null) => {
    e.preventDefault();
    const chatId = e.dataTransfer.getData('chatId');
    if (!chatId) return;

    setHistoryItems(prev => {
      const item = prev.find(i => i.id === chatId);
      if (!item || item.projectId === targetProjectId) return prev;

      return prev.map(i => i.id === chatId ? { ...i, projectId: targetProjectId } : i);
    });

    supabase.from('chat_sessions').update({ project_id: targetProjectId }).eq('id', chatId).then();
  }, []);

  const handleOpenProject = useCallback((projectId: string) => {
    setActiveProjectId(projectId);
  }, []);

  const handleBackToMain = useCallback(() => {
    setActiveProjectId(null);
  }, []);

  // --- Derived State ---
  const activeProject = useMemo(() =>
    projects.find(p => p.id === activeProjectId) || null,
    [projects, activeProjectId]);

  const projectItems = useMemo(() =>
    historyItems.filter(item => item.projectId === activeProjectId),
    [historyItems, activeProjectId]);

  const recentItems = useMemo(() =>
    historyItems.filter(item => !item.projectId),
    [historyItems]);

  const projectItemCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    historyItems.forEach(item => {
      if (item.projectId) {
        counts[item.projectId] = (counts[item.projectId] || 0) + 1;
      }
    });
    return counts;
  }, [historyItems]);

  return useMemo(() => ({
    confirmingDeleteId,
    confirmingDeleteProjectId,
    activeProjectId,
    activeProject,
    projectItems,
    recentItems,
    projectItemCounts,
    isPromptOpen,
    newProjectName,
    setNewProjectName,
    projects,
    historyItems,
    handleDelete,
    handleDeleteProject,
    handleNewFile,
    handleCreateNewProject,
    submitNewProject,
    cancelNewProject,
    handleDragStart,
    handleDrop,
    handleOpenProject,
    handleBackToMain,
  }), [
    confirmingDeleteId,
    confirmingDeleteProjectId,
    activeProjectId,
    activeProject,
    projectItems,
    recentItems,
    projectItemCounts,
    isPromptOpen,
    newProjectName,
    projects,
    historyItems,
    handleDelete,
    handleDeleteProject,
    handleNewFile,
    handleCreateNewProject,
    submitNewProject,
    cancelNewProject,
    handleDragStart,
    handleDrop,
    handleOpenProject,
    handleBackToMain
  ]);
}
