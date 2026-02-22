import { useState, useEffect, useCallback, useRef } from 'react';
import type { Connection, NodeData } from '../types/NodeTypes';
import { isInputPort } from '../utils/nodeUtils';
import { useNodeGraph } from '../context/NodeGraphContext';
import {
    INSPECTOR_OUTPUT_SOURCE_NODE_TYPE,
    INSPECTOR_OUTPUT_SOURCE_PORT,
    INSPECTOR_OUTPUT_WHITELIST_SET,
    NUMBER_SLIDER_OUTPUT_SOURCE_NODE_TYPE,
    NUMBER_SLIDER_OUTPUT_SOURCE_PORT,
    NUMBER_SLIDER_OUTPUT_WHITELIST_SET,
    TEXT_ON_MESH_OUTPUT_SOURCE_NODE_TYPE,
    TEXT_ON_MESH_OUTPUT_SOURCE_PORT,
    TEXT_ON_MESH_OUTPUT_WHITELIST_SET,
    AI_ASSISTANT_OUTPUT_SOURCE_NODE_TYPE,
    AI_ASSISTANT_OUTPUT_SOURCE_PORT,
    AI_ASSISTANT_OUTPUT_WHITELIST_SET,
    PROMPT_NODE_OUTPUT_SOURCE_NODE_TYPE,
    PROMPT_NODE_OUTPUT_SOURCE_PORT,
    PROMPT_NODE_OUTPUT_TARGET_WHITELIST_SET,
    BACKGROUND_NODE_OUTPUT_SOURCE_NODE_TYPE,
    BACKGROUND_NODE_OUTPUT_SOURCE_PORT,
    BACKGROUND_NODE_OUTPUT_TARGET_WHITELIST_SET,
    LAYER_BRIDGE_INPUT_WHITELIST_SET,
    isLayerBridgeInputPort,
    VIEWPORT_NODE_OUTPUT_SOURCE_NODE_TYPE,
    VIEWPORT_NODE_OUTPUT_SOURCE_PORT,
    VIEWPORT_NODE_OUTPUT_TARGET_WHITELIST_SET
} from '../utils/canvasUtils';

const MESH_BOOLEAN_INPUT_WHITELIST = new Set<NodeData['type']>([
    'box',
    'sphere',
    'cone',
    'cylinder',
    'mesh-union',
    'mesh-difference',
    'mesh-intersection',
]);
const AI_MESH_INPUT_WHITELIST = new Set<NodeData['type']>([
    'box',
    'sphere',
    'cone',
    'cylinder',
    'mesh-union',
    'mesh-difference',
    'mesh-intersection',
]);
const MODEL_MATERIAL_INPUT_WHITELIST = new Set<NodeData['type']>([
    'box',
    'sphere',
    'cone',
    'cylinder',
    'mesh-union',
    'mesh-difference',
    'mesh-intersection',
]);
const MESH_BOOLEAN_SMOOTHNESS_NODE_TYPES = new Set<NodeData['type']>([
    'mesh-union',
    'mesh-difference',
    'mesh-intersection',
]);
const TRANSFORM_MATRIX_OUTPUT_WHITELIST = new Set<NodeData['type']>([
    'box',
    'sphere',
    'cone',
    'cylinder',
    'build-3d-ai',
]);
const AI_MESH_OUTPUT_SOURCE_NODE_TYPES = new Set<NodeData['type']>(['ai-paint', 'ai-sculpt']);
const AI_MESH_OUTPUT_SOURCE_PORT = 'output-mesh';
const AI_MESH_OUTPUT_BASE_TARGET_WHITELIST = new Set<NodeData['type']>([
    'mesh-union',
    'mesh-difference',
    'mesh-intersection',
    'layer-source',
    'panel',
]);
const AI_MESH_OUTPUT_AI_TARGET_WHITELIST = new Set<NodeData['type']>(['ai-sculpt', 'ai-paint']);
const LAYER_SOURCE_OUTPUT_TARGET_WHITELIST = new Set<NodeData['type']>(['layer-bridge', 'panel']);
const MESH_BOOLEAN_OUTPUT_SOURCE_NODE_TYPES = new Set<NodeData['type']>([
    'mesh-union',
    'mesh-difference',
    'mesh-intersection',
]);
const MESH_BOOLEAN_OUTPUT_SOURCE_PORT = 'R';
const MESH_BOOLEAN_OUTPUT_TARGET_WHITELIST = new Set<NodeData['type']>([
    'ai-sculpt',
    'ai-paint',
    'model-material',
    'mesh-union',
    'mesh-difference',
    'mesh-intersection',
    'panel',
    'layer-source',
]);
const TEXT_DATA_OUTPUT_SOURCE_NODE_TYPE: NodeData['type'] = 'node-prompt';
const TEXT_DATA_OUTPUT_SOURCE_PORT = 'output-prompt';
const TEXT_DATA_OUTPUT_TARGET_WHITELIST = new Set<NodeData['type']>(['panel', 'layer-source']);

