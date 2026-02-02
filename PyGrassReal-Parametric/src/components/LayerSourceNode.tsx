import React, { useMemo } from 'react';
import { CustomNode } from './CustomNode';
import type { NodeData, Connection } from '../types/NodeTypes';

interface LayerSourceNodeData {
    customName?: string;
    isGroup?: boolean;
    inputs?: any[];
    outputs?: any[];
    isPaused?: boolean;
}

interface LayerSourceNodeProps {
    id: string;
    data: LayerSourceNodeData;
    position: { x: number; y: number };
    selected: boolean;
    onPositionChange: (id: string, position: { x: number; y: number }) => void;
    onDataChange: (id: string, data: Partial<NodeData['data']>) => void;
    onDelete: (id: string) => void;
    onSelect?: () => void;
    scale?: number;
    parentGroupId?: string;
    overlappingGroupId?: string;
    onJoinGroup?: (nodeId: string, groupId: string) => void;
    onLeaveGroup?: (nodeId: string) => void;
    onConnectionStart: (nodeId: string, portId: string, position: { x: number; y: number }) => void;
    onConnectionComplete: (nodeId: string, portId: string) => void;
    selectedNodeIds: Set<string>;
    onNodeSelect: (id: string) => void;
    connections?: Array<Connection>;
    onDeleteConnection?: (connectionId: string) => void;
    interactionMode?: 'node' | '3d' | 'wire';
    onDuplicate?: (id: string) => void;
    onDragStart?: () => void;
    onDragEnd?: () => void;
}

const LayerSourceNodeComponent: React.FC<LayerSourceNodeProps> = (props) => {
    // Enhanced data - CustomNode with single centered output port
    const enhancedData = useMemo(() => {
        return {
            ...props.data,
            customName: props.data.customName || 'Layer Source',
            width: 300,
            // Single output port, centered on right side
            outputs: props.data.outputs && props.data.outputs.length > 0
                ? props.data.outputs
                : [{ id: 'output-layers', label: 'Layers Output', type: 'data' as const }],
            hideModifierMenu: true, // Hide JST button
            hideOutputsHeader: true, // Hide OUTPUTS text
            hideOutputsAdd: true, // Hide Add Output button
            centerOutput: true, // Center the output port vertically
        };
    }, [props.data]);

    return (
        <CustomNode
            {...props}
            data={enhancedData}
            nodeType="layer-source"
        />
    );
};

export const LayerSourceNode = React.memo(LayerSourceNodeComponent);