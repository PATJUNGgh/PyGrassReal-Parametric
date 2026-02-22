import { useEffect } from 'react';
import type { NodeData, Port } from '../types/NodeTypes';
import { getNodeDefinition } from '../definitions/nodeDefinitions';

interface UseNodeDefaultsProps {
    node: NodeData;
    onDataChange: (id: string, data: Partial<NodeData['data']>) => void;
    calculateFallbackHeight: (maxPorts: number) => number;
}

export const useNodeDefaults = ({ node, onDataChange, calculateFallbackHeight }: UseNodeDefaultsProps) => {
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
        onDataChange,
        calculateFallbackHeight,
    ]);
};