const isAllowedAiMeshOutputTargetType = (
    sourceNodeType: NodeData['type'] | undefined,
    targetNodeType: NodeData['type'] | undefined
): boolean => {
    if (!targetNodeType) {
        return false;
    }
    if (AI_MESH_OUTPUT_BASE_TARGET_WHITELIST.has(targetNodeType)) {
        return true;
    }
    const isAiMeshOutputSourceType = sourceNodeType === 'ai-sculpt' || sourceNodeType === 'ai-paint';
    return isAiMeshOutputSourceType && AI_MESH_OUTPUT_AI_TARGET_WHITELIST.has(targetNodeType);
};
const AI_MASK_TARGET_NODE_TYPES = new Set<NodeData['type']>(['ai-paint', 'ai-sculpt']);
const AI_MASK_TARGET_INPUT_PORT = 'input-mask';
const AI_MASK_ALLOWED_SOURCE_NODE_TYPE: NodeData['type'] = 'vertex-mask';

const isMeshBooleanInputPort = (nodeType: NodeData['type'] | undefined, portId: string) => {
    if (nodeType === 'mesh-union') {
        return portId === 'M';
    }
    if (nodeType === 'mesh-difference' || nodeType === 'mesh-intersection') {
        return portId === 'A' || portId === 'B';
    }
    return false;
};

const getMeshBooleanInputAllowedSourceNodeType = (
    nodeType: NodeData['type'] | undefined,
    portId: string
): NodeData['type'] | null => {
    if (nodeType && portId === 'S' && MESH_BOOLEAN_SMOOTHNESS_NODE_TYPES.has(nodeType)) {
        return 'number-slider';
    }
    if (nodeType === 'mesh-difference' && portId === 'showMeshesB') {
        return 'boolean-toggle';
    }
    if (nodeType === 'mesh-intersection' && portId === 'showMeshesAB') {
        return 'boolean-toggle';
    }
    return null;
};

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
}

