import React, { useState, useRef } from 'react';
import type { NodeData } from '../../types/NodeTypes';
import { Trash2, Trash, Bomb, AlertTriangle } from 'lucide-react';
import { ExternalLabel } from './ExternalLabel';
import styles from './GroupNode.module.css';

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

interface GroupNodeProps {
    node: NodeData;
    onPositionChange: (id: string, position: { x: number; y: number }) => void;
    onDelete?: (nodeId: string, deleteChildren?: boolean) => void;
    selected?: boolean;
    onSelect?: (multiSelect?: boolean) => void;
    onNameChange?: (id: string, newName: string) => void;
    onCluster?: (groupId: string) => void;
    scale?: number;
    onDragStart?: () => void;
    onDragEnd?: () => void;
}

export const GroupNode: React.FC<GroupNodeProps> = ({
    node,
    onPositionChange,
    onDelete,
    selected = false,
    onSelect,
    onNameChange,
    onCluster,
    scale = 1,
    onDragStart,
    onDragEnd,
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteOptions, setShowDeleteOptions] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showOutsideLabel, setShowOutsideLabel] = useState(false);
    const [playPopIn, setPlayPopIn] = useState(!!node.data?.isNewGroup);

    const [isEditing, setIsEditing] = useState(false);
    const [currentName, setCurrentName] = useState(node.data?.customName || 'Group');
    const [copyTooltip, setCopyTooltip] = useState<CopyTooltipState | null>(null);

    React.useEffect(() => {
        if (node.data?.customName) {
            setCurrentName(node.data.customName);
        }
    }, [node.data?.customName]);

    React.useEffect(() => {
        if (node.data?.isNewGroup) {
            setPlayPopIn(true);
            const timer = setTimeout(() => setPlayPopIn(false), 420);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [node.data?.isNewGroup]);

    const dragStartPos = useRef({ mouseX: 0, mouseY: 0, nodeX: 0, nodeY: 0 });
    const hasDraggedRef = useRef(false);
    const nodeRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const nameContainerRef = useRef<HTMLDivElement>(null);
    const nameRef = useRef<HTMLSpanElement>(null);
    const deleteButtonRef = useRef<HTMLButtonElement>(null);
    const deleteOptionsRef = useRef<HTMLDivElement>(null);
    const tooltipTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
    const tooltipStateRef = useRef<CopyTooltipState | null>(null);

    React.useEffect(() => {
        tooltipStateRef.current = copyTooltip;
    }, [copyTooltip]);

    const colors = [
        { name: 'Orange', border: 'rgba(255, 165, 0, 0.6)', bg: 'rgba(255, 165, 0, 0.05)', accent: '#ff8c00' },
        { name: 'Blue', border: 'rgba(59, 130, 246, 0.6)', bg: 'rgba(59, 130, 246, 0.05)', accent: '#3b82f6' },
        { name: 'Green', border: 'rgba(34, 197, 94, 0.6)', bg: 'rgba(34, 197, 94, 0.05)', accent: '#22c55e' },
        { name: 'Purple', border: 'rgba(168, 85, 247, 0.6)', bg: 'rgba(168, 85, 247, 0.05)', accent: '#a855f7' },
        { name: 'Red', border: 'rgba(239, 68, 68, 0.6)', bg: 'rgba(239, 68, 68, 0.05)', accent: '#ef4444' },
    ];

    const [colorIndex, setColorIndex] = useState(0);
    const currentColor = colors[colorIndex];

    const clearTooltipTimer = React.useCallback(() => {
        if (tooltipTimerRef.current !== null) {
            window.clearTimeout(tooltipTimerRef.current);
            tooltipTimerRef.current = null;
        }
    }, []);

    const hideCopyTooltip = React.useCallback(() => {
        clearTooltipTimer();
        setCopyTooltip(null);
    }, [clearTooltipTimer]);

    const scheduleTooltipDismiss = React.useCallback((delayMs: number) => {
        clearTooltipTimer();
        tooltipTimerRef.current = window.setTimeout(() => {
            setCopyTooltip(null);
            tooltipTimerRef.current = null;
        }, delayMs);
    }, [clearTooltipTimer]);

    const showCopiedFeedback = React.useCallback(() => {
        setCopyTooltip((prev) => (prev ? { ...prev, text: 'Copied!' } : prev));
        scheduleTooltipDismiss(COPIED_DISMISS_MS);
    }, [scheduleTooltipDismiss]);

    const updateTooltipFromSelection = React.useCallback(() => {
        const nameEl = nameRef.current;
        const nameContainerEl = nameContainerRef.current;
        const selection = window.getSelection();

        if (
            !nameEl ||
            !nameContainerEl ||
            !selection ||
            selection.rangeCount === 0 ||
            selection.isCollapsed
        ) {
            hideCopyTooltip();
            return;
        }

        const selectedText = selection.toString().trim();
        if (!selectedText || !isSelectionInsideElement(selection, nameEl)) {
            hideCopyTooltip();
            return;
        }

        const rangeRect = selection.getRangeAt(0).getBoundingClientRect();
        if (rangeRect.width === 0 && rangeRect.height === 0) {
            hideCopyTooltip();
            return;
        }

        const containerRect = nameContainerEl.getBoundingClientRect();
        setCopyTooltip({
            visible: true,
            x: rangeRect.left + rangeRect.width / 2 - containerRect.left,
            y: rangeRect.top - containerRect.top - 8,
            text: 'Copy',
            selectedText,
        });
        scheduleTooltipDismiss(AUTO_DISMISS_MS);
    }, [hideCopyTooltip, scheduleTooltipDismiss]);

    const handleMouseDown = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('button, input, [data-no-drag="true"]')) {
            return;
        }
        hideCopyTooltip();
        if (e.button !== 0 || isEditing) return;
        const isMultiSelect = e.ctrlKey || e.shiftKey;
        hasDraggedRef.current = false;
        if (!selected || isMultiSelect) {
            onSelect?.(isMultiSelect);
        }
        setIsDragging(true);
        dragStartPos.current = {
            mouseX: e.clientX,
            mouseY: e.clientY,
            nodeX: node.position.x,
            nodeY: node.position.y,
        };
        e.stopPropagation();
        onDragStart?.();
    };

    const handleMouseMove = React.useCallback((e: MouseEvent) => {
        if (!isDragging) return;
        hasDraggedRef.current = true;
        const currentScale = Math.max(scale, 0.01);
        const deltaX = (e.clientX - dragStartPos.current.mouseX) / currentScale;
        const deltaY = (e.clientY - dragStartPos.current.mouseY) / currentScale;
        onPositionChange(node.id, {
            x: dragStartPos.current.nodeX + deltaX,
            y: dragStartPos.current.nodeY + deltaY,
        });
    }, [isDragging, node.id, onPositionChange, scale]);

    const handleMouseUp = React.useCallback(() => {
        if (isDragging) {
            setIsDragging(false);
            onDragEnd?.();
        }
    }, [isDragging, onDragEnd]);

    const handleNameSubmit = () => {
        setIsEditing(false);
        if (currentName.trim()) {
            onNameChange?.(node.id, currentName);
        } else {
            setCurrentName(node.data?.customName || 'Group');
        }
    };

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

    React.useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, handleMouseMove, handleMouseUp]);

    React.useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    React.useEffect(() => {
        if (!copyTooltip?.visible) return;

        const handleSelectionChange = () => {
            const selection = window.getSelection();
            const nameEl = nameRef.current;
            if (
                !selection ||
                !nameEl ||
                selection.isCollapsed ||
                !selection.toString().trim() ||
                !isSelectionInsideElement(selection, nameEl)
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
    }, [copyTooltip?.visible, hideCopyTooltip, showCopiedFeedback]);

    React.useEffect(() => () => {
        clearTooltipTimer();
    }, [clearTooltipTimer]);

    const triggerDelete = (deleteChildren: boolean) => {
        if (!onDelete) return;
        setIsDeleting(true);
        setShowDeleteOptions(false);
        setTimeout(() => onDelete(node.id, deleteChildren), 300);
    };

    React.useEffect(() => {
        if (!showDeleteOptions) return;

        const handleOutsidePointerDown = (event: PointerEvent) => {
            const target = event.target as Node;
            if (
                deleteOptionsRef.current?.contains(target) ||
                deleteButtonRef.current?.contains(target)
            ) {
                return;
            }
            setShowDeleteOptions(false);
        };

        window.addEventListener('pointerdown', handleOutsidePointerDown);
        return () => window.removeEventListener('pointerdown', handleOutsidePointerDown);
    }, [showDeleteOptions]);

    const width = node.data?.width || 400;
    const height = node.data?.height || 300;

    const nodeClasses = [
        styles.groupNodeBase,
        'group-node-base', // Added for global selector detection
        isDeleting ? styles.deleting : styles.notDeleting,
        isDragging ? styles.dragging : styles.notDragging,
        playPopIn ? styles.popIn : '',
    ].join(' ');

    return (
        <div
            id={node.id}
            ref={nodeRef}
            className={nodeClasses}
            data-no-selection="true"
            onMouseDown={handleMouseDown}
            onClick={(e) => {
                e.stopPropagation();
                const isMultiSelect = e.ctrlKey || e.shiftKey;
                if (!hasDraggedRef.current && selected && !isMultiSelect) {
                    onSelect?.(false);
                }
            }}
            style={{
                left: node.position.x,
                top: node.position.y,
                width: `${width}px`,
                height: `${height}px`,
                background: currentColor.bg,
                border: selected ? `3px dashed ${currentColor.accent}` : `2px dashed ${currentColor.border}`,
                boxShadow: selected
                    ? `0 0 0 4px ${currentColor.border}, 0 0 30px 5px ${currentColor.border}`
                    : `0 4px 20px ${currentColor.border}`,
                zIndex: showDeleteOptions ? 1000 : 0,
            }}
        >
            <div className={styles.header} style={{ borderBottom: `1px dashed ${currentColor.border}`, background: currentColor.bg }}>
                <div
                    ref={nameContainerRef}
                    className={styles.nameContainer}
                    data-no-drag="true"
                    onMouseDown={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => {
                        e.stopPropagation();
                        hideCopyTooltip();
                        setIsEditing(true);
                    }}
                >
                    {copyTooltip?.visible && !isEditing && (
                        <div
                            className={styles.copyTooltip}
                            onMouseDown={handleTooltipMouseDown}
                            onClick={handleTooltipClick}
                            style={{
                                left: `${copyTooltip.x}px`,
                                top: `${copyTooltip.y}px`,
                            }}
                        >
                            {copyTooltip.text}
                        </div>
                    )}
                    {isEditing ? (
                        <input
                            ref={inputRef}
                            value={currentName}
                            onChange={(e) => setCurrentName(e.target.value)}
                            onBlur={handleNameSubmit}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleNameSubmit();
                                e.stopPropagation();
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            className={styles.nameInput}
                            style={{ border: `1px solid ${currentColor.accent}`, color: currentColor.accent }}
                        />
                    ) : (
                        <span
                            ref={nameRef}
                            className={styles.nameSpan}
                            style={{ color: currentColor.accent }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onMouseUp={handleNameMouseUp}
                        >
                            {currentName}
                        </span>
                    )}
                </div>

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowOutsideLabel(!showOutsideLabel);
                    }}
                    className={styles.toggleExternalLabelButton}
                    title={showOutsideLabel ? "Hide External Label" : "Show External Label"}
                >
                    <span style={{ fontSize: '18px' }}>📦</span>
                </button>

                {showOutsideLabel && onNameChange && (
                    <ExternalLabel
                        nodeId={node.id}
                        currentName={currentName}
                        onNameChange={onNameChange}
                        currentColor={currentColor}
                    />
                )}

                <div className={styles.colorPickerButtonContainer}>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowColorPicker(!showColorPicker);
                        }}
                        className={styles.colorPickerButton}
                        style={{
                            background: `linear-gradient(135deg, ${currentColor.accent}, ${currentColor.border})`,
                            border: `1px solid ${currentColor.accent}`,
                            boxShadow: `0 2px 8px ${currentColor.border}`,
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = `0 4px 12px ${currentColor.border}`;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = `0 2px 8px ${currentColor.border}`;
                        }}
                        title="Change Color"
                    >
                        <span style={{ fontSize: '14px' }}>🎨</span>
                    </button>
                    {showColorPicker && (
                        <div className={styles.colorPickerPopup} onMouseDown={(e) => e.stopPropagation()}>
                            {colors.map((c, index) => (
                                <div
                                    key={c.name}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setColorIndex(index);
                                        setShowColorPicker(false);
                                    }}
                                    title={c.name}
                                    className={styles.colorSwatch}
                                    style={{
                                        background: c.accent,
                                        border: index === colorIndex ? '2px solid white' : '2px solid transparent',
                                        transform: index === colorIndex ? 'scale(1.1)' : 'scale(1)',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.25)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = index === colorIndex ? 'scale(1.1)' : 'scale(1)'}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {(onCluster || onDelete) && (
                    <div className={styles.controlsContainer}>
                        {onCluster && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onCluster(node.id);
                                }}
                                className={styles.clusterButton}
                                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.5)'}
                                onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                                title="Convert group to component"
                            >
                                Cluster
                            </button>
                        )}
                        {onDelete && (
                            <button
                                ref={deleteButtonRef}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowDeleteOptions((prev) => {
                                        return !prev;
                                    });
                                }}
                                className={styles.deleteButton}
                                title="Delete Options"
                            >
                                <Trash2 size={14} color="#fff" />
                            </button>
                        )}
                        {showDeleteOptions && (
                            <div
                                ref={deleteOptionsRef}
                                className={styles.deleteOptions}
                                onPointerDown={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                            >
                                <button
                                    onClick={() => triggerDelete(false)}
                                    className={`${styles.deleteOptionButton} ${styles.deleteGroupOnly}`}
                                    title="Delete group only"
                                    aria-label="Delete group only"
                                >
                                    <Trash size={16} />
                                </button>
                                <button
                                    onClick={() => triggerDelete(true)}
                                    className={`${styles.deleteOptionButton} ${styles.deleteWithChildren}`}
                                    title="Delete group and all child nodes"
                                    aria-label="Delete group and all child nodes"
                                >
                                    <Bomb size={16} />
                                    <AlertTriangle size={10} className={styles.deleteWithChildrenWarning} />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className={styles.body}>
                <div className={`${styles.cornerIndicator} ${styles.topLeft}`} style={{ borderColor: currentColor.border }} />
                <div className={`${styles.cornerIndicator} ${styles.topRight}`} style={{ borderColor: currentColor.border }} />
                <div className={`${styles.cornerIndicator} ${styles.bottomLeft}`} style={{ borderColor: currentColor.border }} />
                <div className={`${styles.cornerIndicator} ${styles.bottomRight}`} style={{ borderColor: currentColor.border }} />
            </div>
        </div>
    );
};
