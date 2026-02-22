import * as THREE from 'three';
import type { NodeData, Connection } from '../types/NodeTypes';
import { extractBoolean, extractNumber, extractVector3 } from './nodeUtils';

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const readBooleanToggleOutput = (sourceNode: NodeData, sourcePort: string): boolean => {
    const fallbackValue = extractBoolean(sourceNode.data.value, false);
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
                value: extractBoolean(toggle.value, fallbackValue),
            };
        })
        .filter((toggle): toggle is { id: string; value: boolean } => toggle !== null);

    const firstValue = toggles[0]?.value ?? fallbackValue;
    if (!sourcePort || sourcePort === 'output-bool' || sourcePort === 'output-main') {
        return firstValue;
    }

    const indexedMatch = sourcePort.match(/^out_(\d+)$/);
    if (!indexedMatch) {
        return firstValue;
    }

    const toggleId = `toggle_${Number(indexedMatch[1])}`;
    const matched = toggles.find((toggle) => toggle.id === toggleId);
    return matched?.value ?? firstValue;
};

const readSourceNodeOutput = (
    sourceNode: NodeData,
    sourcePort: string,
    getInputValueFn: (nodeId: string, portId: string, defaultValue?: any) => any
): any => {
    if (sourceNode.type === 'number-slider') {
        const values = Array.isArray(sourceNode.data.value)
            ? sourceNode.data.value.filter((item): item is number => isFiniteNumber(item))
            : (isFiniteNumber(sourceNode.data.value) ? [sourceNode.data.value] : []);

        if (values.length === 0) return 0;
        if (!sourcePort || sourcePort === 'output-main') return values[0];

        const indexedMatch = sourcePort.match(/^output-(\d+)$/);
        if (!indexedMatch) return values[0];

        const outputIndex = Number(indexedMatch[1]) - 1;
        return values[outputIndex] ?? values[0];
    }

    if (sourceNode.type === 'boolean-toggle') {
        return readBooleanToggleOutput(sourceNode, sourcePort);
    }

    if (sourceNode.type === 'unit-x') {
        const factor = extractNumber(getInputValueFn(sourceNode.id, 'F', 1), 1);
        const neg = sourceNode.data.negative ? -1 : 1;
        return new THREE.Vector3(factor * neg, 0, 0);
    }
    if (sourceNode.type === 'unit-y') {
        const factor = extractNumber(getInputValueFn(sourceNode.id, 'F', 1), 1);
        const neg = sourceNode.data.negative ? -1 : 1;
        return new THREE.Vector3(0, factor * neg, 0);
    }
    if (sourceNode.type === 'unit-z') {
        const factor = extractNumber(getInputValueFn(sourceNode.id, 'F', 1), 1);
        const neg = sourceNode.data.negative ? -1 : 1;
        return new THREE.Vector3(0, 0, factor * neg);
    }
    if (sourceNode.type === 'vector-xyz') {
        const x = extractNumber(getInputValueFn(sourceNode.id, 'X', 0), 0);
        const y = extractNumber(getInputValueFn(sourceNode.id, 'Y', 0), 0);
        const z = extractNumber(getInputValueFn(sourceNode.id, 'Z', 0), 0);
        return new THREE.Vector3(x, y, z);
    }

    if (sourceNode.type === 'transform') {
        const defaultMove = extractVector3(sourceNode.data.location, new THREE.Vector3(0, 0, 0));
        const defaultRotate = extractVector3(sourceNode.data.rotation, new THREE.Vector3(0, 0, 0));
        const defaultScale = extractVector3(sourceNode.data.scale, new THREE.Vector3(1, 1, 1));

        if (sourcePort === 'move_out' || sourcePort === 'move_in' || sourcePort === '') {
            return extractVector3(getInputValueFn(sourceNode.id, 'move_in', defaultMove), defaultMove);
        }
        if (sourcePort === 'rotate_out' || sourcePort === 'rotate_in') {
            return extractVector3(getInputValueFn(sourceNode.id, 'rotate_in', defaultRotate), defaultRotate);
        }
        if (sourcePort === 'scale_out' || sourcePort === 'scale_in') {
            return extractVector3(getInputValueFn(sourceNode.id, 'scale_in', defaultScale), defaultScale);
        }
    }

    if (sourceNode.type === 'prompt') {
        return sourceNode.data.promptOutput ?? '';
    }

    if (sourceNode.type === 'ai-assistant') {
        return sourceNode.data.aiAssistantResponse ?? '';
    }

    if (sourceNode.type === 'vertex-mask') {
        if (Array.isArray(sourceNode.data.value)) return sourceNode.data.value;
        return sourceNode.data.value ?? [];
    }

    if (sourceNode.type === 'ai-sculpt') {
        return sourceNode.data.sculptResult ?? sourceNode.data.sculptPlan ?? sourceNode.data.sculptOps;
    }

    if (sourceNode.type === 'ai-paint') {
        return sourceNode.data.paintResult ?? sourceNode.data.paintPlan ?? sourceNode.data.paintOps;
    }

    if (typeof sourceNode.data.value !== 'undefined') {
        return sourceNode.data.value;
    }

    if (typeof sourceNode.data.count !== 'undefined') {
        return sourceNode.data.count;
    }

    return undefined;
};

export const resolveInputValue = (
    nodeId: string,
    portId: string,
    nodeMap: Map<string, NodeData>,
    connections: Connection[],
    defaultValue: any = 0
): any => {
    const resolveInternalInput = (subNodeId: string, subPortId: string, subDefaultValue: any) => {
        const subSourceConn = connections.find(c => c.targetNodeId === subNodeId && c.targetPort === subPortId);
        const subSource = subSourceConn ? nodeMap.get(subSourceConn.sourceNodeId) : null;
        return subSource ? readSourceNodeOutput(subSource, subSourceConn!.sourcePort, resolveInternalInput) : subDefaultValue;
    };

    if (portId === '') {
        const nodeAsSource = nodeMap.get(nodeId);
        if (nodeAsSource) {
            const rawValue = readSourceNodeOutput(nodeAsSource, 'output-main', resolveInternalInput);
            if (rawValue !== undefined) return rawValue;
        }
        return defaultValue;
    }

    const sourceConnection = connections.find(c => c.targetNodeId === nodeId && c.targetPort === portId);
    if (!sourceConnection) return defaultValue;
    const source = nodeMap.get(sourceConnection.sourceNodeId);
    if (!source) return defaultValue;

    const rawValue = readSourceNodeOutput(source, sourceConnection.sourcePort, resolveInternalInput);
    return rawValue !== undefined ? rawValue : defaultValue;
};

export const resolveVectorValue = (
    nodeId: string,
    portId: string,
    nodeMap: Map<string, NodeData>,
    connections: Connection[]
): THREE.Vector3 => {
    const val = resolveInputValue(nodeId, portId, nodeMap, connections, null);
    if (val instanceof THREE.Vector3) return val;
    if (isFiniteNumber(val)) return new THREE.Vector3(val, val, val);
    if (Array.isArray(val)) {
        const scalar = extractNumber(val, 0);
        return new THREE.Vector3(scalar, scalar, scalar);
    }
    return new THREE.Vector3(0, 0, 0);
};

export { isFiniteNumber, readSourceNodeOutput };
