import React, { useCallback, useMemo } from 'react';
import { CustomNode } from './CustomNode';
import { LayerPanel } from './widgets/LayerPanel';
import type { NodeData, Connection, Port } from '../types/NodeTypes';
import { computeLayersFromViewNode, type LayerInputData } from '../utils/computeLayerData';

export type LayerViewNodeData = NodeData['data'];

interface LayerViewNodeProps {
    id: string;
    data: LayerViewNodeData;
    position: { x: number; y: number };
    selected: boolean;
    connections: Connection[];
    nodes: NodeData[];
    onPositionChange: (id: string, position: { x: number; y: number }) => void;
    onDataChange: (id: string, data: Partial<NodeData['data']>) => void;
    onDelete: (id: string) => void;
    onSelect?: () => void;
    scale?: number;
    onConnectionStart: (nodeId: string, portId: string, position: { x: number; y: number }) => void;
    onConnectionComplete: (nodeId: string, portId: string) => void;
    onDeleteConnection?: (connectionId: string) => void;
    isShaking?: boolean;
    onCluster?: (nodeId: string) => void;
    parentGroupId?: string;
    overlappingGroupId?: string;
    onJoinGroup?: (nodeId: string, groupId: string) => void;
    onLeaveGroup?: (nodeId: string) => void;
    isInfected?: boolean;
    onDuplicate?: (id: string) => void;
    interactionMode?: 'node' | '3d' | 'wire';
}

export const LayerViewNode: React.FC<LayerViewNodeProps> = ({
    id,
    data,
    onDataChange,
    nodes,
    connections,
    ...props
}) => {
    const layersToWidgetInputs = useMemo(() => {
        return computeLayersFromViewNode(id, nodes, connections);
    }, [id, nodes, connections]);

    const handleRenameLayer = useCallback((layerId: string, newName: string) => {
        const cleanName = newName.trim();
        if (!cleanName) return;

        const layerInfo = layersToWidgetInputs.find((layer) => layer.id === layerId);
        if (!layerInfo) {
            console.error(`[LayerViewNode] Could not find layer info for ID: ${layerId}`);
            return;
        }

        const nodeToUpdate = nodes.find((node) => node.id === layerInfo.nodeId);
        if (!nodeToUpdate) {
            console.error(`[LayerViewNode] Could not find node with ID: ${layerInfo.nodeId}`);
            return;
        }

        const originalInputs = nodeToUpdate.data?.inputs || [];
        let found = false;
        const updatedInputs = originalInputs.map((input: Port) => {
            if (input.id === layerInfo.portId) {
                found = true;
                return { ...input, label: cleanName };
            }
            return input;
        });

        if (!found) {
            console.warn(`[LayerViewNode] Port ID "${layerInfo.portId}" not found on node "${layerInfo.nodeId}".`);
            return;
        }

        onDataChange(nodeToUpdate.id, {
            ...nodeToUpdate.data,
            inputs: updatedInputs,
        });
    }, [layersToWidgetInputs, nodes, onDataChange]);

    const enhancedData = {
        ...data,
        isNameEditable: false,
        width: (() => {
            const baseWidth = typeof data.width === 'number' ? data.width : 300;
            const maxDepth = layersToWidgetInputs.reduce((max, layer) => Math.max(max, layer.depth ?? 0), 0);
            const maxLabelLength = layersToWidgetInputs.reduce((max, layer) => Math.max(max, layer.label.length), 0);
            const estimatedWidth = 300 + (maxDepth * 16) + Math.min(maxLabelLength * 5, 90);
            return Math.max(baseWidth, Math.min(estimatedWidth, 460));
        })(),
        height: (() => {
            const rowCount = Math.max(1, layersToWidgetInputs.length);
            const targetHeight = 124 + (rowCount * 27);
            return Math.max(205, Math.min(targetHeight, 720));
        })(),
        bodyPadding: '24px 16px 12px 16px',
        hideInputs: true,
        hideInputsAdd: true,
        hideOutputs: false,
        hideOutputsHeader: true,
        hideOutputsAdd: true,
        hidePortLabels: true,
        hidePortControls: true,
        hideModifierMenu: true,
        outputPortSide: 'right' as const,
        outputsAreaWidth: 24,
        outputPortAbsoluteCentered: true,
        outputPortOffsetRight: 10,
        centerOutput: true,
        inputs: [],
        outputs: [{ id: 'output-all-layer', label: 'Layer View Output', type: 'data' }],
    };

    return (
        <CustomNode
            id={id}
            data={enhancedData}
            onDataChange={onDataChange}
            connections={connections}
            {...props}
        >
            {layersToWidgetInputs.length > 0 && (
                <LayerPanel
                    layers={layersToWidgetInputs.map((layer: LayerInputData) => ({
                        id: layer.id,
                        label: layer.label,
                        depth: layer.depth ?? 0,
                    }))}
                    onUpdate={(layerId, updates) => handleRenameLayer(layerId, updates.label)}
                    hideToolbar={true}
                    hideCheckboxes={true}
                    hideIcons={true}
                />
            )}
        </CustomNode>
    );
};
