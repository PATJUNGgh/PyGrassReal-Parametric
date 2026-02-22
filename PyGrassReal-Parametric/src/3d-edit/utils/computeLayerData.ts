import type { Connection, NodeData, Port } from '../types/NodeTypes';

const NODE_TYPE_LAYER_BRIDGE: NodeData['type'] = 'layer-bridge';
const NODE_TYPE_LAYER_SOURCE: NodeData['type'] = 'layer-source';
const NODE_TYPE_LAYER_VIEW: NodeData['type'] = 'layer-view';
const MAX_NESTED_LAYER_DEPTH = 10;

export interface LayerInputData {
    id: string;
    portId: string;
    label: string;
    nodeId: string;
    depth?: number;
    parentId?: string;
    isSubLayer?: boolean;
    treePrefix?: string;
    objectType?: string;
    objectLabel?: string;
    objectNodeType?: string;
}

const resolveOutputType = (node: NodeData, portId?: string): string | undefined => {
    const outputs = (node.data?.outputs || []) as Port[];
    const port = portId ? outputs.find((output) => output.id === portId) : outputs[0];
    if (port?.type) return port.type;
    if (port?.label) return port.label;
    return node.type;
};

const getLayerBridgeIdsConnectedToViewNode = (
    viewNodeId: string,
    nodeById: Map<string, NodeData>,
    connections: Connection[]
): Set<string> => {
    const connectedBridgeIds = new Set<string>();

    for (const connection of connections) {
        if (connection.sourceNodeId === viewNodeId) {
            const targetNode = nodeById.get(connection.targetNodeId);
            if (targetNode?.type === NODE_TYPE_LAYER_BRIDGE) {
                connectedBridgeIds.add(targetNode.id);
            }
            continue;
        }

        if (connection.targetNodeId === viewNodeId) {
            const sourceNode = nodeById.get(connection.sourceNodeId);
            if (sourceNode?.type === NODE_TYPE_LAYER_BRIDGE) {
                connectedBridgeIds.add(sourceNode.id);
            }
        }
    }

    return connectedBridgeIds;
};

const collectNestedSubLayers = (
    sourceNodeId: string,
    nodeById: Map<string, NodeData>,
    connectionsByTargetNodeId: Map<string, Connection[]>,
    depth: number = 1,
    visited: Set<string> = new Set(),
    parentId?: string
): LayerInputData[] => {
    if (depth > MAX_NESTED_LAYER_DEPTH || visited.has(sourceNodeId)) {
        return [];
    }

    const sourceNode = nodeById.get(sourceNodeId);
    if (!sourceNode || sourceNode.type !== NODE_TYPE_LAYER_SOURCE) {
        return [];
    }

    const sourceInputs = (sourceNode.data?.inputs || []) as Port[];
    const nextVisited = new Set(visited);
    nextVisited.add(sourceNodeId);

    return sourceInputs.flatMap((subInput): LayerInputData[] => {
        const childConnection = (connectionsByTargetNodeId.get(sourceNode.id) || []).find(
            (connection) => connection.targetPort === subInput.id
        );
        const childNode = childConnection ? nodeById.get(childConnection.sourceNodeId) : undefined;
        const childType = childNode ? resolveOutputType(childNode, childConnection?.sourcePort) : undefined;
        const childLabel = childNode ? (childNode.data?.customName || childNode.type) : undefined;

        const layerId = `${sourceNode.id}_${subInput.id}`;
        const currentLayer: LayerInputData = {
            id: layerId,
            portId: subInput.id,
            label: subInput.label,
            nodeId: sourceNode.id,
            depth,
            parentId,
            isSubLayer: true,
            objectType: childType,
            objectLabel: childLabel,
            objectNodeType: childNode?.type,
        };

        const nestedLayers = childNode?.type === NODE_TYPE_LAYER_SOURCE
            ? collectNestedSubLayers(
                childNode.id,
                nodeById,
                connectionsByTargetNodeId,
                depth + 1,
                nextVisited,
                layerId
            )
            : [];

        return [currentLayer, ...nestedLayers];
    });
};

export const computeLayersFromViewNode = (
    viewNodeId: string,
    nodes: NodeData[],
    connections: Connection[]
): LayerInputData[] => {
    if (!viewNodeId || nodes.length === 0) {
        return [];
    }

    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const viewNode = nodeById.get(viewNodeId);
    if (!viewNode || viewNode.type !== NODE_TYPE_LAYER_VIEW) {
        return [];
    }

    const connectionsByTargetNodeId = new Map<string, Connection[]>();
    for (const connection of connections) {
        const currentList = connectionsByTargetNodeId.get(connection.targetNodeId);
        if (currentList) {
            currentList.push(connection);
        } else {
            connectionsByTargetNodeId.set(connection.targetNodeId, [connection]);
        }
    }

    const connectedBridgeIds = getLayerBridgeIdsConnectedToViewNode(viewNodeId, nodeById, connections);
    const layerBridgeNodes = nodes.filter((node) => {
        if (node.type !== NODE_TYPE_LAYER_BRIDGE) return false;
        return connectedBridgeIds.size === 0 || connectedBridgeIds.has(node.id);
    });

    return layerBridgeNodes.flatMap((layerBridgeNode) => {
        const inputs = (layerBridgeNode.data?.inputs || []) as Port[];

        return inputs.flatMap((input): LayerInputData[] => {
            const layerConnection = (connectionsByTargetNodeId.get(layerBridgeNode.id) || []).find(
                (connection) => connection.targetPort === input.id
            );
            const connectedNode = layerConnection ? nodeById.get(layerConnection.sourceNodeId) : undefined;
            const connectedType = connectedNode ? resolveOutputType(connectedNode, layerConnection?.sourcePort) : undefined;
            const connectedLabel = connectedNode ? (connectedNode.data?.customName || connectedNode.type) : undefined;

            const mainLayerId = `${layerBridgeNode.id}_${input.id}`;
            const mainLayer: LayerInputData = {
                id: mainLayerId,
                portId: input.id,
                label: input.label,
                nodeId: layerBridgeNode.id,
                depth: 0,
                objectType: connectedType,
                objectLabel: connectedLabel,
                objectNodeType: connectedNode?.type,
            };

            const nestedSubLayers = connectedNode?.type === NODE_TYPE_LAYER_SOURCE
                ? collectNestedSubLayers(
                    connectedNode.id,
                    nodeById,
                    connectionsByTargetNodeId,
                    1,
                    new Set(),
                    mainLayerId
                )
                : [];

            return [mainLayer, ...nestedSubLayers];
        });
    });
};
