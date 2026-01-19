export interface NodeData {
    id: string;
    type: 'box' | 'sphere' | 'custom' | 'antivirus' | 'input' | 'output' | 'number-slider' | 'group' | 'component' | 'panel';
    position: { x: number; y: number };
    data: {
        width?: number;
        height?: number;
        depth?: number;
        radius?: number;
        scale?: { x: number; y: number; z: number };
        rotation?: { x: number; y: number; z: number };
        location?: { x: number; y: number; z: number };
        customName?: string;
        inputs?: Array<{ id: string; label: string }>;
        outputs?: Array<{ id: string; label: string }>;
        min?: number;
        max?: number;
        step?: number;
        value?: number;
        childNodeIds?: string[];
        componentId?: string;
        // Panel Node specific
        isGroup?: boolean;
    };
}

export interface Connection {
    id: string;
    sourceNodeId: string;
    targetNodeId: string;
    sourcePort: string;
    targetPort: string;
    isDashed?: boolean;
    isGhost?: boolean;
}
