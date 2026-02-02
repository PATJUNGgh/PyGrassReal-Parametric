import React, { useEffect, useMemo, useRef } from 'react';
import { CustomNode } from './CustomNode';
import type { Port } from '../types/NodeTypes';
import styles from './MeshArrayNode.module.css';

type MeshArrayMode = 'linear' | 'box' | 'polar' | 'rectangular';

const MODE_OPTIONS: Array<{ value: MeshArrayMode; label: string; description: string }> = [
    {
        value: 'linear',
        label: 'Linear Array',
        description: 'Array along a direction vector with a single count value.',
    },
    {
        value: 'box',
        label: 'Box Array',
        description: 'Array across X, Y, Z directions using a 3D box cell.',
    },
    {
        value: 'polar',
        label: 'Polar Array',
        description: 'Array around a plane with count and sweep angle.',
    },
    {
        value: 'rectangular',
        label: 'Rectangular Array',
        description: 'Array across X and Y using a rectangular cell.',
    },
];

const OUTPUT_PORTS: Port[] = [
    { id: 'output-mesh', label: 'Mesh', type: 'Mesh' },
    { id: 'output-transform', label: 'Transform', type: 'Transform' },
];

const INPUT_PORTS_BY_MODE: Record<MeshArrayMode, Port[]> = {
    linear: [
        { id: 'input-mesh', label: 'Mesh', type: 'Mesh' },
        { id: 'input-direction', label: 'Direction', type: 'Vector' },
        { id: 'input-count', label: 'Count', type: 'Integer' },
    ],
    box: [
        { id: 'input-mesh', label: 'Mesh', type: 'Mesh' },
        { id: 'input-cell-box', label: 'Cell', type: 'Box' },
        { id: 'input-x-count', label: 'X Count', type: 'Integer' },
        { id: 'input-y-count', label: 'Y Count', type: 'Integer' },
        { id: 'input-z-count', label: 'Z Count', type: 'Integer' },
    ],
    polar: [
        { id: 'input-mesh', label: 'Mesh', type: 'Mesh' },
        { id: 'input-plane', label: 'Plane', type: 'Plane' },
        { id: 'input-count', label: 'Count', type: 'Integer' },
        { id: 'input-angle', label: 'Angle', type: 'Number' },
    ],
    rectangular: [
        { id: 'input-mesh', label: 'Mesh', type: 'Mesh' },
        { id: 'input-cell-rect', label: 'Cell', type: 'Rectangle' },
        { id: 'input-x-count', label: 'X Count', type: 'Integer' },
        { id: 'input-y-count', label: 'Y Count', type: 'Integer' },
    ],
};

const arePortsEqual = (a: Port[] | undefined, b: Port[]): boolean => {
    if (!a || a.length !== b.length) return false;
    return a.every((port, index) => {
        const other = b[index];
        return port.id === other.id && port.label === other.label && port.type === other.type;
    });
};

export const MeshArrayNode: React.FC<Omit<React.ComponentProps<typeof CustomNode>, 'children'>> = (props) => {
    const onDataChangeRef = useRef(props.onDataChange);
    useEffect(() => {
        onDataChangeRef.current = props.onDataChange;
    }, [props.onDataChange]);

    const mode: MeshArrayMode = props.data.meshArrayMode ?? 'linear';
    const expectedInputs = useMemo(() => INPUT_PORTS_BY_MODE[mode], [mode]);
    const activeMode = MODE_OPTIONS.find((option) => option.value === mode) ?? MODE_OPTIONS[0];

    // Keep stored ports synchronized with the selected mode so other systems
    // (like group sizing and overlap checks) see the correct structure.
    useEffect(() => {
        const inputsChanged = !arePortsEqual(props.data.inputs, expectedInputs);
        const outputsChanged = !arePortsEqual(props.data.outputs, OUTPUT_PORTS);

        if (!inputsChanged && !outputsChanged) return;

        onDataChangeRef.current(props.id, {
            meshArrayMode: mode,
            inputs: expectedInputs,
            outputs: OUTPUT_PORTS,
        });
    }, [props.id, props.data.inputs, props.data.outputs, expectedInputs, mode]);

    const enhancedData = useMemo(() => {
        return {
            ...props.data,
            customName: props.data.customName || 'Mesh Array',
            icon: props.data.icon || 'AR',
            width: props.data.width || 360,
            inputs: expectedInputs,
            outputs: OUTPUT_PORTS,
            showInputsWithChildren: true,
            hideInputsAdd: true,
            hideOutputsAdd: true,
            hidePortControls: true,
            resizable: false,
        };
    }, [props.data, expectedInputs]);

    const handleModeChange = (nextMode: MeshArrayMode) => {
        const nextInputs = INPUT_PORTS_BY_MODE[nextMode];
        onDataChangeRef.current(props.id, {
            meshArrayMode: nextMode,
            inputs: nextInputs,
            outputs: OUTPUT_PORTS,
        });
    };

    return (
        <CustomNode {...props} data={enhancedData}>
            <div className={styles.container}>
                <div className={styles.label}>Array Type</div>
                <div className={styles.selectWrap}>
                    <select
                        className={styles.select}
                        value={mode}
                        onChange={(e) => handleModeChange(e.target.value as MeshArrayMode)}
                        onMouseDown={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        {MODE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <span className={styles.chevron}>v</span>
                </div>
                <div className={styles.description}>
                    <span className={styles.descriptionTitle}>{activeMode.label}:</span>
                    {activeMode.description}
                </div>
            </div>
        </CustomNode>
    );
};
