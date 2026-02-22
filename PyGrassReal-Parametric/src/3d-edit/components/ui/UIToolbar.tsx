import React from 'react';
import { Undo2, Redo2 } from 'lucide-react';
import { NODE_DEFINITIONS } from '../../definitions/nodeDefinitions';
import { HIDDEN_NODES } from '../../definitions/hiddenNodes';
import { NODE_CATEGORIES, WIDGET_CATEGORIES, type NodeCategory } from '../../definitions/nodeCategories';
import type { NodeData } from '../../types/NodeTypes';
import type { ActiveDragData } from './DragOverlay'; // Import ActiveDragData
import './UIToolbar.css';

const NODE_EDITOR_NODES: NodeData['type'][] = [
    'box', 'sphere', 'cone', 'cylinder', 'vector-xyz', 'transform', 'build-3d-ai', 'vertex-mask', 'ai-sculpt', 'ai-paint', 'picture-on-mesh', 'unit-x', 'unit-y', 'unit-z', 'boolean-toggle', 'mesh-union', 'mesh-difference', 'mesh-intersection', 'model-material', 'text-on-mesh', 'mesh-array', 'node-prompt', 'layer-source', 'layer-bridge', 'custom', 'antivirus', 'input', 'output', 'number-slider', 'series', 'panel'
].filter(type => !HIDDEN_NODES.includes(type));

const WIDGET_EDITOR_NODES: NodeData['type'][] = [
    'widget-window', 'ai-assistant', 'prompt', 'background-color', 'viewport', 'layer-source', 'layer-bridge', 'layer-view', 'antivirus', 'custom', 'input', 'output', 'number-slider', 'panel'
];

interface NodeGridProps {
    nodeTypes: NodeData['type'][];
    categories: NodeCategory[];
    setActiveDragNode: (node: ActiveDragData | null) => void;
    activeDragNode: ActiveDragData | null;
}

