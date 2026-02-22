import React, { useContext, useEffect, useMemo, useRef } from 'react';
import type { NodeData, Port } from '../types/NodeTypes';
import { CustomNode } from './CustomNode';
import { getNodeDefinition } from '../definitions/nodeDefinitions';
import { SceneInteractionContext, type SceneInteractionState } from '../context/SceneInteractionContext';

interface VertexMaskNodeProps {
    node: NodeData;
    nodes: NodeData[];
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
    onDragStart?: () => void;
    onDragEnd?: () => void;
}

interface HitPositionLike {
    x: number;
    y: number;
    z: number;
}

interface VertexMaskResolvedInputs {
    radius: number;
    smooth: boolean;
    hit: boolean;
    erase: boolean;
}

const DEFAULT_RADIUS = 0.05;

const calculateFallbackHeight = (maxPorts: number): number => {
    return Math.max(120, 122 + (maxPorts > 0 ? maxPorts * 28 : 0));
};

const isFiniteNumber = (value: unknown): value is number => {
    return typeof value === 'number' && Number.isFinite(value);
};

const extractNumberValue = (value: unknown, fallback: number): number => {
    if (isFiniteNumber(value)) return value;
    if (Array.isArray(value)) {
        const firstNumber = value.find((item): item is number => isFiniteNumber(item));
        return firstNumber ?? fallback;
    }
    if (typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
};

const extractBooleanValue = (value: unknown, fallback: boolean): boolean => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
        if (['false', '0', 'no', 'off'].includes(normalized)) return false;
    }
    return fallback;
};

const areArraysEqual = (a: number[], b: number[]) => {
    if (a.length !== b.length) return false;
    for (let index = 0; index < a.length; index += 1) {
        if (a[index] !== b[index]) return false;
    }
    return true;
};

const sanitizeHitPosition = (value: unknown): HitPositionLike | null => {
    if (!value || typeof value !== 'object') return null;
    const candidate = value as { x?: unknown; y?: unknown; z?: unknown };
    if (!isFiniteNumber(candidate.x) || !isFiniteNumber(candidate.y) || !isFiniteNumber(candidate.z)) {
        return null;
    }
    return { x: candidate.x, y: candidate.y, z: candidate.z };
};

const readGlobalHitPosition = (): HitPositionLike | null => {
    if (typeof window === 'undefined') return null;

    const globalWindow = window as Window & {
        __vertexMaskHitPosition?: unknown;
        __brushCursorPosition?: unknown;
        __hitPosition?: unknown;
    };

    return (
        sanitizeHitPosition(globalWindow.__vertexMaskHitPosition) ||
        sanitizeHitPosition(globalWindow.__brushCursorPosition) ||
        sanitizeHitPosition(globalWindow.__hitPosition)
    );
};

const readTargetHitPosition = (
    sceneContext: SceneInteractionState | null
): HitPositionLike | null => {
    if (!sceneContext?.targetRef?.current) return null;
    return sanitizeHitPosition(sceneContext.targetRef.current.position);
};

const readBooleanToggleOutput = (sourceNode: NodeData, sourcePort: string): boolean => {
    const fallbackValue = extractBooleanValue(sourceNode.data.value, false);
    const rawToggles = Array.isArray(sourceNode.data.toggles)
        ? sourceNode.data.toggles
        : [{ id: 'toggle_1', value: fallbackValue }];

    const toggles = rawToggles
        .map((toggle) => {
            if (!toggle || typeof toggle.id !== 'string') return null;
            const match = toggle.id.match(/^toggle_(\d+)$/);
            if (!match) return null;
            return {
                id: `toggle_${Number(match[1])}`,
                value: extractBooleanValue(toggle.value, fallbackValue),
            };
        })
        .filter((toggle): toggle is { id: string; value: boolean } => toggle !== null);

    const firstValue = toggles[0]?.value ?? fallbackValue;
    if (!sourcePort || sourcePort === 'output-bool' || sourcePort === 'output-main') {
        return firstValue;
    }

    const indexedMatch = sourcePort.match(/^out_(\d+)$/);
    if (!indexedMatch) return firstValue;

    const toggleId = `toggle_${Number(indexedMatch[1])}`;
    const matched = toggles.find((toggle) => toggle.id === toggleId);
    return matched?.value ?? firstValue;
};

