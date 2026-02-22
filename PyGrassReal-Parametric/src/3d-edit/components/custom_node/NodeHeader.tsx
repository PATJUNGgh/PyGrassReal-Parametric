import React, { useCallback, useEffect, useRef, useState } from 'react';
import { NodeActionBar } from '../NodeActionBar';
import '../CustomNode.css';

type CopyTooltipText = 'Copy' | 'Copied!';

interface CopyTooltipState {
    visible: boolean;
    x: number;
    y: number;
    text: CopyTooltipText;
    selectedText: string;
}

const AUTO_DISMISS_MS = 2000;
const COPIED_DISMISS_MS = 800;

const isNodeInsideElement = (node: Node | null, element: HTMLElement) =>
    !!node && (node === element || element.contains(node));

const isSelectionInsideElement = (selection: Selection, element: HTMLElement) =>
    isNodeInsideElement(selection.anchorNode, element) &&
    isNodeInsideElement(selection.focusNode, element);

const fallbackCopyText = (text: string) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied;
};

interface NodeHeaderProps {
    id: string;
    customName: string;
    isRenamable: boolean;
    isNodePaused: boolean;
    selected: boolean;
    overlappingGroupId?: string;
    overlapGroupId?: string;
    parentGroupId?: string;
    hideTitleLabel?: boolean;
    onNameChange: (newName: string) => void;
    onTogglePause: () => void;
    onDuplicate?: (id: string) => void;
    onDelete: (id: string) => void;
    onJoinGroup?: (nodeId: string, groupId: string) => void;
    onLeaveGroup?: (nodeId: string) => void;
    onCluster?: (nodeId: string) => void;
}