const NodeGrid: React.FC<NodeGridProps> = ({ nodeTypes, categories, setActiveDragNode, activeDragNode }) => {
    const handlePointerDown = (e: React.PointerEvent, type: NodeData['type']) => {
        // Only left click
        if (e.button !== 0) return;

        // Prevent default browser dragging
        e.preventDefault();

        const target = e.currentTarget as HTMLElement;
        const pointerId = e.pointerId;

        // Release capture so the window/canvas/DragOverlay can pick up the tracking immediately
        try {
            if (target.hasPointerCapture(pointerId)) {
                target.releasePointerCapture(pointerId);
            }
        } catch {
            // Ignore
        }

        // Activates drag immediately (hover works -> click works)
        setActiveDragNode({
            type,
            x: e.clientX,
            y: e.clientY
        });
    };

    const handlePointerUpOrLeave = () => {
        // No-op
    };

    const categorySections = React.useMemo(() => {
        const availableNodeSet = new Set<NodeData['type']>(nodeTypes);
        const orderedSections: Array<{
            id: string;
            label: string;
            nodeTypes: NodeData['type'][];
            defaultExpanded: boolean;
        }> = [];
        const seenNodeTypes = new Set<NodeData['type']>();

        categories.forEach((category) => {
            const sectionNodeTypes = category.nodeTypes.filter((type): type is NodeData['type'] => {
                if (!availableNodeSet.has(type)) {
                    return false;
                }
                seenNodeTypes.add(type);
                return true;
            });

            if (sectionNodeTypes.length === 0) {
                return;
            }

            orderedSections.push({
                id: category.id,
                label: category.label,
                nodeTypes: sectionNodeTypes,
                defaultExpanded: Boolean(category.defaultExpanded),
            });
        });

        const uncategorized = nodeTypes.filter((type) => !seenNodeTypes.has(type));
        if (uncategorized.length > 0) {
            orderedSections.push({
                id: 'other',
                label: 'Other',
                nodeTypes: uncategorized,
                defaultExpanded: false,
            });
        }

        return orderedSections;
    }, [categories, nodeTypes]);

    const orderedNodeTypes = React.useMemo(() => {
        const ordered: NodeData['type'][] = [];
        const seen = new Set<NodeData['type']>();

        categorySections.forEach((section) => {
            section.nodeTypes.forEach((type) => {
                if (!seen.has(type)) {
                    seen.add(type);
                    ordered.push(type);
                }
            });
        });

        nodeTypes.forEach((type) => {
            if (!seen.has(type)) {
                seen.add(type);
                ordered.push(type);
            }
        });

        return ordered;
    }, [categorySections, nodeTypes]);

    const defaultCategoryId = React.useMemo(() => {
        const preferred = categorySections.find((section) => section.defaultExpanded);
        return preferred?.id ?? categorySections[0]?.id ?? 'all';
    }, [categorySections]);

    const [manualCategoryId, setManualCategoryId] = React.useState<string | null>(null);

    const isManualCategoryValid = React.useMemo(() => {
        if (!manualCategoryId) {
            return false;
        }
        return categorySections.some((section) => section.id === manualCategoryId);
    }, [categorySections, manualCategoryId]);

    const activeCategoryId = (isManualCategoryValid && manualCategoryId)
        ? manualCategoryId
        : defaultCategoryId;

    const visibleNodeTypes = React.useMemo(() => {
        const section = categorySections.find((item) => item.id === activeCategoryId);
        return section ? section.nodeTypes : orderedNodeTypes;
    }, [activeCategoryId, categorySections, orderedNodeTypes]);

    return (
        <div className="ui-node-grid">
            <div className="ui-node-category-row">
                {categorySections.map((section) => (
                    <button
                        key={section.id}
                        type="button"
                        className={`ui-node-category-chip ${activeCategoryId === section.id ? 'is-active' : ''}`}
                        onClick={() => setManualCategoryId(section.id)}
                        title={section.label}
                    >
                        {section.label}
                    </button>
                ))}
            </div>
            <div className="ui-node-row">
                {visibleNodeTypes.map(nodeType => {
                    const node = NODE_DEFINITIONS[nodeType];
                    if (!node) return null;

                    const isActive = activeDragNode?.type === node.type;

                    return (
                        <div
                            key={node.type}
                            onPointerDown={(e) => handlePointerDown(e, node.type)}
                            onPointerUp={handlePointerUpOrLeave}
                            onPointerLeave={handlePointerUpOrLeave}
                            className={`ui-node-card ${isActive ? 'is-dragging-source' : ''}`}
                            style={{
                                ['--node-accent' as string]: node.color[0],
                                cursor: 'grab',
                                // Prevent default browser drag
                                touchAction: 'none',
                            }}
                            title={node.label}
                            data-label={node.label}
                            aria-label={node.label}
                        >
                            <span className="ui-node-icon">{node.icon}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

interface UIToolbarProps {
    showNodeEditor: boolean;
    setShowNodeEditor: (show: boolean) => void;
    showWidgetEditor: boolean;
    setShowWidgetEditor: (show: boolean) => void;
    interactionMode: '3d' | 'node' | 'wire';
    setInteractionMode: (mode: '3d' | 'node' | 'wire') => void;
    setHandleTextureTarget: (target: 'x' | 'y' | 'z') => void;
    handleImageButtonClick: () => void;
    setActiveDragNode: (node: ActiveDragData | null) => void;
    activeDragNode: ActiveDragData | null;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onZoomToFit: () => void;
    onUndo?: () => void;
    onRedo?: () => void;
}

export const UIToolbar: React.FC<UIToolbarProps> = ({
    showNodeEditor,
    setShowNodeEditor,
    showWidgetEditor,
    setShowWidgetEditor,
    interactionMode,
    setInteractionMode,
    setHandleTextureTarget,
    handleImageButtonClick,
    setActiveDragNode,
    activeDragNode,
    fileInputRef,
    handleImageChange,
    onZoomToFit,
    onUndo,
    onRedo
}) => {
    return (
        <div
            className="ui-toolbar"
            onPointerDown={(e) => e.stopPropagation()}
        >
            <div className="ui-toolbar__group">
                {!showWidgetEditor && (
                    <button
                        onClick={() => {
                            const next = !showNodeEditor;
                            setShowNodeEditor(next);
                            if (!next) {
                                setInteractionMode('3d');
                            }
                        }}
                        title="Toggle Node Editor"
                        className={`ui-btn ui-toggle-btn ${showNodeEditor ? 'is-active' : ''}`}
                    >
                        <span className="ui-btn__icon">ND</span>
                        <span className="ui-btn__label">Nodes {showNodeEditor && 'ON'}</span>
                    </button>
                )}

                {!showNodeEditor && (
                    <button
                        onClick={() => {
                            const next = !showWidgetEditor;
                            setShowWidgetEditor(next);
                            if (!next) {
                                setInteractionMode('3d');
                            }
                        }}
                        title="Toggle Widget Editor"
                        className={`ui-btn ui-toggle-btn ${showWidgetEditor ? 'is-active' : ''}`}
                    >
                        <span className="ui-btn__icon">WG</span>
                        <span className="ui-btn__label">Widget {showWidgetEditor && 'ON'}</span>
                    </button>
                )}
            </div>

            {!showNodeEditor && !showWidgetEditor && (
                <>
                    <div className="ui-divider" />
                    <div className="ui-toolbar__group">
                        <button
                            onClick={() => { setHandleTextureTarget('x'); handleImageButtonClick(); }}
                            title="Apply image to X"
                            className="ui-btn ui-axis-btn"
                        >
                            Image X
                        </button>
                        <button
                            onClick={() => { setHandleTextureTarget('y'); handleImageButtonClick(); }}
                            title="Apply image to Y"
                            className="ui-btn ui-axis-btn"
                        >
                            Image Y
                        </button>
                        <button
                            onClick={() => { setHandleTextureTarget('z'); handleImageButtonClick(); }}
                            title="Apply image to Z"
                            className="ui-btn ui-axis-btn"
                        >
                            Image Z
                        </button>
                    </div>
                </>
            )}

            {(showNodeEditor || showWidgetEditor) && (
                <>
                    <div className="ui-divider" />
                    <div className="ui-toolbar__group">
                        <button
                            onClick={() => setInteractionMode('3d')}
                            title="3D Interaction Mode"
                            className={`ui-btn ui-mode-btn ${interactionMode === '3d' ? 'is-active' : ''}`}
                        >
                            <span className="ui-btn__icon">3D</span>
                            <span className="ui-btn__label">3D Mode</span>
                        </button>

                        <button
                            onClick={() => setInteractionMode('node')}
                            title="Node Interaction Mode"
                            className={`ui-btn ui-mode-btn ${interactionMode === 'node' ? 'is-active' : ''}`}
                        >
                            <span className="ui-btn__icon">ND</span>
                            <span className="ui-btn__label">Node Mode</span>
                        </button>

                        <button
                            onClick={() => setInteractionMode('wire')}
                            title="Wire Selection Mode"
                            className={`ui-btn ui-mode-btn ${interactionMode === 'wire' ? 'is-active' : ''}`}
                        >
                            <span className="ui-btn__icon">WR</span>
                            <span className="ui-btn__label">Wire Mode</span>
                        </button>

                    </div>

                    <div className="ui-divider" />

                    <div className="ui-toolbar__group">
                        <button
                            onClick={onZoomToFit}
                            title="Zoom to Fit"
                            className="ui-btn ui-mode-btn"
                        >
                            <span className="ui-btn__icon">FT</span>
                            <span className="ui-btn__label">Fit</span>
                        </button>
                    </div>
                    {(onUndo || onRedo) && (
                        <div className="ui-toolbar__group ui-toolbar__group--undo">
                            <div className="ui-toolbar__section ui-history-group">
                                <button
                                    onPointerDown={(e) => {
                                        e.stopPropagation();
                                        onUndo?.();
                                    }}
                                    disabled={!onUndo}
                                    title="Undo"
                                    className="ui-btn ui-icon-btn"
                                >
                                    <Undo2 size={22} />
                                </button>
                                <button
                                    onPointerDown={(e) => {
                                        e.stopPropagation();
                                        onRedo?.();
                                    }}
                                    disabled={!onRedo}
                                    title="Redo"
                                    className="ui-btn ui-icon-btn"
                                >
                                    <Redo2 size={22} />
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="ui-divider" />

                    {showNodeEditor && (
                        <div className="ui-grid-panel">
                            <NodeGrid
                                nodeTypes={NODE_EDITOR_NODES}
                                categories={NODE_CATEGORIES}
                                setActiveDragNode={setActiveDragNode}
                                activeDragNode={activeDragNode}
                            />
                        </div>
                    )}

                    {showWidgetEditor && (
                        <div className="ui-grid-panel">
                            <NodeGrid
                                nodeTypes={WIDGET_EDITOR_NODES}
                                categories={WIDGET_CATEGORIES}
                                setActiveDragNode={setActiveDragNode}
                                activeDragNode={activeDragNode}
                            />
                        </div>
                    )}

                </>
            )
            }

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: 'none' }}
            />
        </div>
    );
};
