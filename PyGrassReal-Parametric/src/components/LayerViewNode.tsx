import React, { useCallback, useMemo } from 'react';
import { CustomNode } from './CustomNode';
import { useLayerStore } from '../hooks/useLayerStore';
import type { NodeData, Connection, Port } from '../types/NodeTypes';

const NODE_TYPE_LAYER_BRIDGE = 'layer-bridge';
const NODE_TYPE_LAYER_SOURCE = 'layer-source'; // Updated from NODE_TYPE_LAYER_WIDGET

interface LayerInputData {
    id: string; // Unique ID for React key, e.g., "nodeId_portId"
    portId: string; // The actual ID of the port
    label: string;
    nodeId: string;
    parentId?: string;
    isSubLayer?: boolean;
    treePrefix?: string;
    objectType?: string;
    objectLabel?: string;
    objectNodeType?: string;
}

export interface LayerViewNodeData {
    layersData: LayerInputData[];
    showLayerPanel: boolean;
    hideLayerPanelToolbar: boolean;
    hideLayerPanelCheckboxes: boolean;
    hideLayerPanelIcons: boolean;
    onLayerRename: (layerId: string, newName: string) => void;
}


interface LayerViewNodeProps { // Updated interface name
    id: string;
    data: LayerViewNodeData; // Use the new interface
    position: { x: number; y: number };
    selected: boolean;
    connections: Connection[];
    nodes: NodeData[];
    onPositionChange: (id: string, position: { x: number; y: number }) => void;
    onDataChange: (id: string, data: Partial<NodeData['data']>) => void; // Update data type here too
    onDelete: (id: string) => void;
    onSelect?: () => void;
    scale?: number;
    onConnectionStart: (nodeId: string, portId: string, position: { x: number; y: number }) => void;
    onConnectionComplete: (nodeId: string, portId: string) => void;
    onDeleteConnection?: (connectionId: string) => void;
    isShaking?: boolean;
    onCluster?: (nodeId: string) => void;
    parentGroupId?: string;
    overlappingGroupId?: string;
    onJoinGroup?: (nodeId: string, groupId: string) => void;
    onLeaveGroup?: (nodeId: string) => void;
    isInfected?: boolean;
    onDuplicate?: (id: string) => void;
    interactionMode?: 'node' | '3d' | 'wire';
}

