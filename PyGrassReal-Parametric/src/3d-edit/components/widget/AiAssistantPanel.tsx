import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CornerDownLeft, History, Plus, X } from 'lucide-react';
import type { ChatHistoryMessage, ChatSession, PendingImageItem } from '../../types/NodeTypes';
import styles from './AiAssistantPanel.module.css';

interface AiAssistantPanelProps {
    enabled: boolean;
    visible: boolean;
    position: { x: number; y: number };
    size: { width: number; height: number };
    messages: ChatHistoryMessage[];
    draft: string;
    chatModel: 'model-a' | 'model-b';
    actionMode: 'plan' | 'act';
    planMarkdown: string;
    planPanelVisible: boolean;
    planPanelWidth: number;
    showHistoryMenu: boolean;
    incomingPreview: { sourceLabel: string; text: string } | null;
    pendingImages: PendingImageItem[];
    activeSessionId: string;
    sessionList: ChatSession[];
    canCreateSession: boolean;
    onDraftChange: (value: string) => void;
    onChatModelChange: (value: 'model-a' | 'model-b') => void;
    onActionModeChange: (value: 'plan' | 'act') => void;
    onPlanMarkdownChange: (value: string) => void;
    onTogglePlanPanel: () => void;
    onPlanPanelWidthChange: (value: number) => void;
    onToggleHistoryMenu: () => void;
    onUseIncomingPreview: () => void;
    onAddPendingImage: (item: PendingImageItem) => void;
    onRemovePendingImage: (imageId: string) => void;
    onCreateSession: () => void;
    onSelectSession: (sessionId: string) => void;
    onDeleteSession: (sessionId: string) => void;
    onSend: () => void;
    onShow: () => void;
    onHide: () => void;
    onPositionPreview: (position: { x: number; y: number }) => void;
    onPositionCommit: (position: { x: number; y: number }) => void;
    onSizePreview: (size: { width: number; height: number }) => void;
    onSizeCommit: (size: { width: number; height: number }, position?: { x: number; y: number }) => void;
    interactionMode?: 'node' | '3d' | 'wire';
}

interface DragState {
    startX: number;
    startY: number;
    startPosition: { x: number; y: number };
}

interface ResizeState {
    mode: 'se' | 'sw';
    startX: number;
    startY: number;
    startSize: { width: number; height: number };
    startPosition: { x: number; y: number };
}

interface PlanResizeState {
    edge: 'left' | 'right';
    startX: number;
    startWidth: number;
}

const TrashIcon: React.FC = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="M19 6l-1 14H6L5 6" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
    </svg>
);

const CheckIcon: React.FC = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m5 12 5 5L20 7" />
    </svg>
);

const MIN_PANEL_WIDTH = 280;
const MIN_PANEL_HEIGHT = 260;
const PLAN_PANEL_GAP = 2;

