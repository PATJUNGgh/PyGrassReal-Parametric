import React, { useState, useRef, useCallback, useEffect, useMemo, useLayoutEffect } from 'react';
import { MagicParticles } from './effects/MagicParticles';
import { FireEffect } from './effects/FireEffect';
import { LightningEffect } from './effects/LightningEffect';
import { GroupButtonOverlay } from './ui/GroupButtonOverlay';
import { NodeLayer } from './NodeLayer';
import { ConnectionLayer } from './ConnectionLayer';
import { WireActionMenu } from './ui/WireActionMenu';
import { useSelection } from '../hooks/useSelection';
import { useGroupLogic } from '../hooks/useGroupLogic';
import { useComponentLogic } from '../hooks/useComponentLogic';
import { useNodeOperations } from '../hooks/useNodeOperations';
import { useConnectionLogic } from '../hooks/useConnectionLogic';
import type { ComponentData } from '../types/ComponentTypes';
import type { NodeData, Connection } from '../types/NodeTypes';

interface NodeCanvasProps {
    onNodeCreate?: (node: NodeData) => void;
    interactive?: boolean; // Controls whether canvas captures pointer events
    isDraggingNode?: boolean; // Controls whether to show drop zone overlay even if non-interactive
    interactionMode?: 'node' | '3d' | 'wire';
}



