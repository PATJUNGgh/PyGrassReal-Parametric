import React, { useEffect } from 'react';
import type { NodeData, Port } from '../types/NodeTypes';
import { CustomNode } from './CustomNode';
import { getNodeDefinition } from '../definitions/nodeDefinitions';

// Helper function to calculate fallback height
const calculateFallbackHeight = (maxPorts: number): number => {
    return Math.max(100, 110 + (maxPorts > 0 ? maxPorts * 28 : 0));
}

interface PrimitiveNodeProps {
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
    onSelect?: (multiSelect?: boolean) => void;
    scale?: number;
    isInfected?: boolean;
    interactionMode?: 'node' | '3d' | 'wire';
    onDuplicate?: (id: string) => void;
    parentGroupId?: string;
    overlappingGroupId?: string;
    onJoinGroup?: (nodeId: string, groupId: string) => void;
    onLeaveGroup?: (nodeId: string) => void;
    onDragStart?: () => void;
    onDragEnd?: () => void;
}

export const PrimitiveNode: React.FC<PrimitiveNodeProps> = ({
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
    onDragStart,
    onDragEnd,
}) => {
    const inputs = (node.data.inputs || []) as Port[];
    const outputs = (node.data.outputs || []) as Port[];
    const usesBoxPortLayout = ['box', 'sphere', 'cone', 'cylinder'].includes(node.type);
    const maxPorts = Math.max(inputs.length, outputs.length);
    const fallbackHeight = calculateFallbackHeight(maxPorts);

    useEffect(() => {
        const nodeDefinition = getNodeDefinition(node.type);
        if (!nodeDefinition) return;

        const { initialData, name: defName, icon: defIcon } = nodeDefinition;
        const dataUpdate: Partial<NodeData['data']> = {};

        const shouldInitInputs = !node.data.inputs || node.data.inputs.length === 0;
        if (shouldInitInputs) {
            dataUpdate.inputs = initialData?.inputs || [];
        }

        const shouldInitOutputs = !node.data.outputs || node.data.outputs.length === 0;
        if (shouldInitOutputs) {
            dataUpdate.outputs = initialData?.outputs || [];
        }

        const defaultName = initialData?.customName || defName;
        if (defaultName && node.data.customName !== defaultName) {
            dataUpdate.customName = defaultName;
        }

        const defaultIcon = initialData?.icon || defIcon;
        if (defaultIcon && node.data.icon !== defaultIcon) {
            dataUpdate.icon = defaultIcon;
        }

        const shouldInitHeight = !node.data.height || node.data.height <= 50;
        if (shouldInitHeight) {
            const nextInputs = dataUpdate.inputs ?? node.data.inputs ?? [];
            const nextOutputs = dataUpdate.outputs ?? node.data.outputs ?? [];
            const nextMaxPorts = Math.max(nextInputs.length, nextOutputs.length);
            dataUpdate.height = calculateFallbackHeight(nextMaxPorts);
        }

        // Move only Box output port; keep output label layout untouched.
        if (usesBoxPortLayout && node.data.outputPortSide !== 'right') {
            dataUpdate.outputPortSide = 'right';
        }
        if (usesBoxPortLayout && node.data.inputPortOffsetLeft !== -30) {
            dataUpdate.inputPortOffsetLeft = -30;
        }
        if (usesBoxPortLayout && node.data.outputPortAbsoluteCentered !== true) {
            dataUpdate.outputPortAbsoluteCentered = true;
        }
        if (usesBoxPortLayout && node.data.outputPortOffsetRight !== 10) {
            dataUpdate.outputPortOffsetRight = 10;
        }
        if (usesBoxPortLayout && node.data.outputLabelMarginRight !== 44) {
            dataUpdate.outputLabelMarginRight = 44;
        }
        if (usesBoxPortLayout && node.data.outputEditMarginRight !== 42) {
            dataUpdate.outputEditMarginRight = 42;
        }

        if (Object.keys(dataUpdate).length > 0) {
            onDataChange(node.id, dataUpdate);
        }
    }, [node.id, node.type, node.data.inputs, node.data.outputs, node.data.height, node.data.customName, node.data.icon, node.data.inputPortOffsetLeft, node.data.outputPortSide, node.data.outputPortAbsoluteCentered, node.data.outputPortOffsetRight, node.data.outputLabelMarginRight, node.data.outputEditMarginRight, usesBoxPortLayout, onDataChange]);

    const updateNodeDataWithNewPorts = (portUpdate: { inputs?: Port[]; outputs?: Port[] }) => {
        const nextInputs = portUpdate.inputs || inputs;
        const nextOutputs = portUpdate.outputs || outputs;
        const nextMaxPorts = Math.max(nextInputs.length, nextOutputs.length);
        const nextHeight = calculateFallbackHeight(nextMaxPorts);
        onDataChange(node.id, { ...portUpdate, height: nextHeight });
    };

    const handleAddInput = () => {
        const newInput = { id: `input-${Date.now()}`, label: `Input ${inputs.length + 1}` };
        updateNodeDataWithNewPorts({ inputs: [...inputs, newInput] });
    };

    const handleAddOutput = () => {
        const newOutput = { id: `output-${Date.now()}`, label: `Output ${outputs.length + 1}` };
        updateNodeDataWithNewPorts({ outputs: [...outputs, newOutput] });
    };

    const handleRemoveInput = (inputId: string) => {
        const nextInputs = inputs.filter((inp) => inp.id !== inputId);
        updateNodeDataWithNewPorts({ inputs: nextInputs });
    };


    const handleRemoveOutput = (outputId: string) => {
        const nextOutputs = outputs.filter((out) => out.id !== outputId);
        updateNodeDataWithNewPorts({ outputs: nextOutputs });
    };

    return (
        <CustomNode
            id={node.id}
            data={{
                ...node.data,
                customName: node.data.customName, // Set by effect from definition
                inputs: inputs,
                outputs: outputs,
                icon: node.data.icon, // Set by effect from definition
                isNameEditable: false,
                width: node.data.width && node.data.width > 50 ? node.data.width : 300,
                height: fallbackHeight,
                inputPortOffsetLeft: typeof node.data.inputPortOffsetLeft === 'number'
                    ? node.data.inputPortOffsetLeft
                    : (usesBoxPortLayout ? -33 : undefined),
                outputPortSide: node.data.outputPortSide || (usesBoxPortLayout ? 'right' : undefined),
                outputPortOffsetLeft: typeof node.data.outputPortOffsetLeft === 'number' ? node.data.outputPortOffsetLeft : -37,
                outputPortOffsetRight: typeof node.data.outputPortOffsetRight === 'number'
                    ? node.data.outputPortOffsetRight
                    : (usesBoxPortLayout ? 10 : undefined),
                outputPortAbsoluteCentered: typeof node.data.outputPortAbsoluteCentered === 'boolean'
                    ? node.data.outputPortAbsoluteCentered
                    : (usesBoxPortLayout ? true : undefined),
                outputLabelMarginRight: typeof node.data.outputLabelMarginRight === 'number'
                    ? node.data.outputLabelMarginRight
                    : (usesBoxPortLayout ? 44 : undefined),
                outputEditMarginRight: typeof node.data.outputEditMarginRight === 'number'
                    ? node.data.outputEditMarginRight
                    : (usesBoxPortLayout ? 42 : undefined),
                onAddInput: handleAddInput,
                onRemoveInput: handleRemoveInput,
                onAddOutput: handleAddOutput,
                onRemoveOutput: handleRemoveOutput,
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
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            nodeType={node.type}
        />
    );
};
