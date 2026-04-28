import { useState, useEffect, useCallback, useRef } from 'react';
import type { Connection, NodeData } from '../types/NodeTypes';
import { isInputPort } from '../utils/nodeUtils';
import { getInitialDataForNode } from '../definitions/nodeDefinitions';
import { useNodeGraph } from '../context/NodeGraphContext';
import { getAutoCreateAction, hasExistingConnectionForAutoCreate, type AutoCreateRule } from '../graph/autoCreatePolicy';
import { canConnect } from '../graph/connectionPolicy';
import { computeNodePosition } from '../graph/autoLayoutPolicy';

interface UseConnectionLogicProps {
    canvasRef: React.RefObject<HTMLDivElement | null>;
    offset: { x: number; y: number };
    scale: number;
    getPortPosition: (nodeId: string, portId: string) => { x: number; y: number } | null;
    setLightningEffects: React.Dispatch<React.SetStateAction<Array<{ id: string; source: { x: number; y: number }; target: { x: number; y: number } }>>>;
    setShakingNodes: React.Dispatch<React.SetStateAction<Set<string>>>;
    onConnectionDropOnEmpty?: (payload: {
        clientX: number;
        clientY: number;
        sourceNodeId: string;
        sourcePortId: string;
    }) => void;
    addNode: (type: NodeData['type'], position: { x: number; y: number; }, options?: {
        editorOrigin?: 'nodes' | 'widget';
        initialData?: Partial<NodeData['data']>;
        initialConnections?: Array<{
            sourceNodeId?: string;
            sourcePort: string;
            targetNodeId?: string;
            targetPort: string;
        }>;
    }) => string | undefined;
}

