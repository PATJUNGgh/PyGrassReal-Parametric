import React, { useMemo } from 'react';
import { CustomNode } from '../CustomNode';
import { usePrompt } from '../../hooks/usePrompt';
import type { NodeData } from '../../types/NodeTypes';
import { PromptOverlay } from './PromptOverlay';

const PROMPT_OUTPUTS: NodeData['data']['outputs'] = [
    { id: 'output-prompt', label: 'Prompt', type: 'String' },
];

type PromptNodeProps = Omit<React.ComponentProps<typeof CustomNode>, 'children'> & {
    nodes: NodeData[];
    interactionMode?: 'node' | '3d' | 'wire';
};

export const PromptNode: React.FC<PromptNodeProps> = (props) => {
    const nodeData = props.data as NodeData['data'];

    const prompt = usePrompt({
        nodeId: props.id,
        nodeData,
        nodes: props.nodes,
        connections: props.connections ?? [],
        onDataChange: props.onDataChange,
    });
    const shouldShowOverlay = prompt.hasWindowConnection;

    const enhancedData = useMemo(() => {
        return {
            ...nodeData,
            customName: nodeData.customName || 'Prompt',
            isNameEditable: false,
            icon: nodeData.icon || '\u270F\uFE0F',
            width: nodeData.width || 260,
            height: nodeData.height || 120,
            promptDraft: nodeData.promptDraft ?? '',
            promptPendingImages: Array.isArray(nodeData.promptPendingImages) ? nodeData.promptPendingImages : [],
            promptOutput: nodeData.promptOutput ?? '',
            inputs: [],
            outputs: PROMPT_OUTPUTS,
            hideInputs: true,
            hideInputsHeader: true,
            hideInputsAdd: true,
            hideOutputsHeader: false,
            hideOutputsAdd: true,
            hidePortControls: true,
            hideModifierMenu: true,
            bodyPadding: nodeData.bodyPadding || '30px 12px 10px 12px',
            bodyMinHeight: nodeData.bodyMinHeight || 22,
            outputsAreaWidth: nodeData.outputsAreaWidth || 62,
            outputPortSide: 'right',
            outputPortAbsoluteCentered: true,
            outputPortOffsetRight: 2,
            outputLabelMarginRight: 44,
            outputEditMarginRight: 42,
            outputListTopPadding: nodeData.outputListTopPadding ?? 0,
            outputRowMinHeight: nodeData.outputRowMinHeight || 20,
            outputRowGap: nodeData.outputRowGap ?? 0,
            outputRowPaddingY: nodeData.outputRowPaddingY ?? 0,
        };
    }, [nodeData]);

    return (
        <>
            <CustomNode
                {...props}
                data={enhancedData}
                nodeType="prompt"
            />

            <PromptOverlay
                enabled={shouldShowOverlay}
                draft={prompt.draft}
                pendingImages={prompt.pendingImages}
                onDraftChange={prompt.setDraft}
                onAddPendingImage={prompt.addPendingImage}
                onRemovePendingImage={prompt.removePendingImage}
                onSubmit={prompt.submitPrompt}
                interactionMode={props.interactionMode}
            />
        </>
    );
};