const renderPlanMarkdown = (markdown: string) => {
    const lines = markdown.split(/\r?\n/);
    let inCodeBlock = false;
    const output: Array<{ type: string; text: string; checked?: boolean; order?: string }> = [];

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

export const AiAssistantPanel: React.FC<AiAssistantPanelProps> = ({
    enabled,
    visible,
    position,
    size,
    messages,
    draft,
    chatModel,
    actionMode,
    planMarkdown,
    planPanelVisible,
    planPanelWidth,
    showHistoryMenu,
    incomingPreview,
    pendingImages,
    activeSessionId,
    sessionList,
    canCreateSession,
    onDraftChange,
    onChatModelChange,
    onActionModeChange,
    onPlanMarkdownChange,
    onTogglePlanPanel,
    onPlanPanelWidthChange,
    onToggleHistoryMenu,
    onUseIncomingPreview,
    onAddPendingImage,
    onRemovePendingImage,
    onCreateSession,
    onSelectSession,
    onDeleteSession,
    onSend,
    onShow,
    onHide,
    onPositionPreview,
    onPositionCommit,
    onSizePreview,
    onSizeCommit,
    interactionMode,
}) => {
    const [pendingDeleteSessionId, setPendingDeleteSessionId] = useState<string | null>(null);
    const [historySearch, setHistorySearch] = useState('');
    const [previewImage, setPreviewImage] = useState<{ dataUrl: string; name: string } | null>(null);
    const [planViewMode, setPlanViewMode] = useState<'edit' | 'preview'>('edit');
    const historyRef = useRef<HTMLDivElement | null>(null);
    const dragStateRef = useRef<DragState | null>(null);
    const resizeStateRef = useRef<ResizeState | null>(null);
    const planResizeStateRef = useRef<PlanResizeState | null>(null);
    const floatingDragStateRef = useRef<DragState | null>(null);
    const floatingMovedRef = useRef(false);
    const dragPreviewPositionRef = useRef(position);
    const resizePreviewSizeRef = useRef(size);
    const resizePreviewPositionRef = useRef(position);

    useEffect(() => {
        dragPreviewPositionRef.current = position;
    }, [position]);

    useEffect(() => {
        resizePreviewSizeRef.current = size;
    }, [size]);
    useEffect(() => {
        resizePreviewPositionRef.current = position;
    }, [position]);

    useEffect(() => {
        const historyElement = historyRef.current;
        if (!historyElement) return;
        historyElement.scrollTop = historyElement.scrollHeight;
    }, [messages]);

    useEffect(() => {
        if (!pendingDeleteSessionId) return;
        if (!sessionList.some((session) => session.id === pendingDeleteSessionId)) {
            setPendingDeleteSessionId(null);
        }
    }, [pendingDeleteSessionId, sessionList]);

    useEffect(() => {
        if (!showHistoryMenu && historySearch) {
            setHistorySearch('');
        }
    }, [showHistoryMenu, historySearch]);

    const normalizedSearch = historySearch.trim().toLowerCase();
    const filteredSessions = normalizedSearch
        ? sessionList.filter((session) => session.title.toLowerCase().includes(normalizedSearch))
        : sessionList;
    const planPanelLeft = Math.max(8, position.x - planPanelWidth - PLAN_PANEL_GAP);
    const planDockLeft = planPanelVisible ? planPanelLeft - 28 : position.x - 28;
    const hasPlanContent = planMarkdown.trim().length > 0;
    const markdownLines = renderPlanMarkdown(planMarkdown || '');

    const readFileAsDataUrl = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
    };

    const appendImageFile = async (file: File) => {
        if (!file.type.startsWith('image/')) return;
        try {
            const dataUrl = await readFileAsDataUrl(file);
            if (!dataUrl) return;
            onAddPendingImage({
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                name: file.name || 'Image',
                dataUrl,
            });
        } catch {
            // ignore read errors for now
        }
    };

    useEffect(() => {
        const handlePointerMove = (event: PointerEvent) => {
            const dragState = dragStateRef.current;
            if (dragState) {
                const nextPosition = {
                    x: dragState.startPosition.x + (event.clientX - dragState.startX),
                    y: dragState.startPosition.y + (event.clientY - dragState.startY),
                };
                dragPreviewPositionRef.current = nextPosition;
                onPositionPreview(nextPosition);
                return;
            }

            const floatingDragState = floatingDragStateRef.current;
            if (floatingDragState) {
                const movedX = event.clientX - floatingDragState.startX;
                const movedY = event.clientY - floatingDragState.startY;
                if (Math.abs(movedX) > 3 || Math.abs(movedY) > 3) {
                    floatingMovedRef.current = true;
                }
                const nextPosition = {
                    x: floatingDragState.startPosition.x + movedX,
                    y: floatingDragState.startPosition.y + movedY,
                };
                dragPreviewPositionRef.current = nextPosition;
                onPositionPreview(nextPosition);
                return;
            }

            const resizeState = resizeStateRef.current;
            if (resizeState) {
                const movedX = event.clientX - resizeState.startX;
                const movedY = event.clientY - resizeState.startY;
                const isSouthWest = resizeState.mode === 'sw';
                const rawWidth = isSouthWest
                    ? resizeState.startSize.width - movedX
                    : resizeState.startSize.width + movedX;
                const rawHeight = resizeState.startSize.height + movedY;

                const clampedWidth = Math.max(MIN_PANEL_WIDTH, rawWidth);
                const clampedHeight = Math.max(MIN_PANEL_HEIGHT, rawHeight);

                const nextSize = {
                    width: clampedWidth,
                    height: clampedHeight,
                };

                const nextPosition = isSouthWest
                    ? {
                        x: resizeState.startPosition.x + (resizeState.startSize.width - clampedWidth),
                        y: resizeState.startPosition.y,
                    }
                    : resizeState.startPosition;
                resizePreviewSizeRef.current = nextSize;
                resizePreviewPositionRef.current = nextPosition;
                onSizePreview(nextSize);
                if (isSouthWest) {
                    onPositionPreview(nextPosition);
                }
                return;
            }

            const planResizeState = planResizeStateRef.current;
            if (planResizeState) {
                const movedX = event.clientX - planResizeState.startX;
                const rawWidth = planResizeState.edge === 'left'
                    ? planResizeState.startWidth - movedX
                    : planResizeState.startWidth + movedX;
                onPlanPanelWidthChange(rawWidth);
            }
        };

        const handlePointerUp = () => {
            if (dragStateRef.current) {
                dragStateRef.current = null;
                onPositionCommit(dragPreviewPositionRef.current);
            }
            if (floatingDragStateRef.current) {
                floatingDragStateRef.current = null;
                onPositionCommit(dragPreviewPositionRef.current);
            }
            if (resizeStateRef.current) {
                resizeStateRef.current = null;
                onSizeCommit(resizePreviewSizeRef.current, resizePreviewPositionRef.current);
            }
            if (planResizeStateRef.current) {
                planResizeStateRef.current = null;
            }
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [onPlanPanelWidthChange, onPositionCommit, onPositionPreview, onSizeCommit, onSizePreview]);

    if (!enabled || typeof document === 'undefined' || interactionMode !== '3d') {
        return null;
    }

    return createPortal(
        <>
            {visible && (
                <button
                    type="button"
                    className={`${styles.planDockButton} ${planPanelVisible ? styles.planDockButtonActive : ''} ${hasPlanContent ? styles.planDockButtonHasContent : ''}`}
                    data-no-selection="true"
                    style={{
                        left: planDockLeft,
                        top: position.y + 58,
                    }}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                        event.stopPropagation();
                        onTogglePlanPanel();
                    }}
                    title={planPanelVisible ? 'Hide markdown plan' : 'Show markdown plan'}
                >
                    MD
                </button>
            )}
            {visible && planPanelVisible && (
                <div
                    className={styles.planPanel}
                    data-no-selection="true"
                    style={{
                        left: planPanelLeft,
                        top: position.y,
                        width: planPanelWidth,
                        height: size.height,
                    }}
                    onPointerDown={(event) => event.stopPropagation()}
                >
                    <div className={styles.planHeader}>
                        <div className={styles.planTitle}>Plan Markdown</div>
                        <div className={styles.planModeToggle}>
                            <button
                                type="button"
                                className={`${styles.planModeButton} ${planViewMode === 'edit' ? styles.planModeButtonActive : ''}`}
                                onClick={() => setPlanViewMode('edit')}
                            >
                                Edit
                            </button>
                            <button
                                type="button"
                                className={`${styles.planModeButton} ${planViewMode === 'preview' ? styles.planModeButtonActive : ''}`}
                                onClick={() => setPlanViewMode('preview')}
                            >
                                Preview
                            </button>
                        </div>
                    </div>
                    <div className={styles.planBody}>
                        {planViewMode === 'edit' ? (
                            <textarea
                                value={planMarkdown}
                                className={styles.planTextarea}
                                placeholder={'# Plan\n- [ ] Task 1\n- [ ] Task 2'}
                                onChange={(event) => onPlanMarkdownChange(event.target.value)}
                            />
                        ) : (
                            <div className={styles.planPreview}>
                                {markdownLines.length === 0 || (markdownLines.length === 1 && !markdownLines[0].text.trim()) ? (
                                    <div className={styles.planEmpty}>No plan yet</div>
                                ) : (
                                    markdownLines.map((line, index) => {
                                        if (line.type === 'h1') return <div key={index} className={styles.planH1}>{line.text}</div>;
                                        if (line.type === 'h2') return <div key={index} className={styles.planH2}>{line.text}</div>;
                                        if (line.type === 'h3') return <div key={index} className={styles.planH3}>{line.text}</div>;
                                        if (line.type === 'task') {
                                            return (
                                                <div key={index} className={styles.planTask}>
                                                    <input type="checkbox" checked={Boolean(line.checked)} readOnly />
                                                    <span>{line.text}</span>
                                                </div>
                                            );
                                        }
                                        if (line.type === 'number') {
                                            return <div key={index} className={styles.planList}>{line.order}. {line.text}</div>;
                                        }
                                        if (line.type === 'bullet') {
                                            return <div key={index} className={styles.planList}>- {line.text}</div>;
                                        }
                                        if (line.type === 'code') {
                                            return <pre key={index} className={styles.planCode}>{line.text}</pre>;
                                        }
                                        if (line.type === 'empty') {
                                            return <div key={index} className={styles.planSpacer} />;
                                        }
                                        return <div key={index} className={styles.planParagraph}>{line.text}</div>;
                                    })
                                )}
                            </div>
                        )}
                    </div>
                    <div
                        className={styles.planResizeHandleLeft}
                        onPointerDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            planResizeStateRef.current = {
                                edge: 'left',
                                startX: event.clientX,
                                startWidth: planPanelWidth,
                            };
                        }}
                        title="Resize plan panel"
                    />
                    <div
                        className={styles.planResizeHandleRight}
                        onPointerDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            planResizeStateRef.current = {
                                edge: 'right',
                                startX: event.clientX,
                                startWidth: planPanelWidth,
                            };
                        }}
                        title="Resize plan panel"
                    />
                </div>
            )}
            <div
                className={`${styles.panel} ${visible ? styles.panelVisible : styles.panelHidden}`}
                data-no-selection="true"
                style={{
                    left: position.x,
                    top: position.y,
                    width: size.width,
                    height: size.height,
                }}
                onPointerDown={(event) => event.stopPropagation()}
            >
                <div
                    className={styles.header}
                    onPointerDown={(event) => {
                        const target = event.target as HTMLElement;
                        if (target.closest('button')) return;
                        event.preventDefault();
                        event.stopPropagation();
                        dragStateRef.current = {
                            startX: event.clientX,
                            startY: event.clientY,
                            startPosition: position,
                        };
                    }}
                >
                    <div className={styles.headerTitle}>AI Assistant</div>
                    <div className={styles.headerButtons}>
                        <button
                            type="button"
                            className={styles.headerButton}
                            title="Hide panel"
                            onClick={(event) => {
                                event.stopPropagation();
                                onHide();
                            }}
                        >
                            _
                        </button>
                    </div>
                </div>

                <div className={styles.sessionToolbar}>
                    <button
                        type="button"
                        className={styles.sessionButton}
                        onClick={() => {
                            setHistorySearch('');
                            setPendingDeleteSessionId(null);
                            onCreateSession();
                        }}
                        disabled={!canCreateSession}
                        title={canCreateSession ? 'New chat room' : 'Send at least one message before creating a new chat'}
                    >
                        <Plus size={12} />
                    </button>
                    <button type="button" className={styles.sessionButton} onClick={onToggleHistoryMenu} title="Show chat history">
                        <History size={12} />
                    </button>
                </div>
                {showHistoryMenu && (
                    <div className={styles.sessionMenu} data-no-selection="true">
                        <div className={styles.sessionSearchWrap}>
                            <input
                                value={historySearch}
                                onChange={(event) => setHistorySearch(event.target.value)}
                                className={styles.sessionSearch}
                                placeholder="Search history..."
                                aria-label="Search chat history"
                            />
                        </div>
                        {filteredSessions.length === 0 && (
                            <div className={styles.sessionEmpty}>
                                {sessionList.length === 0 ? 'No sessions' : 'No results'}
                            </div>
                        )}
                        {filteredSessions.map((session) => (
                            <div
                                key={session.id}
                                className={`${styles.sessionItem} ${session.id === activeSessionId ? styles.sessionItemActive : ''}`}
                            >
                                <button
                                    type="button"
                                    className={styles.sessionSelect}
                                    onClick={() => onSelectSession(session.id)}
                                >
                                    {session.title}
                                </button>
                                <button
                                    type="button"
                                    className={`${styles.sessionDelete} ${pendingDeleteSessionId === session.id ? styles.sessionDeleteConfirm : ''}`}
                                    onClick={() => {
                                        if (pendingDeleteSessionId === session.id) {
                                            onDeleteSession(session.id);
                                            setPendingDeleteSessionId(null);
                                            return;
                                        }
                                        setPendingDeleteSessionId(session.id);
                                    }}
                                    title={pendingDeleteSessionId === session.id ? 'Confirm delete' : 'Delete session'}
                                >
                                    {pendingDeleteSessionId === session.id ? <CheckIcon /> : <TrashIcon />}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                <div ref={historyRef} className={styles.historyArea}>
                    {messages.length === 0 && (
                        <div className={styles.emptyState}>No chat history</div>
                    )}
                    {messages.map((message) => {
                        const isImageMessage = message.contentType === 'image';
                        const text = isImageMessage ? (message.content || '') : message.content;
                        const imageUrls = message.imageDataUrls && message.imageDataUrls.length > 0
                            ? message.imageDataUrls
                            : (message.imageDataUrl ? [message.imageDataUrl] : []);
                        const isUser = message.role === 'user';
                        return (
                            <div
                                key={message.id}
                                className={`${styles.messageRow} ${isUser ? styles.userMessage : styles.assistantMessage}`}
                            >
                                <div className={styles.messageRole}>
                                    {isUser ? 'You' : 'AI'}
                                </div>
                                {imageUrls.length > 0 && (
                                    <div className={styles.messageImageList}>
                                        {imageUrls.map((url, index) => (
                                            <img
                                                key={`${message.id}-img-${index}`}
                                                src={url}
                                                alt={`Chat attachment ${index + 1}`}
                                                className={styles.messageImage}
                                                onClick={() => setPreviewImage({ dataUrl: url, name: `Image ${index + 1}` })}
                                            />
                                        ))}
                                    </div>
                                )}
                                {text && <div className={styles.messageText}>{text}</div>}
                            </div>
                        );
                    })}
                </div>

                <div className={styles.inputArea}>
                    <div className={styles.composerShell}>
                        {incomingPreview && (
                            <div className={styles.previewBar}>
                                <div className={styles.previewMeta}>{incomingPreview.sourceLabel}</div>
                                <div className={styles.previewText}>{incomingPreview.text}</div>
                                <button
                                    type="button"
                                    className={styles.previewUseButton}
                                    onClick={onUseIncomingPreview}
                                    title="Insert preview into message"
                                >
                                    Insert
                                </button>
                            </div>
                        )}
                        <div className={styles.inputWrap}>
                            <textarea
                                value={draft}
                                placeholder="Type your message..."
                                className={styles.input}
                                onChange={(event) => onDraftChange(event.target.value)}
                                onDragOver={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                }}
                                onDrop={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    const file = event.dataTransfer.files?.[0];
                                    if (file) {
                                        void appendImageFile(file);
                                    }
                                }}
                                onPaste={(event) => {
                                    const fileFromClipboard = Array.from(event.clipboardData.files)
                                        .find((file) => file.type.startsWith('image/'));
                                    if (fileFromClipboard) {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        void appendImageFile(fileFromClipboard);
                                    }
                                }}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' && !event.shiftKey) {
                                        event.preventDefault();
                                        onSend();
                                    }
                                }}
                            />
                            <button
                                type="button"
                                className={styles.sendButton}
                                onClick={onSend}
                                title="Send"
                                aria-label="Send"
                            >
                                <CornerDownLeft size={14} />
                            </button>
                        </div>
                        {pendingImages.length > 0 && (
                            <div className={styles.imageQueue}>
                                {pendingImages.map((item) => (
                                    <div key={item.id} className={styles.imageQueueItem}>
                                        <button
                                            type="button"
                                            className={styles.imagePreviewButton}
                                            onClick={() => setPreviewImage({ dataUrl: item.dataUrl, name: item.name })}
                                            title={item.name}
                                        >
                                            <img src={item.dataUrl} alt={item.name} className={styles.imageThumb} />
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.imageRemoveButton}
                                            onClick={() => onRemovePendingImage(item.id)}
                                            title="Remove image"
                                            aria-label="Remove image"
                                        >
                                            <X size={10} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className={styles.modeRow}>
                            <div className={`${styles.modeGroup} ${styles.modeGroupModel}`}>
                                <button
                                    type="button"
                                    className={`${styles.modeButton} ${chatModel === 'model-a' ? styles.modeButtonActive : ''}`}
                                    onClick={() => onChatModelChange('model-a')}
                                    title="Chat Model A"
                                    aria-label="Hanuman-Ai"
                                >
                                    Hanuman-Ai
                                </button>
                                <button
                                    type="button"
                                    className={`${styles.modeButton} ${chatModel === 'model-b' ? styles.modeButtonActive : ''}`}
                                    onClick={() => onChatModelChange('model-b')}
                                    title="Chat Model B"
                                    aria-label="Phraram-Ai"
                                >
                                    Phraram-Ai
                                </button>
                            </div>
                            <div className={`${styles.modeGroup} ${styles.modeGroupAction}`}>
                                <button
                                    type="button"
                                    className={`${styles.modeButton} ${actionMode === 'plan' ? styles.modeButtonActive : ''}`}
                                    onClick={() => onActionModeChange('plan')}
                                >
                                    Plan
                                </button>
                                <button
                                    type="button"
                                    className={`${styles.modeButton} ${actionMode === 'act' ? styles.modeButtonActive : ''}`}
                                    onClick={() => onActionModeChange('act')}
                                >
                                    Act
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    className={styles.resizeHandle}
                    onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        resizeStateRef.current = {
                            mode: 'se',
                            startX: event.clientX,
                            startY: event.clientY,
                            startSize: size,
                            startPosition: position,
                        };
                    }}
                    title="Resize panel"
                />
                <div
                    className={styles.resizeHandleLeft}
                    onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        resizeStateRef.current = {
                            mode: 'sw',
                            startX: event.clientX,
                            startY: event.clientY,
                            startSize: size,
                            startPosition: position,
                        };
                    }}
                    title="Resize panel"
                />
            </div>

            {previewImage && (
                <div
                    className={styles.previewOverlay}
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={() => setPreviewImage(null)}
                >
                    <div
                        className={styles.previewModal}
                        onMouseDown={(event) => event.stopPropagation()}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <button
                            type="button"
                            className={styles.previewClose}
                            onClick={() => setPreviewImage(null)}
                            title="Close preview"
                        >
                            X
                        </button>
                        <img src={previewImage.dataUrl} alt={previewImage.name} className={styles.previewModalImage} />
                    </div>
                </div>
            )}

            {!visible && (
                <button
                    type="button"
                    className={styles.floatingToggle}
                    data-no-selection="true"
                    style={{ top: Math.max(20, position.y + 18) }}
                    onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        floatingMovedRef.current = false;
                        floatingDragStateRef.current = {
                            startX: event.clientX,
                            startY: event.clientY,
                            startPosition: position,
                        };
                    }}
                    onClick={(event) => {
                        if (floatingMovedRef.current) {
                            event.preventDefault();
                            event.stopPropagation();
                            floatingMovedRef.current = false;
                            return;
                        }
                        onShow();
                    }}
                    title="Show AI Assistant"
                >
                    {'\u{1F916}'}
                </button>
            )}
        </>,
        document.body
    );
};
