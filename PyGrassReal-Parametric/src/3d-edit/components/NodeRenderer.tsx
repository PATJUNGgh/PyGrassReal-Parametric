import React from 'react';
import { PrimitiveNode } from './PrimitiveNode';
import { VectorXYZNode } from './VectorXYZNode';
import { CustomNode } from './CustomNode';
import { NumberSliderNode } from './NumberSliderNode';
import { BooleanToggleNode } from './BooleanToggleNode';
import { SeriesNode } from './SeriesNode';
import { GroupNode } from './group/GroupNode';
import { InspectorNode } from './InspectorNode';
import { WidgetWindowNode } from './WidgetWindowNode';
import { LayerSourceNode } from './LayerSourceNode';
import { LayerViewNode, type LayerViewNodeData } from './LayerViewNode';
import { NodePromptNode } from './NodePromptNode';
import { BackgroundColorNode } from './BackgroundColorNode';
import { ViewportNode } from './ViewportNode';
import { MeshArrayNode } from './MeshArrayNode';
import { UnitYNode } from './UnitYNode';
import { UnitXNode } from './UnitXNode';
import { UnitZNode } from './UnitZNode';
import { TransformNode } from './TransformNode';
import { Build3DAiNode } from './Build3DAiNode';
import { AiAgentNode } from './AiAgentNode';
import { VertexMaskNode } from './VertexMaskNode';
import { AiSculptNode } from './AiSculptNode';
import { AiPaintNode } from './AiPaintNode';
import { PictureOnMeshNode } from './PictureOnMeshNode';
import { AiAssistantNode } from './widget/AiAssistantNode';
import { PromptNode } from './widget/PromptNode';
import type { NodeData, Connection } from '../types/NodeTypes';

interface NodeRendererProps {
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
    onSelect: (id: string, multiSelect?: boolean) => void;
    onConnectionStart: (nodeId: string, portId: string, position: { x: number; y: number }) => void;
    onConnectionComplete: (nodeId: string, portId: string) => void;
    onDeleteConnection: (id: string) => void;
    onJoinGroup: (nodeId: string, groupId: string) => void;
    onLeaveGroup: (nodeId: string) => void;
    isNodeOverlappingGroup: (node: NodeData, group: NodeData) => boolean;
    onGroupCluster?: (groupId: string) => void;
    onComponentCluster?: (nodeId: string) => void;
    interactionMode?: 'node' | '3d' | 'wire';
    onDragStart?: () => void;
    onDragEnd?: () => void;
    onEditMaterial?: (nodeId: string) => void;
    onAddNode?: (node: NodeData) => void;
    onAddConnection?: (sourceId: string, sourcePort: string, targetId: string, targetPort: string) => void;
}

