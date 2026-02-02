import React, { useEffect } from 'react';
import { CustomNode } from './CustomNode';
import type { NodeData, Port } from '../types/NodeTypes';
import { getNodeDefinition } from '../definitions/nodeDefinitions';

const calculateFallbackHeight = (maxPorts: number): number => {
    return Math.max(100, 110 + (maxPorts > 0 ? maxPorts * 28 : 0));
};

interface VectorXYZNodeProps {
    node: NodeData;
    onPositionChange: (id: string, position: { x: number; y: number }) => void;
    onDataChange: (id: string, data: Partial<NodeData['data']>) => void;
    onConnectionStart: (nodeId: string, port: string, position: { x: number; y: number }) => void;
    onConnectionComplete: (nodeId: string, port: string) => void;
    connections?: Array<{ id: string; sourceNodeId: string; targetNodeId: string; sourcePort: string; targetPort: string }>;
    onDeleteConnection?: (connectionId: string) => void;
    onDelete?: (nodeId: string) => void;
    isShaking?: boolean;
    selected?: boolean;
    onSelect?: () => void;
    scale?: number;
    isInfected?: boolean;
    interactionMode?: 'node' | '3d' | 'wire';
    onDuplicate?: (id: string) => void;
    parentGroupId?: string;
    overlappingGroupId?: string;
    onJoinGroup?: (nodeId: string, groupId: string) => void;
    onLeaveGroup?: (nodeId: string) => void;
}

export const VectorXYZNode: React.FC<VectorXYZNodeProps> = ({
    node,
    onPositionChange,
    onDataChange,
    onConnectionStart,
    onConnectionComplete,
    connections = [],
    onDeleteConnection,
    onDelete,
    isShaking,
    selected = false,
    onSelect,
    scale,
    isInfected = false,
    interactionMode,
    onDuplicate,
    parentGroupId,
    overlappingGroupId,
    onJoinGroup,
    onLeaveGroup,
}) => {
    const inputs = (node.data.inputs || []) as Port[];
    const outputs = (node.data.outputs || []) as Port[];

    return (
        <CustomNode
            id={node.id}
            data={{
                ...node.data,
                customName: node.data.customName,
                inputs: inputs,
                outputs: outputs,
                icon: node.data.icon,
                isNameEditable: false,
                width: node.data.width && node.data.width > 50 ? node.data.width : 300,
                height: fallbackHeight,
                hideInputsAdd: true,
                hideOutputsAdd: true,
                hidePortControls: true,
            }}
            position={node.position}
            selected={selected}
            onPositionChange={onPositionChange}
            onDataChange={onDataChange}
            onDelete={onDelete}
            onConnectionStart={onConnectionStart}
            onConnectionComplete={onConnectionComplete}
            connections={connections}
            onDeleteConnection={onDeleteConnection}
            isShaking={isShaking}
            onSelect={onSelect}
            scale={scale}
            isInfected={isInfected}
            interactionMode={interactionMode}
            onDuplicate={onDuplicate}
            parentGroupId={parentGroupId}
            overlappingGroupId={overlappingGroupId}
            onJoinGroup={onJoinGroup}
            onLeaveGroup={onLeaveGroup}
        />
    );
};
