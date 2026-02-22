import React, { useMemo } from 'react';
import { CustomNode } from './CustomNode';
import type { Port } from '../types/NodeTypes';

type Build3DAiNodeProps = Omit<React.ComponentProps<typeof CustomNode>, 'children'>;

const INPUT_PORTS: Port[] = [
    { id: 'input-scope', label: 'Scope', type: 'Bounds' },
    { id: 'input-transform', label: 'Transform', type: 'Matrix' },
];

const OUTPUT_PORTS: Port[] = [
    { id: 'output-geometry', label: 'Geometry', type: 'Mesh' },
];

export const Build3DAiNode: React.FC<Build3DAiNodeProps> = (props) => {
    const { data } = props;

    const enhancedData = useMemo(() => {
        return {
            ...data,
            customName: data.customName || 'Build 3D AI',
            isNameEditable: false,
            width: 230,
            height: undefined,
            bodyPadding: '36px 20px 10px 20px',
            bodyMinHeight: 60,
            inputPortOffsetLeft: -30,
            outputPortSide: 'right',
            outputPortAbsoluteCentered: true,
            outputPortOffsetRight: 10,
            outputLabelMarginRight: typeof data.outputLabelMarginRight === 'number' ? data.outputLabelMarginRight : 44,
            outputEditMarginRight: typeof data.outputEditMarginRight === 'number' ? data.outputEditMarginRight : 42,
            inputs: INPUT_PORTS,
            outputs: OUTPUT_PORTS,
            hideInputsAdd: true,
            hideOutputsAdd: true,
            hidePortControls: true,
            hideModifierMenu: true,
            resizable: false,
        };
    }, [data]);

    return <CustomNode {...props} data={enhancedData} />;
};
