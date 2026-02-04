import React, { useState, useRef, useCallback, useEffect, useMemo, useImperativeHandle, forwardRef } from 'react';
import { MagicParticles } from './effects/MagicParticles';
import { FireEffect } from './effects/FireEffect';
import { LightningEffect } from './effects/LightningEffect';
import { GridBackground } from './GridBackground';
import { NodeRenderer } from './NodeRenderer';
import { ConnectionLayer } from './ConnectionLayer';
import { SelectionBoxOverlay } from './ui/SelectionBoxOverlay';
import { CanvasOverlays } from './ui/CanvasOverlays';
import { useSelection } from '../hooks/useSelection';
import { useGroupLogic } from '../hooks/useGroupLogic';
import { useComponentLogic } from '../hooks/useComponentLogic';
import { useNodeOperations } from '../hooks/useNodeOperations';
import { useConnectionLogic } from '../hooks/useConnectionLogic';
import { useCanvasTransform } from '../hooks/useCanvasTransform';
import { useCanvasInteraction } from '../hooks/useCanvasInteraction';
import { getInitialDataForNode } from '../definitions/nodeDefinitions';
import type { ComponentData } from '../types/ComponentTypes';
import type { NodeData, Connection, NodeCanvasHandle } from '../types/NodeTypes';
import { useGroupButtonLogic } from '../hooks/useGroupButtonLogic';
import { useSceneSync } from '../hooks/useSceneSync';
import { useCanvasEffects } from '../hooks/useCanvasEffects';
import { useCanvasUI } from '../hooks/useCanvasUI';
import { useNodeGraph } from '../context/NodeGraphContext';

interface NodeCanvasProps {
    onNodeCreate?: (node: NodeData) => void;
    onNodeDelete?: (nodeId: string) => void;
    onBackgroundStyleChange?: (style: { cssBackground: string; sceneColor: string; isGradient: boolean }) => void;
    onSceneNodeSelect?: (nodeId: string) => void;
    onViewportModeChange?: (mode: 'wireframe' | 'depth' | 'monochrome' | 'rendered') => void;
    onGraphChange?: (nodes: NodeData[], connections: Connection[]) => void;
    sceneObjects?: SceneObject[];
    newNodeCategory?: 'nodes' | 'widget';
    visibleNodeTypes?: NodeData['type'][];
    visibleNodeCategory?: 'nodes' | 'widget';
    allow3dNodeDrop?: boolean;
    uiEnabled?: boolean;
    firstSelectedAppId?: string | null;
    interactive?: boolean;
    isDraggingNode?: boolean;
    interactionMode?: 'node' | '3d' | 'wire';
    activeDragNode?: { type: NodeData['type'], x: number, y: number } | null;
    setActiveDragNode?: (node: { type: NodeData['type'], x: number, y: number } | null) => void;
}

