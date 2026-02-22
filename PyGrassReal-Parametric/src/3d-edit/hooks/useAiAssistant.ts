import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChatHistoryMessage, ChatSession, Connection, NodeData, PendingImageItem } from '../types/NodeTypes';

const MIN_PANEL_WIDTH = 280;
const MIN_PANEL_HEIGHT = 260;
const DEFAULT_PANEL_WIDTH = 350;
const DEFAULT_PANEL_HEIGHT = 420;
const PANEL_SAFE_GAP = 12;

const createMessageId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const createSessionId = () => `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const clamp = (value: number, min: number, max: number) => {
    return Math.min(max, Math.max(min, value));
};

const summarizeTitle = (text: string) => {
    const single = text.replace(/\s+/g, ' ').trim();
    if (!single) return 'New Chat';
    return single.length > 24 ? `${single.slice(0, 24)}...` : single;
};

const getNodePromptPreviewText = (node: NodeData): string => {
    const currentDraft = typeof node.data.promptText === 'string' ? node.data.promptText.trim() : '';
    if (currentDraft) return currentDraft;

    const sessions = Array.isArray(node.data.chatSessions) ? node.data.chatSessions : [];
    const activeSessionId = node.data.activeSessionId || sessions[0]?.id;
    const activeSession = sessions.find((session) => session.id === activeSessionId) || sessions[0];
    const lastMessage = activeSession?.messages?.[activeSession.messages.length - 1];
    if (lastMessage?.content?.trim()) return lastMessage.content.trim();

    const submitted = typeof node.data.promptSubmittedText === 'string'
        ? node.data.promptSubmittedText.trim()
        : '';
    return submitted;
};

const clampPanelSize = (size: { width: number; height: number }) => {
    return {
        width: Math.max(MIN_PANEL_WIDTH, Math.round(size.width)),
        height: Math.max(MIN_PANEL_HEIGHT, Math.round(size.height)),
    };
};

const getDefaultPanelSize = (savedSize?: { width: number; height: number }) => {
    if (savedSize) {
        return clampPanelSize(savedSize);
    }
    if (typeof window !== 'undefined') {
        return clampPanelSize({
            width: DEFAULT_PANEL_WIDTH,
            height: Math.round(window.innerHeight * 0.6),
        });
    }
    return {
        width: DEFAULT_PANEL_WIDTH,
        height: DEFAULT_PANEL_HEIGHT,
    };
};

const getDefaultPanelPosition = (panelWidth: number) => {
    if (typeof window === 'undefined') {
        return { x: 20, y: 20 };
    }
    return {
        x: Math.max(20, window.innerWidth - panelWidth - 24),
        y: 20,
    };
};

const clampPanelPosition = (
    position: { x: number; y: number },
    size: { width: number; height: number }
) => {
    if (typeof window === 'undefined') {
        return position;
    }
    const maxX = Math.max(PANEL_SAFE_GAP, window.innerWidth - size.width - PANEL_SAFE_GAP);
    const maxY = Math.max(PANEL_SAFE_GAP, window.innerHeight - size.height - PANEL_SAFE_GAP);
    return {
        x: clamp(Math.round(position.x), PANEL_SAFE_GAP, maxX),
        y: clamp(Math.round(position.y), PANEL_SAFE_GAP, maxY),
    };
};

interface UseAiAssistantParams {
    nodeId: string;
    nodeData: NodeData['data'];
    nodes: NodeData[];
    connections: Connection[];
    onDataChange: (id: string, data: Partial<NodeData['data']>) => void;
}

export const useAiAssistant = ({
    nodeId,
    nodeData,
    nodes,
    connections,
    onDataChange,
}: UseAiAssistantParams) => {
    const initialPanelSize = getDefaultPanelSize(nodeData.panelSize);
    const [panelVisible, setPanelVisible] = useState(nodeData.panelVisible ?? true);
    const [panelSize, setPanelSize] = useState<{ width: number; height: number }>(initialPanelSize);
    const [panelPosition, setPanelPosition] = useState<{ x: number; y: number }>(() => {
        const hasSavedPosition = Boolean(
            nodeData.panelPosition &&
            (nodeData.panelPosition.x !== 0 || nodeData.panelPosition.y !== 0)
        );
        const initialPosition = hasSavedPosition
            ? (nodeData.panelPosition as { x: number; y: number })
            : getDefaultPanelPosition(initialPanelSize.width);
        return clampPanelPosition(initialPosition, initialPanelSize);
    });
    const [draft, setDraft] = useState<string>(nodeData.aiAssistantDraft ?? '');
    const [showHistoryMenu, setShowHistoryMenu] = useState(false);
    const [chatModel, setChatModelState] = useState<'model-a' | 'model-b'>(nodeData.chatModel ?? 'model-a');
    const [actionMode, setActionModeState] = useState<'plan' | 'act'>(nodeData.chatActionMode ?? 'plan');
    const [planMarkdown, setPlanMarkdownState] = useState<string>(nodeData.planMarkdown ?? nodeData.planContent ?? '');
    const [planPanelVisible, setPlanPanelVisibleState] = useState<boolean>(nodeData.planPanelVisible ?? false);
    const [planPanelWidth, setPlanPanelWidthState] = useState<number>(nodeData.planPanelWidth ?? 280);
    const [pendingImages, setPendingImages] = useState<PendingImageItem[]>(
        Array.isArray(nodeData.pendingImages) ? nodeData.pendingImages : []
    );

    useEffect(() => {
        if (typeof nodeData.panelVisible === 'boolean') {
            setPanelVisible(nodeData.panelVisible);
        }
    }, [nodeData.panelVisible]);

    useEffect(() => {
        if (typeof nodeData.aiAssistantDraft === 'string') {
            setDraft(nodeData.aiAssistantDraft);
        }
    }, [nodeData.aiAssistantDraft]);
    useEffect(() => {
        if (nodeData.chatModel === 'model-a' || nodeData.chatModel === 'model-b') {
            setChatModelState(nodeData.chatModel);
        }
    }, [nodeData.chatModel]);
    useEffect(() => {
        if (nodeData.chatActionMode === 'plan' || nodeData.chatActionMode === 'act') {
            setActionModeState(nodeData.chatActionMode);
        }
    }, [nodeData.chatActionMode]);
    useEffect(() => {
        if (typeof nodeData.planMarkdown === 'string') {
            setPlanMarkdownState(nodeData.planMarkdown);
            return;
        }
        if (typeof nodeData.planContent === 'string') {
            setPlanMarkdownState(nodeData.planContent);
        }
    }, [nodeData.planContent, nodeData.planMarkdown]);
    useEffect(() => {
        if (typeof nodeData.planPanelVisible === 'boolean') {
            setPlanPanelVisibleState(nodeData.planPanelVisible);
        }
    }, [nodeData.planPanelVisible]);
    useEffect(() => {
        if (typeof nodeData.planPanelWidth === 'number' && Number.isFinite(nodeData.planPanelWidth)) {
            setPlanPanelWidthState(nodeData.planPanelWidth);
        }
    }, [nodeData.planPanelWidth]);
    useEffect(() => {
        setPendingImages(Array.isArray(nodeData.pendingImages) ? nodeData.pendingImages : []);
    }, [nodeData.pendingImages]);

    useEffect(() => {
        if (!nodeData.panelSize) return;
        setPanelSize(clampPanelSize(nodeData.panelSize));
    }, [nodeData.panelSize?.width, nodeData.panelSize?.height]);

    useEffect(() => {
        if (!nodeData.panelPosition) return;
        const hasSavedPosition = nodeData.panelPosition.x !== 0 || nodeData.panelPosition.y !== 0;
        if (!hasSavedPosition) return;
        setPanelPosition((previous) => {
            const next = clampPanelPosition(nodeData.panelPosition as { x: number; y: number }, panelSize);
            if (previous.x === next.x && previous.y === next.y) {
                return previous;
            }
            return next;
        });
    }, [nodeData.panelPosition?.x, nodeData.panelPosition?.y]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handleWindowResize = () => {
            setPanelPosition((previous) => clampPanelPosition(previous, panelSize));
        };
        window.addEventListener('resize', handleWindowResize);
        return () => window.removeEventListener('resize', handleWindowResize);
    }, [panelSize.height, panelSize.width]);

    const hasWindowConnection = useMemo(() => {
        return connections.some((connection) => {
            const isConnectedToAssistant =
                connection.sourceNodeId === nodeId || connection.targetNodeId === nodeId;
            if (!isConnectedToAssistant) {
                return false;
            }
            const otherNodeId = connection.sourceNodeId === nodeId
                ? connection.targetNodeId
                : connection.sourceNodeId;
            const otherNode = nodes.find((node) => node.id === otherNodeId);
            return otherNode?.type === 'widget-window';
        });
    }, [connections, nodeId, nodes]);

    const chatConnection = useMemo(() => {
        return connections.find((connection) => {
            return connection.targetNodeId === nodeId && connection.targetPort === 'input-chat';
        }) ?? null;
    }, [connections, nodeId]);

    const connectedChatNode = useMemo(() => {
        if (!chatConnection) return null;
        return nodes.find((node) => node.id === chatConnection.sourceNodeId) ?? null;
    }, [chatConnection, nodes]);

    const connectedSessions = useMemo<ChatSession[]>(() => {
        if (!connectedChatNode) return [];
        return Array.isArray(connectedChatNode.data.chatSessions) ? connectedChatNode.data.chatSessions : [];
    }, [connectedChatNode]);

    const localSessions = useMemo<ChatSession[]>(() => {
        return Array.isArray(nodeData.chatSessions) ? nodeData.chatSessions : [];
    }, [nodeData.chatSessions]);

    const activeSessionId = useMemo(() => {
        if (connectedChatNode) {
            return connectedChatNode.data.activeSessionId || connectedSessions[0]?.id || '';
        }
        return nodeData.activeSessionId || localSessions[0]?.id || '';
    }, [connectedChatNode, connectedSessions, localSessions, nodeData.activeSessionId]);

    const activeSession = useMemo(() => {
        const sourceSessions = connectedChatNode ? connectedSessions : localSessions;
        if (sourceSessions.length === 0) return null;
        return sourceSessions.find((session) => session.id === activeSessionId) || sourceSessions[0];
    }, [activeSessionId, connectedChatNode, connectedSessions, localSessions]);

    const connectedMessages = useMemo(() => {
        if (!connectedChatNode) {
            return [] as ChatHistoryMessage[];
        }
        if (connectedSessions.length > 0) {
            return activeSession?.messages ?? [];
        }

        return Array.isArray(connectedChatNode.data.chatHistory)
            ? connectedChatNode.data.chatHistory
            : [];
    }, [activeSession, connectedChatNode, connectedSessions.length]);

    const localMessages = useMemo(() => {
        return Array.isArray(nodeData.chatHistory) ? nodeData.chatHistory : [];
    }, [nodeData.chatHistory]);

    const localSessionMessages = useMemo(() => {
        if (localSessions.length > 0) {
            return activeSession?.messages ?? [];
        }
        return localMessages;
    }, [activeSession, localMessages, localSessions.length]);

    const chatMessages = connectedChatNode ? connectedMessages : localSessionMessages;

    const hasChatConnection = Boolean(connectedChatNode);

    const incomingPreview = useMemo(() => {
        const buildPreviewFromSource = (sourceNode: NodeData | null) => {
            if (!sourceNode) return null;
            if (sourceNode.type === 'node-prompt') {
                const text = getNodePromptPreviewText(sourceNode);
                if (!text) return null;
                return { sourceLabel: sourceNode.data.customName || 'Text Data', text };
            }
            if (sourceNode.type !== 'panel') {
                return null;
            }
            const inspectorInput = connections.find((connection) => {
                return connection.targetNodeId === sourceNode.id && connection.targetPort === 'input-main';
            });
            const inspectorSource = inspectorInput
                ? nodes.find((node) => node.id === inspectorInput.sourceNodeId) ?? null
                : null;
            if (inspectorSource?.type === 'node-prompt') {
                const text = getNodePromptPreviewText(inspectorSource);
                if (!text) return null;
                return {
                    sourceLabel: `${sourceNode.data.customName || 'Inspector'} / ${inspectorSource.data.customName || 'Text Data'}`,
                    text,
                };
            }
            const raw = inspectorSource
                ? JSON.stringify(inspectorSource.data, null, 2)
                : JSON.stringify(sourceNode.data, null, 2);
            if (!raw || raw === '{}') return null;
            return {
                sourceLabel: sourceNode.data.customName || 'Inspector',
                text: raw.length > 300 ? `${raw.slice(0, 300)}...` : raw,
            };
        };

        const inputConnection = connections.find((connection) => connection.targetNodeId === nodeId);
        const connectedSource = inputConnection
            ? nodes.find((node) => node.id === inputConnection.sourceNodeId) ?? null
            : null;
        const connectedPreview = buildPreviewFromSource(connectedSource);
        if (connectedPreview) return connectedPreview;

        const latestPromptNode = [...nodes].reverse().find((node) => node.type === 'node-prompt') ?? null;
        const promptPreview = buildPreviewFromSource(latestPromptNode);
        if (promptPreview) return promptPreview;

        const latestInspectorNode = [...nodes].reverse().find((node) => node.type === 'panel') ?? null;
        const inspectorPreview = buildPreviewFromSource(latestInspectorNode);
        if (inspectorPreview) return inspectorPreview;

        return null;
    }, [connections, nodeId, nodes]);

    const sessionList = useMemo(() => {
        const sessions = connectedChatNode ? connectedSessions : localSessions;
        return [...sessions].sort((a, b) => b.timestamp - a.timestamp);
    }, [connectedChatNode, connectedSessions, localSessions]);

    const canCreateSession = useMemo(() => {
        if (activeSession && activeSession.messages.length > 0) {
            return true;
        }
        return chatMessages.length > 0;
    }, [activeSession, chatMessages.length]);

    const createChatSession = useCallback(() => {
        if (!canCreateSession) return;
        const newSession: ChatSession = {
            id: createSessionId(),
            title: 'New Chat',
            messages: [],
            timestamp: Date.now(),
        };
        if (connectedChatNode) {
            const sessions = connectedSessions;
            onDataChange(connectedChatNode.id, {
                chatSessions: [newSession, ...sessions],
                activeSessionId: newSession.id,
            });
        } else {
            const sessions = localSessions;
            onDataChange(nodeId, {
                chatSessions: [newSession, ...sessions],
                activeSessionId: newSession.id,
            });
        }
        setShowHistoryMenu(true);
    }, [canCreateSession, connectedChatNode, connectedSessions, localSessions, nodeId, onDataChange]);

    const selectChatSession = useCallback((sessionId: string) => {
        if (connectedChatNode) {
            onDataChange(connectedChatNode.id, { activeSessionId: sessionId });
        } else {
            onDataChange(nodeId, { activeSessionId: sessionId });
        }
        setShowHistoryMenu(false);
    }, [connectedChatNode, nodeId, onDataChange]);

    const deleteChatSession = useCallback((sessionId: string) => {
        const sessions = connectedChatNode ? connectedSessions : localSessions;
        if (sessions.length <= 1) return;
        const nextSessions = sessions.filter((session) => session.id !== sessionId);
        const nextActiveId = activeSessionId === sessionId ? (nextSessions[0]?.id || '') : activeSessionId;
        if (connectedChatNode) {
            onDataChange(connectedChatNode.id, {
                chatSessions: nextSessions,
                activeSessionId: nextActiveId,
            });
        } else {
            onDataChange(nodeId, {
                chatSessions: nextSessions,
                activeSessionId: nextActiveId,
            });
        }
    }, [activeSessionId, connectedChatNode, connectedSessions, localSessions, nodeId, onDataChange]);

    const showPanel = useCallback(() => {
        setPanelVisible(true);
        onDataChange(nodeId, { panelVisible: true });
    }, [nodeId, onDataChange]);

    const hidePanel = useCallback(() => {
        setPanelVisible(false);
        onDataChange(nodeId, { panelVisible: false });
    }, [nodeId, onDataChange]);

    const previewPanelPosition = useCallback((next: { x: number; y: number }) => {
        setPanelPosition(next);
    }, []);

    const commitPanelPosition = useCallback((next: { x: number; y: number }) => {
        const clamped = clampPanelPosition(next, panelSize);
        setPanelPosition(clamped);
        onDataChange(nodeId, { panelPosition: clamped });
    }, [nodeId, onDataChange, panelSize]);

    const previewPanelSize = useCallback((next: { width: number; height: number }) => {
        const clampedSize = clampPanelSize(next);
        setPanelSize(clampedSize);
    }, []);

    const commitPanelSize = useCallback((
        next: { width: number; height: number },
        nextPosition?: { x: number; y: number }
    ) => {
        const clampedSize = clampPanelSize(next);
        setPanelSize(clampedSize);
        setPanelPosition((previous) => {
            const adjusted = clampPanelPosition(nextPosition ?? previous, clampedSize);
            onDataChange(nodeId, {
                panelSize: clampedSize,
                panelPosition: adjusted,
            });
            return adjusted;
        });
    }, [nodeId, onDataChange]);

    const submitMessage = useCallback(() => {
        const text = draft.trim();
        if (!text && pendingImages.length === 0) return;

        const now = Date.now();
        const outgoingMessages: ChatHistoryMessage[] = [];
        if (pendingImages.length > 0) {
            outgoingMessages.push({
                id: createMessageId(),
                role: 'user',
                content: text,
                contentType: 'image',
                imageDataUrl: pendingImages[0]?.dataUrl,
                imageDataUrls: pendingImages.map((item) => item.dataUrl),
                timestamp: now,
            });
        } else {
            outgoingMessages.push({
                id: createMessageId(),
                role: 'user',
                content: text,
                timestamp: now,
            });
        }
        const assistantText = pendingImages.length > 0
            ? `AI(${chatModel}, ${actionMode}): Received ${pendingImages.length} image(s)${text ? ' and text' : ''}`
            : `AI(${chatModel}, ${actionMode}): Received "${text}"`;
        const assistantMessage: ChatHistoryMessage = {
            id: createMessageId(),
            role: 'assistant',
            content: assistantText,
            timestamp: now + outgoingMessages.length + 1,
        };

        if (connectedChatNode) {
            const sessions = connectedSessions;
            if (sessions.length > 0) {
                const currentActiveId = connectedChatNode.data.activeSessionId || sessions[0]?.id;
                if (currentActiveId) {
                    const updatedSessions = sessions.map((session) => {
                        if (session.id !== currentActiveId) {
                            return session;
                        }
                        const isFirst = session.messages.length === 0;
                        return {
                            ...session,
                            title: isFirst ? summarizeTitle(text) : session.title,
                            messages: [...session.messages, ...outgoingMessages, assistantMessage],
                            timestamp: now,
                        };
                    });
                    onDataChange(connectedChatNode.id, {
                        chatSessions: updatedSessions,
                        activeSessionId: currentActiveId,
                    });
                }
            } else {
                const history = Array.isArray(connectedChatNode.data.chatHistory)
                    ? connectedChatNode.data.chatHistory
                    : [];
                onDataChange(connectedChatNode.id, {
                    chatHistory: [...history, ...outgoingMessages, assistantMessage],
                });
            }
        } else {
            const currentLocalHistory = Array.isArray(nodeData.chatHistory) ? nodeData.chatHistory : [];
            const sessions = localSessions;
            if (sessions.length > 0) {
                const currentActiveId = nodeData.activeSessionId || sessions[0]?.id;
                const updatedSessions = sessions.map((session) => {
                    if (session.id !== currentActiveId) return session;
                    const isFirst = session.messages.length === 0;
                    return {
                        ...session,
                        title: isFirst ? summarizeTitle(text) : session.title,
                        messages: [...session.messages, ...outgoingMessages, assistantMessage],
                        timestamp: now,
                    };
                });
                onDataChange(nodeId, {
                    chatSessions: updatedSessions,
                    activeSessionId: currentActiveId,
                });
            } else {
                onDataChange(nodeId, {
                    chatHistory: [...currentLocalHistory, ...outgoingMessages, assistantMessage],
                });
            }
        }

        setDraft('');
        setPendingImages([]);
        onDataChange(nodeId, {
            aiAssistantDraft: '',
            aiAssistantResponse: assistantText,
            pendingImages: [],
        });
    }, [actionMode, chatModel, connectedChatNode, connectedSessions, draft, localSessions, nodeData.activeSessionId, nodeData.chatHistory, nodeId, onDataChange, pendingImages]);

    const setChatModel = useCallback((next: 'model-a' | 'model-b') => {
        setChatModelState(next);
        onDataChange(nodeId, { chatModel: next });
    }, [nodeId, onDataChange]);

    const setActionMode = useCallback((next: 'plan' | 'act') => {
        setActionModeState(next);
        onDataChange(nodeId, { chatActionMode: next });
    }, [nodeId, onDataChange]);

    const setPlanMarkdown = useCallback((next: string) => {
        setPlanMarkdownState(next);
        onDataChange(nodeId, {
            planContent: next,
            planMarkdown: next,
            planSource: 'user',
            planUpdatedAt: Date.now(),
        });
    }, [nodeId, onDataChange]);

    const togglePlanPanel = useCallback(() => {
        const next = !planPanelVisible;
        setPlanPanelVisibleState(next);
        onDataChange(nodeId, { planPanelVisible: next });
    }, [nodeId, onDataChange, planPanelVisible]);

    const setPlanPanelWidth = useCallback((next: number) => {
        const clamped = Math.max(220, Math.min(560, Math.round(next)));
        setPlanPanelWidthState(clamped);
        onDataChange(nodeId, { planPanelWidth: clamped });
    }, [nodeId, onDataChange]);

    const applyIncomingPreviewToDraft = useCallback(() => {
        if (!incomingPreview?.text) return;
        const merged = draft.trim()
            ? `${draft.trim()}\n\n${incomingPreview.text}`
            : incomingPreview.text;
        setDraft(merged);
        onDataChange(nodeId, { aiAssistantDraft: merged });
    }, [draft, incomingPreview, nodeId, onDataChange]);

    const addPendingImage = useCallback((item: PendingImageItem) => {
        const next = [...pendingImages, item];
        setPendingImages(next);
        onDataChange(nodeId, { pendingImages: next });
    }, [nodeId, onDataChange, pendingImages]);

    const removePendingImage = useCallback((imageId: string) => {
        const next = pendingImages.filter((item) => item.id !== imageId);
        setPendingImages(next);
        onDataChange(nodeId, { pendingImages: next });
    }, [nodeId, onDataChange, pendingImages]);

    return {
        hasWindowConnection,
        hasChatConnection,
        panelVisible,
        panelPosition,
        panelSize,
        draft,
        chatModel,
        actionMode,
        planMarkdown,
        planPanelVisible,
        planPanelWidth,
        chatMessages,
        showHistoryMenu,
        incomingPreview,
        pendingImages,
        activeSessionId,
        sessionList,
        canCreateSession,
        latestResponse: nodeData.aiAssistantResponse ?? '',
        setDraft,
        setChatModel,
        setActionMode,
        setPlanMarkdown,
        togglePlanPanel,
        setPlanPanelWidth,
        setShowHistoryMenu,
        applyIncomingPreviewToDraft,
        addPendingImage,
        removePendingImage,
        createChatSession,
        selectChatSession,
        deleteChatSession,
        showPanel,
        hidePanel,
        previewPanelPosition,
        commitPanelPosition,
        previewPanelSize,
        commitPanelSize,
        submitMessage,
    };
};
