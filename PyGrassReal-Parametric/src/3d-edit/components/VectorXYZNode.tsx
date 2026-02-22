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
    const fallbackHeight = calculateFallbackHeight(Math.max(inputs.length, outputs.length));

    useEffect(() => {
        const dataUpdate: Partial<NodeData['data']> = {};

        // Match Box node port layout (green/red ports only).
        if (node.data.inputPortOffsetLeft !== -30) {
            dataUpdate.inputPortOffsetLeft = -30;
        }
        if (node.data.outputPortSide !== 'right') {
            dataUpdate.outputPortSide = 'right';
        }
        if (node.data.outputPortAbsoluteCentered !== true) {
            dataUpdate.outputPortAbsoluteCentered = true;
        }
        if (node.data.outputPortOffsetRight !== 10) {
            dataUpdate.outputPortOffsetRight = 10;
        }
        if (node.data.outputLabelMarginRight !== 44) {
            dataUpdate.outputLabelMarginRight = 44;
        }
        if (node.data.outputEditMarginRight !== 42) {
            dataUpdate.outputEditMarginRight = 42;
        }

        if (Object.keys(dataUpdate).length > 0) {
            onDataChange(node.id, dataUpdate);
        }
    }, [
        node.id,
        node.data.inputPortOffsetLeft,
        node.data.outputPortSide,
        node.data.outputPortAbsoluteCentered,
        node.data.outputPortOffsetRight,
        node.data.outputLabelMarginRight,
        node.data.outputEditMarginRight,
        onDataChange,
    ]);

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
                hideModifierMenu: true,
                inputPortOffsetLeft: typeof node.data.inputPortOffsetLeft === 'number'
                    ? node.data.inputPortOffsetLeft
                    : -30,
                outputPortSide: node.data.outputPortSide || 'right',
                outputPortOffsetRight: typeof node.data.outputPortOffsetRight === 'number'
                    ? node.data.outputPortOffsetRight
                    : 10,
                outputPortAbsoluteCentered: typeof node.data.outputPortAbsoluteCentered === 'boolean'
                    ? node.data.outputPortAbsoluteCentered
                    : true,
                outputLabelMarginRight: typeof node.data.outputLabelMarginRight === 'number'
                    ? node.data.outputLabelMarginRight
                    : 44,
                outputEditMarginRight: typeof node.data.outputEditMarginRight === 'number'
                    ? node.data.outputEditMarginRight
                    : 42,
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
            nodeType={node.type}
        />
    );
};
