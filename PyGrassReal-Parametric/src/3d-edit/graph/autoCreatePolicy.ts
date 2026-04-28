import type { Connection, NodeData, Port } from '../types/NodeTypes';

export interface AutoCreateRule {
    id: string;
    triggerNodeType?: NodeData['type'];
    triggerNodeTypes?: NodeData['type'][];
    triggerPortId?: string;
    triggerPortType?: string;
    requireOutputPort?: boolean;
    createNodeType: NodeData['type'];
    createTargetPortId?: string;
    createNodeData?: Partial<NodeData['data']>;
    layoutHint?: {
        xOffset?: number;
        yOffset?: number;
    };
}

const AUTO_CREATE_RULES: AutoCreateRule[] = [
    {
        id: 'vector-output-components-slider',
        triggerNodeType: 'vector-xyz',
        triggerPortId: 'V',
        requireOutputPort: true,
        createNodeType: 'number-slider',
        createNodeData: {
            customName: 'Vector Components',
            sliders: [
                { id: 'slider-1', value: 0, min: -1, max: 1, step: 0.01 },
                { id: 'slider-2', value: 0, min: -1, max: 1, step: 0.01 },
                { id: 'slider-3', value: 0, min: -1, max: 1, step: 0.01 },
            ],
            value: [0, 0, 0],
        },
        layoutHint: {
            xOffset: 220,
            yOffset: -30,
        },
    },
];

interface PortContext {
    port: Port | undefined;
    isOutputPort: boolean;
}

const resolvePortContext = (sourceNode: NodeData, sourcePortId: string): PortContext => {
    const outputs = sourceNode.data.outputs ?? [];
    const outputPort = outputs.find((port) => port.id === sourcePortId);
    if (outputPort) {
        return { port: outputPort, isOutputPort: true };
    }

    const inputs = sourceNode.data.inputs ?? [];
    const inputPort = inputs.find((port) => port.id === sourcePortId);
    if (inputPort) {
        return { port: inputPort, isOutputPort: false };
    }

    const normalizedPortId = sourcePortId.toLowerCase();
    return {
        port: undefined,
        isOutputPort: normalizedPortId.startsWith('output-') || normalizedPortId.startsWith('out-'),
    };
};

const doesRuleMatchContext = (
    rule: AutoCreateRule,
    sourceNode: NodeData,
    sourcePortId: string,
    sourcePort: Port | undefined,
    isOutputPort: boolean
): boolean => {
    if (rule.triggerNodeType && rule.triggerNodeType !== sourceNode.type) {
        return false;
    }
    if (rule.triggerNodeTypes && !rule.triggerNodeTypes.includes(sourceNode.type)) {
        return false;
    }
    if (rule.triggerPortId && rule.triggerPortId !== sourcePortId) {
        return false;
    }
    if (rule.triggerPortType && sourcePort?.type !== rule.triggerPortType) {
        return false;
    }
    if (rule.requireOutputPort && !isOutputPort) {
        return false;
    }
    return true;
};

const isExistingConnectionMatchForRule = (
    connection: Connection,
    sourceNodeId: string,
    sourcePortId: string,
    action: AutoCreateRule,
    nodesById: Map<string, NodeData>
): boolean => {
    if (
        connection.sourceNodeId !== sourceNodeId ||
        connection.sourcePort !== sourcePortId
    ) {
        return false;
    }

    if (action.createTargetPortId && connection.targetPort !== action.createTargetPortId) {
        return false;
    }

    const targetNode = nodesById.get(connection.targetNodeId);
    return targetNode?.type === action.createNodeType;
};

export const hasExistingConnectionForAutoCreate = (
    connections: Connection[],
    nodes: NodeData[],
    sourceNodeId: string,
    sourcePortId: string,
    action: AutoCreateRule | null
): boolean => {
    if (!action) {
        return false;
    }

    const nodesById = new Map(nodes.map((node) => [node.id, node] as const));
    const hasMatchingConnection = connections.some((connection) => (
        isExistingConnectionMatchForRule(connection, sourceNodeId, sourcePortId, action, nodesById)
    ));
    if (hasMatchingConnection) {
        return true;
    }

    const hasMatchingAutoCreatedNode = nodes.some((node) => (
        node.type === action.createNodeType &&
        node.data.autoCreateSource?.nodeId === sourceNodeId &&
        node.data.autoCreateSource?.portId === sourcePortId &&
        node.data.autoCreateSource?.ruleId === action.id
    ));
    if (hasMatchingAutoCreatedNode) {
        return true;
    }

    if (!action.createTargetPortId) {
        return connections.some((connection) => (
            (connection.sourceNodeId === sourceNodeId && connection.sourcePort === sourcePortId) ||
            (connection.targetNodeId === sourceNodeId && connection.targetPort === sourcePortId)
        ));
    }

    return false;
};

export const getAutoCreateAction = (
    sourceNode: NodeData | undefined,
    sourcePortId: string
): AutoCreateRule | null => {
    if (!sourceNode) {
        return null;
    }

    const { port, isOutputPort } = resolvePortContext(sourceNode, sourcePortId);
    const matchedRule = AUTO_CREATE_RULES.find((rule) => (
        doesRuleMatchContext(rule, sourceNode, sourcePortId, port, isOutputPort)
    ));

    if (!matchedRule) {
        return null;
    }

    return matchedRule;
};
