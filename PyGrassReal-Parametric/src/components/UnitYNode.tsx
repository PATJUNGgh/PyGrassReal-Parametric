import React, { useMemo } from 'react';
import { CustomNode } from './CustomNode';
import type { NodeData, Port } from '../types/NodeTypes';

// Inner component for the toggle UI
interface UnitYBodyProps {
    id: string;
    data: NodeData['data'];
    onDataChange: (id: string, data: Partial<NodeData['data']>) => void;
}

const UnitYBody: React.FC<UnitYBodyProps> = ({ id, data, onDataChange }) => {
    const isNegative = typeof data.negative === 'boolean' ? data.negative : false;

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent drag/select when clicking toggle
        onDataChange(id, { ...data, negative: !isNegative });
    };

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px 0',
                width: '100%',
            }}
        >
            <div
                onClick={handleToggle}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    background: 'rgba(0, 0, 0, 0.2)',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    transition: 'all 0.2s ease',
                    marginTop: '-5px', // Adjust spacing if needed
                    marginBottom: '5px',
                    marginLeft: '40px'
                }}
            >
                <div
                    style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '3px',
                        border: isNegative ? '1px solid #ef4444' : '1px solid #94a3b8',
                        background: isNegative ? '#ef4444' : 'transparent',
                        marginRight: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                    }}
                >
                    {isNegative && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    )}
                </div>
                <span
                    style={{
                        fontSize: '12px',
                        color: '#ddd',
                        userSelect: 'none',
                        fontWeight: 500
                    }}
                >
                    Negative
                </span>
            </div>
        </div>
    );
};

interface UnitYNodeProps {
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

export const UnitYNode: React.FC<UnitYNodeProps> = ({
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
    // Memoize the data object to prevent unnecessary re-renders
    const enhancedData = useMemo(() => {
        const outputs: Port[] = (node.data.outputs || [{ id: 'V', label: '', type: 'Vector' }]).map((output) =>
            output.id === 'V' ? { ...output, label: '' } : output
        );

        return {
            ...node.data,
            // Ensure inputs and outputs are set correctly if not present
            inputs: node.data.inputs || [{ id: 'F', label: 'Factor', type: 'Number' }],
            outputs,
            customName: node.data.customName || 'Y',
            icon: 'Y',
            width: 200,
            height: 100,
            bodyMinHeight: 56,
            bodyPadding: '26px 16px 10px 16px',
            outputPortOffsetRight: 0,

            // Standard cleanups
            hideInputsAdd: true,
            hideOutputsAdd: true,
            hidePortControls: true,
        };
    }, [node.data]);

    return (
        <CustomNode
            id={node.id}
            data={enhancedData}
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
            nodeType="unit-y"
        >
            <UnitYBody
                id={node.id}
                data={node.data}
                onDataChange={onDataChange}
            />
        </CustomNode>
    );
};
