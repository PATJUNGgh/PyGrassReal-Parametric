import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Database, Pencil, Search, Target, Trash2, X } from 'lucide-react';
import type { NodeData, Connection } from '../types/NodeTypes';
import { useNodeDrag } from '../hooks/useNodeDrag';
import { useNodeResize } from '../hooks/useInspectorNodeResize';
import clsx from 'clsx';
import './CustomNode.css';
import './CustomNodeMenu.css';
import { NodeActionBar } from './NodeActionBar';
import { ActionModeToggle } from './ActionModeToggle';
import { usePromptChatLogic } from '../hooks/usePromptChatLogic';

interface InspectorNodeProps {
    id: string;
    data: {
        customName?: string;
        width?: number;
        height?: number;
        isPaused?: boolean;
        chatActionMode?: 'chat' | 'plan' | 'act';
    };
    position: { x: number; y: number };
    selected: boolean;
    nodes: NodeData[];
    connections: Connection[];
    onPositionChange: (id: string, position: { x: number; y: number }) => void;
    onDelete: (id: string) => void;
    onConnectionComplete: (nodeId: string, portId: string) => void;
    onSelect?: () => void;
    scale?: number;
    // New Props for Group/Duplicate
    onDuplicate?: (id: string) => void;
    parentGroupId?: string;
    overlappingGroupId?: string;
    onJoinGroup?: (nodeId: string, groupId: string) => void;
    onLeaveGroup?: (nodeId: string) => void;
    onDataChange: (id: string, data: Partial<NodeData['data']>) => void;
    onDeleteConnection?: (connectionId: string) => void;
    isShaking?: boolean;
    onConnectionStart?: (nodeId: string, portId: string, position: { x: number; y: number }) => void;
    interactionMode?: 'node' | '3d' | 'wire';
    isInfected?: boolean;
    isPaused?: boolean;
    onDragStart?: () => void;
    onDragEnd?: () => void;
}

const getPrimaryNumericValue = (value: NodeData['data']['value']): number | null => {
    if (typeof value === 'number') return value;
    if (Array.isArray(value) && typeof value[0] === 'number') return value[0];
    return null;
};

const getNumericValues = (value: NodeData['data']['value']): number[] => {
    if (Array.isArray(value)) return value.filter((item): item is number => typeof item === 'number');
    if (typeof value === 'number') return [value];
    return [];
};

const inspectorGeneratingStyles = `
@keyframes inspectorPulse {
    0%, 100% {
        opacity: 0.65;
        transform: scale(1);
    }
    50% {
        opacity: 1;
        transform: scale(1.03);
    }
}

@keyframes inspectorTypingDot {
    0%, 70%, 100% {
        transform: translateY(0) scale(0.82);
        opacity: 0.4;
    }
    35% {
        transform: translateY(-2px) scale(1);
        opacity: 1;
    }
}

.inspector-pulse-text {
    display: inline-flex;
    align-items: center;
    animation: inspectorPulse 1.15s ease-in-out infinite;
    transform-origin: center;
}

.typing-indicator {
    display: inline-flex;
    align-items: center;
    gap: 4px;
}

.typing-indicator span {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: currentColor;
    animation: inspectorTypingDot 1s ease-in-out infinite;
}

.typing-indicator span:nth-child(2) {
    animation-delay: 0.16s;
}

.typing-indicator span:nth-child(3) {
    animation-delay: 0.32s;
}
`;

const TypingIndicator: React.FC<{ color?: string; dotSize?: number }> = ({
    color = '#67e8f9',
    dotSize = 6,
}) => (
    <span className="typing-indicator" style={{ color }} aria-hidden="true">
        <span style={{ width: dotSize, height: dotSize }} />
        <span style={{ width: dotSize, height: dotSize }} />
        <span style={{ width: dotSize, height: dotSize }} />
    </span>
);

type ParsedPlanLine = {
    type: 'h1' | 'h2' | 'h3' | 'task' | 'number' | 'bullet' | 'code' | 'empty' | 'p';
    text: string;
    checked?: boolean;
    order?: string;
};

type ChatSelectionOverlay = {
    text: string;
    x: number;
    y: number;
};

const INSPECTOR_PROMPT_AUTO_WIDTH = 430;
const INSPECTOR_PROMPT_AUTO_HEIGHT = 500;
const INSPECTOR_OVERFLOW_AUTO_HEIGHT = 580;

const readPlanMarkdown = (node: NodeData | null): string => {
    if (!node) return '';
    if (typeof node.data.planMarkdown === 'string') return node.data.planMarkdown;
    if (typeof node.data.planContent === 'string') return node.data.planContent;
    return '';
};

