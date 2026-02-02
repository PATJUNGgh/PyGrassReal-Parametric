import React, { useMemo } from 'react';
import { CustomNode } from './CustomNode';
import type { NodeData } from '../types/NodeTypes';
import styles from './ViewportNode.module.css';

const VIEW_MODES = [
    {
        value: 'rendered',
        label: 'Render',
        description: 'A fast simulation of the rendered object.',
    },
    {
        value: 'wireframe',
        label: 'Wireframe',
        description: 'The classic CAD working mode: an unshaded wireframe.',
    },
    {
        value: 'depth',
        label: 'Depth',
        description: 'Shows camera distance to read spatial depth and object layering.',
    },
    {
        value: 'monochrome',
        label: 'Monochrome',
        description: 'Combines the effects of a white studio look and a sketch feel.',
    },
];

export const ViewportNode: React.FC<Omit<React.ComponentProps<typeof CustomNode>, 'children'>> = (props) => {
    const selectedMode = typeof props.data.viewportMode === 'string'
        ? props.data.viewportMode
        : 'rendered';

    const enhancedData = useMemo(() => {
        return {
            ...props.data,
            customName: props.data.customName || 'Viewport',
            width: props.data.width || 300,
            height: props.data.height || 170,
            inputs: [],
            outputs: [],
            hideInputs: true,
            hideOutputs: true,
            hideOutputsAdd: true,
            hideOutputsHeader: true,
            hidePortControls: true,
            resizable: false,
        };
    }, [props.data]);

    const activeMode = VIEW_MODES.find((mode) => mode.value === selectedMode) ?? VIEW_MODES[0];

    const handleModeChange = (nextMode: string) => {
        props.onDataChange(props.id, {
            viewportMode: nextMode,
            viewportUpdatedAt: Date.now(),
        });
    };

    return (
        <CustomNode {...props} data={enhancedData}>
            <div className={styles.container}>
                <div className={styles.label}>View Mode</div>
                <div className={styles.selectWrap}>
                    <select
                        className={styles.select}
                        value={selectedMode}
                        onChange={(e) => handleModeChange(e.target.value)}
                        onMouseDown={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        {VIEW_MODES.map((mode) => (
                            <option key={mode.value} value={mode.value}>
                                {mode.label}
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