const readSourceNodeOutput = (sourceNode: NodeData, sourcePort: string): unknown => {
    if (sourceNode.type === 'number-slider') {
        const values = Array.isArray(sourceNode.data.value)
            ? sourceNode.data.value.filter((item): item is number => isFiniteNumber(item))
            : (isFiniteNumber(sourceNode.data.value) ? [sourceNode.data.value] : []);
        if (values.length === 0) return undefined;

        if (!sourcePort || sourcePort === 'output-main') return values[0];

        const indexedMatch = sourcePort.match(/^output-(\d+)$/);
        if (!indexedMatch) return values[0];
        const outputIndex = Number(indexedMatch[1]) - 1;
        return values[outputIndex] ?? values[0];
    }

    if (sourceNode.type === 'boolean-toggle') {
        return readBooleanToggleOutput(sourceNode, sourcePort);
    }

    if (sourceNode.type === 'series') {
        return sourceNode.data.series ?? sourceNode.data.count;
    }

    if (sourceNode.type === 'prompt') {
        return sourceNode.data.promptOutput ?? '';
    }

    return sourceNode.data.value;
};

export const VertexMaskNode: React.FC<VertexMaskNodeProps> = ({
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
    const sceneContext = useContext(SceneInteractionContext) as SceneInteractionState | null;
    const lastStrokeSignatureRef = useRef<string>('');

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

        const shouldInitHeight = !node.data.height || node.data.height <= 60;
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

        if (!isFiniteNumber(node.data.radius)) {
            dataUpdate.radius = DEFAULT_RADIUS;
        }

        if (!Array.isArray(node.data.value)) {
            dataUpdate.value = [];
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
        node.data.radius,
        node.data.value,
        node.data.inputPortOffsetLeft,
        node.data.outputPortSide,
        node.data.outputPortAbsoluteCentered,
        node.data.outputPortOffsetRight,
        node.data.outputLabelMarginRight,
        node.data.outputEditMarginRight,
        onDataChange,
    ]);

    const resolvedInputs = useMemo<VertexMaskResolvedInputs>(() => {
        const resolveInputValue = (portId: string, fallback: unknown): unknown => {
            const incomingConnection = connections.find((connection) => {
                return connection.targetNodeId === node.id && connection.targetPort === portId;
            });
            if (!incomingConnection) return fallback;

            const sourceNode = nodeMap.get(incomingConnection.sourceNodeId);
            if (!sourceNode) return fallback;

            const outputValue = readSourceNodeOutput(sourceNode, incomingConnection.sourcePort);
            return outputValue ?? fallback;
        };

        const baseRadius = isFiniteNumber(node.data.radius) ? node.data.radius : DEFAULT_RADIUS;
        const radius = extractNumberValue(resolveInputValue('input-radius', baseRadius), baseRadius);
        const smooth = extractBooleanValue(resolveInputValue('input-smooth', false), false);
        const hit = extractBooleanValue(resolveInputValue('input-hit', false), false);
        const erase = extractBooleanValue(resolveInputValue('input-erase', false), false);

        return {
            radius: Math.max(0, radius),
            smooth,
            hit,
            erase,
        };
    }, [connections, node.id, node.data.radius, nodeMap]);

    useEffect(() => {
        if (!resolvedInputs.hit) return;

        const hitPosition = readGlobalHitPosition() || readTargetHitPosition(sceneContext);
        if (!hitPosition) return;

        const maskMark = [
            Number(hitPosition.x.toFixed(6)),
            Number(hitPosition.y.toFixed(6)),
            Number(hitPosition.z.toFixed(6)),
            Number(resolvedInputs.radius.toFixed(6)),
            resolvedInputs.smooth ? 1 : 0,
            resolvedInputs.erase ? 0 : 1,
        ];

        const strokeSignature = maskMark.join('|');
        if (lastStrokeSignatureRef.current === strokeSignature) return;

        const currentValue = Array.isArray(node.data.value) ? node.data.value : null;
        if (currentValue && areArraysEqual(currentValue, maskMark)) {
            lastStrokeSignatureRef.current = strokeSignature;
            return;
        }

        lastStrokeSignatureRef.current = strokeSignature;
        onDataChange(node.id, { value: maskMark });
    }, [node.id, node.data.value, onDataChange, resolvedInputs.erase, resolvedInputs.hit, resolvedInputs.radius, resolvedInputs.smooth, sceneContext]);

    return (
        <CustomNode
            id={node.id}
            data={{
                ...node.data,
                customName: node.data.customName || 'Vertex Mask',
                isNameEditable: false,
                inputs,
                outputs,
                width: node.data.width && node.data.width > 50 ? node.data.width : 280,
                height: fallbackHeight,
                bodyPadding: node.data.bodyPadding || '36px 20px 10px 20px',
                bodyMinHeight: node.data.bodyMinHeight || 60,
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
            nodeType="vertex-mask"
        />
    );
};
