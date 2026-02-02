import React, { useState, useRef } from 'react';
import type { NodeData } from '../types/NodeTypes';
import { Trash2 } from 'lucide-react';
import { ExternalLabel } from './ExternalLabel';
import styles from './GroupNode.module.css';

interface GroupNodeProps {
    node: NodeData;
    onPositionChange: (id: string, position: { x: number; y: number }) => void;
    onDelete?: (nodeId: string, deleteChildren?: boolean) => void;
    selected?: boolean;
    onSelect?: () => void;
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
    const nodeRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const colors = [
        { name: 'Orange', border: 'rgba(255, 165, 0, 0.6)', bg: 'rgba(255, 165, 0, 0.05)', accent: '#ff8c00' },
        { name: 'Blue', border: 'rgba(59, 130, 246, 0.6)', bg: 'rgba(59, 130, 246, 0.05)', accent: '#3b82f6' },
        { name: 'Green', border: 'rgba(34, 197, 94, 0.6)', bg: 'rgba(34, 197, 94, 0.05)', accent: '#22c55e' },
        { name: 'Purple', border: 'rgba(168, 85, 247, 0.6)', bg: 'rgba(168, 85, 247, 0.05)', accent: '#a855f7' },
        { name: 'Red', border: 'rgba(239, 68, 68, 0.6)', bg: 'rgba(239, 68, 68, 0.05)', accent: '#ef4444' },
    ];

    const [colorIndex, setColorIndex] = useState(0);
    const currentColor = colors[colorIndex];

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0 || isEditing) return;
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

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        const currentScale = Math.max(scale, 0.01);
        const deltaX = (e.clientX - dragStartPos.current.mouseX) / currentScale;
        const deltaY = (e.clientY - dragStartPos.current.mouseY) / currentScale;
        onPositionChange(node.id, {
            x: dragStartPos.current.nodeX + deltaX,
            y: dragStartPos.current.nodeY + deltaY,
        });
    };

    const handleMouseUp = () => {
        if (isDragging) {
            setIsDragging(false);
            onDragEnd?.();
        }
    }

    const handleNameSubmit = () => {
        setIsEditing(false);
        if (currentName.trim()) {
            onNameChange?.(node.id, currentName);
        } else {
            setCurrentName(node.data?.customName || 'Group');
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
    }, [isDragging, handleMouseMove]);

    React.useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const triggerDelete = (deleteChildren: boolean) => {
        if (!onDelete) return;
        setIsDeleting(true);
        setShowDeleteOptions(false);
        setTimeout(() => onDelete(node.id, deleteChildren), 300);
    };

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
                <div className={styles.nameContainer} onDoubleClick={() => setIsEditing(true)}>
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
                        <span className={styles.nameSpan} style={{ color: currentColor.accent }}>
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
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowDeleteOptions((prev) => !prev);
                                }}
                                className={styles.deleteButton}
                                title="Delete Options"
                            >
                                <Trash2 size={14} color="#fff" />
                            </button>
                        )}
                        {showDeleteOptions && (
                            <div className={styles.deleteOptions} onMouseDown={(e) => e.stopPropagation()}>
                                <button
                                    onClick={() => triggerDelete(false)}
                                    className={`${styles.deleteOptionButton} ${styles.deleteGroupOnly}`}
                                    title="Delete group only"
                                >
                                    Delete group only
                                </button>
                                <button
                                    onClick={() => triggerDelete(true)}
                                    className={`${styles.deleteOptionButton} ${styles.deleteWithChildren}`}
                                    title="Delete group and all child nodes"
                                >
                                    Delete group + children
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
