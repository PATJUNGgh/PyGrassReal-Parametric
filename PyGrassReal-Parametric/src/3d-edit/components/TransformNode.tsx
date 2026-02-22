import React, { useCallback, useMemo } from 'react';
import { CustomNode } from './CustomNode';
import type { NodeData } from '../types/NodeTypes';

type VectorKey = 'location' | 'rotation' | 'scale';
type Axis = 'x' | 'y' | 'z';
type Vector3Data = { x: number; y: number; z: number };

type TransformNodeProps = Omit<React.ComponentProps<typeof CustomNode>, 'children'> & {
    nodes?: NodeData[];
};

const INPUT_PORTS = [
    { id: 'move_in', label: 'Move', type: 'Vector' as const },
    { id: 'rotate_in', label: 'Rotate', type: 'Vector' as const },
    { id: 'scale_in', label: 'Scale', type: 'Vector' as const },
];

const OUTPUT_PORTS = [
    { id: 'matrix_out', label: 'Matrix', type: 'Matrix' as const },
];

const ROWS: Array<{ label: string; key: VectorKey; inputPort: string }> = [
    { label: 'Move', key: 'location', inputPort: 'move_in' },
    { label: 'Rotate', key: 'rotation', inputPort: 'rotate_in' },
    { label: 'Scale', key: 'scale', inputPort: 'scale_in' },
];

const ROW_HEIGHT = 32;
const ROW_GAP = 4;
const LIST_TOP_PADDING = 2;