export const NodeCanvas = forwardRef<NodeCanvasHandle, NodeCanvasProps>(({
    onNodeCreate,
    onNodeDelete,
    onBackgroundStyleChange,
    sceneObjects = [],
    interactive = true,
    uiEnabled = true,
    isDraggingNode = false, // Kept for legacy if any, but activeDragNode is primary
    interactionMode = 'node',
    visibleNodeCategory,
    newNodeCategory,
    activeDragNode,
    setActiveDragNode,
    onViewportModeChange,
    onGraphChange
}, ref) => {
    const {
        nodes,
        connections,
        undo,
        redo,
        startAction,
        endAction,
        setNodesWithHistory,
        setConnectionsWithHistory,
        isUndoingRef,
        setNodesRaw // Added setNodesRaw
    } = useNodeGraph();

    const [layoutRevision, setLayoutRevision] = useState(0);

    useEffect(() => {
        // When the node editor becomes visible, the connection lines might not have
        // the correct dimensions if their container was previously display: none.
        // A forced re-render after a timeout ensures that the layout has been
        // calculated and the wires can draw correctly.
        if (visibleNodeCategory || newNodeCategory || uiEnabled) {
            setTimeout(() => {
                setLayoutRevision(c => c + 1);
            }, 0); // A minimal timeout is enough to push it to the next render cycle
        }
    }, [visibleNodeCategory, newNodeCategory, uiEnabled]);

    const canvasRef = useRef<HTMLDivElement>(null);
    const {
        offset,
        scale,
        setScale,
        setOffset,
        isPanning,
        handlePanStart,
        handlePanMove,
        handlePanEnd,
    } = useCanvasTransform({ canvasRef });

    const {
        magicEffects,
        fireEffects,
        lightningEffects,
        setMagicEffects,
        setFireEffects,
        setLightningEffects,
    } = useCanvasEffects();

    const {
        searchBoxVisible,
        searchBoxPos,
        editingMaterialNodeId,
        showSearchBox,
        hideSearchBox,
        openMaterialEditor,
        closeMaterialEditor,
    } = useCanvasUI();

    const currentMode = interactionMode === '3d' ? '3d' : 'nodes';
    const [shakingNodes, setShakingNodes] = useState<Set<string>>(new Set());
    const componentLibraryRef = useRef<Map<string, ComponentData>>(new Map());

    // --- Start of Refactored Hooks Block ---

    // 1. Memoize filteredNodes first, as many hooks depend on it.
    const filteredNodes = useMemo(() => {
        const map = new Map<string, NodeData>();
        nodes.filter(node => {
            if (!visibleNodeCategory) return true;
            const origin = node.data.editorOrigin || 'nodes';
            return origin === visibleNodeCategory;
        }).forEach((node) => {
            map.set(node.id, node);
        });
        return Array.from(map.values());
    }, [nodes, visibleNodeCategory]);

    // 2. Define port position helpers.
    const getPortPosition = useCallback((nodeId: string, portId: string, type: 'input' | 'output'): { x: number; y: number } | null => {
        const id = `port-${nodeId}-${portId}`;
        const el = document.getElementById(id);
        if (!el || !canvasRef.current) return null;
        const r = el.getBoundingClientRect();
        const cr = canvasRef.current.getBoundingClientRect();
        return { x: r.left - cr.left + r.width / 2, y: r.top - cr.top + r.height / 2 };
    }, []);

    const getApproximatePortPosition = useCallback((nodeId: string, portId: string): { x: number; y: number } | null => {
        const node = filteredNodes.find(n => n.id === nodeId);
        if (!node) return null;

        const nodeScreenX = node.position.x * scale + offset.x;
        const nodeScreenY = node.position.y * scale + offset.y;

        if (node.type === 'panel') {
            const height = node.data.height || 300;
            const width = node.data.width || 340;
            const relativeY = (height / 2) * scale;
            return portId === 'output-main'
                ? { x: nodeScreenX + (width * scale) + (15 * scale), y: nodeScreenY + relativeY }
                : { x: nodeScreenX - (15 * scale), y: nodeScreenY + relativeY };
        }

        const inputs = node.data.inputs || [];
        const outputs = node.data.outputs || [];
        const inputIndex = inputs.findIndex(p => p.id === portId);
        const outputIndex = outputs.findIndex(p => p.id === portId);

        if (inputIndex === -1 && outputIndex === -1) return null;

        const isInput = inputIndex !== -1;
        const index = isInput ? inputIndex : outputIndex;

        const customName = node.data.customName || 'Node';
        let nodeWidthUnscaled = 280;
        if (node.data.width) nodeWidthUnscaled = node.data.width;
        else if (node.type === 'custom' || node.type === 'antivirus') nodeWidthUnscaled = Math.min(620, Math.max(300, (customName.length * 8) + 180));

        const nodeWidth = nodeWidthUnscaled * scale;
        const HEADER_HEIGHT = 50, BODY_PADDING = 16, LABEL_HEIGHT = 18, ROW_HEIGHT = 24, GAP = 10;
        const relativeYUnscaled = HEADER_HEIGHT + BODY_PADDING + LABEL_HEIGHT + (index * (ROW_HEIGHT + GAP)) + (ROW_HEIGHT / 2);
        const relativeY = relativeYUnscaled * scale;
        const PORT_CENTER_OFFSET = -25;
        const finalX = isInput ? nodeScreenX + (PORT_CENTER_OFFSET * scale) : nodeScreenX + nodeWidth + (-PORT_CENTER_OFFSET * scale);

        return { x: finalX, y: nodeScreenY + relativeY };
    }, [filteredNodes, offset, scale]);

    // 3. Initialize selection logic, which depends on port positions.
    const {
        selectedNodeIds,
        setSelectedNodeIds,
        selectedConnectionIds,
        setSelectedConnectionIds,
        selectionBox,
        setSelectionBox,
        toggleNodeSelection,
        startSelectionBox,
        updateSelectionBox,
        endSelectionBox,
        clearSelection
    } = useSelection({
        scale,
        offset,
        interactionMode,
        getApproximatePortPosition
    });

    // 4. Group logic depends on selection.
    const {
        scheduleGroupResize,
        createGroupNode,
        handleJoinGroup,
        handleLeaveGroup,
        isNodeOverlappingGroup
    } = useGroupLogic({
        selectedNodeIds,
        setSelectedNodeIds,
        onNodeCreate
    });

    // 5. Node operations depend on selection and group logic.
    const {
        addNode,
        deleteNode,
        duplicateNode,
        updateNodeData,
        updateNodePosition
    } = useNodeOperations({
        selectedNodeIds,
        setSelectedNodeIds,
        setFireEffects,
        setMagicEffects,
        scheduleGroupResize,
        componentLibraryRef,
        onNodeCreate,
        onNodeDelete
    });

    // 6. Connection logic depends on port positions and node state.
    const {
        draggingConnection,
        startConnection,
        completeConnection,
        deleteConnection,
        cancelConnection,
        updateConnectionDrag
    } = useConnectionLogic({
        canvasRef,
        offset,
        scale,
        getPortPosition,
        setLightningEffects,
        setShakingNodes,
    });

    const isDraggingNodeRef = useRef(false);

    const {
        shouldShowGroupButton,
        groupButtonProps,
        isInvalidGroupSelection,
        showGroupButton,
        isGroupButtonExiting,
    } = useGroupButtonLogic({ selectedNodeIds, filteredNodes });

    // 7. Imperative handle depends on node operations.
    useImperativeHandle(ref, () => ({
        zoomToFit: () => {
            if (nodes.length === 0 || !canvasRef.current) return;

            let minX = Infinity;
            let minY = Infinity;
            let maxX = -Infinity;
            let maxY = -Infinity;

            nodes.forEach(node => {
                const w = node.data.width || 300;
                const h = node.data.height || 200;
                minX = Math.min(minX, node.position.x);
                minY = Math.min(minY, node.position.y);
                maxX = Math.max(maxX, node.position.x + w);
                maxY = Math.max(maxY, node.position.y + h);
            });

            if (minX === Infinity) return;



            const PADDING = 80;
            const contentWidth = maxX - minX + (PADDING * 2);
            const contentHeight = maxY - minY + (PADDING * 2);

            const { clientWidth, clientHeight } = canvasRef.current;

            const scaleX = clientWidth / contentWidth;
            const scaleY = clientHeight / contentHeight;
            let newScale = Math.min(scaleX, scaleY, 1.2);
            newScale = Math.max(newScale, 0.2);

            const contentCenterX = minX - PADDING + contentWidth / 2;
            const contentCenterY = minY - PADDING + contentHeight / 2;

            const newOffsetX = (clientWidth / 2) - (contentCenterX * newScale);
            const newOffsetY = (clientHeight / 2) - (contentCenterY * newScale);

            setScale(newScale);
            setOffset({ x: newOffsetX, y: newOffsetY });
        },
        undo,
        redo,
        updateNodeData: (id: string, updates: Partial<NodeData['data']>) => {
            updateNodeData(id, updates);
        },
        startAction,
        endAction,
        endActionAfterNextChange: () => {
            setTimeout(() => {
                endAction();
            }, 0);
        }
    }), [nodes, undo, redo, setScale, setOffset, updateNodeData, startAction, endAction]); // Added updateNodeData to dependencies

    // --- End of Refactored Hooks Block ---

    // Keep handleNodeDragStart simple
    const handleNodeDragStart = useCallback(() => {
        isDraggingNodeRef.current = true;
        startAction(); // Manually push history at the start of a drag
    }, [startAction]);

    const handleNodeDragEnd = useCallback(() => {
        isDraggingNodeRef.current = false;
        endAction();
    }, [endAction]);

    useEffect(() => {
        // TODO: This is a defensive cleanup for a bug causing duplicate nodes.
        // This is inefficient as it runs on every node update (e.g., dragging).
        // The root cause of duplicate node creation should be investigated and fixed.
        const map = new Map<string, NodeData>();
        let hasDuplicate = false;
        nodes.forEach((node) => {
            if (map.has(node.id)) {
                hasDuplicate = true;
            }
            map.set(node.id, node);
        });
        if (hasDuplicate) {
            console.warn('Found and removed duplicate nodes (Background Cleanup)');
            setNodesRaw(Array.from(map.values()));
        }
    }, [nodes, setNodesRaw]);











    // Handle node selection (preserves multi-selection for dragging)
    const handleNodeSelect = useCallback((id: string) => {
        if (interactionMode !== 'node' && interactionMode !== '3d' && interactionMode !== 'wire') {
            return;
        }

        if (selectedNodeIds.has(id)) {
            return;
        }

        setSelectedNodeIds(new Set([id]));
        setSelectedConnectionIds(new Set());
    }, [interactionMode, selectedNodeIds, setSelectedNodeIds, setSelectedConnectionIds]);

    // Detect nodes connected to AntiVirus (Infected Nodes)
    const infectedNodeIds = useMemo(() => {
        const infected = new Set<string>();

        // Find all AntiVirus nodes
        const antiVirusNodes = filteredNodes.filter(n => n.type === 'antivirus');

        // For each connection, check if it connects to an AntiVirus node
        connections.forEach(conn => {
            const isSourceAV = antiVirusNodes.some(av => av.id === conn.sourceNodeId);
            const isTargetAV = antiVirusNodes.some(av => av.id === conn.targetNodeId);

            // If source is AV, target is infected
            if (isSourceAV && conn.targetNodeId) {
                infected.add(conn.targetNodeId);
            }

            // If target is AV, source is infected
            if (isTargetAV && conn.sourceNodeId) {
                infected.add(conn.sourceNodeId);
            }
        });

        return infected;
    }, [filteredNodes, connections]);


    // Notify parent of graph changes (for evaluation and scene sync).
    // Avoid triggering the evaluator while we are mid-undo/redo so we don't race with history restores.
    useEffect(() => {
        onGraphChange?.(nodes, connections);
    }, [nodes, connections, onGraphChange]); // Removed currentUndoing check to ensure view updates on Undo

    // Synchronize Background Color node with Scene background
    useEffect(() => {
        const bgNode = nodes.find(n => n.type === 'background-color');
        if (bgNode && onBackgroundStyleChange) {
            const data = bgNode.data;
            const isGradient = data.backgroundMode === 'gradient';
            const start = data.backgroundGradientStart || '#0f172a';
            const end = data.backgroundGradientEnd || '#1f2937';
            const angle = data.backgroundGradientAngle ?? 135;

            let cssBackground = '';
            let sceneColor = '';

            if (isGradient) {
                cssBackground = `linear-gradient(${angle}deg, ${start} 0%, ${end} 100%)`;
                sceneColor = start; // Fallback for scene clear color
            } else {
                const color = data.backgroundColor || '#1e1e1e';
                cssBackground = color;
                sceneColor = color;
            }

            onBackgroundStyleChange({
                cssBackground,
                sceneColor,
                isGradient
            });
        }
    }, [nodes, onBackgroundStyleChange]);

    // Clear selection when switching to 3D mode (only when nodes uninteractive)
    useEffect(() => {
        if (currentMode === '3d' && !interactive) {
            setSelectedNodeIds(new Set());
        }
    }, [currentMode, interactive]);

    const handleNodeDataChange = useCallback((id: string, data: Partial<NodeData['data']>) => {
        updateNodeData(id, data);

        // Check if this is a viewport node and trigger callback
        const targetNode = nodes.find(n => n.id === id);
        if (targetNode?.type === 'viewport' && data.viewportMode && onViewportModeChange) {
            onViewportModeChange(data.viewportMode as any);
        }
    }, [updateNodeData, nodes, onViewportModeChange]);

    // Synchronize scene objects with nodes in the canvas
    useSceneSync(sceneObjects);

    const isInputPortId = useCallback((portId: string) => {
        const lower = portId.toLowerCase();
        return lower.includes('input') || lower.startsWith('in-');
    }, []);

    // ----------------------------------------------------------------------
    // Use Component Logic Hook
    // ----------------------------------------------------------------------
    const {
        convertGroupToComponent,
        handleComponentCluster
    } = useComponentLogic({
        componentLibraryRef
    });

    const canvasInteractionHandlers = useCanvasInteraction({
        canvasRef,
        interactive,
        interactionMode,
        handlePanStart,
        handlePanMove,
        handlePanEnd,
        selectionBox,
        startSelectionBox,
        updateSelectionBox,
        endSelectionBox,
        clearSelection,
        draggingConnection,
        cancelConnection,
        updateConnectionDrag,
        addNode,
        offset,
        scale,
        newNodeCategory,
        showSearchBox,
        activeDragNode,
        setActiveDragNode,
    });



    // Global listener for dropping nodes from toolbar is now inside useCanvasInteraction hook

    // Wire-specific actions
    const handleDeleteWires = useCallback(() => {
        const idsToDelete = new Set(selectedConnectionIds);
        setConnectionsWithHistory(prev => prev.filter(c => !idsToDelete.has(c.id)));
        setSelectedConnectionIds(new Set());
    }, [selectedConnectionIds, setConnectionsWithHistory]);

    const handleToggleWireStyle = useCallback((style: 'dashed' | 'ghost') => {
        setConnectionsWithHistory(prev => prev.map(conn => {
            if (selectedConnectionIds.has(conn.id)) {
                return { ...conn, isDashed: style === 'dashed' ? !conn.isDashed : conn.isDashed, isGhost: style === 'ghost' ? !conn.isGhost : conn.isGhost };
            }
            return conn;
        }));
    }, [selectedConnectionIds, setConnectionsWithHistory]);

    const getSelectedWiresCenter = useCallback(() => {
        if (selectedConnectionIds.size === 0) return null;
        let sumX = 0, sumY = 0, count = 0;
        connections.forEach(conn => {
            if (selectedConnectionIds.has(conn.id)) {
                const sourcePos = getPortPosition(conn.sourceNodeId, conn.sourcePort);
                const targetPos = getPortPosition(conn.targetNodeId, conn.targetPort);
                if (sourcePos && targetPos) {
                    sumX += (sourcePos.x + targetPos.x) / 2;
                    sumY += (sourcePos.y + targetPos.y) / 2;
                    count++;
                }
            }
        });
        if (count === 0) return null;
        return { x: sumX / count, y: sumY / count };
    }, [connections, selectedConnectionIds, getPortPosition]);

    const editingNodeForMaterial = useMemo(() => {
        if (!editingMaterialNodeId) return null;
        return filteredNodes.find(n => n.id === editingMaterialNodeId);
    }, [editingMaterialNodeId, filteredNodes]);

    return (
        <div
            ref={canvasRef}
            className="node-canvas"
            style={{
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(26, 26, 26, 0.3)', // 30% transparency as requested
                overflow: 'hidden',
                position: 'relative',
                cursor: isPanning ? 'grabbing' : draggingConnection ? 'crosshair' : 'default',
                pointerEvents: (interactive && interactionMode !== '3d') || isDraggingNode || draggingConnection ? 'auto' : 'none',
            }}
            {...canvasInteractionHandlers}
        >
            {/* Grid Background */}
            <GridBackground scale={scale} offset={offset} />

            {/* Connections Layer (SVG) */}
            {/* Connections Layer (Refactored) */}
            <ConnectionLayer
                connections={connections}
                nodes={filteredNodes}
                getPortPosition={getPortPosition}
                infectedNodeIds={infectedNodeIds}
                selectedConnectionIds={selectedConnectionIds}
                interactionMode={interactionMode}
                setSelectedConnectionIds={setSelectedConnectionIds}
                draggingConnection={draggingConnection}
                scale={scale}
                offset={offset}
                onDeleteConnection={deleteConnection}
            >
                {/* Render Lightning Effects - Disabled per user request */}
                {/* {lightningEffects.map((effect) => (
                    <LightningEffect
                        key={effect.id}
                        source={effect.source}
                        target={effect.target}
                    />
                ))} */}
            </ConnectionLayer>

            {/* Render nodes and effects */}
            <div
                data-transform-container="true"
                style={{
                    transform: `matrix(${scale}, 0, 0, ${scale}, ${offset.x}, ${offset.y})`,
                    position: 'relative',
                    zIndex: 2,
                    transformOrigin: '0 0',
                    pointerEvents: 'auto' // Allow interaction with nodes even in 3D mode
                }}
            >
                <NodeRenderer
                    nodes={filteredNodes}
                    connections={connections}
                    selectedNodeIds={selectedNodeIds}
                    infectedNodeIds={infectedNodeIds}
                    shakingNodes={shakingNodes}
                    scale={scale}
                    onPositionChange={updateNodePosition}
                    onDataChange={handleNodeDataChange}
                    onDelete={deleteNode}
                    onDuplicate={duplicateNode}
                    onSelect={handleNodeSelect}
                    onConnectionStart={startConnection}
                    onConnectionComplete={completeConnection}
                    onDeleteConnection={deleteConnection}
                    onJoinGroup={handleJoinGroup}
                    onLeaveGroup={handleLeaveGroup}
                    isNodeOverlappingGroup={isNodeOverlappingGroup}
                    onGroupCluster={convertGroupToComponent}
                    onComponentCluster={handleComponentCluster}
                    onDragStart={handleNodeDragStart}
                    onDragEnd={handleNodeDragEnd}
                    onEditMaterial={openMaterialEditor}
                />


                {/* Magic Particle Effects - inside transform layer */}
                {magicEffects.map((effect) => (
                    <MagicParticles
                        key={effect.id}
                        x={effect.x}
                        y={effect.y}
                        color={effect.color}
                    />
                ))}

                {/* Fire Effects - inside transform layer */}
                {fireEffects.map((effect) => (
                    <FireEffect
                        key={effect.id}
                        x={effect.x}
                        y={effect.y}
                    />
                ))}
            </div>

            {/* Selection Box Overlay */}
            <SelectionBoxOverlay
                selectionBox={selectionBox}
                interactionMode={interactionMode}
                scale={scale}
                offset={offset}
            />

            <CanvasOverlays
                scale={scale}
                offset={offset}
                interactionMode={interactionMode}
                selectedConnectionIds={selectedConnectionIds}
                getSelectedWiresCenter={getSelectedWiresCenter}
                handleDeleteWires={handleDeleteWires}
                handleToggleWireStyle={handleToggleWireStyle}
                showGroupButton={showGroupButton}
                isInvalidGroupSelection={isInvalidGroupSelection}
                groupButtonProps={groupButtonProps}
                isGroupButtonExiting={isGroupButtonExiting}
                createGroupNode={createGroupNode}
                editingNodeForMaterial={editingNodeForMaterial}
                editingMaterialNodeId={editingMaterialNodeId}
                closeMaterialEditor={closeMaterialEditor}
                updateNodeData={updateNodeData}
                searchBoxVisible={searchBoxVisible}
                searchBoxPos={searchBoxPos}
                addNode={addNode}
                hideSearchBox={hideSearchBox}
            />
        </div >
    );
});