export const useConnectionLogic = ({
    canvasRef,
    offset,
    scale,
    getPortPosition,
    setLightningEffects,
    setShakingNodes,
    onConnectionDropOnEmpty,
    addNode,
}: UseConnectionLogicProps) => {
    const {
        nodes,
        connections,
        setNodesWithHistory,
        setConnectionsWithHistory
    } = useNodeGraph();

    const [draggingConnection, setDraggingConnection] = useState<{
        sourceNodeId: string;
        sourcePort: string;
        currentPos: { x: number; y: number };
    } | null>(null);
    const draggingConnectionRef = useRef<{
        sourceNodeId: string;
        sourcePort: string;
        currentPos: { x: number; y: number };
    } | null>(null);
    const completeConnectionRef = useRef<((targetNodeId: string, targetPort: string, overrideSource?: { nodeId: string, portId: string }) => void) | null>(null);

    useEffect(() => {
        draggingConnectionRef.current = draggingConnection;
    }, [draggingConnection]);

    const maybeGetAutoCreateAction = useCallback((sourceNodeId: string, sourcePortId: string) => {
        const hasAnyConnectionOnSourcePort = connections.some((connection) => (
            (connection.sourceNodeId === sourceNodeId && connection.sourcePort === sourcePortId) ||
            (connection.targetNodeId === sourceNodeId && connection.targetPort === sourcePortId)
        ));
        if (hasAnyConnectionOnSourcePort) {
            return null;
        }

        const sourceNode = nodes.find((node) => node.id === sourceNodeId);
        const action = getAutoCreateAction(sourceNode, sourcePortId);
        const hasDuplicateAutoCreate = hasExistingConnectionForAutoCreate(
            connections,
            nodes,
            sourceNodeId,
            sourcePortId,
            action
        );
        if (hasDuplicateAutoCreate) {
            return null;
        }
        return action;
    }, [connections, nodes]);

    const executeAutoCreateAction = useCallback((
        action: AutoCreateRule,
        sourceNodeId: string,
        sourcePortId: string,
        clientX: number,
        clientY: number
    ): boolean => {
        if (!canvasRef.current) {
            return false;
        }

        const sourceNode = nodes.find((node) => node.id === sourceNodeId);
        if (!sourceNode) {
            return false;
        }

        const rect = canvasRef.current.getBoundingClientRect();
        const graphDropPosition = {
            x: (clientX - rect.left - offset.x) / scale,
            y: (clientY - rect.top - offset.y) / scale,
        };
        const positionHint = {
            x: graphDropPosition.x + (action.layoutHint?.xOffset ?? 0),
            y: graphDropPosition.y + (action.layoutHint?.yOffset ?? 0),
        };
        const autoCreatedPosition = computeNodePosition(nodes, action.createNodeType, positionHint);

        const clonedRuleData: Partial<NodeData['data']> = action.createNodeData
            ? JSON.parse(JSON.stringify(action.createNodeData)) as Partial<NodeData['data']>
            : {};
        const initialData: Partial<NodeData['data']> = {
            ...clonedRuleData,
            autoCreateSource: {
                nodeId: sourceNodeId,
                portId: sourcePortId,
                ruleId: action.id,
            },
        };

        const initialConnections: Array<{
            sourceNodeId?: string;
            sourcePort: string;
            targetNodeId?: string;
            targetPort: string;
        }> = [];

        if (action.createTargetPortId) {
            const virtualTargetNode: NodeData = {
                id: '__auto-create-preview__',
                type: action.createNodeType,
                position: autoCreatedPosition,
                data: {
                    ...getInitialDataForNode(action.createNodeType),
                    ...initialData,
                },
            };
            const connectionRule = canConnect(
                sourceNode,
                sourcePortId,
                virtualTargetNode,
                action.createTargetPortId
            );
            if (!connectionRule.allow) {
                return false;
            }
            initialConnections.push({
                sourceNodeId,
                sourcePort: sourcePortId,
                targetPort: action.createTargetPortId,
            });
        }

        const createdNodeId = addNode(action.createNodeType, autoCreatedPosition, {
            editorOrigin: sourceNode.data.editorOrigin ?? 'nodes',
            initialData,
            initialConnections: initialConnections.length > 0 ? initialConnections : undefined,
        });

        return Boolean(createdNodeId);
    }, [addNode, canvasRef, nodes, offset.x, offset.y, scale]);

    // Start connection dragging
    const startConnection = useCallback((nodeId: string, port: string, position: { x: number; y: number }) => {
        if (!canvasRef.current) {
            return;
        }
        const rect = canvasRef.current.getBoundingClientRect();

        const newDragging = {
            sourceNodeId: nodeId,
            sourcePort: port,
            // Convert viewport position to canvas space
            currentPos: {
                x: position.x - rect.left,
                y: position.y - rect.top,
            },
        };
        setDraggingConnection(newDragging);
    }, [canvasRef]);

    // Global listener for Dragging Connection (Robust)
    useEffect(() => {
        if (!draggingConnection) return;

        const updateDragPosition = (clientX: number, clientY: number) => {
            if (!canvasRef.current) return;
            const rect = canvasRef.current.getBoundingClientRect();
            setDraggingConnection(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    currentPos: {
                        x: clientX - rect.left,
                        y: clientY - rect.top,
                    }
                };
            });
        };

        const handleWindowPointerMove = (e: PointerEvent) => {
            updateDragPosition(e.clientX, e.clientY);
        };

        const handleWindowMouseMove = (e: MouseEvent) => {
            updateDragPosition(e.clientX, e.clientY);
        };

        const completeConnectionFromPoint = (clientX: number, clientY: number): boolean => {
            const active = draggingConnectionRef.current;
            if (!active) return false;
            const target = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
            const portTarget = target?.closest('[data-node-id][data-port-id]') as HTMLElement | null;
            const nodeId = portTarget?.dataset.nodeId;
            const portId = portTarget?.dataset.portId;
            if (!nodeId || !portId) return false;
            completeConnectionRef.current?.(nodeId, portId, {
                nodeId: active.sourceNodeId,
                portId: active.sourcePort,
            });
            setDraggingConnection(null);
            draggingConnectionRef.current = null;
            return true;
        };

        const handleDropOnEmpty = (clientX: number, clientY: number) => {
            const active = draggingConnectionRef.current;
            if (!active) {
                return;
            }

            const autoCreateAction = maybeGetAutoCreateAction(active.sourceNodeId, active.sourcePort);
            const hasAutoCreatedNode = autoCreateAction
                ? executeAutoCreateAction(
                    autoCreateAction,
                    active.sourceNodeId,
                    active.sourcePort,
                    clientX,
                    clientY
                )
                : false;

            if (!hasAutoCreatedNode && canvasRef.current) {
                const rect = canvasRef.current.getBoundingClientRect();
                onConnectionDropOnEmpty?.({
                    clientX: clientX - rect.left,
                    clientY: clientY - rect.top,
                    sourceNodeId: active.sourceNodeId,
                    sourcePortId: active.sourcePort,
                });
            }
        };

        const handleWindowPointerUp = (e: PointerEvent) => {
            if (completeConnectionFromPoint(e.clientX, e.clientY)) {
                return;
            }
            handleDropOnEmpty(e.clientX, e.clientY);
            setDraggingConnection(null);
            draggingConnectionRef.current = null;
        };

        const handleWindowPointerCancel = () => {
            setDraggingConnection(null);
            draggingConnectionRef.current = null;
        };

        const handleWindowMouseUp = (e: MouseEvent) => {
            if (completeConnectionFromPoint(e.clientX, e.clientY)) {
                return;
            }
            handleDropOnEmpty(e.clientX, e.clientY);
            setDraggingConnection(null);
            draggingConnectionRef.current = null;
        };

        window.addEventListener('pointermove', handleWindowPointerMove);
        window.addEventListener('pointerup', handleWindowPointerUp);
        window.addEventListener('pointercancel', handleWindowPointerCancel);
        window.addEventListener('mousemove', handleWindowMouseMove);
        window.addEventListener('mouseup', handleWindowMouseUp);

        return () => {
            window.removeEventListener('pointermove', handleWindowPointerMove);
            window.removeEventListener('pointerup', handleWindowPointerUp);
            window.removeEventListener('pointercancel', handleWindowPointerCancel);
            window.removeEventListener('mousemove', handleWindowMouseMove);
            window.removeEventListener('mouseup', handleWindowMouseUp);
        };
    }, [
        draggingConnection?.sourceNodeId,
        draggingConnection?.sourcePort,
        canvasRef,
        onConnectionDropOnEmpty,
        maybeGetAutoCreateAction,
        executeAutoCreateAction,
    ]);

    // Function strictly for cleaning up or manual updates if needed
    const updateConnectionDrag = useCallback(() => {
        // No-op: handled by useEffect
    }, []);

    // Complete connection
    const completeConnection = useCallback((targetNodeId: string, targetPort: string, overrideSource?: { nodeId: string, portId: string }) => {
        // 1. Determine Source
        const source = overrideSource
            ? overrideSource
            : (draggingConnection ? { nodeId: draggingConnection.sourceNodeId, portId: draggingConnection.sourcePort } : null);

        if (!source) return;

        const sourceNodeForDirection = nodes.find((node) => node.id === source.nodeId);
        const targetNodeForDirection = nodes.find((node) => node.id === targetNodeId);
        const sourceIsWidgetWindowFallbackInput =
            sourceNodeForDirection?.type === 'widget-window' && source.portId === 'input-1';
        const targetIsWidgetWindowFallbackInput =
            targetNodeForDirection?.type === 'widget-window' && targetPort === 'input-1';

        // 2. Resolve Port Types (Input vs Output) using robust utility
        const sourceIsInput =
            isInputPort(nodes, source.nodeId, source.portId) || sourceIsWidgetWindowFallbackInput;
        const targetIsInput =
            isInputPort(nodes, targetNodeId, targetPort) || targetIsWidgetWindowFallbackInput;

        // 3. Validation: Prevent Input-Input or Output-Output
        if (sourceIsInput === targetIsInput) {
            if (!overrideSource) setDraggingConnection(null);
            return;
        }

        // 4. Normalize Direction: Always Output -> Input
        let finalSourceId = source.nodeId;
        let finalSourcePort = source.portId;
        let finalTargetId = targetNodeId;
        let finalTargetPort = targetPort;

        if (sourceIsInput && !targetIsInput) {
            // Swap to ensure Source is Output
            finalSourceId = targetNodeId;
            finalSourcePort = targetPort;
            finalTargetId = source.nodeId;
            finalTargetPort = source.portId;
        }

        // 5. Duplicate Check
        const exists = connections.some(c =>
            c.sourceNodeId === finalSourceId && c.targetNodeId === finalTargetId &&
            c.sourcePort === finalSourcePort && c.targetPort === finalTargetPort
        );

        if (exists) {
            if (!overrideSource) setDraggingConnection(null);
            return;
        }

        const finalSourceNode = nodes.find((node) => node.id === finalSourceId);
        const finalTargetNode = nodes.find((node) => node.id === finalTargetId);
        const connectionRule = canConnect(
            finalSourceNode,
            finalSourcePort,
            finalTargetNode,
            finalTargetPort
        );
        if (!connectionRule.allow) {
            if (!overrideSource) setDraggingConnection(null);
            return;
        }

        // 6. Create Connection
        const newConnection: Connection = {
            id: `conn-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            sourceNodeId: finalSourceId,
            targetNodeId: finalTargetId,
            sourcePort: finalSourcePort,
            targetPort: finalTargetPort,
        };

        setConnectionsWithHistory((prev) => [...prev, newConnection]);

        // Clear dragging state only if we were dragging
        if (!overrideSource) setDraggingConnection(null);

        // Auto-add input port for layers-to-widget node
        const targetNode = nodes.find(n => n.id === finalTargetId);
        if (targetNode && targetNode.type === 'layer-bridge') {
            setNodesWithHistory((prevNodes) => prevNodes.map(node => {
                if (node.id === finalTargetId) {
                    const currentInputs = node.data.inputs || [];
                    const inputCount = currentInputs.length + 1;
                    const newInput = {
                        id: `input-layers-${Date.now()}`,
                        label: `Layers ${inputCount}`
                    };
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            inputs: [...currentInputs, newInput]
                        }
                    };
                }
                return node;
            }));
        }

        // Auto-add input for layer-source
        if (targetNode && targetNode.type === 'layer-source') {
            const currentInputs = targetNode.data.inputs || [];
            const isConnectingToLastInput = currentInputs[currentInputs.length - 1]?.id === finalTargetPort;

            if (isConnectingToLastInput) {
                setNodesWithHistory((prevNodes) => prevNodes.map(node => {
                    if (node.id === finalTargetId) {
                        const inputs = node.data.inputs || [];
                        const newInput = {
                            id: `input-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                            label: `Layer ${inputs.length + 1}`
                        };
                        return {
                            ...node,
                            data: {
                                ...node.data,
                                inputs: [...inputs, newInput]
                            }
                        };
                    }
                    return node;
                }));
            }
        }

        // Trigger Lightning Effect
        const sourcePos = getPortPosition(source.nodeId, source.portId);
        const targetPos = getPortPosition(targetNodeId, targetPort);

        if (sourcePos && targetPos) {
            const newLightning = {
                id: `lightning-${Date.now()}`,
                source: sourcePos,
                target: targetPos,
            };
            setLightningEffects((prev) => [...prev, newLightning]);

            // Cleanup lightning
            setTimeout(() => {
                setLightningEffects((prev) => prev.filter(l => l.id !== newLightning.id));
            }, 500);
        }
    }, [draggingConnection, getPortPosition, nodes, connections, setConnectionsWithHistory, setNodesWithHistory, setLightningEffects, setShakingNodes]);

    useEffect(() => {
        completeConnectionRef.current = completeConnection;
    }, [completeConnection]);

    // Delete connection
    const deleteConnection = useCallback((connectionId: string) => {
        setConnectionsWithHistory((prev) => prev.filter((conn) => conn.id !== connectionId));
    }, [setConnectionsWithHistory]);

    // Cancel connection
    const cancelConnection = useCallback(() => {
        setDraggingConnection(null);
    }, []);

    return {
        draggingConnection,
        startConnection,
        completeConnection,
        deleteConnection,
        cancelConnection,
        updateConnectionDrag
    };
};