const toSafeNumber = (value: unknown, fallback: number): number => {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const toVector3 = (value: unknown, fallback: Vector3Data): Vector3Data => {
    if (!value || typeof value !== 'object') return fallback;
    const maybeVector = value as Partial<Vector3Data>;
    return {
        x: toSafeNumber(maybeVector.x, fallback.x),
        y: toSafeNumber(maybeVector.y, fallback.y),
        z: toSafeNumber(maybeVector.z, fallback.z),
    };
};

const fieldBaseStyle: React.CSSProperties = {
    width: '100%',
    minWidth: 0,
    background: 'rgba(15, 23, 42, 0.7)',
    color: '#f8fafc',
    border: '1px solid rgba(148, 163, 184, 0.5)',
    borderRadius: '6px',
    padding: '4px 6px',
    fontSize: '12px',
    outline: 'none',
    boxSizing: 'border-box',
};

export const TransformNode: React.FC<TransformNodeProps> = (props) => {
    const {
        id,
        data,
        nodes = [],
        connections = [],
        onDataChange,
        ...restProps
    } = props;

    const nodeMap = useMemo(() => {
        return new Map(nodes.map((node) => [node.id, node]));
    }, [nodes]);

    const resolveVectorFromConnection = useMemo(() => {
        const extractNumberValue = (value: unknown): number | null => {
            if (typeof value === 'number' && Number.isFinite(value)) {
                return value;
            }

            if (typeof value === 'string') {
                const parsed = Number(value);
                if (Number.isFinite(parsed)) {
                    return parsed;
                }
            }

            if (Array.isArray(value)) {
                const firstNumeric = value.find((item): item is number => {
                    return typeof item === 'number' && Number.isFinite(item);
                });
                return firstNumeric ?? null;
            }

            return null;
        };

        const readNumberSliderOutput = (sourceNode: NodeData, sourcePort: string): number | null => {
            const values = Array.isArray(sourceNode.data.value)
                ? sourceNode.data.value.filter((item): item is number => typeof item === 'number' && Number.isFinite(item))
                : (typeof sourceNode.data.value === 'number' && Number.isFinite(sourceNode.data.value)
                    ? [sourceNode.data.value]
                    : []);

            if (values.length === 0) return null;
            if (!sourcePort || sourcePort === 'output-main') return values[0];

            const indexedMatch = sourcePort.match(/^output-(\d+)$/);
            if (!indexedMatch) return values[0];

            const outputIndex = Number(indexedMatch[1]) - 1;
            return values[outputIndex] ?? values[0];
        };

        const getIncomingConnection = (targetNodeId: string, targetPort: string) => {
            return connections.find((connection) => {
                return connection.targetNodeId === targetNodeId && connection.targetPort === targetPort;
            }) ?? null;
        };

        const resolveScalarFromInput = (
            targetNodeId: string,
            targetPort: string,
            fallback: number,
            visited: Set<string>
        ): number => {
            const incoming = getIncomingConnection(targetNodeId, targetPort);
            if (!incoming) return fallback;

            const sourceNode = nodeMap.get(incoming.sourceNodeId);
            if (!sourceNode) return fallback;

            const resolved = resolveScalarFromNodeOutput(sourceNode, incoming.sourcePort, visited);
            return resolved ?? fallback;
        };

        const resolveVectorFromInput = (
            targetNodeId: string,
            targetPort: string,
            visited: Set<string>
        ): Vector3Data | null => {
            const incoming = getIncomingConnection(targetNodeId, targetPort);
            if (!incoming) return null;

            const sourceNode = nodeMap.get(incoming.sourceNodeId);
            if (!sourceNode) return null;

            return resolveVectorFromNodeOutput(sourceNode, incoming.sourcePort, visited);
        };

        const resolveScalarFromNodeOutput = (
            sourceNode: NodeData,
            sourcePort: string,
            visited: Set<string>
        ): number | null => {
            const visitedKey = `scalar:${sourceNode.id}:${sourcePort}`;
            if (visited.has(visitedKey)) return null;
            visited.add(visitedKey);
            try {
                if (sourceNode.type === 'number-slider') {
                    return readNumberSliderOutput(sourceNode, sourcePort);
                }

                if (sourceNode.type === 'vector-xyz') {
                    const vector = resolveVectorFromNodeOutput(sourceNode, sourcePort, visited);
                    if (!vector) return null;

                    const normalizedPort = sourcePort.toUpperCase();
                    if (normalizedPort === 'Y') return vector.y;
                    if (normalizedPort === 'Z') return vector.z;
                    return vector.x;
                }

                const directValue = extractNumberValue(sourceNode.data.value);
                if (directValue !== null) {
                    return directValue;
                }

                return null;
            } finally {
                visited.delete(visitedKey);
            }
        };

        const resolveVectorFromNodeOutput = (
            sourceNode: NodeData,
            sourcePort: string,
            visited: Set<string>
        ): Vector3Data | null => {
            const visitedKey = `vector:${sourceNode.id}:${sourcePort}`;
            if (visited.has(visitedKey)) return null;
            visited.add(visitedKey);
            try {
                if (sourceNode.type === 'vector-xyz') {
                    return {
                        x: resolveScalarFromInput(sourceNode.id, 'X', 0, visited),
                        y: resolveScalarFromInput(sourceNode.id, 'Y', 0, visited),
                        z: resolveScalarFromInput(sourceNode.id, 'Z', 0, visited),
                    };
                }

                if (sourceNode.type === 'unit-x' || sourceNode.type === 'unit-y' || sourceNode.type === 'unit-z') {
                    const factor = resolveScalarFromInput(sourceNode.id, 'F', 1, visited);
                    const isNegative = Boolean((sourceNode.data as { negative?: unknown }).negative);
                    const signedFactor = isNegative ? -factor : factor;

                    if (sourceNode.type === 'unit-x') return { x: signedFactor, y: 0, z: 0 };
                    if (sourceNode.type === 'unit-y') return { x: 0, y: signedFactor, z: 0 };
                    return { x: 0, y: 0, z: signedFactor };
                }

                if (sourceNode.type === 'number-slider') {
                    const scalar = readNumberSliderOutput(sourceNode, sourcePort);
                    if (scalar === null) return null;
                    return { x: scalar, y: scalar, z: scalar };
                }

                if (sourceNode.type === 'transform') {
                    const moveFallback = toVector3(sourceNode.data.location, { x: 0, y: 0, z: 0 });
                    const rotateFallback = toVector3(sourceNode.data.rotation, { x: 0, y: 0, z: 0 });
                    const scaleFallback = toVector3(sourceNode.data.scale, { x: 1, y: 1, z: 1 });

                    if (sourcePort === 'rotate_out' || sourcePort === 'rotate_in') {
                        return resolveVectorFromInput(sourceNode.id, 'rotate_in', visited) ?? rotateFallback;
                    }
                    if (sourcePort === 'scale_out' || sourcePort === 'scale_in') {
                        return resolveVectorFromInput(sourceNode.id, 'scale_in', visited) ?? scaleFallback;
                    }

                    return resolveVectorFromInput(sourceNode.id, 'move_in', visited) ?? moveFallback;
                }

                const scalarValue = extractNumberValue(sourceNode.data.value);
                if (scalarValue !== null) {
                    return { x: scalarValue, y: scalarValue, z: scalarValue };
                }

                return null;
            } finally {
                visited.delete(visitedKey);
            }
        };

        return (portId: string): Vector3Data | null => {
            return resolveVectorFromInput(id, portId, new Set<string>());
        };
    }, [connections, id, nodeMap]);

    const move = resolveVectorFromConnection('move_in') ?? toVector3(data.location, { x: 0, y: 0, z: 0 });
    const rotate = resolveVectorFromConnection('rotate_in') ?? toVector3(data.rotation, { x: 0, y: 0, z: 0 });
    const scale = resolveVectorFromConnection('scale_in') ?? toVector3(data.scale, { x: 1, y: 1, z: 1 });

    const connectedInputPorts = useMemo(() => {
        const connected = new Set<string>();
        for (const connection of connections) {
            if (connection.targetNodeId === id) {
                connected.add(connection.targetPort);
            }
        }
        return connected;
    }, [connections, id]);

    const updateAxisValue = useCallback((vectorKey: VectorKey, axis: Axis, rawValue: string) => {
        const parsedValue = Number(rawValue);
        if (!Number.isFinite(parsedValue)) {
            return;
        }

        const currentVector = vectorKey === 'location'
            ? move
            : vectorKey === 'rotation'
                ? rotate
                : scale;

        onDataChange(id, {
            [vectorKey]: {
                ...currentVector,
                [axis]: parsedValue,
            },
        });
    }, [move, rotate, scale, id, onDataChange]);

    const enhancedData = useMemo(() => {
        return {
            ...data,
            customName: data.customName || 'Transform',
            isNameEditable: false,
            width: data.width === 420 ? 300 : (data.width && data.width > 50 ? data.width : 300),
            height: undefined, // Force auto height
            location: move,
            rotation: rotate,
            scale: scale,
            inputs: INPUT_PORTS,
            outputs: OUTPUT_PORTS,
            hideInputsAdd: true,
            hideOutputsAdd: true,
            hidePortControls: true,
            hideModifierMenu: true,
            hidePortLabels: true,
            hideInputsHeader: true,
            hideOutputsHeader: true,
            inputPortOffsetLeft: -30,
            outputPortSide: 'right' as const,
            outputPortAbsoluteCentered: true,
            bodyPadding: '4px 4px 10px 20px',
            bodyMinHeight: 60,
            inputsAreaWidth: 10,
            outputsAreaWidth: 5,
            outputPortOffsetRight: 10,
            outputLabelMarginRight: 44,
            outputEditMarginRight: 42,
            inputListTopPadding: LIST_TOP_PADDING,
            outputListTopPadding: LIST_TOP_PADDING,
            inputRowMinHeight: ROW_HEIGHT,
            outputRowMinHeight: ROW_HEIGHT,
            inputRowGap: ROW_GAP,
            outputRowGap: ROW_GAP,
            inputRowPaddingY: 0,
            outputRowPaddingY: 0,
        };
    }, [data, move, rotate, scale]);

    const vectorValues: Record<VectorKey, Vector3Data> = {
        location: move,
        rotation: rotate,
        scale,
    };

    return (
        <CustomNode
            {...restProps}
            id={id}
            data={enhancedData}
            connections={connections}
            onDataChange={onDataChange}
            nodeType="transform"
        >
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: `${ROW_GAP}px`,
                    paddingTop: `${LIST_TOP_PADDING}px`,
                    width: '100%',
                    minWidth: 0,
                    marginLeft: '-20px',
                }}
            >
                {ROWS.map((row) => {
                    const values = vectorValues[row.key];
                    const isLocked = connectedInputPorts.has(row.inputPort);
                    return (
                        <div
                            key={row.key}
                            style={{
                                minHeight: `${ROW_HEIGHT}px`,
                                display: 'grid',
                                gridTemplateColumns: '40px repeat(3, minmax(0, 1fr))',
                                alignItems: 'center',
                                columnGap: '10px',
                                opacity: isLocked ? 0.72 : 1,
                            }}
                        >
                            <div
                                style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    color: '#e2e8f0',
                                    letterSpacing: '0.4px',
                                }}
                            >
                                {row.label}
                            </div>
                            {(['x', 'y', 'z'] as const).map((axis) => (
                                <label
                                    key={axis}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                    }}
                                    onMouseDown={(event) => event.stopPropagation()}
                                >
                                    <span
                                        style={{
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            color: '#93c5fd',
                                            minWidth: '10px',
                                            textTransform: 'uppercase',
                                        }}
                                    >
                                        {axis}
                                    </span>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={values[axis]}
                                        disabled={isLocked}
                                        onChange={(event) => updateAxisValue(row.key, axis, event.target.value)}
                                        style={{
                                            ...fieldBaseStyle,
                                            cursor: isLocked ? 'not-allowed' : 'text',
                                        }}
                                    />
                                </label>
                            ))}
                        </div>
                    );
                })}
            </div>
        </CustomNode>
    );
};