export const useConnectionLogic = ({
    canvasRef,
    getPortPosition,
    setLightningEffects,
    setShakingNodes,
    onConnectionDropOnEmpty,
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

        const handleWindowPointerUp = (e: PointerEvent) => {
            if (completeConnectionFromPoint(e.clientX, e.clientY)) {
                return;
            }
            // Cancel connection if dropped on nothing
            const active = draggingConnectionRef.current;
            if (active) {
                onConnectionDropOnEmpty?.({
                    clientX: e.clientX,
                    clientY: e.clientY,
                    sourceNodeId: active.sourceNodeId,
                    sourcePortId: active.sourcePort,
                });
            }
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
            // Cancel connection if dropped on nothing
            const active = draggingConnectionRef.current;
            if (active) {
                onConnectionDropOnEmpty?.({
                    clientX: e.clientX,
                    clientY: e.clientY,
                    sourceNodeId: active.sourceNodeId,
                    sourcePortId: active.sourcePort,
                });
            }
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
    }, [draggingConnection?.sourceNodeId, draggingConnection?.sourcePort, canvasRef, onConnectionDropOnEmpty]);

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
        const isLayerSourceOutput =
            finalSourceNode?.type === 'layer-source' &&
            !isInputPort(nodes, finalSourceId, finalSourcePort);
        const isMeshBooleanOutput =
            !!finalSourceNode &&
            MESH_BOOLEAN_OUTPUT_SOURCE_NODE_TYPES.has(finalSourceNode.type) &&
            finalSourcePort === MESH_BOOLEAN_OUTPUT_SOURCE_PORT;
        const isTextDataOutput =
            finalSourceNode?.type === TEXT_DATA_OUTPUT_SOURCE_NODE_TYPE &&
            finalSourcePort === TEXT_DATA_OUTPUT_SOURCE_PORT;
        const isPromptOutput =
            finalSourceNode?.type === PROMPT_NODE_OUTPUT_SOURCE_NODE_TYPE &&
            finalSourcePort === PROMPT_NODE_OUTPUT_SOURCE_PORT;
        const isBackgroundColorOutput =
            finalSourceNode?.type === BACKGROUND_NODE_OUTPUT_SOURCE_NODE_TYPE &&
            finalSourcePort === BACKGROUND_NODE_OUTPUT_SOURCE_PORT;
        const isInspectorOutput =
            finalSourceNode?.type === INSPECTOR_OUTPUT_SOURCE_NODE_TYPE &&
            finalSourcePort === INSPECTOR_OUTPUT_SOURCE_PORT;
        const isAiAssistantOutput =
            finalSourceNode?.type === AI_ASSISTANT_OUTPUT_SOURCE_NODE_TYPE &&
            finalSourcePort === AI_ASSISTANT_OUTPUT_SOURCE_PORT;
        const isNumberSliderOutput =
            finalSourceNode?.type === NUMBER_SLIDER_OUTPUT_SOURCE_NODE_TYPE &&
            finalSourcePort === NUMBER_SLIDER_OUTPUT_SOURCE_PORT;
        const isTextOnMeshOutput =
            finalSourceNode?.type === TEXT_ON_MESH_OUTPUT_SOURCE_NODE_TYPE &&
            finalSourcePort === TEXT_ON_MESH_OUTPUT_SOURCE_PORT;
        const isViewportOutput =
            finalSourceNode?.type === VIEWPORT_NODE_OUTPUT_SOURCE_NODE_TYPE &&
            finalSourcePort === VIEWPORT_NODE_OUTPUT_SOURCE_PORT;
        const isModelMaterialInputTarget =
            finalTargetNode?.type === 'model-material' && finalTargetPort === 'in-M';
        const isModelMaterialNameInputTarget =
            finalTargetNode?.type === 'model-material' && finalTargetPort === 'in-N';
        const sourceIsBooleanToggle = finalSourceNode?.type === 'boolean-toggle';
        const sourceIsUnitNode =
            finalSourceNode?.type === 'unit-x' || finalSourceNode?.type === 'unit-y' || finalSourceNode?.type === 'unit-z';
        const isBuild3dScopeTarget =
            finalTargetNode?.type === 'build-3d-ai' && finalTargetPort === 'input-scope';
        const isAiMeshInputTarget =
            !!finalTargetNode &&
            (finalTargetNode.type === 'ai-paint' || finalTargetNode.type === 'ai-sculpt') &&
            finalTargetPort === 'input-mesh';
        const isAiMeshOutputSource =
            !!finalSourceNode &&
            AI_MESH_OUTPUT_SOURCE_NODE_TYPES.has(finalSourceNode.type) &&
            finalSourcePort === AI_MESH_OUTPUT_SOURCE_PORT;
        const isLayerBridgeInputTarget =
            !!finalTargetNode &&
            finalTargetNode.type === 'layer-bridge' &&
            isInputPort(nodes, finalTargetId, finalTargetPort) &&
            isLayerBridgeInputPort(finalTargetPort);

        if (isLayerBridgeInputTarget && (!finalSourceNode || !LAYER_BRIDGE_INPUT_WHITELIST_SET.has(finalSourceNode.type))) {
            if (!overrideSource) setDraggingConnection(null);
            return;
        }

        if (isLayerSourceOutput && (!finalTargetNode || !LAYER_SOURCE_OUTPUT_TARGET_WHITELIST.has(finalTargetNode.type))) {
            if (!overrideSource) setDraggingConnection(null);
            return;
        }

        if (isMeshBooleanOutput && (!finalTargetNode || !MESH_BOOLEAN_OUTPUT_TARGET_WHITELIST.has(finalTargetNode.type))) {
            if (!overrideSource) setDraggingConnection(null);
            return;
        }

        if (isTextDataOutput && (!finalTargetNode || !TEXT_DATA_OUTPUT_TARGET_WHITELIST.has(finalTargetNode.type))) {
            if (!overrideSource) setDraggingConnection(null);
            return;
        }

        if (isPromptOutput && (!finalTargetNode || !PROMPT_NODE_OUTPUT_TARGET_WHITELIST_SET.has(finalTargetNode.type))) {
            if (!overrideSource) setDraggingConnection(null);
            return;
        }

        if (isBackgroundColorOutput && (!finalTargetNode || !BACKGROUND_NODE_OUTPUT_TARGET_WHITELIST_SET.has(finalTargetNode.type))) {
            if (!overrideSource) setDraggingConnection(null);
            return;
        }

        if (isInspectorOutput && (!finalTargetNode || !INSPECTOR_OUTPUT_WHITELIST_SET.has(finalTargetNode.type))) {
            if (!overrideSource) setDraggingConnection(null);
            return;
        }

        if (isAiAssistantOutput && (!finalTargetNode || !AI_ASSISTANT_OUTPUT_WHITELIST_SET.has(finalTargetNode.type))) {
            if (!overrideSource) setDraggingConnection(null);
            return;
        }

        if (isNumberSliderOutput && (!finalTargetNode || !NUMBER_SLIDER_OUTPUT_WHITELIST_SET.has(finalTargetNode.type))) {
            if (!overrideSource) setDraggingConnection(null);
            return;
        }

        if (isTextOnMeshOutput && (!finalTargetNode || !TEXT_ON_MESH_OUTPUT_WHITELIST_SET.has(finalTargetNode.type))) {
            if (!overrideSource) setDraggingConnection(null);
            return;
        }

        if (isViewportOutput && (!finalTargetNode || !VIEWPORT_NODE_OUTPUT_TARGET_WHITELIST_SET.has(finalTargetNode.type))) {
            if (!overrideSource) setDraggingConnection(null);
            return;
        }

        if (isAiMeshOutputSource && !isAllowedAiMeshOutputTargetType(finalSourceNode?.type, finalTargetNode?.type)) {
            if (!overrideSource) setDraggingConnection(null);
            return;
        }

        if (isAiMeshInputTarget && (!finalSourceNode || !AI_MESH_INPUT_WHITELIST.has(finalSourceNode.type))) {
            if (!overrideSource) setDraggingConnection(null);
            return;
        }

        if (isModelMaterialInputTarget && (!finalSourceNode || !MODEL_MATERIAL_INPUT_WHITELIST.has(finalSourceNode.type))) {
            if (!overrideSource) setDraggingConnection(null);
            return;
        }

        if (isModelMaterialNameInputTarget && finalSourceNode?.type !== 'node-prompt') {
            if (!overrideSource) setDraggingConnection(null);
            return;
        }

        if (sourceIsBooleanToggle && finalTargetNode?.type !== 'panel') {
            if (!overrideSource) setDraggingConnection(null);
            return;
        }

        if (sourceIsUnitNode && finalTargetNode?.type !== 'panel') {
            if (!overrideSource) setDraggingConnection(null);
            return;
        }

        if (isBuild3dScopeTarget && finalSourceNode?.type !== 'panel') {
            if (!overrideSource) setDraggingConnection(null);
            return;
        }

        const isVectorXyzVectorOutput =
            finalSourceNode?.type === 'vector-xyz' && finalSourcePort === 'V';
        if (isVectorXyzVectorOutput && finalTargetNode?.type !== 'transform') {
            if (!overrideSource) setDraggingConnection(null);
            return;
        }
        const isTransformMatrixOutput =
            finalSourceNode?.type === 'transform' && finalSourcePort === 'matrix_out';
        if (isTransformMatrixOutput && (!finalTargetNode || !TRANSFORM_MATRIX_OUTPUT_WHITELIST.has(finalTargetNode.type))) {
            if (!overrideSource) setDraggingConnection(null);
            return;
        }
        if (isTransformMatrixOutput && finalTargetPort !== 'input-transform') {
            if (!overrideSource) setDraggingConnection(null);
            return;
        }
        const isAiMaskInputTarget =
            !!finalTargetNode &&
            AI_MASK_TARGET_NODE_TYPES.has(finalTargetNode.type) &&
            finalTargetPort === AI_MASK_TARGET_INPUT_PORT;
        if (isAiMaskInputTarget && finalSourceNode?.type !== AI_MASK_ALLOWED_SOURCE_NODE_TYPE) {
            if (!overrideSource) setDraggingConnection(null);
            return;
        }

        const isAiPlanInputTarget =
            !!finalTargetNode &&
            (finalTargetNode.type === 'ai-paint' || finalTargetNode.type === 'ai-sculpt') &&
            finalTargetPort === 'input-plan';

        if (isAiPlanInputTarget && finalSourceNode?.type !== 'panel') {
            if (!overrideSource) setDraggingConnection(null);
            return;
        }

        const finalSourceIsInputPort = isInputPort(nodes, finalSourceId, finalSourcePort);
        const finalTargetIsInputPort = isInputPort(nodes, finalTargetId, finalTargetPort);
        const sourceIsRestrictedMeshInput =
            finalSourceIsInputPort && isMeshBooleanInputPort(finalSourceNode?.type, finalSourcePort);
        const targetIsRestrictedMeshInput =
            finalTargetIsInputPort && isMeshBooleanInputPort(finalTargetNode?.type, finalTargetPort);

        if (sourceIsRestrictedMeshInput || targetIsRestrictedMeshInput) {
            const peerNodeType = sourceIsRestrictedMeshInput ? finalTargetNode?.type : finalSourceNode?.type;
            if (!peerNodeType || !MESH_BOOLEAN_INPUT_WHITELIST.has(peerNodeType)) {
                if (!overrideSource) setDraggingConnection(null);
                return;
            }
        }

        const sourceAllowedNodeType = finalSourceIsInputPort
            ? getMeshBooleanInputAllowedSourceNodeType(finalSourceNode?.type, finalSourcePort)
            : null;
        const targetAllowedNodeType = finalTargetIsInputPort
            ? getMeshBooleanInputAllowedSourceNodeType(finalTargetNode?.type, finalTargetPort)
            : null;

        if (sourceAllowedNodeType && finalTargetNode?.type !== sourceAllowedNodeType) {
            if (!overrideSource) setDraggingConnection(null);
            return;
        }

        if (targetAllowedNodeType && finalSourceNode?.type !== targetAllowedNodeType) {
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