const parsePlanMarkdown = (markdown: string): ParsedPlanLine[] => {
    const lines = markdown.split(/\r?\n/);
    let inCodeBlock = false;
    const output: ParsedPlanLine[] = [];

    lines.forEach((line) => {
        if (line.trim().startsWith('```')) {
            inCodeBlock = !inCodeBlock;
            return;
        }

        if (inCodeBlock) {
            output.push({ type: 'code', text: line || ' ' });
            return;
        }

        const h3 = line.match(/^###\s+(.+)$/);
        if (h3) {
            output.push({ type: 'h3', text: h3[1] });
            return;
        }

        const h2 = line.match(/^##\s+(.+)$/);
        if (h2) {
            output.push({ type: 'h2', text: h2[1] });
            return;
        }

        const h1 = line.match(/^#\s+(.+)$/);
        if (h1) {
            output.push({ type: 'h1', text: h1[1] });
            return;
        }

        const task = line.match(/^\s*[-*]\s+\[( |x|X)\]\s+(.+)$/);
        if (task) {
            output.push({ type: 'task', checked: task[1].toLowerCase() === 'x', text: task[2] });
            return;
        }

        const numbered = line.match(/^\s*(\d+)\.\s+(.+)$/);
        if (numbered) {
            output.push({ type: 'number', order: numbered[1], text: numbered[2] });
            return;
        }

        const bullet = line.match(/^\s*[-*]\s+(.+)$/);
        if (bullet) {
            output.push({ type: 'bullet', text: bullet[1] });
            return;
        }

        output.push({ type: line.trim() ? 'p' : 'empty', text: line });
    });

    return output;
};

export const InspectorNode: React.FC<InspectorNodeProps> = ({
    id,
    data,
    position,
    selected,
    nodes,
    connections,
    onPositionChange,
    onDelete,
    onConnectionComplete,
    onSelect,
    scale = 1,
    onDuplicate,
    parentGroupId,
    overlappingGroupId,
    onJoinGroup,
    onLeaveGroup,
    onDataChange,
    onDeleteConnection,
    isShaking,
    onConnectionStart,
    interactionMode,
    isInfected = false,
    isPaused = false,
    onDragStart,
    onDragEnd,
}) => {
    const [previewImage, setPreviewImage] = useState<{ dataUrl: string; name: string } | null>(null);
    const chatMessagesContainerRef = useRef<HTMLDivElement | null>(null);
    const chatSelectionRootRef = useRef<HTMLDivElement | null>(null);
    const hasAutoExpandedForPromptRef = useRef(false);
    const hasAutoExpandedForOverflowRef = useRef(false);
    const [chatSelectionOverlay, setChatSelectionOverlay] = useState<ChatSelectionOverlay | null>(null);
    const [isInputPortHovered, setIsInputPortHovered] = useState(false);
    const [isOutputPortHovered, setIsOutputPortHovered] = useState(false);
    const handleDropdownWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.scrollTop += e.deltaY;
    };
    const handleChatWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        const target = e.target;
        if (target instanceof HTMLElement && target.closest('[data-plan-editor="true"]')) {
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.scrollTop += e.deltaY;
    };

    const { size, isResizing, handleResizeStart } = useNodeResize({
        id,
        initialWidth: data.width,
        initialHeight: data.height,
        minWidth: 340,
        minHeight: 300,
        scale,
        position,
        onDataChange,
        onPositionChange,
    });

    // Animation State
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setHasMounted(true);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    const isNodePaused = data.isPaused ?? isPaused;

    const animationClasses = clsx('custom-node-base', selected ? 'custom-node-selected' : 'custom-node-unselected', {
        'custom-node-paused': isNodePaused,
        'custom-node-infected': !isNodePaused && isInfected,
        'custom-node-normal': !isNodePaused && !isInfected,
        'custom-node-animation-shake': isShaking,
        'custom-node-animation-popin': !hasMounted,
    });

    const connectedNode = useMemo(() => {
        const inputConnection = connections.find(
            (connection) => connection.targetNodeId === id && connection.targetPort === 'input-main'
        );
        if (!inputConnection) return null;
        return nodes.find((node) => node.id === inputConnection.sourceNodeId) ?? null;
    }, [connections, id, nodes]);

    // Recursive prompt node finder
    const chainedPromptNode = useMemo(() => {
        if (!connectedNode) return null;
        if (connectedNode.type === 'node-prompt') return connectedNode;

        let currentNode = connectedNode;
        let depth = 0;

        while (depth < 10) { // Limit depth to avoid infinite loops
            // If current node is prompt, we found it!
            if (currentNode.type === 'node-prompt') return currentNode;

            // Find upstream connection (any port entering this node)
            const upstreamConn = connections.find(
                (c) => c.targetNodeId === currentNode.id
            );
            if (!upstreamConn) return null; // Dead end

            const upstreamNode = nodes.find((n) => n.id === upstreamConn.sourceNodeId);
            if (!upstreamNode) return null; // Node not found (?)

            currentNode = upstreamNode;
            depth++;
        }
        return null; // Too deep or not found
    }, [connectedNode, connections, nodes]);

    // Use effectivePromptNode for mode detection so chained inspectors work
    const effectivePromptNode = connectedNode?.type === 'node-prompt' ? connectedNode : chainedPromptNode;
    const isPromptChatMode = !!effectivePromptNode;

    // Simplified logic: If we found a prompt node (direct or chained), consider it the source
    const planSourceNode = effectivePromptNode;

    // Check if THIS inspector is in Plan Mode
    // Default to 'plan' if daisy-chained (chainedPromptNode exists) and mode is not set.
    const isChained = !!chainedPromptNode && connectedNode?.type !== 'node-prompt';
    const currentMode = data.chatActionMode || (isChained ? 'plan' : 'chat');

    const isPlanMode = !!planSourceNode && (
        currentMode === 'plan'
    );

    const vectorXYZValues = useMemo(() => {
        if (!connectedNode || connectedNode.type !== 'vector-xyz') return null;

        const getNumberFromInput = (portId: string) => {
            const inputConn = connections.find(
                (conn) => conn.targetNodeId === connectedNode.id && conn.targetPort === portId
            );
            if (!inputConn) return null;
            const source = nodes.find((node) => node.id === inputConn.sourceNodeId);
            if (!source || source.type !== 'number-slider') return null;
            return getPrimaryNumericValue(source.data.value);
        };

        return {
            x: getNumberFromInput('X'),
            y: getNumberFromInput('Y'),
            z: getNumberFromInput('Z'),
        };
    }, [connectedNode, connections, nodes]);

    const layerSourceData = useMemo(() => {
        if (!connectedNode || connectedNode.type !== 'layer-source') return null;

        // Find all connections targeting this layer source node
        // We sort by port index/id to maintain order if possible, or just arrival order
        const inputConnections = connections.filter(c => c.targetNodeId === connectedNode.id);

        // Map connections to source nodes
        const sourceNodes = inputConnections.map(conn => {
            const node = nodes.find(n => n.id === conn.sourceNodeId);
            return { node, portId: conn.targetPort };
        }).filter(item => item.node !== undefined);

        return sourceNodes;
    }, [connectedNode, connections, nodes]);

    const [showAllSeries, setShowAllSeries] = useState(false);

    const sliderValues = connectedNode?.type === 'number-slider' ? getNumericValues(connectedNode.data.value) : [];

    const promptStatus = isPromptChatMode && effectivePromptNode
        ? (effectivePromptNode.data.promptStatus || (effectivePromptNode.data.isGenerating ? 'generating' : 'idle'))
        : 'idle';
    const isPromptGenerating = promptStatus === 'generating';
    const promptErrorMessage = isPromptChatMode && effectivePromptNode && typeof effectivePromptNode.data.promptError === 'string'
        ? effectivePromptNode.data.promptError
        : '';
    const planMarkdown = readPlanMarkdown(planSourceNode);
    const parsedPlanLines = useMemo(
        () => parsePlanMarkdown(planMarkdown),
        [planMarkdown]
    );
    const [planViewMode, setPlanViewMode] = useState<'preview' | 'edit'>('edit');
    const [planDraft, setPlanDraft] = useState(planMarkdown);
    const [isPlanDirty, setIsPlanDirty] = useState(false);
    const [isSavingPlan, setIsSavingPlan] = useState(false);
    const planTextareaRef = useRef<HTMLTextAreaElement | null>(null);
    const planEditorValue = isPlanDirty ? planDraft : planMarkdown;
    const hasUnsavedPlanChanges = isPlanDirty && planDraft !== planMarkdown;
    const hasPlanContent = planMarkdown.trim().length > 0;
    const hasProceedContent = (planViewMode === 'edit' ? planEditorValue : planMarkdown).trim().length > 0;
    const canEditPlan = Boolean(planSourceNode) && !isPromptGenerating;

    const openPlanEditMode = () => {
        if (!canEditPlan) return;
        setPlanDraft(planMarkdown);
        setIsPlanDirty(false);
        setPlanViewMode('edit');
        setIsSavingPlan(false);
    };

    const closePlanEditMode = () => {
        setPlanDraft(planMarkdown);
        setIsPlanDirty(false);
        setPlanViewMode('preview');
        setIsSavingPlan(false);
    };

    const savePlanDraft = () => {
        if (!planSourceNode) return;
        const nextPlan = planEditorValue;
        setIsSavingPlan(true);
        onDataChange(planSourceNode.id, {
            planContent: nextPlan,
            planMarkdown: nextPlan,
            planSource: 'user',
            planUpdatedAt: Date.now(),
        });
        setPlanDraft(nextPlan);
        setIsPlanDirty(false);
        setPlanViewMode('preview');
        window.setTimeout(() => {
            setIsSavingPlan(false);
        }, 180);
    };

    const handleProceed = () => {
        if (!planSourceNode) return;
        if (planViewMode === 'edit' && hasUnsavedPlanChanges) {
            const nextPlan = planEditorValue;
            onDataChange(planSourceNode.id, {
                planContent: nextPlan,
                planMarkdown: nextPlan,
                planSource: 'user',
                planUpdatedAt: Date.now(),
            });
            setPlanDraft(nextPlan);
            setIsPlanDirty(false);
        }
        onDataChange(planSourceNode.id, { chatActionMode: 'act' });
        onDataChange(id, { chatActionMode: 'act' });
    };

    const handlePlanEditorKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Tab') {
            event.preventDefault();
            const textarea = event.currentTarget;
            const selectionStart = textarea.selectionStart;
            const selectionEnd = textarea.selectionEnd;
            const nextValue = `${planEditorValue.slice(0, selectionStart)}\t${planEditorValue.slice(selectionEnd)}`;
            setPlanDraft(nextValue);
            setIsPlanDirty(true);
            window.requestAnimationFrame(() => {
                textarea.selectionStart = selectionStart + 1;
                textarea.selectionEnd = selectionStart + 1;
            });
            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            closePlanEditMode();
            return;
        }

        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault();
            savePlanDraft();
        }
    };

    const copySelectedChatText = async (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        if (!chatSelectionOverlay?.text) return;

        try {
            await navigator.clipboard.writeText(chatSelectionOverlay.text);
        } catch {
            const fallbackInput = document.createElement('textarea');
            fallbackInput.value = chatSelectionOverlay.text;
            fallbackInput.style.position = 'fixed';
            fallbackInput.style.opacity = '0';
            fallbackInput.style.pointerEvents = 'none';
            document.body.appendChild(fallbackInput);
            fallbackInput.focus();
            fallbackInput.select();
            try {
                document.execCommand('copy');
            } finally {
                document.body.removeChild(fallbackInput);
            }
        }

        window.getSelection()?.removeAllRanges();
        setChatSelectionOverlay(null);
    };

    const {
        showTaskHistoryMenu, setShowTaskHistoryMenu,
        sessionSearchText, setSessionSearchText,
        pendingDeleteSessionId, setPendingDeleteSessionId,
        promptSessions, activePromptSessionId, activePromptSession, visiblePromptSessions,
        createPromptSession, selectPromptSession,
        selectedChatModel, selectedActionMode,
        setChatModel, setActionMode,
        deletePromptSession,
    } = usePromptChatLogic({
        connectedNode: effectivePromptNode, // Pass the effective prompt node!
        isPromptChatMode,
        onDataChange,
        selected,
    });
    const activePromptMessageCount = activePromptSession?.messages.length ?? 0;

    useEffect(() => {
        if (!isPromptChatMode) return;
        const chatContainer = chatMessagesContainerRef.current;
        if (!chatContainer) return;

        const animationFrameId = window.requestAnimationFrame(() => {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        });

        return () => window.cancelAnimationFrame(animationFrameId);
    }, [isPromptChatMode, activePromptSessionId, activePromptMessageCount, isPromptGenerating]);

    useEffect(() => {
        if (!isPromptChatMode) {
            hasAutoExpandedForPromptRef.current = false;
            hasAutoExpandedForOverflowRef.current = false;
            return;
        }

        if (hasAutoExpandedForPromptRef.current) return;

        const currentWidth = typeof data.width === 'number' ? data.width : size.width;
        const currentHeight = typeof data.height === 'number' ? data.height : size.height;
        const nextWidth = Math.max(currentWidth, INSPECTOR_PROMPT_AUTO_WIDTH);
        const nextHeight = Math.max(currentHeight, INSPECTOR_PROMPT_AUTO_HEIGHT);

        if (nextWidth !== currentWidth || nextHeight !== currentHeight) {
            onDataChange(id, { width: nextWidth, height: nextHeight });
        }

        hasAutoExpandedForPromptRef.current = true;
    }, [data.height, data.width, id, isPromptChatMode, onDataChange, size.height, size.width]);

    useEffect(() => {
        if (!isPromptChatMode || activePromptMessageCount === 0) {
            hasAutoExpandedForOverflowRef.current = false;
            return;
        }

        const currentHeight = typeof data.height === 'number' ? data.height : size.height;
        if (currentHeight < INSPECTOR_OVERFLOW_AUTO_HEIGHT - 16) {
            hasAutoExpandedForOverflowRef.current = false;
        }

        if (hasAutoExpandedForOverflowRef.current || isResizing) return;

        const frame = window.requestAnimationFrame(() => {
            const chatContainer = chatMessagesContainerRef.current;
            if (!chatContainer) return;

            const overflowPx = chatContainer.scrollHeight - chatContainer.clientHeight;
            if (overflowPx < 96) return;

            const latestHeight = typeof data.height === 'number' ? data.height : size.height;
            const nextHeight = Math.max(latestHeight, INSPECTOR_OVERFLOW_AUTO_HEIGHT);
            if (nextHeight > latestHeight) {
                onDataChange(id, { height: nextHeight });
            }

            hasAutoExpandedForOverflowRef.current = true;
        });

        return () => window.cancelAnimationFrame(frame);
    }, [activePromptMessageCount, data.height, id, isPromptChatMode, isResizing, onDataChange, size.height]);

    useEffect(() => {
        const handleSelectionChange = () => {
            const chatContainer = chatMessagesContainerRef.current;
            const overlayRoot = chatSelectionRootRef.current;
            if (!chatContainer || !overlayRoot) {
                setChatSelectionOverlay(null);
                return;
            }

            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
                setChatSelectionOverlay(null);
                return;
            }

            const anchorNode = selection.anchorNode;
            const focusNode = selection.focusNode;
            if (!anchorNode || !focusNode || !chatContainer.contains(anchorNode) || !chatContainer.contains(focusNode)) {
                setChatSelectionOverlay(null);
                return;
            }

            const selectedText = selection.toString().trim();
            if (!selectedText) {
                setChatSelectionOverlay(null);
                return;
            }

            const range = selection.getRangeAt(0);
            const rangeRect = range.getBoundingClientRect();
            if (rangeRect.width === 0 && rangeRect.height === 0) {
                setChatSelectionOverlay(null);
                return;
            }

            const rootRect = overlayRoot.getBoundingClientRect();
            let targetRect: DOMRect = rangeRect;
            try {
                const focusRange = document.createRange();
                focusRange.setStart(focusNode, selection.focusOffset);
                focusRange.collapse(true);
                const focusRect = focusRange.getBoundingClientRect();
                if (focusRect.width !== 0 || focusRect.height !== 0) {
                    targetRect = focusRect;
                } else {
                    const rects = range.getClientRects();
                    if (rects.length > 0) {
                        targetRect = rects[rects.length - 1];
                    }
                }
            } catch {
                const rects = range.getClientRects();
                if (rects.length > 0) {
                    targetRect = rects[rects.length - 1];
                }
            }

            const x = Math.max(10, Math.min(rootRect.width - 70, targetRect.right - rootRect.left + 6));
            const y = Math.max(22, targetRect.top - rootRect.top + 2);

            setChatSelectionOverlay({ text: selectedText, x, y });
        };

        document.addEventListener('selectionchange', handleSelectionChange);
        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
        };
    }, []);

    useEffect(() => {
        if (planViewMode !== 'edit') return;
        const textarea = planTextareaRef.current;
        if (!textarea) return;
        textarea.focus();
        const textEnd = textarea.value.length;
        textarea.setSelectionRange(textEnd, textEnd);
    }, [planViewMode]);

    const animationStyle = isShaking
        ? 'shake 0.3s ease-in-out'
        : !hasMounted
            ? 'popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
            : 'none';


    const { isDragging, handleMouseDown } = useNodeDrag({
        id,
        position,
        onPositionChange,
        scale,
        onSelect,
        isResizing,
        onDragStart,
        onDragEnd
    });

    const cursorStyle = isNodePaused ? 'not-allowed' : (isDragging ? 'grabbing' : 'grab');
    const activeBackground = isInfected
        ? 'linear-gradient(165deg, rgba(220, 38, 38, 0.2) 0%, rgba(255, 255, 255, 0.05) 100%)'
        : 'linear-gradient(180deg, rgba(56, 189, 248, 0.25) 0%, rgba(255, 255, 255, 0.1) 100%)';
    const activeBorder = isInfected
        ? '3px solid #ff0000'
        : selected
            ? '3px solid #38bdf8'
            : '1px solid rgba(255, 255, 255, 0.2)';
    const activeBoxShadow = isInfected
        ? '0 0 0 4px rgba(255, 0, 0, 0.4), 0 0 30px 5px rgba(255, 0, 0, 0.8), 0 10px 30px -5px rgba(0, 0, 0, 0.3), inset 0 0 20px rgba(255, 0, 0, 0.3)'
        : selected
            ? '0 0 0 4px rgba(56, 189, 248, 0.4), 0 0 30px 5px rgba(56, 189, 248, 0.6), 0 10px 30px -5px rgba(0, 0, 0, 0.3), inset 0 0 20px rgba(56, 189, 248, 0.3)'
            : '0 10px 30px -5px rgba(0, 0, 0, 0.3), inset 0 0 0 1px rgba(255, 255, 255, 0.1)';
    const activeBackdropFilter = isInfected ? 'blur(4px) saturate(180%)' : 'blur(6px) saturate(180%)';
    const containerBaseStyle: React.CSSProperties = {
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        borderRadius: '16px',
        color: 'white',
        fontFamily: "'Inter', sans-serif",
        display: 'flex',
        flexDirection: 'column',
        zIndex: selected ? 100 : 1,
        cursor: cursorStyle,
        pointerEvents: 'auto',
        userSelect: 'none',
        transition: 'border 0.3s ease, box-shadow 0.3s ease, background 0.3s ease, opacity 0.3s ease, filter 0.3s ease',
        animation: (isInfected && !isShaking) ? 'criticalBorderPulse 1.5s infinite ease-in-out' : animationStyle,
    };
    const activeStyle: React.CSSProperties = {
        background: activeBackground,
        border: activeBorder,
        boxShadow: activeBoxShadow,
        backdropFilter: activeBackdropFilter,
        WebkitBackdropFilter: activeBackdropFilter,
        filter: 'none',
        opacity: 1,
    };
    const pausedStyle: React.CSSProperties = {
        background: 'rgba(50, 50, 50, 0.8)',
        border: '1px solid #666',
        boxShadow: '0 20px 50px -20px rgba(0, 0, 0, 0.85), inset 0 0 30px rgba(255, 255, 255, 0.08)',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        filter: 'grayscale(100%)',
        opacity: 1,
    };
    const containerStyle: React.CSSProperties = {
        ...containerBaseStyle,
        ...(isNodePaused ? pausedStyle : activeStyle),
    };
    const togglePauseState = () => {
        onDataChange(id, { isPaused: !isNodePaused });
    };
    return (
        <>
            <style>{inspectorGeneratingStyles}</style>
            <div
                id={id}
                className={animationClasses}
                style={containerStyle}
                data-no-selection="true"
                onMouseDown={handleMouseDown}
            >
                {/* Input Port - Positioned Absolutely relative to the Main Node container, NOT inside scrollable area */}
                <div
                    style={{
                        position: 'absolute',
                        left: '-10px',
                        top: '50%', // Centered vertically
                        transform: 'translateY(-50%)',
                        display: 'flex',
                        alignItems: 'center',
                        zIndex: 200, // Keep ports above resize handles
                        pointerEvents: 'auto'
                    }}
                >
                    {/* Disconnect Button */}
                    {connections.some(c => c.targetNodeId === id) && onDeleteConnection && interactionMode === 'wire' && (
                        <div
                            onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                            }}
                            onPointerDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                            }}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const conn = connections.find(c => c.targetNodeId === id);
                                if (conn) onDeleteConnection(conn.id);
                            }}
                            style={{
                                position: 'absolute',
                                left: '-25px',
                                cursor: 'pointer',
                                color: '#000000',
                                background: '#22c55e',
                                borderRadius: '50%',
                                width: '16px',
                                height: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                zIndex: 103,
                            }}
                            title="Disconnect"
                        >
                            <X size={10} strokeWidth={3} />
                        </div>
                    )}
                    <div style={{ position: 'relative', width: 14, height: 14 }}>
                        <div
                            className="port-hitbox"
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                if (onConnectionStart) {
                                    onConnectionStart(id, 'input-main', { x: e.clientX, y: e.clientY });
                                }
                            }}
                            onMouseUp={(e) => {
                                e.stopPropagation();
                                onConnectionComplete(id, 'input-main');
                            }}
                            onMouseEnter={() => setIsInputPortHovered(true)}
                            onMouseLeave={() => setIsInputPortHovered(false)}
                            style={{
                                position: 'absolute',
                                left: '50%',
                                top: '50%',
                                width: 40,
                                height: 40,
                                transform: 'translate(-50%, -50%)',
                                cursor: 'crosshair',
                                zIndex: 2,
                            }}
                            title="Connect node to inspect"
                        />
                        <div
                            id={`port-${id}-input-main`}
                            className="node-port"
                            style={{
                                width: 14,
                                height: 14,
                                borderRadius: '50%',
                                background: '#22c55e',
                                border: '2px solid #ffffff',
                                cursor: 'crosshair',
                                boxShadow: '0 0 8px rgba(34, 197, 94, 0.5)',
                                transition: 'transform 0.2s',
                                transform: isInputPortHovered ? 'scale(1.2)' : 'scale(1)',
                                pointerEvents: 'none',
                            }}
                        />
                    </div>
                </div>

                {/* Output Port - Positioned Absolutely on Right */}
                <div
                    style={{
                        position: 'absolute',
                        right: '-10px',
                        top: '50%', // Centered vertically
                        transform: 'translateY(-50%)',
                        display: 'flex',
                        alignItems: 'center',
                        zIndex: 200, // Keep ports above resize handles
                        pointerEvents: 'auto'
                    }}
                >
                    {/* Disconnect Button (Output) */}
                    {connections.some(c => c.sourceNodeId === id && c.sourcePort === 'output-main') && onDeleteConnection && interactionMode === 'wire' && (
                        <div
                            onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                            }}
                            onPointerDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                            }}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                // Find connections from this output
                                const conns = connections.filter(c => c.sourceNodeId === id && c.sourcePort === 'output-main');
                                conns.forEach(c => onDeleteConnection(c.id));
                            }}
                            style={{
                                position: 'absolute',
                                right: '-25px', // Shift right to avoid overlap with port
                                cursor: 'pointer',
                                color: '#000000',
                                background: '#ef4444', // Red for output
                                borderRadius: '50%',
                                width: '16px',
                                height: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                zIndex: 103,
                            }}
                            title="Disconnect Output"
                        >
                            <X size={10} strokeWidth={3} />
                        </div>
                    )}
                    <div style={{ position: 'relative', width: 14, height: 14 }}>
                        <div
                            className="port-hitbox"
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                if (onConnectionStart) {
                                    onConnectionStart(id, 'output-main', { x: e.clientX, y: e.clientY });
                                }
                            }}
                            onMouseUp={(e) => {
                                e.stopPropagation();
                                onConnectionComplete(id, 'output-main');
                            }}
                            onMouseEnter={() => setIsOutputPortHovered(true)}
                            onMouseLeave={() => setIsOutputPortHovered(false)}
                            style={{
                                position: 'absolute',
                                left: '50%',
                                top: '50%',
                                width: 40,
                                height: 40,
                                transform: 'translate(-50%, -50%)',
                                cursor: 'crosshair',
                                zIndex: 2,
                            }}
                            title="Output Inspector Data"
                        />
                        <div
                            id={`port-${id}-output-main`}
                            className="node-port"
                            style={{
                                width: 14,
                                height: 14,
                                borderRadius: '50%',
                                background: '#ef4444', // Red for Output
                                border: '2px solid #ffffff',
                                cursor: 'crosshair',
                                boxShadow: '0 0 8px rgba(239, 68, 68, 0.5)',
                                transition: 'transform 0.2s',
                                transform: isOutputPortHovered ? 'scale(1.2)' : 'scale(1)',
                                pointerEvents: 'none',
                            }}
                        />
                    </div>
                </div>


                {/* Header */}
                <div className="node-header">
                    <div className="node-header-title">
                        <span style={{ fontSize: '18px' }}>👁</span>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff', whiteSpace: 'normal', lineHeight: 1.2 }}>
                            Inspector
                        </span>
                    </div>

                    <NodeActionBar
                        selected={selected}
                        isPaused={isNodePaused}
                        onTogglePause={togglePauseState}
                        pauseTitle={isNodePaused ? 'Resume Inspector' : 'Pause Inspector'}
                        onDuplicate={onDuplicate ? () => onDuplicate(id) : undefined}
                        duplicateTitle="Duplicate Inspector"
                        onInfo={() => {
                            alert(`Inspector ID: ${id}`);
                        }}
                        infoTitle="Inspector Info"
                        onDelete={() => onDelete(id)}
                        canJoinGroup={!!(overlappingGroupId && !parentGroupId && onJoinGroup)}
                        onJoinGroup={() => onJoinGroup?.(id, overlappingGroupId!)}
                        canLeaveGroup={!!(parentGroupId && onLeaveGroup)}
                        onLeaveGroup={() => onLeaveGroup?.(id)}
                    />
                </div>                {/* Content Area - Scrollable */}
                <div style={{
                    padding: 16,
                    fontSize: 12,
                    flex: 1, // Fill remaining height
                    overflowX: 'hidden',
                    overflowY: !hasMounted ? 'hidden' : 'auto',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column'
                }}
                    onWheel={handleChatWheel}
                    onWheelCapture={handleChatWheel}
                >


                    {connectedNode ? (
                        isPlanMode ? (
                            // --- PLAN VIEW (Chained or Direct) ---
                            <div key={`${connectedNode.id}-plan-view`} style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, opacity: 0.95, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 8 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <BookOpen size={16} color="#38bdf8" />
                                        <span><strong>Plan View</strong></span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <button
                                            onMouseDown={(e) => e.stopPropagation()}
                                            onPointerDown={(e) => e.stopPropagation()}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openPlanEditMode();
                                            }}
                                            disabled={!canEditPlan}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 4,
                                                fontSize: 10,
                                                padding: '4px 8px',
                                                borderRadius: 4,
                                                border: planViewMode === 'edit' ? '1px solid rgba(56,189,248,0.55)' : '1px solid rgba(56,189,248,0.3)',
                                                background: planViewMode === 'edit' ? 'rgba(14,165,233,0.24)' : 'rgba(14,165,233,0.1)',
                                                color: '#38bdf8',
                                                cursor: canEditPlan ? 'pointer' : 'not-allowed',
                                                opacity: canEditPlan ? 1 : 0.55,
                                            }}
                                            title={canEditPlan ? 'Edit plan markdown' : 'Wait for plan generation to finish'}
                                        >
                                            <Pencil size={12} />
                                            <span>Edit</span>
                                        </button>
                                        <button
                                            onMouseDown={(e) => e.stopPropagation()}
                                            onPointerDown={(e) => e.stopPropagation()}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleProceed();
                                            }}
                                            disabled={!planSourceNode || !hasProceedContent || isPromptGenerating}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 4,
                                                fontSize: 10,
                                                padding: '4px 8px',
                                                borderRadius: 4,
                                                border: '1px solid rgba(34,197,94,0.45)',
                                                background: 'rgba(22,163,74,0.2)',
                                                color: '#bbf7d0',
                                                cursor: (!planSourceNode || !hasProceedContent || isPromptGenerating) ? 'not-allowed' : 'pointer',
                                                opacity: (!planSourceNode || !hasProceedContent || isPromptGenerating) ? 0.55 : 1,
                                            }}
                                            title="Proceed to Act mode"
                                        >
                                            Proceed
                                        </button>
                                    </div>
                                </div>
                                {planViewMode === 'edit' ? (
                                    <div style={{
                                        flex: 1,
                                        minHeight: 0,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 10,
                                        padding: 8,
                                        borderRadius: 10,
                                        border: '1px solid rgba(56,189,248,0.22)',
                                        background: 'linear-gradient(180deg, rgba(2,6,23,0.42) 0%, rgba(2,6,23,0.2) 100%)',
                                    }}>
                                        <textarea
                                            ref={planTextareaRef}
                                            data-plan-editor="true"
                                            value={planEditorValue}
                                            onChange={(event) => {
                                                setPlanDraft(event.target.value);
                                                setIsPlanDirty(true);
                                            }}
                                            onKeyDown={handlePlanEditorKeyDown}
                                            onMouseDown={(event) => event.stopPropagation()}
                                            onPointerDown={(event) => event.stopPropagation()}
                                            placeholder="Edit plan (Markdown)..."
                                            spellCheck={false}
                                            style={{
                                                flex: 1,
                                                minHeight: 0,
                                                height: '100%',
                                                width: '100%',
                                                boxSizing: 'border-box',
                                                resize: 'none',
                                                borderRadius: 10,
                                                border: '1px solid rgba(56,189,248,0.35)',
                                                background: 'rgba(2,6,23,0.84)',
                                                color: '#e2e8f0',
                                                fontFamily: 'Consolas, Monaco, monospace',
                                                fontSize: 12,
                                                lineHeight: 1.6,
                                                padding: '12px 12px 14px 12px',
                                                outline: 'none',
                                                userSelect: 'text',
                                                overflowY: 'auto',
                                                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.03)',
                                                cursor: 'text',
                                            }}
                                        />
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                            <span style={{ fontSize: 10, color: 'rgba(226,232,240,0.65)' }}>
                                                Ctrl+Enter save, Esc cancel
                                            </span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{
                                                fontSize: 10,
                                                color: isSavingPlan
                                                    ? '#7dd3fc'
                                                    : (hasUnsavedPlanChanges ? '#facc15' : '#86efac'),
                                            }}>
                                                {isSavingPlan ? 'Saving...' : (hasUnsavedPlanChanges ? 'Unsaved changes' : 'Saved')}
                                            </span>
                                            <button
                                                onMouseDown={(e) => e.stopPropagation()}
                                                onPointerDown={(e) => e.stopPropagation()}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    savePlanDraft();
                                                }}
                                                disabled={!hasUnsavedPlanChanges || isPromptGenerating}
                                                style={{
                                                    fontSize: 10,
                                                    padding: '5px 12px',
                                                    borderRadius: 5,
                                                    border: '1px solid rgba(16,185,129,0.55)',
                                                    background: 'rgba(16,185,129,0.2)',
                                                    color: '#86efac',
                                                    cursor: (!hasUnsavedPlanChanges || isPromptGenerating) ? 'not-allowed' : 'pointer',
                                                    opacity: (!hasUnsavedPlanChanges || isPromptGenerating) ? 0.55 : 1,
                                                }}
                                                title="Save plan (Ctrl+Enter)"
                                            >
                                                Save
                                            </button>
                                            <button
                                                onMouseDown={(e) => e.stopPropagation()}
                                                onPointerDown={(e) => e.stopPropagation()}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    closePlanEditMode();
                                                }}
                                                style={{
                                                    fontSize: 10,
                                                    padding: '5px 12px',
                                                    borderRadius: 5,
                                                    border: '1px solid rgba(148,163,184,0.45)',
                                                    background: 'rgba(15,23,42,0.65)',
                                                    color: '#cbd5e1',
                                                    cursor: 'pointer',
                                                }}
                                                title="Cancel editing (Esc)"
                                            >
                                                Cancel
                                            </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        data-plan-editor="true"
                                        onMouseDown={(event) => event.stopPropagation()}
                                        onPointerDown={(event) => event.stopPropagation()}
                                        style={{
                                            flex: 1,
                                            fontFamily: "Consolas, Monaco, monospace",
                                            fontSize: 12,
                                            color: '#e2e8f0',
                                            lineHeight: 1.5,
                                            overflowY: 'auto',
                                            padding: 4,
                                            userSelect: 'text',
                                            cursor: 'text',
                                        }}
                                    >
                                        {isPromptGenerating && effectivePromptNode?.data.chatActionMode === 'plan' ? (
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                height: '100%',
                                                color: '#38bdf8',
                                                fontStyle: 'italic',
                                                gap: 8
                                            }}>
                                                <TypingIndicator color="#38bdf8" dotSize={7} />
                                                <span className="inspector-pulse-text">Generating plan...</span>
                                            </div>
                                        ) : (!hasPlanContent ? (
                                            <span style={{ color: 'rgba(255,255,255,0.45)', fontStyle: 'italic' }}>
                                                No plan available. Click edit to add.
                                            </span>
                                        ) : (
                                            parsedPlanLines.map((line, index) => {
                                                if (line.type === 'h1') {
                                                    return <div key={index} style={{ fontSize: 16, fontWeight: 700, margin: '2px 0 6px 0' }}>{line.text}</div>;
                                                }
                                                if (line.type === 'h2') {
                                                    return <div key={index} style={{ fontSize: 14, fontWeight: 700, margin: '6px 0 4px 0' }}>{line.text}</div>;
                                                }
                                                if (line.type === 'h3') {
                                                    return <div key={index} style={{ fontSize: 13, fontWeight: 600, margin: '5px 0 3px 0' }}>{line.text}</div>;
                                                }
                                                if (line.type === 'task') {
                                                    return (
                                                        <label key={index} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <input type="checkbox" checked={Boolean(line.checked)} readOnly />
                                                            <span>{line.text}</span>
                                                        </label>
                                                    );
                                                }
                                                if (line.type === 'number') {
                                                    return <div key={index} style={{ whiteSpace: 'pre-wrap' }}>{line.order}. {line.text}</div>;
                                                }
                                                if (line.type === 'bullet') {
                                                    return <div key={index} style={{ whiteSpace: 'pre-wrap' }}>- {line.text}</div>;
                                                }
                                                if (line.type === 'code') {
                                                    return (
                                                        <pre key={index} style={{
                                                            margin: 0,
                                                            padding: '6px 8px',
                                                            borderRadius: 6,
                                                            background: 'rgba(15,23,42,0.8)',
                                                            border: '1px solid rgba(148,163,184,0.25)',
                                                            overflowX: 'auto',
                                                        }}>
                                                            {line.text}
                                                        </pre>
                                                    );
                                                }
                                                if (line.type === 'empty') {
                                                    return <div key={index} style={{ height: 8 }} />;
                                                }
                                                return <div key={index} style={{ whiteSpace: 'pre-wrap' }}>{line.text}</div>;
                                            })
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : isPromptChatMode ? (
                            // --- DIRECT CHAT VIEW (Node 2) ---
                            <div key={`${connectedNode.id}-chat`} style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, opacity: 0.95 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Target size={16} color="#38bdf8" />
                                        <span><strong>Chat Target:</strong> {effectivePromptNode?.data?.customName || effectivePromptNode?.type || connectedNode?.data?.customName || connectedNode?.type}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
                                            <button
                                                onMouseDown={(e) => e.stopPropagation()}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    createPromptSession();
                                                }}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    width: 24,
                                                    height: 24,
                                                    color: '#bbf7d0',
                                                    fontSize: 12,
                                                    border: '1px solid rgba(255,255,255,0.2)',
                                                    background: 'rgba(15,23,42,0.65)',
                                                    borderRadius: 6,
                                                    cursor: (!activePromptSession || activePromptSession.messages.length === 0 || isPromptGenerating)
                                                        ? 'not-allowed'
                                                        : 'pointer',
                                                    opacity: isPromptGenerating ? 0.6 : 1,
                                                }}
                                                title={activePromptSession && activePromptSession.messages.length > 0 ? 'New Session' : 'Type a message first'}
                                                disabled={!activePromptSession || activePromptSession.messages.length === 0 || isPromptGenerating}
                                            >
                                                <span style={{ fontSize: 14, lineHeight: 1, color: '#bbf7d0' }}>+</span>
                                            </button>
                                            <button
                                                onMouseDown={(e) => e.stopPropagation()}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowTaskHistoryMenu((prev) => !prev);
                                                }}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    width: 24,
                                                    height: 24,
                                                    color: '#cbd5e1',
                                                    border: '1px solid rgba(255,255,255,0.2)',
                                                    background: 'rgba(15,23,42,0.65)',
                                                    borderRadius: 6,
                                                    cursor: 'pointer',
                                                }}
                                                title="Task History"
                                            >
                                                <span style={{ fontSize: 13, lineHeight: 1, color: '#e2e8f0' }}>🕘</span>
                                            </button>

                                            {showTaskHistoryMenu && (
                                                <div
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                    onWheelCapture={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                    }}
                                                    style={{
                                                        position: 'absolute',
                                                        top: 30,
                                                        right: 0,
                                                        width: 240,
                                                        maxHeight: 300,
                                                        overflow: 'hidden',
                                                        borderRadius: 8,
                                                        border: '1px solid rgba(255,255,255,0.2)',
                                                        background: '#020617',
                                                        boxShadow: '0 8px 20px rgba(0,0,0,0.45)',
                                                        zIndex: 9999,
                                                        isolation: 'isolate',
                                                        opacity: 1,
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: 6,
                                                        padding: 8,
                                                    }}
                                                >
                                                    <input
                                                        value={sessionSearchText}
                                                        onChange={(e) => setSessionSearchText(e.target.value)}
                                                        placeholder="Search sessions..."
                                                        style={{
                                                            width: '100%',
                                                            boxSizing: 'border-box',
                                                            borderRadius: 6,
                                                            border: '1px solid rgba(255,255,255,0.2)',
                                                            background: '#0f172a',
                                                            color: '#e2e8f0',
                                                            fontSize: 11,
                                                            padding: '6px 8px',
                                                            outline: 'none',
                                                        }}
                                                    />
                                                    <div
                                                        onWheelCapture={handleDropdownWheel}
                                                        style={{ maxHeight: 220, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: 4 }}
                                                    >
                                                        {visiblePromptSessions.length === 0 ? (
                                                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', padding: '6px 8px' }}>
                                                                No sessions
                                                            </div>
                                                        ) : (
                                                            visiblePromptSessions.map((session) => {
                                                                const isActive = session.id === activePromptSessionId;
                                                                return (
                                                                    <div
                                                                        key={session.id}
                                                                        style={{
                                                                            width: '100%',
                                                                            display: 'flex',
                                                                            alignItems: 'stretch',
                                                                            gap: 6,
                                                                        }}
                                                                    >
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                selectPromptSession(session.id);
                                                                            }}
                                                                            style={{
                                                                                flex: 1,
                                                                                textAlign: 'left',
                                                                                borderRadius: 6,
                                                                                border: isActive ? '1px solid rgba(56,189,248,0.65)' : '1px solid rgba(255,255,255,0.14)',
                                                                                background: isActive ? '#0b3452' : '#0f172a',
                                                                                color: '#e2e8f0',
                                                                                fontSize: 11,
                                                                                padding: '6px 8px',
                                                                                cursor: 'pointer',
                                                                            }}
                                                                        >
                                                                            <div style={{ fontWeight: isActive ? 700 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                                {session.title || 'Untitled'}
                                                                            </div>
                                                                            <div style={{ opacity: 0.55, fontSize: 10 }}>
                                                                                {session.messages.length} msgs
                                                                            </div>
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                if (pendingDeleteSessionId === session.id) {
                                                                                    deletePromptSession(session.id);
                                                                                } else {
                                                                                    setPendingDeleteSessionId(session.id);
                                                                                }
                                                                            }}
                                                                            disabled={promptSessions.length <= 1}
                                                                            style={{
                                                                                minWidth: pendingDeleteSessionId === session.id ? 56 : 30,
                                                                                borderRadius: 6,
                                                                                border: '1px solid rgba(255,255,255,0.14)',
                                                                                background: '#3f1320',
                                                                                color: promptSessions.length <= 1 ? 'rgba(255,255,255,0.35)' : '#fecaca',
                                                                                cursor: promptSessions.length <= 1 ? 'not-allowed' : 'pointer',
                                                                                display: 'inline-flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                padding: 0,
                                                                            }}
                                                                            title={promptSessions.length <= 1 ? 'At least one session is required' : (pendingDeleteSessionId === session.id ? 'Confirm delete' : 'Delete session')}
                                                                        >
                                                                            {pendingDeleteSessionId === session.id ? (
                                                                                <span style={{ fontSize: 10, lineHeight: 1, padding: '0 6px' }}>Confirm</span>
                                                                            ) : (
                                                                                <Trash2 size={12} />
                                                                            )}
                                                                        </button>
                                                                    </div>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div
                                    ref={chatSelectionRootRef}
                                    className="nowheel"
                                    style={{
                                        flex: 1,
                                        minHeight: 120,
                                        borderRadius: 8,
                                        border: '1px solid rgba(255,255,255,0.15)',
                                        background: 'rgba(2, 6, 23, 0.45)',
                                        padding: 10,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 8,
                                        position: 'relative',
                                        overflowY: 'hidden',
                                        overflowX: 'hidden',
                                    }}
                                >
                                    <>
                                        <div
                                            ref={chatMessagesContainerRef}
                                            className="nowheel"
                                            style={{
                                                flex: 1,
                                                minHeight: 0,
                                                overflowY: 'auto',
                                                overflowX: 'hidden',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 8,
                                                userSelect: 'text',
                                                cursor: 'text',
                                            }}
                                            onWheel={handleChatWheel}
                                            onMouseDown={(event) => event.stopPropagation()}
                                            onPointerDown={(event) => event.stopPropagation()}
                                        >
                                            {!activePromptSession || activePromptSession.messages.length === 0 ? (
                                                <div style={{
                                                    flex: 1,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    textAlign: 'center',
                                                    color: 'rgba(255,255,255,0.55)',
                                                    fontSize: 11,
                                                    padding: '8px 12px',
                                                }}>
                                                    Submit from Text Data to start chat
                                                </div>
                                            ) : (
                                                activePromptSession.messages.map((message) => (
                                                    <div
                                                        key={message.id}
                                                        style={{
                                                            display: 'flex',
                                                            justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                maxWidth: '85%',
                                                                borderRadius: message.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                                                                border: message.role === 'user'
                                                                    ? '1px solid rgba(56, 189, 248, 0.55)'
                                                                    : '1px solid rgba(255,255,255,0.2)',
                                                                background: message.role === 'user'
                                                                    ? 'rgba(14, 165, 233, 0.2)'
                                                                    : 'rgba(15, 23, 42, 0.75)',
                                                                padding: '8px 10px',
                                                                fontSize: 12,
                                                                lineHeight: 1.45,
                                                                userSelect: 'text',
                                                            }}
                                                        >
                                                            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                                                {message.contentType === 'image' && message.imageDataUrl ? (
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: message.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                                                        <button
                                                                            onMouseDown={(e) => e.stopPropagation()}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setPreviewImage({
                                                                                    dataUrl: message.imageDataUrl!,
                                                                                    name: message.content || 'Uploaded image',
                                                                                });
                                                                            }}
                                                                            style={{
                                                                                border: '1px solid rgba(255,255,255,0.2)',
                                                                                background: 'transparent',
                                                                                borderRadius: 6,
                                                                                padding: 0,
                                                                                cursor: 'zoom-in',
                                                                                width: 'fit-content',
                                                                            }}
                                                                            title="Open image preview"
                                                                        >
                                                                            <img
                                                                                src={message.imageDataUrl}
                                                                                alt={message.content || 'Uploaded image'}
                                                                                style={{
                                                                                    display: 'block',
                                                                                    maxWidth: 120,
                                                                                    maxHeight: 90,
                                                                                    borderRadius: 6,
                                                                                    objectFit: 'cover',
                                                                                }}
                                                                            />
                                                                        </button>
                                                                        {message.content && (
                                                                            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', textAlign: message.role === 'user' ? 'right' : 'left' }}>
                                                                                {message.content}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    message.content
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                            {isPromptGenerating && (
                                                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                                    <div style={{
                                                        maxWidth: '85%',
                                                        borderRadius: '12px 12px 12px 4px',
                                                        border: '1px solid rgba(103,232,249,0.35)',
                                                        background: 'rgba(8, 47, 73, 0.65)',
                                                        padding: '8px 10px',
                                                        fontSize: 12,
                                                        color: '#67e8f9',
                                                    }}>
                                                        <TypingIndicator />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {chatSelectionOverlay && (
                                            <button
                                                onMouseDown={(event) => event.stopPropagation()}
                                                onPointerDown={(event) => event.stopPropagation()}
                                                onClick={copySelectedChatText}
                                                style={{
                                                    position: 'absolute',
                                                    left: chatSelectionOverlay.x,
                                                    top: chatSelectionOverlay.y,
                                                    transform: 'translate(0, -100%)',
                                                    borderRadius: 6,
                                                    border: '1px solid rgba(56,189,248,0.5)',
                                                    background: 'rgba(15,23,42,0.95)',
                                                    color: '#bae6fd',
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    padding: '5px 10px',
                                                    cursor: 'pointer',
                                                    zIndex: 20,
                                                    boxShadow: '0 8px 20px rgba(2,6,23,0.55)',
                                                }}
                                                title="Copy selected text"
                                            >
                                                Copy
                                            </button>
                                        )}

                                        {previewImage && (
                                            <div
                                                onMouseDown={(e) => e.stopPropagation()}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPreviewImage(null);
                                                }}
                                                style={{
                                                    position: 'fixed',
                                                    inset: 0,
                                                    zIndex: 100000,
                                                    background: 'rgba(2, 6, 23, 0.75)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    padding: 20,
                                                    boxSizing: 'border-box',
                                                }}
                                            >
                                                <div
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{
                                                        position: 'relative',
                                                        maxWidth: 'min(92vw, 720px)',
                                                        maxHeight: '88vh',
                                                        borderRadius: 10,
                                                        border: '1px solid rgba(255,255,255,0.25)',
                                                        background: 'rgba(15, 23, 42, 0.95)',
                                                        padding: 8,
                                                        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                                                    }}
                                                >
                                                    <button
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setPreviewImage(null);
                                                        }}
                                                        title="Close preview"
                                                        style={{
                                                            position: 'absolute',
                                                            top: 8,
                                                            right: 8,
                                                            width: 24,
                                                            height: 24,
                                                            borderRadius: 999,
                                                            border: '1px solid rgba(255,255,255,0.35)',
                                                            background: 'rgba(2,6,23,0.75)',
                                                            color: '#f8fafc',
                                                            fontSize: 11,
                                                            lineHeight: 1,
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        X
                                                    </button>
                                                    <img
                                                        src={previewImage.dataUrl}
                                                        alt={previewImage.name}
                                                        style={{
                                                            display: 'block',
                                                            maxWidth: 'min(88vw, 700px)',
                                                            maxHeight: 'calc(88vh - 20px)',
                                                            width: 'auto',
                                                            height: 'auto',
                                                            objectFit: 'contain',
                                                            borderRadius: 6,
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                    </>
                                </div>
                                <div style={{ marginTop: 6 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                            <div style={{ fontSize: 10, opacity: 0.65 }}>
                                                Active: {activePromptSession?.title || 'New Chat'}
                                            </div>
                                            {isPromptGenerating && (
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#67e8f9', fontWeight: 600 }}>
                                                    <TypingIndicator dotSize={5} />
                                                    <span className="inspector-pulse-text">Generating...</span>
                                                </div>
                                            )}
                                            {!isPromptGenerating && promptErrorMessage && (
                                                <div style={{ fontSize: 10, color: '#fecaca', maxWidth: 260 }}>
                                                    Error: {promptErrorMessage}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <div style={{ display: 'inline-flex', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, overflow: 'hidden' }}>
                                                <button
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setChatModel('model-a');
                                                    }}
                                                    style={{
                                                        border: 0,
                                                        background: selectedChatModel === 'model-a' ? 'rgba(14,165,233,0.35)' : 'rgba(15,23,42,0.7)',
                                                        color: '#e2e8f0',
                                                        fontSize: 9,
                                                        padding: '4px 6px',
                                                        cursor: 'pointer',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                    title="Chat Model A"
                                                >
                                                    Hanuman-Ai
                                                </button>
                                                <button
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setChatModel('model-b');
                                                    }}
                                                    style={{
                                                        border: 0,
                                                        background: selectedChatModel === 'model-b' ? 'rgba(14,165,233,0.35)' : 'rgba(15,23,42,0.7)',
                                                        color: '#e2e8f0',
                                                        fontSize: 9,
                                                        padding: '4px 6px',
                                                        cursor: 'pointer',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                    title="Chat Model B"
                                                >
                                                    Phraram-Ai
                                                </button>
                                            </div>
                                            <ActionModeToggle
                                                selectedMode={selectedActionMode}
                                                onSetMode={setActionMode}
                                                planBgColorActive="rgba(16,185,129,0.35)"
                                                actBgColorActive="rgba(16,185,129,0.35)"
                                                textColorActive="#e2e8f0"
                                                textColorInactive="#e2e8f0"
                                                fontSize={10}
                                                padding="4px 7px"
                                                borderRadius={0}
                                                containerClass="no-gap-in-toggle"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div key={connectedNode.id} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.9 }}>
                                    <Target size={16} color="#38bdf8" />
                                    <span><strong>Target:</strong> {connectedNode.data.customName || connectedNode.type}</span>
                                </div>

                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: 10, borderRadius: 6, fontFamily: 'monospace', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <div style={{ opacity: 0.7, marginBottom: 4 }}>ID: {connectedNode.id}</div>
                                    <div style={{ opacity: 0.7, marginBottom: 4 }}>Type: {connectedNode.type}</div>
                                    <div style={{ color: '#93c5fd', fontWeight: 'bold' }}>
                                        X: {Math.round(connectedNode.position.x)}, Y: {Math.round(connectedNode.position.y)}
                                    </div>
                                </div>

                                {vectorXYZValues && (vectorXYZValues.x !== null || vectorXYZValues.y !== null || vectorXYZValues.z !== null) && (
                                    <div style={{ background: 'rgba(15, 23, 42, 0.35)', padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)' }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.5px', marginBottom: 6 }}>
                                            Vector XYZ
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#e2e8f0' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span>X</span>
                                                <span>{vectorXYZValues.x ?? 0}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span>Y</span>
                                                <span>{vectorXYZValues.y ?? 0}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span>Z</span>
                                                <span>{vectorXYZValues.z ?? 0}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {connectedNode.type === 'number-slider' && (
                                    <div style={{ background: 'rgba(15, 23, 42, 0.35)', padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)' }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.5px', marginBottom: 6 }}>
                                            Number Values ({sliderValues.length})
                                        </div>
                                        <div style={{ fontSize: 16, fontWeight: 'bold', color: '#38bdf8' }}>
                                            {sliderValues.length > 0 ? sliderValues.join(', ') : 'N/A'}
                                        </div>
                                    </div>
                                )}

                                {connectedNode.type === 'series' && (() => {
                                    const start = typeof connectedNode.data.start === 'number' ? connectedNode.data.start : 0;
                                    const step = typeof connectedNode.data.step === 'number' ? connectedNode.data.step : 1;
                                    const count = typeof connectedNode.data.count === 'number' ? connectedNode.data.count : 1;
                                    const safeCount = Math.max(1, Math.floor(count));
                                    const previewLimit = showAllSeries ? safeCount : Math.min(safeCount, 10);
                                    const preview = Array.from({ length: previewLimit }, (_, i) => {
                                        const value = start + (step * i);
                                        return Math.round(value * 1000) / 1000;
                                    });
                                    const previewText = preview.join('\n') + (!showAllSeries && safeCount > 10 ? '\n...' : '');
                                    return (
                                        <div style={{ background: 'rgba(15, 23, 42, 0.35)', padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.5px' }}>
                                                    Output Preview
                                                </div>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'rgba(255,255,255,0.8)' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={showAllSeries}
                                                        onChange={(e) => setShowAllSeries(e.target.checked)}
                                                        style={{ cursor: 'pointer' }}
                                                    />
                                                    Show All
                                                </label>
                                            </div>
                                            <div style={{ fontSize: 12, color: '#e2e8f0', whiteSpace: 'pre-line' }}>
                                                {previewText}
                                            </div>
                                        </div>
                                    );
                                })()}

                                {layerSourceData && (
                                    <div style={{ background: 'rgba(15, 23, 42, 0.35)', padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', marginBottom: 12 }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.5px', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                                            <span>Layer Objects</span>
                                            <span style={{ opacity: 0.5 }}>{layerSourceData.length} items</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#e2e8f0', maxHeight: '150px', overflowY: 'auto' }}>
                                            {layerSourceData.length === 0 ? (
                                                <div style={{ fontStyle: 'italic', opacity: 0.5, padding: 4 }}>No objects connected</div>
                                            ) : (
                                                layerSourceData.map((item, index) => (
                                                    <div key={`${item.node!.id}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: 4 }}>
                                                        <span style={{ opacity: 0.5, minWidth: 16, fontSize: 10 }}>{index + 1}.</span>
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                            <span style={{ fontWeight: 500 }}>{item.node!.data.customName || item.node!.type}</span>
                                                            <span style={{ opacity: 0.4, fontSize: 9 }}>ID: {item.node!.id.slice(0, 6)}...</span>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, opacity: 0.9 }}>
                                        <Database size={16} color="#38bdf8" />
                                        <span><strong>Node Data:</strong></span>
                                    </div>
                                    <pre style={{
                                        margin: 0,
                                        background: 'rgba(0,0,0,0.3)',
                                        padding: 10,
                                        borderRadius: 6,
                                        overflowX: 'auto',
                                        fontSize: 11,
                                        lineHeight: '1.4',
                                        color: '#a5f3fc',
                                        border: '1px solid rgba(255,255,255,0.1)'
                                    }}>
                                        {JSON.stringify(connectedNode.data, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        )
                    ) : (
                        <div key="no-connection" style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'column',
                            gap: 8,
                            opacity: 0.5,
                            border: '2px dashed rgba(255,255,255,0.15)',
                            borderRadius: 8,
                            background: 'rgba(0,0,0,0.1)',
                            minHeight: '100px'
                        }}>
                            <Search size={40} strokeWidth={1.5} />
                            <span style={{ fontWeight: 500 }}>No Connection</span>
                        </div>
                    )}
                </div>

                {/* Resize Handles - Show only on hover or selection */}
                {selected && (
                    <>
                        {/* Right Edge (E) */}
                        <div
                            onMouseDown={(e) => handleResizeStart(e, 'e')}
                            style={{
                                position: 'absolute',
                                top: 0,
                                right: -4,
                                width: 10,
                                height: '100%',
                                cursor: 'ew-resize',
                                zIndex: 110,
                            }}
                        />
                        {/* Left Edge (W) */}
                        <div
                            onMouseDown={(e) => handleResizeStart(e, 'w')}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: 10,
                                height: '100%',
                                cursor: 'ew-resize',
                                zIndex: 110,
                            }}
                        />
                        {/* Bottom Edge (S) */}
                        <div
                            onMouseDown={(e) => handleResizeStart(e, 's')}
                            style={{
                                position: 'absolute',
                                bottom: -4,
                                left: 0,
                                width: '100%',
                                height: 10,
                                cursor: 'ns-resize',
                                zIndex: 110,
                            }}
                        />
                        {/* Bottom-Right Corner (SE) */}
                        <div
                            onMouseDown={(e) => handleResizeStart(e, 'se')}
                            style={{
                                position: 'absolute',
                                bottom: -6,
                                right: -6,
                                width: 20,
                                height: 20,
                                cursor: 'nwse-resize',
                                zIndex: 120,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            {/* Visual Corner Marker */}
                            <div style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: selected ? '#646cff' : 'rgba(255,255,255,0.5)',
                                boxShadow: '0 0 4px rgba(0,0,0,0.5)'
                            }} />
                        </div>
                        {/* Bottom-Left Corner (SW) */}
                        <div
                            onMouseDown={(e) => handleResizeStart(e, 'sw')}
                            style={{
                                position: 'absolute',
                                bottom: -6,
                                left: -6,
                                width: 20,
                                height: 20,
                                cursor: 'nesw-resize',
                                zIndex: 120,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            {/* Visual Corner Marker */}
                            <div style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: selected ? '#646cff' : 'rgba(255,255,255,0.5)',
                                boxShadow: '0 0 4px rgba(0,0,0,0.5)'
                            }} />
                        </div>
                    </>
                )}
            </div>
        </>
    );
};
