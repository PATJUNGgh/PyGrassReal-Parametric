import React from 'react';
import { BoxNode } from './BoxNode';
import { SphereNode } from './SphereNode';
import { CustomNode } from './CustomNode';
import { AntiVirusNode } from './AntiVirusNode';
import { InputNode } from './InputNode';
import { OutputNode } from './OutputNode';
import { NumberSliderNode } from './NumberSliderNode';
import { GroupNode } from './GroupNode';
import { PanelNode } from './PanelNode';
import type { NodeData, Connection } from '../types/NodeTypes';

interface NodeLayerProps {
    nodes: NodeData[];
    connections: Connection[];
    selectedNodeIds: Set<string>;
    infectedNodeIds: Set<string>;
    shakingNodes: Set<string>;
    scale: number;
    onPositionChange: (id: string, position: { x: number; y: number }) => void;
    onDataChange: (id: string, data: any) => void;
    onDelete: (id: string) => void;
    onDuplicate: (id: string) => void;
    onSelect: (id: string) => void;
    onConnectionStart: (nodeId: string, portId: string, position: { x: number; y: number }) => void;
    onConnectionComplete: (nodeId: string, portId: string) => void;
    onDeleteConnection: (id: string) => void;
    onJoinGroup: (nodeId: string, groupId: string) => void;
    onLeaveGroup: (nodeId: string) => void;
    isNodeOverlappingGroup: (node: NodeData, group: NodeData) => boolean;
    onGroupCluster?: (groupId: string) => void;
    onComponentCluster?: (nodeId: string) => void;
}

export const NodeLayer: React.FC<NodeLayerProps> = ({
    nodes,
    connections,
    selectedNodeIds,
    infectedNodeIds,
    shakingNodes,
    scale,
    onPositionChange,
    onDataChange,
    onDelete,
    onDuplicate,
    onSelect,
    onConnectionStart,
    onConnectionComplete,
    onDeleteConnection,
    onJoinGroup,
    onLeaveGroup,
    isNodeOverlappingGroup,
    onGroupCluster,
    onComponentCluster
}) => {
    return (
        <>
            {nodes.map((node) => {
                // CommonProps WITHOUT key
                const commonProps = {
                    id: node.id,
                    data: node.data,
                    position: node.position,
                    selected: selectedNodeIds.has(node.id),
                    onPositionChange: onPositionChange,
                    onDelete: onDelete,
                    onConnectionStart: onConnectionStart,
                    onConnectionComplete: onConnectionComplete,
                    onSelect: () => onSelect(node.id),
                    scale: scale,
                    isInfected: infectedNodeIds.has(node.id),
                    isShaking: shakingNodes.has(node.id),
                };

                // Group-related props calculation
                const parentGroupId = nodes.find(n => n.type === 'group' && n.data.childNodeIds?.includes(node.id))?.id;
                const overlappingGroupId = nodes.find(n => n.type === 'group' && isNodeOverlappingGroup(node, n))?.id;

                const interactProps = {
                    connections: connections,
                    onDuplicate: onDuplicate,
                    parentGroupId: parentGroupId,
                    overlappingGroupId: overlappingGroupId,
                    onJoinGroup: onJoinGroup,
                    onLeaveGroup: onLeaveGroup,
                    onDataChange: onDataChange,
                    onDeleteConnection: onDeleteConnection
                };

                if (node.type === 'box') {
                    return <BoxNode key={node.id} node={node} {...commonProps} onDataChange={onDataChange} />;
                } else if (node.type === 'sphere') {
                    return <SphereNode key={node.id} node={node} {...commonProps} onDataChange={onDataChange} />;
                } else if (node.type === 'group') {
                    return (
                        <GroupNode
                            key={node.id}
                            node={node}
                            onPositionChange={onPositionChange}
                            onDelete={onDelete}
                            selected={selectedNodeIds.has(node.id)}
                            onSelect={() => onSelect(node.id)}
                            onNameChange={(id, newName) => onDataChange(id, { customName: newName })}
                            onCluster={onGroupCluster}
                        />
                    );
                } else if (node.type === 'component') {
                    return (
                        <CustomNode
                            key={node.id}
                            {...commonProps}
                            {...interactProps}
                            isShaking={shakingNodes.has(node.id)}
                            onCluster={onComponentCluster}
                        />
                    );
                } else if (node.type === 'antivirus') {
                    return <AntiVirusNode key={node.id} {...commonProps} {...interactProps} />;
                } else if (node.type === 'input') {
                    return <InputNode key={node.id} {...commonProps} {...interactProps} />;
                } else if (node.type === 'output') {
                    return <OutputNode key={node.id} {...commonProps} {...interactProps} />;
                } else if (node.type === 'number-slider') {
                    return <NumberSliderNode key={node.id} {...commonProps} {...interactProps} />;
                } else if (node.type === 'panel') {
                    return (
                        <PanelNode
                            key={node.id}
                            nodes={nodes}
                            {...commonProps}
                            {...interactProps}
                            isShaking={shakingNodes.has(node.id)}
                        />
                    );
                } else {
                    // Custom Node (Default fallback)
                    return (
                        <CustomNode
                            key={node.id}
                            {...commonProps}
                            {...interactProps}
                            isShaking={shakingNodes.has(node.id)}
                        />
                    );
                }
            })}
        </>
    );
};
