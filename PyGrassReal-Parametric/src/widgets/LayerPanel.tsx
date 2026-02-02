import React from 'react';
import './LayerPanel.css';

interface LayerPanelProps {
    layers: Array<{ id: string; label: string; depth: number; }>;
    hideToolbar?: boolean;
    hideCheckboxes?: boolean;
    hideIcons?: boolean;
    onUpdate?: (id: string, newName: string) => void;
    onAddLayer?: () => void;
    onDeleteLayer?: (layerId: string | string[]) => void;
    onMoveLayer?: (fromIndex: number, toIndex: number) => void;
    selectedIds?: Set<string>;
    onSelect?: (id: string) => void;
}

export const LayerPanel: React.FC<LayerPanelProps> = ({
    layers,
    hideToolbar = false,
    hideCheckboxes = false,
    hideIcons = false,
    onUpdate,
    onAddLayer,
    onDeleteLayer,
    selectedIds,
    onSelect,
}) => {
    return (
        <div className="layer-panel-container">
            {!hideToolbar && (
                <div className="layer-panel-toolbar">
                    {/* Toolbar content, e.g., Add Layer button */}
                    {onAddLayer && <button onClick={onAddLayer}>Add Layer</button>}
                </div>
            )}
            <div className="layer-list">
                {layers.length === 0 ? (
                    <div className="no-layers">No layers to display.</div>
                ) : (
                    layers.map(layer => (
                        <div
                            key={layer.id}
                            className={`layer-item ${selectedIds?.has(layer.id) ? 'selected' : ''}`}
                            style={{ paddingLeft: `${layer.depth * 15}px` }}
                            onClick={() => onSelect?.(layer.id)}
                        >
                            {!hideCheckboxes && <input type="checkbox" />}
                            {!hideIcons && <span className="layer-icon"> war</span>}
                            <span className="layer-label" onDoubleClick={() => {
                                const newName = prompt('Enter new layer name:', layer.label);
                                if (newName && onUpdate) {
                                    onUpdate(layer.id, newName);
                                }
                            }}>{layer.label}</span>
                            {onDeleteLayer && <button onClick={() => onDeleteLayer(layer.id)}>X</button>}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