export const NodeCanvas: React.FC<NodeCanvasProps> = ({ onNodeCreate, interactive = true, isDraggingNode = false, interactionMode = 'node' }) => {
    const [nodes, setNodes] = useState<NodeData[]>([]);
    const [connections, setConnections] = useState<Connection[]>([]);
    const canvasRef = useRef<HTMLDivElement>(null);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [scale, setScale] = useState(1);
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [magicEffects, setMagicEffects] = useState<Array<{ id: string; x: number; y: number; color: string }>>([]);
    const [fireEffects, setFireEffects] = useState<Array<{ id: string; x: number; y: number }>>([]);
    const currentMode = interactionMode === '3d' ? '3d' : 'nodes';
    const [lightningEffects, setLightningEffects] = useState<Array<{ id: string; source: { x: number; y: number }; target: { x: number; y: number } }>>([]);
    const [shakingNodes, setShakingNodes] = useState<Set<string>>(new Set());

    // Get node port position helper (Defined early to avoid reference errors)
    // Optimized getPortPosition: Calculates position mathematically to avoid expensive DOM reflows
    const getPortPosition = useCallback((nodeId: string, portId: string): { x: number; y: number } | null => {
        // DOM-based calculation (Reverted for visual accuracy)
        const id = `port-${nodeId}-${portId}`;
        const el = document.getElementById(id);
        if (!el || !canvasRef.current) return null;
        const r = el.getBoundingClientRect();
        const cr = canvasRef.current.getBoundingClientRect();
        return { x: r.left - cr.left + r.width / 2, y: r.top - cr.top + r.height / 2 };
    }, []);

    const {
        draggingConnection,
        startConnection,
        completeConnection,
        deleteConnection,
        cancelConnection,
        updateConnectionDrag
    } = useConnectionLogic({
        canvasRef,
        connections,
        setConnections,
        offset,
        scale,
        getPortPosition,
        setLightningEffects,
        setShakingNodes
    });

    // ----------------------------------------------------------------------
    // Optimized Port Position for SELECTION (Mathematical approximation)
    // ----------------------------------------------------------------------
    const getApproximatePortPosition = useCallback((nodeId: string, portId: string): { x: number; y: number } | null => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return null;

        const nodeScreenX = node.position.x * scale + offset.x;
        const nodeScreenY = node.position.y * scale + offset.y;

        // Special handling for Panel Node
        if (node.type === 'panel') {
            const height = node.data.height || 300;
            const width = node.data.width || 340;
            const relativeY = (height / 2) * scale;
            if (portId === 'output-main') {
                return { x: nodeScreenX + (width * scale) + (15 * scale), y: nodeScreenY + relativeY };
            } else {
                return { x: nodeScreenX - (15 * scale), y: nodeScreenY + relativeY };
            }
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
        const HEADER_HEIGHT = 50;
        const BODY_PADDING = 16;
        const LABEL_HEIGHT = 18;
        const ROW_HEIGHT = 24;
        const GAP = 10;

        const relativeYUnscaled = HEADER_HEIGHT + BODY_PADDING + LABEL_HEIGHT + (index * (ROW_HEIGHT + GAP)) + (ROW_HEIGHT / 2);
        const relativeY = relativeYUnscaled * scale;
        const PORT_CENTER_OFFSET = -25;
        const finalX = isInput ? nodeScreenX + (PORT_CENTER_OFFSET * scale) : nodeScreenX + nodeWidth + (-PORT_CENTER_OFFSET * scale);

        return { x: finalX, y: nodeScreenY + relativeY };
    }, [nodes, offset, scale]);



    // Derived state for Group Button
    const [isGroupButtonExiting, setIsGroupButtonExiting] = useState(false);
    const [showGroupButton, setShowGroupButton] = useState(false);
    const [joinCandidate, setJoinCandidate] = useState<{ groupId: string; nodeId: string } | null>(null);
    const [, forceRender] = useState(0);
    const componentLibraryRef = useRef<Map<string, ComponentData>>(new Map());

    // Store last valid group button state for exit animation
    const lastGroupState = useRef<{ centerX: number; buttonY: number; count: number }>({
        centerX: 0,
        buttonY: 0,
        count: 0
    });

    // ----------------------------------------------------------------------


    // ----------------------------------------------------------------------
    // Use Selection Hook
    // ----------------------------------------------------------------------
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
        nodes,
        connections,
        scale,
        offset,
        interactionMode,
        getApproximatePortPosition
    });

    // Handle node selection (preserves multi-selection for dragging)
    const handleNodeSelect = useCallback((id: string) => {
        if (interactionMode === 'node') {
            // If the clicked node is already selected, preserve the selection group
            // This allows dragging multiple selected nodes together
            if (selectedNodeIds.has(id)) {
                return; // Do nothing - keep existing selection
            }
            // Otherwise, select only this node
            setSelectedNodeIds(new Set([id]));
            setSelectedConnectionIds(new Set()); // Clear connection selection
        }
    }, [interactionMode, selectedNodeIds, setSelectedNodeIds, setSelectedConnectionIds]);

    // Detect nodes connected to AntiVirus (Infected Nodes)
    const infectedNodeIds = useMemo(() => {
        const infected = new Set<string>();

        // Find all AntiVirus nodes
        const antiVirusNodes = nodes.filter(n => n.type === 'antivirus');

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
    }, [nodes, connections]);

    // Group Logic Hook
    const {
        scheduleGroupResize,
        createGroupNode,
        handleJoinGroup,
        handleLeaveGroup,
        isNodeOverlappingGroup
    } = useGroupLogic({
        nodes,
        setNodes,
        selectedNodeIds,
        setSelectedNodeIds,
        onNodeCreate
    });


    // Handle Group button visibility with exit animation
    useEffect(() => {
        const selectedNodes = nodes.filter(n => selectedNodeIds.has(n.id));
        let shouldShow = selectedNodeIds.size > 1;
        let isInvalidSelection = false;

        if (shouldShow) {
            // Check restrictive conditions
            const hasGroupNode = selectedNodes.some(n => n.type === 'group');
            const isAnyInGroup = selectedNodes.some(n =>
                nodes.some(g => g.type === 'group' && g.data.childNodeIds?.includes(n.id))
            );

            if (hasGroupNode || isAnyInGroup) {
                shouldShow = false;
                isInvalidSelection = true;
            }
        }

        if (shouldShow) {
            // Show button when we have 2+ nodes
            if (!showGroupButton) {
                setShowGroupButton(true);
                setIsGroupButtonExiting(false);
            } else if (isGroupButtonExiting) {
                // If button is exiting but we still have 2+ nodes, cancel exit
                setIsGroupButtonExiting(false);
            }
        } else {
            // When should hide
            if (showGroupButton && !isGroupButtonExiting) {
                if (isInvalidSelection) {
                    // Invalid selection (e.g. includes group) -> Hide IMMEDIATELY
                    setShowGroupButton(false);
                    setIsGroupButtonExiting(false);
                } else {
                    // Normal Deselect -> Trigger exit animation
                    setIsGroupButtonExiting(true);
                    // Hide after animation completes
                    const timer = setTimeout(() => {
                        setShowGroupButton(false);
                        setIsGroupButtonExiting(false);
                    }, 400); // Match animation duration
                    return () => clearTimeout(timer);
                }
            }
        }
    }, [selectedNodeIds, nodes, showGroupButton, isGroupButtonExiting]);

    // Clear selection when switching to 3D mode
    useEffect(() => {
        if (currentMode === '3d') {
            setSelectedNodeIds(new Set());
        }
    }, [currentMode]);

    // Add a new node


    // ----------------------------------------------------------------------
    // Use Node Operations Hook
    // ----------------------------------------------------------------------
    const {
        addNode,
        deleteNode,
        duplicateNode,
        updateNodeData,
        updateNodePosition
    } = useNodeOperations({
        nodes,
        setNodes,
        connections,
        setConnections,
        selectedNodeIds,
        setSelectedNodeIds,
        setFireEffects,
        setMagicEffects,
        scheduleGroupResize,
        componentLibraryRef,
        setJoinCandidate,
        onNodeCreate
    });



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
        nodes,
        setNodes,
        connections,
        setConnections,
        componentLibraryRef
    });



    // Global listener for Deselection in 3D Mode
    useEffect(() => {
        if (currentMode !== '3d') return;

        const handleGlobalPointerDown = (e: PointerEvent) => {
            const target = e.target as HTMLElement;

            // Check if we clicked on a UI element or a Node
            const isNoSelectionElement = target.closest('[data-no-selection="true"]');
            const isUIControl = target.closest('button, input, label, select, .node-port');

            // Logic: If we clicked something that is NOT a marked UI/Node element, we deselect.
            // This covers clicking the 3D Canvas, empty space, or any other non-interactive background.
            // We use 'pointerdown' in capture phase to catch it before R3F or OrbitControls potentially stop propagation.
            if (!isNoSelectionElement && !isUIControl) {
                clearSelection();
            }
        };

        // Use capture phase to ensure we get the event
        window.addEventListener('pointerdown', handleGlobalPointerDown, { capture: true });
        return () => window.removeEventListener('pointerdown', handleGlobalPointerDown, { capture: true });
    }, [currentMode, clearSelection]);

    // Handle canvas panning and selection box
    const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
        const target = e.target as HTMLElement;

        const isNoSelectionElement = target.closest('[data-no-selection="true"]');
        const isUIControl = target.closest('button, input, label, select, .node-port');

        if (isNoSelectionElement || isUIControl) {
            return;
        }

        if (e.button === 1 || (e.button === 0 && e.altKey)) {
            setIsPanning(true);
            setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
            e.preventDefault();
            return;
        }

        if (e.button === 0 && !e.altKey && canvasRef.current && (interactionMode === 'node' || interactionMode === 'wire')) {
            clearSelection();
            const rect = canvasRef.current.getBoundingClientRect();
            startSelectionBox(e.clientX - rect.left, e.clientY - rect.top);
        }
    }, [offset, interactionMode, scale, clearSelection, startSelectionBox]);

    // Handle drop from toolbar
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const nodeType = e.dataTransfer.getData('nodeType');
        if ((nodeType === 'box' || nodeType === 'sphere' || nodeType === 'custom' || nodeType === 'antivirus' || nodeType === 'input' || nodeType === 'output' || nodeType === 'number-slider' || nodeType === 'panel') && canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            const screenX = e.clientX - rect.left;
            const screenY = e.clientY - rect.top;

            addNode(nodeType as 'box' | 'sphere' | 'custom' | 'antivirus' | 'input' | 'output' | 'number-slider' | 'panel', {
                x: (screenX - offset.x) / scale,
                y: (screenY - offset.y) / scale,
            });
        }
    }, [addNode, offset, scale]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
    }, []);

    const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
        if (isPanning) {
            setOffset({
                x: e.clientX - panStart.x,
                y: e.clientY - panStart.y,
            });
        }

        // Update selection box
        if (selectionBox && canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            updateSelectionBox(e.clientX - rect.left, e.clientY - rect.top);
        }

        updateConnectionDrag(e);
    }, [isPanning, panStart, updateConnectionDrag, selectionBox, offset, scale, updateSelectionBox]);



    const handleCanvasMouseUp = useCallback(() => {
        setIsPanning(false);
        endSelectionBox();

        if (draggingConnection) {
            cancelConnection();
        }
    }, [endSelectionBox, draggingConnection, cancelConnection]);

    const handleDeleteWires = useCallback(() => {
        const idsToDelete = new Set(selectedConnectionIds);
        setConnections(prev => prev.filter(c => !idsToDelete.has(c.id)));
        setSelectedConnectionIds(new Set());
    }, [selectedConnectionIds]);

    const handleToggleWireStyle = useCallback((style: 'dashed' | 'ghost') => {
        setConnections(prev => prev.map(conn => {
            if (selectedConnectionIds.has(conn.id)) {
                return {
                    ...conn,
                    isDashed: style === 'dashed' ? !conn.isDashed : conn.isDashed,
                    isGhost: style === 'ghost' ? !conn.isGhost : conn.isGhost,
                };
            }
            return conn;
        }));
    }, [selectedConnectionIds]);

    // Calculate center of selected wires for menu positioning
    const getSelectedWiresCenter = useCallback(() => {
        if (selectedConnectionIds.size === 0) return null;

        let sumX = 0, sumY = 0, count = 0;

        connections.forEach(conn => {
            if (selectedConnectionIds.has(conn.id)) {
                // We need Screen Space positions for the UI overlay
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

        // Return average position (Already in "Container Space" pixels)
        return { x: sumX / count, y: sumY / count };

    }, [connections, selectedConnectionIds, getPortPosition]);





    // Handle zoom with mouse wheel (Native listener to support passive: false)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            setScale((prev) => Math.min(Math.max(prev * delta, 0.1), 3));
        };

        canvas.addEventListener('wheel', onWheel, { passive: false });

        return () => {
            canvas.removeEventListener('wheel', onWheel);
        };
    }, []);

    useLayoutEffect(() => {
        // Force a post-layout render so port positions reflect the latest zoom/pan transform.
        forceRender((prev) => prev + 1);
    }, [scale, offset]);

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
                pointerEvents: interactive || isDraggingNode || draggingConnection ? 'auto' : 'none',
            }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
        >
            {/* Grid Background - Infinite Pattern */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    opacity: 0.4, // 40% visibility
                    // Infinite DOT grid logic using radial-gradient
                    backgroundImage: 'radial-gradient(circle, #555 1px, transparent 1px)',
                    backgroundSize: `${40 * scale}px ${40 * scale}px`,
                    backgroundPosition: `${offset.x}px ${offset.y}px`,
                }}
            />

            {/* Connections Layer (SVG) */}
            {/* Connections Layer (Refactored) */}
            <ConnectionLayer
                connections={connections}
                nodes={nodes}
                getPortPosition={getPortPosition}
                infectedNodeIds={infectedNodeIds}
                selectedConnectionIds={selectedConnectionIds}
                interactionMode={interactionMode}
                setSelectedConnectionIds={setSelectedConnectionIds}
                draggingConnection={draggingConnection}
                scale={scale}
                offset={offset}
            >
                {/* Render Lightning Effects */}
                {lightningEffects.map((effect) => (
                    <LightningEffect
                        key={effect.id}
                        source={effect.source}
                        target={effect.target}
                    />
                ))}
            </ConnectionLayer>

            {/* Render nodes and effects */}
            <div
                data-transform-container="true"
                style={{
                    transform: `matrix(${scale}, 0, 0, ${scale}, ${offset.x}, ${offset.y})`,
                    position: 'relative',
                    zIndex: 2,
                    transformOrigin: '0 0',
                    pointerEvents: 'none' // Ensure container itself is transparent to clicks
                }}
            >
                <NodeLayer
                    nodes={nodes}
                    connections={connections}
                    selectedNodeIds={selectedNodeIds}
                    infectedNodeIds={infectedNodeIds}
                    shakingNodes={shakingNodes}
                    scale={scale}
                    onPositionChange={updateNodePosition}
                    onDataChange={updateNodeData}
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
                {/* Join Group Button (Inside Transform Container) */}
                {joinCandidate && (() => {
                    const group = nodes.find(n => n.id === joinCandidate.groupId);
                    if (!group) return null;

                    // Calculate position relative to group (no need for scale/offset here)
                    const groupWidth = group.data?.width || 400;
                    const buttonX = group.position.x + groupWidth / 2;
                    const buttonY = group.position.y + 20; // Inside group, near top

                    return (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleJoinGroup(joinCandidate.nodeId, joinCandidate.groupId);
                                setJoinCandidate(null);
                            }}
                            style={{
                                position: 'absolute',
                                left: `${buttonX}px`,
                                top: `${buttonY}px`,
                                transform: 'translate(-50%, -100%)',
                                padding: '8px 16px',
                                background: '#3b82f6', // Bright blue
                                color: 'white',
                                border: '2px solid white',
                                borderRadius: '20px',
                                fontSize: '14px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                zIndex: 10000, // Very high z-index
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                                pointerEvents: 'auto', // Important because container has pointer-events: none
                            }}
                        >
                            ➕ Join Group
                        </button>
                    );
                })()}
            </div>

            {/* Selection Box Overlay - WIRE MODE */}
            {selectionBox && interactionMode === 'wire' && (
                <div
                    id="selection-box-wire-mode"
                    title="Selection Box Wire Mode"
                    style={{
                        position: 'absolute',
                        left: `${Math.min(selectionBox.startX, selectionBox.currentX) * scale + offset.x}px`,
                        top: `${Math.min(selectionBox.startY, selectionBox.currentY) * scale + offset.y}px`,
                        width: `${Math.abs(selectionBox.currentX - selectionBox.startX) * scale}px`,
                        height: `${Math.abs(selectionBox.currentY - selectionBox.startY) * scale}px`,
                        border: '2px dashed #FFD700', // Yellow for Wire Mode
                        background: 'rgba(255, 215, 0, 0.1)',
                        pointerEvents: 'none',
                        zIndex: 1000,
                    }}
                />
            )}

            {/* Selection Box Overlay - NODE MODE */}
            {selectionBox && interactionMode === 'node' && (
                <div
                    id="selection-box-node-mode"
                    title="Selection Box Node Mode"
                    style={{
                        position: 'absolute',
                        left: `${Math.min(selectionBox.startX, selectionBox.currentX) * scale + offset.x}px`,
                        top: `${Math.min(selectionBox.startY, selectionBox.currentY) * scale + offset.y}px`,
                        width: `${Math.abs(selectionBox.currentX - selectionBox.startX) * scale}px`,
                        height: `${Math.abs(selectionBox.currentY - selectionBox.startY) * scale}px`,
                        border: '2px dashed #2196f3', // Blue for Node Mode
                        background: 'rgba(33, 150, 243, 0.1)',
                        pointerEvents: 'none',
                        zIndex: 1000,
                    }}
                />
            )}

            {/* Floating Wire Action Menu */}
            {/* Floating Wire Action Menu (Animated) */}
            <WireActionMenu
                visible={selectedConnectionIds.size > 0 && interactionMode === 'wire'}
                center={getSelectedWiresCenter()}
                onDelete={handleDeleteWires}
                onToggleStyle={handleToggleWireStyle}
            />

            {/* Floating Group Button - Top of Selection */}
            {showGroupButton && (() => {
                let centerX: number;
                let buttonY: number;
                let count: number;

                if (selectedNodeIds.size > 1) {
                    // Active state: Calculate from current selection
                    const selectedNodes = nodes.filter(n => selectedNodeIds.has(n.id));
                    if (selectedNodes.length === 0) return null;

                    // Hide button if selection includes a Group Node OR if a node is already in a group
                    const hasGroupNode = selectedNodes.some(n => n.type === 'group');
                    const isAnyInGroup = selectedNodes.some(n =>
                        nodes.some(g => g.type === 'group' && g.data.childNodeIds?.includes(n.id))
                    );

                    if (hasGroupNode || isAnyInGroup) return null;

                    // More accurate node dimensions
                    const NODE_WIDTH = 280;
                    const NODE_HEIGHT = 180;

                    const minX = Math.min(...selectedNodes.map(n => n.position.x));
                    const maxX = Math.max(...selectedNodes.map(n => n.position.x + NODE_WIDTH));
                    const minY = Math.min(...selectedNodes.map(n => n.position.y));
                    const maxY = Math.max(...selectedNodes.map(n => n.position.y + NODE_HEIGHT));

                    // Position at the top center of the bounding box
                    centerX = (minX + maxX) / 2;
                    buttonY = minY - 80;
                    count = selectedNodeIds.size;

                    // Update ref with current values
                    lastGroupState.current = { centerX, buttonY, count };
                } else {
                    // Exiting state: Use frozen values from ref
                    centerX = lastGroupState.current.centerX;
                    buttonY = lastGroupState.current.buttonY;
                    count = lastGroupState.current.count;
                }

                return (
                    <GroupButtonOverlay
                        count={count}
                        centerX={centerX}
                        buttonY={buttonY}
                        scale={scale}
                        offset={offset}
                        isExiting={isGroupButtonExiting}
                        onClick={() => {
                            createGroupNode();
                        }}
                    />
                );
            })()}



            {/* Scale Indicator */}
            <div style={{
                position: 'absolute',
                bottom: '10px',
                right: '10px',
                background: 'rgba(0, 0, 0, 0.7)',
                color: '#fff',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 600,
                zIndex: 10,
                pointerEvents: 'none',
            }}>
                {Math.round(scale * 100)}%
            </div>
        </div >
    );
};
