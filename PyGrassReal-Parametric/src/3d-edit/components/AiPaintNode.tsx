import React, { useEffect, useMemo, useRef } from 'react';
import { isFiniteNumber, readSourceNodeOutput } from '../utils/nodeValueResolvers';
import { useNodeDefaults } from '../hooks/useNodeDefaults';
import { getPaintOpsSignature, parsePaintPlan, resolvePaintMaskMark } from '../utils/aiPaint';
import { getNodeDefinition } from '../definitions/nodeDefinitions';
import { CustomNode } from './CustomNode';








const calculateFallbackHeight = (maxPorts: number): number => {
    return Math.max(140, 126 + (maxPorts > 0 ? maxPorts * 28 : 0));
};

export const AiPaintNode: React.FC<AiPaintNodeProps> = ({
    node,
    nodes,
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
    onDuplicate,
    parentGroupId,
    overlappingGroupId,
    onJoinGroup,
    onLeaveGroup,
}) => {
    const lastResolvedSignatureRef = useRef<string>('');

    const inputs = (node.data.inputs || []) as Port[];
    const outputs = (node.data.outputs || []) as Port[];
    const maxPorts = Math.max(inputs.length, outputs.length);
    const fallbackHeight = calculateFallbackHeight(maxPorts);

    const nodeMap = useMemo(() => {
        return new Map(nodes.map((item) => [item.id, item]));
    }, [nodes]);

    useEffect(() => {
        const nodeDefinition = getNodeDefinition(node.type);
        if (!nodeDefinition) return;

        const { initialData, name: definitionName, icon: definitionIcon } = nodeDefinition;
        const dataUpdate: Partial<NodeData['data']> = {};

        const shouldInitInputs = !node.data.inputs || node.data.inputs.length === 0;
        if (shouldInitInputs) {
            dataUpdate.inputs = initialData?.inputs || [];
        }

        const shouldInitOutputs = !node.data.outputs || node.data.outputs.length === 0;
        if (shouldInitOutputs) {
            dataUpdate.outputs = initialData?.outputs || [];
        }

        const defaultName = initialData?.customName || definitionName;
        if (defaultName && node.data.customName !== defaultName) {
            dataUpdate.customName = defaultName;
        }

        const defaultIcon = initialData?.icon || definitionIcon;
        if (defaultIcon && node.data.icon !== defaultIcon) {
            dataUpdate.icon = defaultIcon;
        }

        const shouldInitHeight = !node.data.height || node.data.height <= 80;
        if (shouldInitHeight) {
            const nextInputs = dataUpdate.inputs ?? node.data.inputs ?? [];
            const nextOutputs = dataUpdate.outputs ?? node.data.outputs ?? [];
            const nextMaxPorts = Math.max(nextInputs.length, nextOutputs.length);
            dataUpdate.height = calculateFallbackHeight(nextMaxPorts);
        }

        // Match Box node port layout.
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
        node.type,
        node.data.inputs,
        node.data.outputs,
        node.data.height,
        node.data.customName,
        node.data.icon,
        node.data.inputPortOffsetLeft,
        node.data.outputPortSide,
        node.data.outputPortAbsoluteCentered,
        node.data.outputPortOffsetRight,
        node.data.outputLabelMarginRight,
        node.data.outputEditMarginRight,
        onDataChange,
    ]);

    const resolvedInputs = useMemo(() => {
        const resolveConnection = (portId: string) => {
            return connections.find((connection) => {
                return connection.targetNodeId === node.id && connection.targetPort === portId;
            });
        };

        const meshConnection = resolveConnection('input-mesh');
        const planConnection = resolveConnection('input-plan');
        const maskConnection = resolveConnection('input-mask');

        const resolveValue = (connection?: { sourceNodeId: string; sourcePort: string }) => {
            if (!connection) return undefined;
            const sourceNode = nodeMap.get(connection.sourceNodeId);
            if (!sourceNode) return undefined;
            return readSourceNodeOutput(sourceNode, connection.sourcePort);
        };

        return {
            meshSourceNodeId: meshConnection?.sourceNodeId ?? null,
            planValue: resolveValue(planConnection),
            maskValue: resolveValue(maskConnection),
        };
    }, [connections, node.id, nodeMap]);

    const paintPlan = useMemo(() => {
        return parsePaintPlan(resolvedInputs.planValue);
    }, [resolvedInputs.planValue]);

    const paintMask = useMemo(() => {
        return resolvePaintMaskMark(resolvedInputs.maskValue);
    }, [resolvedInputs.maskValue]);

    useEffect(() => {
        const resultPayload = {
            meshSourceNodeId: resolvedInputs.meshSourceNodeId,
            maskMark: paintMask,
            opsCount: paintPlan.ops.length,
        };

        const nextSignature = JSON.stringify({
            meshSourceNodeId: resolvedInputs.meshSourceNodeId,
            ops: getPaintOpsSignature(paintPlan.ops),
            mask: paintMask,
        });

        const currentOps = Array.isArray(node.data.paintOps) && node.data.paintOps.length > 0
            ? node.data.paintOps
            : (node.data.paintPlan?.ops ?? []);
        const currentSignature = JSON.stringify({
            meshSourceNodeId: (node.data.paintResult as { meshSourceNodeId?: string | null } | undefined)?.meshSourceNodeId ?? null,
            ops: getPaintOpsSignature(currentOps),
            mask: (node.data.paintResult as { maskMark?: unknown } | undefined)?.maskMark ?? null,
        });

        if (nextSignature === currentSignature || nextSignature === lastResolvedSignatureRef.current) {
            return;
        }

        lastResolvedSignatureRef.current = nextSignature;
        onDataChange(node.id, {
            paintPlan,
            paintOps: paintPlan.ops,
            paintResult: resultPayload,
        });
    }, [
        node.id,
        node.data.paintOps,
        node.data.paintPlan,
        node.data.paintResult,
        onDataChange,
        paintMask,
        paintPlan,
        resolvedInputs.meshSourceNodeId,
    ]);

    return (
        <CustomNode
            id={node.id}
            data={{
                ...node.data,
                customName: node.data.customName || 'AI Paint',
                isNameEditable: false,
                inputs,
                outputs,
                width: node.data.width && node.data.width > 50 ? node.data.width : 300,
                height: fallbackHeight,
                bodyPadding: node.data.bodyPadding || '36px 20px 10px 20px',
                bodyMinHeight: node.data.bodyMinHeight || 80,
                inputPortOffsetLeft: typeof node.data.inputPortOffsetLeft === 'number' ? node.data.inputPortOffsetLeft : -30,
                outputPortSide: node.data.outputPortSide || 'right',
                outputPortAbsoluteCentered: typeof node.data.outputPortAbsoluteCentered === 'boolean' ? node.data.outputPortAbsoluteCentered : true,
                outputPortOffsetRight: typeof node.data.outputPortOffsetRight === 'number' ? node.data.outputPortOffsetRight : 10,
                outputLabelMarginRight: typeof node.data.outputLabelMarginRight === 'number' ? node.data.outputLabelMarginRight : 44,
                outputEditMarginRight: typeof node.data.outputEditMarginRight === 'number' ? node.data.outputEditMarginRight : 42,
                hideInputsAdd: true,
                hideOutputsAdd: true,
                hidePortControls: true,
                hideModifierMenu: true,
            }}
            position={node.position}
            selected={selected}
            onPositionChange={onPositionChange}
            onDataChange={onDataChange}
            onDelete={onDelete ?? (() => {})}
            onConnectionStart={onConnectionStart}
            onConnectionComplete={onConnectionComplete}
            connections={connections}
            onDeleteConnection={onDeleteConnection}
            isShaking={isShaking}
            onSelect={onSelect}
            scale={scale}
            isInfected={isInfected}
            onDuplicate={onDuplicate}
            parentGroupId={parentGroupId}
            overlappingGroupId={overlappingGroupId}
            onJoinGroup={onJoinGroup}
            onLeaveGroup={onLeaveGroup}
            nodeType="ai-paint"
        />
    );
};








