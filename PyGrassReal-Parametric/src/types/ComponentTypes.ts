export interface ComponentPort {
    id: string;
    label: string;
    type?: string;
}

export interface ComponentNodeSnapshot {
    id: string;
    type: string;
    position: { x: number; y: number };
    data: Record<string, unknown>;
}

export interface ComponentConnectionSnapshot {
    id: string;
    sourceNodeId: string;
    targetNodeId: string;
    sourcePort: string;
    targetPort: string;
}

export interface ComponentData {
    id: string;
    name: string;
    description?: string;
    inputPorts: ComponentPort[];
    outputPorts: ComponentPort[];
    internalNodes: ComponentNodeSnapshot[];
    internalConnections: ComponentConnectionSnapshot[];
    inputBindings?: Array<{ componentPortId: string; nodeId: string; portId: string }>;
    outputBindings?: Array<{ componentPortId: string; nodeId: string; portId: string }>;
    origin?: { x: number; y: number };
    thumbnail?: string;
    category?: string;
}