export const LayerViewNode: React.FC<LayerViewNodeProps> = ({ // Updated component name
    id,
    data,
    onDataChange,
    nodes,
    connections,
    ...props
}) => {
    const { } = useLayerStore();

    const resolveOutputType = (node: NodeData, portId?: string): string | undefined => {
        const outputs = (node.data?.outputs || []) as Port[];
        const port = portId ? outputs.find((out) => out.id === portId) : outputs[0];
        if (port?.type) return port.type;
        if (port?.label) return port.label;
        return node.type;
    };

    // Recursive function to get all nested sub-layers from connected Layers nodes
    const getNestedSubLayers = useCallback((
        nodeId: string,
        inputId: string,
        depth: number = 0,
        parentPrefix: string = ''
    ): LayerInputData[] => {
        if (!nodes || !connections || depth > 10) return []; // Prevent infinite recursion

        // Find the connection to this input
        const connection = connections.find(conn =>
            conn.targetNodeId === nodeId && conn.targetPort === inputId
        );

        if (!connection) return [];

        // Find the source node
        const sourceNode = nodes.find(n => n.id === connection.sourceNodeId);
        if (!sourceNode || sourceNode.type !== NODE_TYPE_LAYER_SOURCE) return []; // Updated type check

        // Get inputs from the source Layers node
        const sourceInputs = (sourceNode.data?.inputs || []) as Port[];

        // Process each input recursively
        return sourceInputs.flatMap((subInput, index): LayerInputData[] => {
            const isLastItem = index === sourceInputs.length - 1;

            // Build tree line prefix
            const connector = isLastItem ? '└── ' : '├── ';
            const continuation = isLastItem ? '    ' : '│   ';
            const currentPrefix = parentPrefix + connector;
            const nextPrefix = parentPrefix + continuation;

            const childConnection = connections.find(conn =>
                conn.targetNodeId === sourceNode.id && conn.targetPort === subInput.id
            );
            const childNode = childConnection ? nodes.find(n => n.id === childConnection.sourceNodeId) : null;
            const childType = childNode ? resolveOutputType(childNode, childConnection?.sourcePort) : undefined;
            const childLabel = childNode ? (childNode.data?.customName || childNode.type) : undefined;

            const currentLayer: LayerInputData = {
                id: `${sourceNode.id}_${subInput.id}`, // Stable unique ID
                portId: subInput.id, // Original port ID
                label: subInput.label, // Label without tree prefix
                nodeId: sourceNode.id,
                parentId: inputId,
                isSubLayer: true,
                treePrefix: currentPrefix, // Store tree prefix separately
                objectType: childNode ? childType : undefined,
                objectLabel: childLabel,
                objectNodeType: childNode?.type,
            };

            // Recursively get nested sub-layers
            const nestedLayers = childNode && childNode.type === NODE_TYPE_LAYER_SOURCE
                ? getNestedSubLayers(
                    childNode.id,
                    subInput.id,
                    depth + 1,
                    nextPrefix
                )
                : [];

            return [currentLayer, ...nestedLayers];
        });
    }, [nodes, connections]);

    // ดึงข้อมูลจาก 'layer-bridge' nodes ทั้งหมด พร้อม nested sub-layers
    const layersToWidgetInputs = useMemo(() => {
        if (!nodes || !connections) return [];

        const layersToWidgetNodes = nodes.filter(n => n.type === NODE_TYPE_LAYER_BRIDGE);

        return layersToWidgetNodes.flatMap(layersToWidgetNode => {
            const inputs = layersToWidgetNode.data?.inputs || [];

            return inputs.flatMap((input: Port): LayerInputData[] => {
                const layerConnection = connections.find(conn =>
                    conn.targetNodeId === layersToWidgetNode.id && conn.targetPort === input.id
                );
                const connectedNode = layerConnection ? nodes.find(n => n.id === layerConnection.sourceNodeId) : null;
                const connectedType = connectedNode ? resolveOutputType(connectedNode, layerConnection?.sourcePort) : undefined;
                const connectedLabel = connectedNode ? (connectedNode.data?.customName || connectedNode.type) : undefined;
                const mainLayer: LayerInputData = {
                    id: `${layersToWidgetNode.id}_${input.id}`, // Stable unique ID
                    portId: input.id, // Original port ID
                    label: input.label,
                    nodeId: layersToWidgetNode.id,
                    objectType: connectedNode ? connectedType : undefined,
                    objectLabel: connectedLabel,
                    objectNodeType: connectedNode?.type,
                };

                // Get all nested sub-layers recursively
                const nestedSubLayers = getNestedSubLayers(layersToWidgetNode.id, input.id, 0);

                return [mainLayer, ...nestedSubLayers];
            });
        });
    }, [nodes, connections, getNestedSubLayers]);

    // จัดการการเปลี่ยนชื่อ layer
    const handleRenameLayer = useCallback((layerId: string, newName: string) => {
        const cleanName = newName.trim();
        if (!cleanName || !nodes) return;

        // Find the layer's metadata from the generated list
        const layerInfo = layersToWidgetInputs.find(l => l.id === layerId);
        if (!layerInfo) {
            console.error(`[LayerViewNode] Could not find layer info for ID: ${layerId}`); // Updated log
            return;
        }

        // Find the node that needs to be updated
        const nodeToUpdate = nodes.find(node => node.id === layerInfo.nodeId);
        if (!nodeToUpdate) {
            console.error(`[LayerViewNode] Could not find node with ID: ${layerInfo.nodeId}`); // Updated log
            return;
        }

        // Update the label on the correct port (input)
        const originalInputs = nodeToUpdate.data?.inputs || [];
        let found = false;
        const updatedInputs = originalInputs.map((input: Port) => {
            if (input.id === layerInfo.portId) {
                found = true;
                return { ...input, label: cleanName };
            }
            return input;
        });

        // If the port wasn't found, something is out of sync.
        if (!found) {
            console.warn(`[LayerViewNode] Port ID "${layerInfo.portId}" not found on node "${layerInfo.nodeId}".`); // Updated log
            return;
        }

        onDataChange(nodeToUpdate.id, {
            ...nodeToUpdate.data,
            inputs: updatedInputs,
        });

    }, [nodes, onDataChange, layersToWidgetInputs]);

    const enhancedData = {
        ...data,
        width: 300,
        layersData: layersToWidgetInputs,
        showLayerPanel: true,
        hideLayerPanelToolbar: true,  // ซ่อน toolbar
        hideLayerPanelCheckboxes: true,
        hideLayerPanelIcons: true,
        onLayerRename: handleRenameLayer,
        // Hide UI elements
        hideInputs: true,
        hideInputsAdd: true,
        hideOutputs: false,
        hideOutputsHeader: true,
        hideOutputsAdd: true,
        hidePortLabels: true,
        hidePortControls: true,
        hideModifierMenu: true,
        centerOutput: true,
        // Input/Output configuration - place AFTER to override
        inputs: [],
        outputs: [{ id: 'output-all-layer', label: 'Layer View Output', type: 'data' }],
    };

    return (
        <CustomNode
            id={id}
            data={enhancedData}
            onDataChange={onDataChange}
            connections={connections}
            {...props}
        />
    );
};
