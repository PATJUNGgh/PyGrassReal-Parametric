import React, { useMemo } from 'react';
import { CustomNode } from './CustomNode';
import type { NodeData, Connection } from '../types/NodeTypes';

interface SeriesNodeData {
    customName?: string;
    inputs?: any[];
    outputs?: any[];
    start?: number;
    step?: number;
    count?: number;
}

interface SeriesNodeProps {
    id: string;
    data: SeriesNodeData;
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
    selectedNodeIds?: Set<string>;
    onNodeSelect?: (ids: Set<string>) => void;
    connections?: Array<Connection>;
    onDeleteConnection?: (connectionId: string) => void;
    interactionMode?: 'node' | '3d' | 'wire';
    onDuplicate?: (id: string) => void;
    isInfected?: boolean;
}

const SeriesNodeComponent: React.FC<SeriesNodeProps> = (props) => {
    // Enhanced data - use default inputs/outputs if not provided
    const enhancedData = useMemo(() => {
        const defaultInputs = [
            { id: 'input-start', label: 'Start', type: 'number' as const },
            { id: 'input-step', label: 'Step', type: 'number' as const },
            { id: 'input-count', label: 'Count', type: 'number' as const },
        ];

        const defaultOutputs = [
            { id: 'output-series', label: 'Series', type: 'data' as const },
        ];

        return {
            ...props.data,
            customName: props.data.customName || 'Series',
            inputs: defaultInputs, // Always use default inputs with full names
            outputs: defaultOutputs, // Always use default output
            hideModifierMenu: true, // Hide JST button
            hideInputsAdd: true, // Hide Add Input button
            hideOutputsAdd: true, // Hide Add Output button
        };
    }, [props.data]);

    return (
        <CustomNode
            {...props}
            data={enhancedData}
        />
    );
};

export const SeriesNode = React.memo(SeriesNodeComponent);