export const NodeRenderer: React.FC<NodeRendererProps> = ({
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
    onComponentCluster,
    interactionMode,
    onDragStart,
    onDragEnd,
    onEditMaterial,
    onAddNode,
    onAddConnection
}) => {
    const nonRenamableFallbackTypes = new Set<NodeData['type']>([
        'mesh-union',
        'mesh-difference',
        'mesh-intersection',
        'text-on-mesh',
        'model-material',
        'layer-bridge',
    ]);

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
                    onSelect: (isMultiSelect?: boolean) => onSelect(node.id, isMultiSelect),
                    scale: scale,
                    isInfected: infectedNodeIds.has(node.id),
                    isShaking: false,
                    onDragStart: onDragStart,
                    onDragEnd: onDragEnd,
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
                    onDeleteConnection: onDeleteConnection,
                    interactionMode: interactionMode,
                    onEditMaterial: onEditMaterial
                };
                const shouldUseBoxPortLayout = ['custom', 'input', 'output', 'antivirus', 'mesh-union', 'mesh-difference', 'mesh-intersection', 'text-on-mesh', 'model-material', 'layer-bridge'].includes(node.type);
                const boxPortLayoutData = shouldUseBoxPortLayout
                    ? {
                        inputPortOffsetLeft: -30,
                        outputPortSide: 'right' as const,
                        outputPortAbsoluteCentered: true,
                        outputPortOffsetRight: 10,
                        outputLabelMarginRight: 44,
                        outputEditMarginRight: 42,
                    }
                    : {};
                const nodeNameLockData = nonRenamableFallbackTypes.has(node.type)
                    ? { isNameEditable: false }
                    : {};

                if (node.type === 'box') {
                    return (
                        <PrimitiveNode
                            key={node.id}
                            node={node}
                            connections={connections}
                            onDeleteConnection={onDeleteConnection}
                            interactionMode={interactionMode}
                            onDuplicate={onDuplicate}
                            {...commonProps}
                            parentGroupId={parentGroupId}
                            overlappingGroupId={overlappingGroupId}
                            onJoinGroup={onJoinGroup}
                            onLeaveGroup={onLeaveGroup}
                            onDataChange={onDataChange}
                            customName="Box"
                            icon="📦"
                        />
                    );
                } else if (node.type === 'sphere') {
                    return (
                        <PrimitiveNode
                            key={node.id}
                            node={node}
                            connections={connections}
                            onDeleteConnection={onDeleteConnection}
                            interactionMode={interactionMode}
                            onDuplicate={onDuplicate}
                            {...commonProps}
                            parentGroupId={parentGroupId}
                            overlappingGroupId={overlappingGroupId}
                            onJoinGroup={onJoinGroup}
                            onLeaveGroup={onLeaveGroup}
                            onDataChange={onDataChange}
                            customName="Sphere"
                            icon="🔵"
                        />
                    );
                } else if (node.type === 'cone') {
                    return (
                        <PrimitiveNode
                            key={node.id}
                            node={node}
                            connections={connections}
                            onDeleteConnection={onDeleteConnection}
                            interactionMode={interactionMode}
                            onDuplicate={onDuplicate}
                            {...commonProps}
                            parentGroupId={parentGroupId}
                            overlappingGroupId={overlappingGroupId}
                            onJoinGroup={onJoinGroup}
                            onLeaveGroup={onLeaveGroup}
                            onDataChange={onDataChange}
                            customName="Cone"
                            icon="🔼"
                        />
                    );
                } else if (node.type === 'cylinder') {
                    return (
                        <PrimitiveNode
                            key={node.id}
                            node={node}
                            connections={connections}
                            onDeleteConnection={onDeleteConnection}
                            interactionMode={interactionMode}
                            onDuplicate={onDuplicate}
                            {...commonProps}
                            parentGroupId={parentGroupId}
                            overlappingGroupId={overlappingGroupId}
                            onJoinGroup={onJoinGroup}
                            onLeaveGroup={onLeaveGroup}
                            onDataChange={onDataChange}
                            customName="Cylinder"
                            icon="CY"
                        />
                    );
                } else if (node.type === 'vector-xyz') {
                    return (
                        <VectorXYZNode
                            key={node.id}
                            node={node}
                            connections={connections}
                            onDeleteConnection={onDeleteConnection}
                            interactionMode={interactionMode}
                            onDuplicate={onDuplicate}
                            parentGroupId={parentGroupId}
                            overlappingGroupId={overlappingGroupId}
                            onJoinGroup={onJoinGroup}
                            onLeaveGroup={onLeaveGroup}
                            onDataChange={onDataChange}
                            {...commonProps}
                        />
                    );
                } else if (node.type === 'transform') {
                    return <TransformNode key={node.id} {...commonProps} {...interactProps} nodes={nodes} nodeType={node.type} />;
                } else if (node.type === 'build-3d-ai') {
                    return <Build3DAiNode key={node.id} {...commonProps} {...interactProps} nodeType={node.type} />;
                } else if (node.type === 'ai-agent') {
                    return (
                        <AiAgentNode
                            key={node.id}
                            {...commonProps}
                            {...interactProps}
                            connections={connections}
                        />
                    );
                } else if (node.type === 'vertex-mask') {
                    return (
                        <VertexMaskNode
                            key={node.id}
                            node={node}
                            nodes={nodes}
                            connections={connections}
                            onDeleteConnection={onDeleteConnection}
                            interactionMode={interactionMode}
                            onDuplicate={onDuplicate}
                            {...commonProps}
                            parentGroupId={parentGroupId}
                            overlappingGroupId={overlappingGroupId}
                            onJoinGroup={onJoinGroup}
                            onLeaveGroup={onLeaveGroup}
                            onDataChange={onDataChange}
                        />
                    );
                } else if (node.type === 'ai-sculpt') {
                    return (
                        <AiSculptNode
                            key={node.id}
                            node={node}
                            nodes={nodes}
                            connections={connections}
                            onDeleteConnection={onDeleteConnection}
                            interactionMode={interactionMode}
                            onDuplicate={onDuplicate}
                            {...commonProps}
                            parentGroupId={parentGroupId}
                            overlappingGroupId={overlappingGroupId}
                            onJoinGroup={onJoinGroup}
                            onLeaveGroup={onLeaveGroup}
                            onDataChange={onDataChange}
                        />
                    );
                } else if (node.type === 'ai-paint') {
                    return (
                        <AiPaintNode
                            key={node.id}
                            node={node}
                            nodes={nodes}
                            connections={connections}
                            onDeleteConnection={onDeleteConnection}
                            interactionMode={interactionMode}
                            onDuplicate={onDuplicate}
                            {...commonProps}
                            parentGroupId={parentGroupId}
                            overlappingGroupId={overlappingGroupId}
                            onJoinGroup={onJoinGroup}
                            onLeaveGroup={onLeaveGroup}
                            onDataChange={onDataChange}
                        />
                    );
                } else if (node.type === 'picture-on-mesh') {
                    return (
                        <PictureOnMeshNode
                            key={node.id}
                            node={node}
                            nodes={nodes}
                            connections={connections}
                            onDeleteConnection={onDeleteConnection}
                            interactionMode={interactionMode}
                            onDuplicate={onDuplicate}
                            {...commonProps}
                            parentGroupId={parentGroupId}
                            overlappingGroupId={overlappingGroupId}
                            onJoinGroup={onJoinGroup}
                            onLeaveGroup={onLeaveGroup}
                            onDataChange={onDataChange}
                        />
                    );
                } else if (node.type === 'group') {
                    return (
                        <GroupNode
                            key={node.id}
                            node={node}
                            onPositionChange={onPositionChange}
                            onDelete={onDelete}
                            selected={selectedNodeIds.has(node.id)}
                            onSelect={(isMultiSelect?: boolean) => onSelect(node.id, isMultiSelect)}
                            onNameChange={(id, newName) => onDataChange(id, { customName: newName })}
                            onCluster={onGroupCluster}
                            scale={scale}
                            onDragStart={onDragStart}
                            onDragEnd={onDragEnd}
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
                            nodeType={node.type}
                        />
                    );
                } else if (node.type === 'antivirus') {
                    return <CustomNode key={node.id} {...commonProps} data={{ ...node.data, ...boxPortLayoutData, theme: 'antivirus', icon: '🛡️' }} {...interactProps} nodeType={node.type} />;

                } else if (node.type === 'layer-view') {
                    return (
                        <LayerViewNode
                            key={node.id}
                            {...commonProps}
                            nodes={nodes}
                            {...interactProps}
                            data={node.data as LayerViewNodeData}
                        />
                    );
                } else if (node.type === 'input') {
                    return <CustomNode key={node.id} {...commonProps} data={{ ...node.data, ...boxPortLayoutData, hideInputs: true, isNameEditable: false }} {...interactProps} nodeType={node.type} />;
                } else if (node.type === 'output') {
                    return <CustomNode key={node.id} {...commonProps} data={{ ...node.data, ...boxPortLayoutData, hideOutputs: true, isNameEditable: false }} {...interactProps} nodeType={node.type} />;
                } else if (node.type === 'number-slider') {
                    return <NumberSliderNode key={node.id} {...commonProps} {...interactProps} />;
                } else if (node.type === 'boolean-toggle') {
                    return <BooleanToggleNode key={node.id} {...commonProps} {...interactProps} />;
                } else if (node.type === 'series') {
                    return <SeriesNode key={node.id} {...commonProps} {...interactProps} />;
                } else if (node.type === 'panel') {
                    // Panel needs to support drag events as well if it uses CustomNode internally
                    return (
                        <InspectorNode
                            key={node.id}
                            nodes={nodes}
                            {...commonProps}
                            {...interactProps}
                            isShaking={shakingNodes.has(node.id)}
                            isPaused={node.data.isPaused ?? false}
                        />
                    );
                } else if (node.type === 'node-prompt') {
                    return <NodePromptNode key={node.id} {...commonProps} {...interactProps} nodeType={node.type} nodes={nodes} connections={connections} onAddNode={onAddNode} onAddConnection={onAddConnection} />;
                } else if (node.type === 'background-color') {
                    return <BackgroundColorNode key={node.id} {...commonProps} {...interactProps} />;
                } else if (node.type === 'viewport') {
                    return <ViewportNode key={node.id} {...commonProps} {...interactProps} />;
                } else if (node.type === 'mesh-array') {
                    return <MeshArrayNode key={node.id} {...commonProps} {...interactProps} />;
                } else if (node.type === 'widget-window') {
                    const widgetWindowData = {
                        ...node.data,
                        inputs: node.data.inputs && node.data.inputs.length > 0
                            ? node.data.inputs
                            : [{ id: 'input-1', label: 'Input' }],
                    };
                    return (
                        <WidgetWindowNode
                            key={node.id}
                            {...commonProps}
                            data={widgetWindowData}
                            {...interactProps}
                        />
                    );
                } else if (node.type === 'ai-assistant') {
                    return (
                        <AiAssistantNode
                            key={node.id}
                            {...commonProps}
                            {...interactProps}
                            nodes={nodes}
                            nodeType={node.type}
                        />
                    );
                } else if (node.type === 'prompt') {
                    return (
                        <PromptNode
                            key={node.id}
                            {...commonProps}
                            {...interactProps}
                            nodes={nodes}
                            nodeType={node.type}
                        />
                    );
                } else if (node.type === 'layer-source') {
                    return (
                        <LayerSourceNode
                            key={node.id}
                            {...commonProps}
                            {...interactProps}
                            selectedNodeIds={selectedNodeIds}
                            onNodeSelect={(id, multiSelect) => onSelect(id, multiSelect)}
                        />
                    );
                } else if (node.type === 'unit-y') {
                    return (
                        <UnitYNode
                            key={node.id}
                            node={node}
                            connections={connections}
                            onDeleteConnection={onDeleteConnection}
                            interactionMode={interactionMode}
                            onDuplicate={onDuplicate}
                            parentGroupId={parentGroupId}
                            overlappingGroupId={overlappingGroupId}
                            onJoinGroup={onJoinGroup}
                            onLeaveGroup={onLeaveGroup}
                            onDataChange={onDataChange}
                            {...commonProps}
                        />
                    );
                } else if (node.type === 'unit-x') {
                    return (
                        <UnitXNode
                            key={node.id}
                            node={node}
                            connections={connections}
                            onDeleteConnection={onDeleteConnection}
                            interactionMode={interactionMode}
                            onDuplicate={onDuplicate}
                            parentGroupId={parentGroupId}
                            overlappingGroupId={overlappingGroupId}
                            onJoinGroup={onJoinGroup}
                            onLeaveGroup={onLeaveGroup}
                            onDataChange={onDataChange}
                            {...commonProps}
                        />
                    );
                } else if (node.type === 'unit-z') {
                    return (
                        <UnitZNode
                            key={node.id}
                            node={node}
                            connections={connections}
                            onDeleteConnection={onDeleteConnection}
                            interactionMode={interactionMode}
                            onDuplicate={onDuplicate}
                            parentGroupId={parentGroupId}
                            overlappingGroupId={overlappingGroupId}
                            onJoinGroup={onJoinGroup}
                            onLeaveGroup={onLeaveGroup}
                            onDataChange={onDataChange}
                            {...commonProps}
                        />
                    );
                } else {
                    // Custom Node (Default fallback)
                    return (
                        <CustomNode
                            key={node.id}
                            {...commonProps}
                            data={{ ...node.data, ...boxPortLayoutData, ...nodeNameLockData }}
                            {...interactProps}
                            isShaking={shakingNodes.has(node.id)}
                            nodeType={node.type}
                        />
                    );
                }
            })}
        </>
    );
};