export const NodeHeader: React.FC<NodeHeaderProps> = ({
    id,
    customName,
    isRenamable,
    isNodePaused,
    selected,
    overlappingGroupId,
    parentGroupId,
    onNameChange,
    onTogglePause,
    onDuplicate,
    onDelete,
    onJoinGroup,
    onLeaveGroup,
    onCluster,
    hideTitleLabel,
}) => {
    const [isEditingName, setIsEditingName] = useState(false);
    const [copyTooltip, setCopyTooltip] = useState<CopyTooltipState | null>(null);
    const showNameEditor = isRenamable && isEditingName;
    const titleRef = useRef<HTMLSpanElement>(null);
    const titleContainerRef = useRef<HTMLDivElement>(null);
    const tooltipTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
    const tooltipStateRef = useRef<CopyTooltipState | null>(null);

    useEffect(() => {
        tooltipStateRef.current = copyTooltip;
    }, [copyTooltip]);

    useEffect(() => {
        if (!isRenamable && isEditingName) {
            setIsEditingName(false);
        }
    }, [isRenamable, isEditingName]);

    const clearTooltipTimer = useCallback(() => {
        if (tooltipTimerRef.current !== null) {
            window.clearTimeout(tooltipTimerRef.current);
            tooltipTimerRef.current = null;
        }
    }, []);

    const hideCopyTooltip = useCallback(() => {
        clearTooltipTimer();
        setCopyTooltip(null);
    }, [clearTooltipTimer]);

    const scheduleTooltipDismiss = useCallback((delayMs: number) => {
        clearTooltipTimer();
        tooltipTimerRef.current = window.setTimeout(() => {
            setCopyTooltip(null);
            tooltipTimerRef.current = null;
        }, delayMs);
    }, [clearTooltipTimer]);

    const showCopiedFeedback = useCallback(() => {
        setCopyTooltip((prev) => (prev ? { ...prev, text: 'Copied!' } : prev));
        scheduleTooltipDismiss(COPIED_DISMISS_MS);
    }, [scheduleTooltipDismiss]);

    const handleStartRename = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        if (!isRenamable) return;
        hideCopyTooltip();
        setIsEditingName(true);
    };

    const updateTooltipFromSelection = useCallback(() => {
        const titleEl = titleRef.current;
        const titleContainerEl = titleContainerRef.current;
        const selection = window.getSelection();

        if (
            !titleEl ||
            !titleContainerEl ||
            !selection ||
            selection.rangeCount === 0 ||
            selection.isCollapsed
        ) {
            hideCopyTooltip();
            return;
        }

        const selectedText = selection.toString().trim();
        if (!selectedText || !isSelectionInsideElement(selection, titleEl)) {
            hideCopyTooltip();
            return;
        }

        const rangeRect = selection.getRangeAt(0).getBoundingClientRect();
        if (rangeRect.width === 0 && rangeRect.height === 0) {
            hideCopyTooltip();
            return;
        }

        const containerRect = titleContainerEl.getBoundingClientRect();
        setCopyTooltip({
            visible: true,
            x: rangeRect.left + rangeRect.width / 2 - containerRect.left,
            y: rangeRect.top - containerRect.top - 8,
            text: 'Copy',
            selectedText,
        });
        scheduleTooltipDismiss(AUTO_DISMISS_MS);
    }, [hideCopyTooltip, scheduleTooltipDismiss]);

    const handleNameMouseUp = (e: React.MouseEvent<HTMLSpanElement>) => {
        e.stopPropagation();
        updateTooltipFromSelection();
    };

    const handleTooltipMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleTooltipClick = async (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();

        const textToCopy = copyTooltip?.selectedText?.trim() || window.getSelection()?.toString().trim();
        if (!textToCopy) return;

        let copied = false;
        if (navigator.clipboard?.writeText) {
            try {
                await navigator.clipboard.writeText(textToCopy);
                copied = true;
            } catch {
                copied = false;
            }
        }

        if (!copied) {
            copied = fallbackCopyText(textToCopy);
        }

        if (copied) {
            showCopiedFeedback();
        }
    };

    useEffect(() => {
        if (!copyTooltip?.visible || hideTitleLabel) return;

        const handleSelectionChange = () => {
            const selection = window.getSelection();
            const titleEl = titleRef.current;
            if (
                !selection ||
                !titleEl ||
                selection.isCollapsed ||
                !selection.toString().trim() ||
                !isSelectionInsideElement(selection, titleEl)
            ) {
                hideCopyTooltip();
            }
        };

        const handleMouseDown = () => hideCopyTooltip();

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                hideCopyTooltip();
            }
        };

        const handleCopy = () => {
            if (!tooltipStateRef.current?.visible) return;
            showCopiedFeedback();
        };

        window.addEventListener('selectionchange', handleSelectionChange);
        window.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('copy', handleCopy);

        return () => {
            window.removeEventListener('selectionchange', handleSelectionChange);
            window.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('copy', handleCopy);
        };
    }, [copyTooltip?.visible, hideCopyTooltip, hideTitleLabel, showCopiedFeedback]);

    useEffect(() => () => {
        clearTooltipTimer();
    }, [clearTooltipTimer]);

    return (
        <div className="node-header">
            {showNameEditor ? (
                <input
                    type="text"
                    value={customName}
                    onChange={(e) => onNameChange(e.target.value)}
                    onBlur={() => setIsEditingName(false)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') setIsEditingName(false);
                    }}
                    autoFocus
                    className="node-header-input"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                />
            ) : (
                <div
                    ref={titleContainerRef}
                    className="node-header-title"
                    onDoubleClick={handleStartRename}
                >
                    {copyTooltip?.visible && !hideTitleLabel && (
                        <div
                            className="node-name-copy-tooltip"
                            onMouseDown={handleTooltipMouseDown}
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={handleTooltipClick}
                            style={{
                                left: `${copyTooltip.x}px`,
                                top: `${copyTooltip.y}px`,
                            }}
                        >
                            {copyTooltip.text}
                        </div>
                    )}
                    <span style={{ fontSize: '18px' }}>{'\u2699\ufe0f'}</span>
                    {!hideTitleLabel && (
                        <span
                            ref={titleRef}
                            style={{
                                fontSize: '14px',
                                fontWeight: 600,
                                color: '#fff',
                                whiteSpace: 'normal',
                                lineHeight: 1.2,
                                userSelect: 'text',
                                cursor: 'auto',
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                            onMouseUp={handleNameMouseUp}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {customName}
                        </span>
                    )}
                </div>
            )}
            <NodeActionBar
                selected={selected}
                isPaused={isNodePaused}
                onTogglePause={onTogglePause}
                onDuplicate={onDuplicate ? () => onDuplicate(id) : undefined}
                onInfo={() => {
                    alert(`Node ID: ${id}\nName: ${customName}`);
                }}
                onDelete={() => onDelete(id)}
                canJoinGroup={!!(overlappingGroupId && !parentGroupId && onJoinGroup)}
                onJoinGroup={() => onJoinGroup?.(id, overlappingGroupId!)}
                canLeaveGroup={!!(parentGroupId && onLeaveGroup)}
                onLeaveGroup={() => onLeaveGroup?.(id)}
                onCluster={onCluster ? () => onCluster(id) : undefined}
            />
        </div>
    );
};
