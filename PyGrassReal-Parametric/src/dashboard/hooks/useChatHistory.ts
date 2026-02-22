import { useState, useEffect, useCallback } from 'react';
import type { ChatProject, HistoryItemData } from '../types/chat.types';

export function useChatHistory() {
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [confirmingDeleteProjectId, setConfirmingDeleteProjectId] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const [projects, setProjects] = useState<ChatProject[]>([]);
  const [historyItems, setHistoryItems] = useState<HistoryItemData[]>([
    { id: '1', title: 'Solar Panel Optimization', date: '2 hours ago', projectId: null },
    { id: '2', title: 'Parametric Facade Design', date: 'Yesterday', projectId: null },
    { id: '3', title: 'Material Strength Analysis', date: '3 days ago', projectId: null },
  ]);

  // Auto-reset delete confirmation after 3 seconds
  useEffect(() => {
    if (confirmingDeleteId) {
      const timer = setTimeout(() => {
        setConfirmingDeleteId(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [confirmingDeleteId]);

  // Auto-reset delete confirmation for project after 3 seconds
  useEffect(() => {
    if (confirmingDeleteProjectId) {
      const timer = setTimeout(() => {
        setConfirmingDeleteProjectId(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [confirmingDeleteProjectId]);

  const handleDelete = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirmingDeleteId === id) {
      setHistoryItems(prev => prev.filter(item => item.id !== id));
      setConfirmingDeleteId(null);
    } else {
      setConfirmingDeleteId(id);
    }
  }, [confirmingDeleteId]);

  const handleDeleteProject = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirmingDeleteProjectId === id) {
      setHistoryItems(prev => prev.map(item => item.projectId === id ? { ...item, projectId: null } : item));
      setProjects(prev => prev.filter(p => p.id !== id));
      setConfirmingDeleteProjectId(null);
      if (activeProjectId === id) setActiveProjectId(null);
    } else {
      setConfirmingDeleteProjectId(id);
    }
  }, [confirmingDeleteProjectId, activeProjectId]);

  const handleNewFile = useCallback((e: React.MouseEvent | null, projectId: string | null) => {
    if (e) e.stopPropagation();
    const newId = `f${Date.now()}`;
    setHistoryItems(prev => [
      { id: newId, title: `New File`, date: 'Just now', projectId },
      ...prev,
    ]);
  }, []);

  const handleCreateNewProject = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPromptOpen(true);
    setNewProjectName('');
  }, []);

  const submitNewProject = useCallback(() => {
    const finalName = newProjectName.trim() || `Project ${projects.length + 1}`;
    const newId = `p${Date.now()}`;
    setProjects(prev => [...prev, { id: newId, name: finalName }]);
    setIsPromptOpen(false);
    setNewProjectName('');
  }, [newProjectName, projects.length]);

  const cancelNewProject = useCallback(() => {
    setIsPromptOpen(false);
    setNewProjectName('');
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('chatId', id);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, projectId: string | null) => {
    e.preventDefault();
    const chatId = e.dataTransfer.getData('chatId');
    if (chatId) {
      setHistoryItems(prev => prev.map(item => item.id === chatId ? { ...item, projectId } : item));
    }
  }, []);

  const handleOpenProject = useCallback((projectId: string) => {
    setActiveProjectId(projectId);
  }, []);

  const handleBackToMain = useCallback(() => {
    setActiveProjectId(null);
  }, []);

  return {
    confirmingDeleteId,
    confirmingDeleteProjectId,
    activeProjectId,
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
  };
}
