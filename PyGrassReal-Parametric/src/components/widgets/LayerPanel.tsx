import React, { useState, useCallback } from 'react';
import { Plus, Trash2, Layers, Copy } from 'lucide-react';
import './LayerPanel.css';

interface LayerPanelProps {

    layers: { id: string; label: string; depth: number; treePrefix?: string; objectType?: string; objectLabel?: string; objectNodeType?: string }[];

    onUpdate?: (id: string, updates: { label: string }) => void;

    onAddLayer?: () => void;

    onDeleteLayer?: (id: string | string[]) => void;

    onMoveLayer?: (fromIndex: number, toIndex: number) => void;

    selectedIds?: Set<string>;

    onSelect?: (ids: Set<string>) => void;

    hideToolbar?: boolean;

    hideCheckboxes?: boolean;

    hideIcons?: boolean;
    hideTreeGraphics?: boolean;

}

export const LayerPanel: React.FC<LayerPanelProps> = ({
    layers,
    onUpdate,
    onAddLayer,
    onDeleteLayer,
    onMoveLayer,
    selectedIds = new Set(),
    onSelect,
    hideToolbar,
    hideCheckboxes,
    hideIcons,
    hideTreeGraphics
}) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
    const [isRangeSelectionEnabled, setIsRangeSelectionEnabled] = useState(false);


    const handleStartEdit = useCallback((layer: { id: string; label: string }) => {
        if (!onUpdate) return;
        setEditingId(layer.id);
        setEditName(layer.label);
    }, [onUpdate]);

    const handleCommitEdit = useCallback(() => {
        if (editingId && onUpdate) {
            onUpdate(editingId, { label: editName });
        }
        setEditingId(null);
    }, [editingId, onUpdate, editName]);

    const handleDeleteSelected = useCallback(() => {
        if (!onDeleteLayer || selectedIds.size === 0) return;
        const idsArray = Array.from(selectedIds);
        onDeleteLayer(idsArray.length === 1 ? idsArray[0] : idsArray);
        onSelect?.(new Set()); // Clear selection after deletion
    }, [onDeleteLayer, selectedIds, onSelect]);

    const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
        e.dataTransfer.setData('layerIndex', index.toString());
        e.dataTransfer.effectAllowed = 'move';
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = 'move';
        setDragOverIndex(index);
    }, []);

    const handleDragLeave = useCallback(() => {
        setDragOverIndex(null);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        setDragOverIndex(null);
        const dragIndexStr = e.dataTransfer.getData('layerIndex');
        if (!dragIndexStr) return;

        const dragIndex = parseInt(dragIndexStr, 10);
        if (dragIndex !== dropIndex && onMoveLayer) {
            onMoveLayer(dragIndex, dropIndex);
        }
    }, [onMoveLayer]);

    // REFACTORED: Unified selection handler for item clicks
    const handleItemClick = useCallback((index: number, e: React.MouseEvent) => {
        if (editingId === layers[index].id) return;

        const clickedId = layers[index].id;
        const isCtrlPressed = e.ctrlKey || e.metaKey;
        const isShiftPressed = e.shiftKey;

        let newSelected = new Set(selectedIds);

        if (isRangeSelectionEnabled) {
            // Anchor-based range selection mode (no modifiers needed)
            if (lastClickedIndex !== null) {
                const start = Math.min(lastClickedIndex, index);
                const end = Math.max(lastClickedIndex, index);
                newSelected = new Set(); // This mode replaces selection with the new range
                for (let i = start; i <= end; i++) {
                    newSelected.add(layers[i].id);
                }
                // Keep the anchor, allowing user to resize range by clicking elsewhere
            } else {
                newSelected = new Set([clickedId]);
                setLastClickedIndex(index);
            }
        } else if (isShiftPressed && lastClickedIndex !== null) {
            // Standard shift-click range selection
            const start = Math.min(lastClickedIndex, index);
            const end = Math.max(lastClickedIndex, index);
            // This adds to the selection from the anchor
            for (let i = start; i <= end; i++) {
                newSelected.add(layers[i].id);
            }
        } else if (isCtrlPressed) {
            // Toggle selection for the clicked item
            if (newSelected.has(clickedId)) {
                newSelected.delete(clickedId);
            } else {
                newSelected.add(clickedId);
            }
            setLastClickedIndex(index);
        } else {
            // Plain click
            if (newSelected.has(clickedId) && newSelected.size === 1) {
                newSelected.clear(); // Deselect if it's the only one selected
                setLastClickedIndex(null);
            } else {
                newSelected = new Set([clickedId]);
                setLastClickedIndex(index);
            }
        }

        onSelect?.(newSelected);

    }, [layers, selectedIds, onSelect, editingId, isRangeSelectionEnabled, lastClickedIndex]);

    // REFACTORED: Handler just for checkbox changes
    const handleCheckboxChange = useCallback((id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        onSelect?.(newSelected);
    }, [selectedIds, onSelect]);

    return (
        <div
            style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                background: 'transparent',
            }}
        >
            {/* Toolbar / Header for Adding */}
            {!hideToolbar && (
                <div style={{
                    padding: '8px',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '8px'
                }}>
                    {selectedIds.size > 0 && (
                        <button
                            onClick={handleDeleteSelected}
                            style={{
                                background: 'rgba(239, 68, 68, 0.2)',
                                border: '1px solid rgba(239, 68, 68, 0.5)',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                color: '#f87171',
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                cursor: 'pointer',
                            }}
                        >
                            <Trash2 size={14} /> ({selectedIds.size})
                        </button>
                    )}

                    {/* Range Selection Toggle */}
                    <button
                        onClick={() => {
                            setIsRangeSelectionEnabled(!isRangeSelectionEnabled);
                            setLastClickedIndex(null); // Reset anchor on mode toggle
                        }}
                        style={{
                            background: isRangeSelectionEnabled
                                ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                                : 'rgba(255, 255, 255, 0.1)',
                            border: isRangeSelectionEnabled
                                ? '1px solid rgba(245, 158, 11, 0.5)'
                                : '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '4px',
                            padding: '3px 6px',
                            color: 'white',
                            fontSize: '11px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontWeight: 600,
                            boxShadow: isRangeSelectionEnabled ? '0 2px 8px rgba(245, 158, 11, 0.3)' : 'none',
                            cursor: 'pointer'
                        }}
                        title="Toggle anchor-based range selection. No modifier keys needed."
                    >
                        <Copy size={12} /> {isRangeSelectionEnabled ? 'ON' : 'OFF'}
                    </button>

                    <button
                        onClick={onAddLayer}
                        style={{
                            background: 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            color: 'white',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                            fontWeight: 600
                        }}
                    >
                        <Plus size={14} /> Add Layer
                    </button>
                </div>
            )}

            {/* List */}
            <div
                className="layer-list-container"
                style={{ flex: 1, overflowY: 'auto', position: 'relative' }}
                onMouseLeave={() => setDragOverIndex(null)}
            >
                {layers.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                        No layers
                    </div>
                ) : (
                    layers.map((layer, index) => {
                        const isEditing = editingId === layer.id;
                        const isSelected = selectedIds.has(layer.id);
                        const isDragOver = dragOverIndex === index;
                        const metaParts: string[] = [];
                        if (layer.objectLabel) metaParts.push(layer.objectLabel);
                        if (layer.objectNodeType) metaParts.push(layer.objectNodeType);
                        if (layer.objectType) metaParts.push(layer.objectType);
                        const metaText = metaParts.join(' • ');

                        return (
                            <div
                                key={layer.id}
                                className="layer-item"
                                draggable={!isEditing && !!onMoveLayer} // Only draggable if not editing AND onMoveLayer exists
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, index)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '6px 12px',
                                    gap: '8px',
                                    cursor: isEditing ? 'text' : 'pointer',
                                    fontSize: '13px',
                                    color: isSelected ? '#fff' : '#e2e8f0',
                                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                                    background: isEditing
                                        ? 'rgba(56, 189, 248, 0.1)'
                                        : isDragOver
                                            ? 'rgba(56, 189, 248, 0.4)' // Stronger highlight for visual feedback
                                            : isSelected
                                                ? 'rgba(56, 189, 248, 0.3)'
                                                : 'transparent',
                                    borderTop: isDragOver ? '2px solid #38bdf8' : 'none', // Add line indicator
                                    transition: 'background 0.15s',
                                    height: '28px', // Fixed height for alignment with ports
                                    boxSizing: 'border-box'
                                }}
                                onClick={(e) => handleItemClick(index, e)}
                                onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    handleStartEdit(layer);
                                }}
                                onMouseEnter={(e) => {
                                    if (!isEditing && !isSelected && !isDragOver) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                }}
                                onMouseLeave={(e) => {
                                    if (!isEditing && !isSelected && !isDragOver) e.currentTarget.style.background = 'transparent';
                                }}
                            >
                                {/* Checkbox for deletion */}
                                {!hideCheckboxes && (
                                    <input
                                        type="checkbox"
                                        className="layer-checkbox"
                                        checked={isSelected}
                                        onChange={() => handleCheckboxChange(layer.id)}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                )}

                                {/* Icon */}
                                {!hideIcons && <Layers size={14} className="text-amber-400" />}

                                {/* Name - Editable */}
                                {isEditing ? (
                                    <>
                                        <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <input
                                                type="text"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleCommitEdit();
                                                    if (e.key === 'Escape') {
                                                        setEditingId(null);
                                                        e.stopPropagation();
                                                    }
                                                    e.stopPropagation();
                                                }}
                                                autoFocus
                                                onClick={(e) => e.stopPropagation()}
                                                onMouseDown={(e) => e.stopPropagation()}
                                                style={{
                                                    background: 'rgba(255, 255, 255, 0.15)',
                                                    border: '1px solid #38bdf8',
                                                    borderRadius: '4px',
                                                    color: 'white',
                                                    fontSize: '13px',
                                                    padding: '2px 6px',
                                                    width: '80px',
                                                    outline: 'none'
                                                }}
                                            />
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleCommitEdit();
                                                }}
                                                onMouseDown={(e) => e.stopPropagation()}
                                                style={{
                                                    background: '#10b981',
                                                    border: 'none',
                                                    borderRadius: '3px',
                                                    color: 'white',
                                                    fontSize: '11px',
                                                    padding: '2px 5px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    minWidth: '20px',
                                                    height: '20px'
                                                }}
                                                title="Confirm (Enter)"
                                            >
                                                ✓
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingId(null);
                                                }}
                                                onMouseDown={(e) => e.stopPropagation()}
                                                style={{
                                                    background: '#ef4444',
                                                    border: 'none',
                                                    borderRadius: '3px',
                                                    color: 'white',
                                                    fontSize: '11px',
                                                    padding: '2px 5px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    minWidth: '20px',
                                                    height: '20px'
                                                }}
                                                title="Cancel (Esc)"
                                            >
                                                ✗
                                            </button>
                                        </span>
                                    </>
                                ) : (
                                    <span
                                        style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', userSelect: 'none', display: 'flex', alignItems: 'center' }}
                                    >
                                        {/* Tree lines visualization */}
                                        {!hideTreeGraphics && (() => {
                                            const depth = layer.depth || 0;
                                            if (depth > 0) {
                                                return (
                                                    <span style={{ display: 'flex', alignItems: 'center', marginRight: '4px' }}>
                                                        {Array.from({ length: depth }).map((_, i) => (
                                                            <span
                                                                key={i}
                                                                style={{
                                                                    width: '16px',
                                                                    height: '20px',
                                                                    position: 'relative',
                                                                    display: 'inline-block'
                                                                }}
                                                            >
                                                                {i === depth - 1 ? (
                                                                    // Last level - show └
                                                                    <span style={{
                                                                        position: 'absolute',
                                                                        left: '0',
                                                                        top: '-10px',
                                                                        width: '100%',
                                                                        height: '20px',
                                                                        borderLeft: '2px solid rgba(255, 255, 255, 0.35)',
                                                                        borderBottom: '2px solid rgba(255, 255, 255, 0.35)',
                                                                        borderBottomLeftRadius: '6px'
                                                                    }} />
                                                                ) : (
                                                                    // Middle levels - show vertical line
                                                                    <span style={{
                                                                        position: 'absolute',
                                                                        left: '0',
                                                                        top: '-10px',
                                                                        height: '30px',
                                                                        borderLeft: '2px solid rgba(255, 255, 255, 0.2)'
                                                                    }} />
                                                                )}
                                                            </span>
                                                        ))}
                                                    </span>
                                                );
                                            }
                                            return null;
                                        })()}
                                        {/* Tree prefix with gray color */}
                                        {(layer as any).treePrefix && (
                                            <span style={{ color: 'rgba(156, 163, 175, 0.6)', fontFamily: 'monospace' }}>
                                                {(layer as any).treePrefix}
                                            </span>
                                        )}
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                                            <span>{layer.label}</span>
                                            {metaText && (
                                                <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '11px' }}>
                                                    {metaText}
                                                </span>
                                            )}
                                        </span>
                                    </span>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
