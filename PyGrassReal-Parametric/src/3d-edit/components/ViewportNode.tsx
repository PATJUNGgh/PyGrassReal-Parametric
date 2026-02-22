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
const VIEWPORT_OUTPUTS: NodeData['data']['outputs'] = [
    { id: 'output-viewport', label: 'Viewport', type: 'Viewport' },
];

export const ViewportNode: React.FC<Omit<React.ComponentProps<typeof CustomNode>, 'children'>> = (props) => {
    const selectedMode = typeof props.data.viewportMode === 'string'
        ? props.data.viewportMode
        : 'rendered';

    const enhancedData = useMemo(() => {
        return {
            ...props.data,
            customName: props.data.customName || 'Viewport',
            isNameEditable: false,
            width: 230,
            height: 156,
            bodyPadding: '7px 10px 12px 10px',
            bodyMinHeight: 84,
            inputs: [],
            outputs: props.data.outputs && props.data.outputs.length > 0 ? props.data.outputs : VIEWPORT_OUTPUTS,
            hideInputs: true,
            hideOutputs: false,
            hidePortLabels: true,
            hideOutputsAdd: true,
            hideOutputsHeader: true,
            hidePortControls: true,
            outputsAreaWidth: 14,
            outputPortSide: 'right',
            outputPortAbsoluteCentered: true,
            outputPortOffsetRight: 2,
            outputListTopPadding: 0,
            outputRowMinHeight: 78,
            outputRowGap: 0,
            outputRowPaddingY: 0,
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
