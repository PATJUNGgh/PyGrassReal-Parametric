import { useState, useMemo, useEffect } from 'react';
import type { ChatSession, NodeData } from '../types/NodeTypes';

interface UsePromptChatLogicProps {
    connectedNode: NodeData | null;
    isPromptChatMode: boolean;
    onDataChange: (id: string, data: Partial<NodeData['data']>) => void;
    selected: boolean;
}

export const usePromptChatLogic = ({
    connectedNode,
    isPromptChatMode,
    onDataChange,
    selected,
}: UsePromptChatLogicProps) => {
    const [showTaskHistoryMenu, setShowTaskHistoryMenu] = useState(false);
    const [sessionSearchText, setSessionSearchText] = useState('');
    const [pendingDeleteSessionId, setPendingDeleteSessionId] = useState<string | null>(null);

    useEffect(() => {
        if (!selected) {
            setShowTaskHistoryMenu(false);
            setPendingDeleteSessionId(null);
        }
    }, [selected]);

    const promptSessions = useMemo<ChatSession[]>(() => {
        if (!isPromptChatMode || !connectedNode) return [];
        const existing = Array.isArray(connectedNode.data.chatSessions) ? connectedNode.data.chatSessions : [];
        if (existing.length > 0) return existing;
        return [{ id: 'default', title: 'New Chat', messages: [], timestamp: Date.now() }];
    }, [connectedNode, isPromptChatMode]);

    const activePromptSessionId = useMemo(() => {
        if (!isPromptChatMode || !connectedNode) return '';
        return connectedNode.data.activeSessionId || promptSessions[0]?.id || '';
    }, [connectedNode, isPromptChatMode, promptSessions]);

    const activePromptSession = useMemo(
        () => promptSessions.find((session) => session.id === activePromptSessionId) || promptSessions[0] || null,
        [promptSessions, activePromptSessionId]
    );

    const visiblePromptSessions = useMemo(() => {
        const keyword = sessionSearchText.trim().toLowerCase();
        const sorted = [...promptSessions].sort((a, b) => b.timestamp - a.timestamp);
        if (!keyword) return sorted;
        return sorted.filter((session) => session.title.toLowerCase().includes(keyword));
    }, [promptSessions, sessionSearchText]);

    const createPromptSession = () => {
        if (!isPromptChatMode || !connectedNode) return;
        if (!activePromptSession || activePromptSession.messages.length === 0) return;
        const newSession: ChatSession = {
            id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            title: 'New Chat',
            messages: [],
            timestamp: Date.now(),
        };
        onDataChange(connectedNode.id, {
            chatSessions: [newSession, ...promptSessions],
            activeSessionId: newSession.id,
            promptText: '',
        });
        setShowTaskHistoryMenu(false);
        setSessionSearchText('');
    };

    const selectPromptSession = (sessionId: string) => {
        if (!isPromptChatMode || !connectedNode) return;
        onDataChange(connectedNode.id, { activeSessionId: sessionId });
        setShowTaskHistoryMenu(false);
        setPendingDeleteSessionId(null);
    };

    const selectedChatModel = connectedNode?.type === 'node-prompt'
        ? (connectedNode.data.chatModel || 'model-a')
        : 'model-a';
    const selectedActionMode = connectedNode?.type === 'node-prompt'
        ? (connectedNode.data.chatActionMode || 'plan')
        : 'plan';

    const setChatModel = (model: 'model-a' | 'model-b') => {
        if (!isPromptChatMode || !connectedNode) return;
        onDataChange(connectedNode.id, { chatModel: model });
    };

    const setActionMode = (mode: 'plan' | 'act') => {
        if (!isPromptChatMode || !connectedNode) return;
        onDataChange(connectedNode.id, { chatActionMode: mode });
    };

    const deletePromptSession = (sessionId: string) => {
        if (!isPromptChatMode || !connectedNode) return;
        if (promptSessions.length <= 1) return;

        const nextSessions = promptSessions.filter((session) => session.id !== sessionId);
        const nextActiveSessionId = activePromptSessionId === sessionId
            ? (nextSessions[0]?.id || '')
            : activePromptSessionId;

        onDataChange(connectedNode.id, {
            chatSessions: nextSessions,
            activeSessionId: nextActiveSessionId,
        });
        setPendingDeleteSessionId(null);
    };

    return {
        showTaskHistoryMenu,
        setShowTaskHistoryMenu,
        sessionSearchText,
        setSessionSearchText,
        pendingDeleteSessionId,
        setPendingDeleteSessionId,
        promptSessions,
        activePromptSessionId,
        activePromptSession,
        visiblePromptSessions,
        createPromptSession,
        selectPromptSession,
        selectedChatModel,
        selectedActionMode,
        setChatModel,
        setActionMode,
        deletePromptSession,
    };
};
