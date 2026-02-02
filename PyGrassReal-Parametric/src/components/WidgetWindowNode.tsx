import React from 'react';
import { CustomNode } from './CustomNode';
import type { NodeData, Connection } from '../types/NodeTypes';

interface WidgetWindowNodeProps {
    id: string;
    data: NodeData['data'];
    position: { x: number; y: number };
    selected: boolean;
    connections: Connection[];
    onPositionChange: (id: string, position: { x: number; y: number }) => void;
    onDataChange: (id: string, data: Partial<NodeData['data']>) => void;
    onDelete: (id: string) => void;
    onSelect?: () => void;
    scale?: number;
    onConnectionStart: (nodeId: string, portId: string, position: { x: number; y: number }) => void;
    onConnectionComplete: (nodeId: string, portId: string) => void;
    onDeleteConnection?: (connectionId: string) => void;
    isShaking?: boolean;
    onDuplicate?: (id: string) => void;
    parentGroupId?: string;
    overlappingGroupId?: string;
    onJoinGroup?: (nodeId: string, groupId: string) => void;
    onLeaveGroup?: (nodeId: string) => void;
    interactionMode?: 'node' | '3d' | 'wire';
}

export const WidgetWindowNode: React.FC<WidgetWindowNodeProps> = ({
    id,
    data,
    position,
    selected,
    connections,
    onPositionChange,
    onDataChange,
    onDelete,
    onSelect,
    scale,
    onConnectionStart,
    onConnectionComplete,
    onDeleteConnection,
    isShaking,
    onDuplicate,
    parentGroupId,
    overlappingGroupId,
    onJoinGroup,
    onLeaveGroup,
    interactionMode,
}) => {
        // Enhanced data to pass to CustomNode
        const customNodeData = {
            ...data,
            customName: data.customName || 'Widget Window Mode',
            // Add any widget-window specific data here if needed
        };
     
        return (
            <CustomNode
                id={id}
                data={customNodeData}            position={position}
            selected={selected}
            connections={connections}
            onPositionChange={onPositionChange}
            onDataChange={onDataChange}
            onDelete={onDelete}
            onSelect={onSelect}
            scale={scale}
            onConnectionStart={onConnectionStart}
            onConnectionComplete={onConnectionComplete}
            onDeleteConnection={onDeleteConnection}
            isShaking={isShaking}
            onDuplicate={onDuplicate}
            parentGroupId={parentGroupId}
            overlappingGroupId={overlappingGroupId}
            onJoinGroup={onJoinGroup}
            onLeaveGroup={onLeaveGroup}
            interactionMode={interactionMode}
        />
    );
};
