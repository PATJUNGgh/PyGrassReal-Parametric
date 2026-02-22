import React, { useMemo } from 'react';
import { CustomNode } from '../CustomNode';
import { useAiAssistant } from '../../hooks/useAiAssistant';
import type { NodeData } from '../../types/NodeTypes';
import { AiAssistantPanel } from './AiAssistantPanel';

const AI_ASSISTANT_OUTPUTS: NodeData['data']['outputs'] = [
    { id: 'output-response', label: 'AI Response', type: 'String' },
];

type AiAssistantNodeProps = Omit<React.ComponentProps<typeof CustomNode>, 'children'> & {
    nodes: NodeData[];
    interactionMode?: 'node' | '3d' | 'wire';
};

export const AiAssistantNode: React.FC<AiAssistantNodeProps> = (props) => {
    const assistant = useAiAssistant({
        nodeId: props.id,
        nodeData: props.data,
        nodes: props.nodes,
        connections: props.connections ?? [],
        onDataChange: props.onDataChange,
    });

    const enhancedData = useMemo(() => {
        return {
            ...props.data,
            customName: props.data.customName || 'AI Assistant',
            isNameEditable: false,
            width: props.data.width || 250,
            height: props.data.height || 120,
            inputs: [],
            outputs: AI_ASSISTANT_OUTPUTS,
            hideInputs: true,
            hideInputsHeader: true,
            hideInputsAdd: true,
            hideOutputsAdd: true,
            hidePortControls: true,
            hideModifierMenu: true,
            bodyPadding: props.data.bodyPadding || '34px 12px 8px 12px',
            bodyMinHeight: props.data.bodyMinHeight || 18,
            outputsAreaWidth: props.data.outputsAreaWidth || 84,
            outputListTopPadding: props.data.outputListTopPadding ?? 0,
            outputRowMinHeight: props.data.outputRowMinHeight || 22,
            outputRowGap: props.data.outputRowGap ?? 0,
            outputRowPaddingY: props.data.outputRowPaddingY ?? 0,
            outputPortSide: 'right' as const,
            outputPortAbsoluteCentered: true,
            outputPortOffsetRight: 3,
            outputLabelMarginRight: 44,
            outputEditMarginRight: 42,
        };
    }, [props.data]);

    return (
        <>
            <CustomNode
                {...props}
                data={enhancedData}
                nodeType="ai-assistant"
            />

            <AiAssistantPanel
                enabled={assistant.hasWindowConnection}
                visible={assistant.panelVisible}
                position={assistant.panelPosition}
                size={assistant.panelSize}
                messages={assistant.chatMessages}
                draft={assistant.draft}
                chatModel={assistant.chatModel}
                actionMode={assistant.actionMode}
                planMarkdown={assistant.planMarkdown}
                planPanelVisible={assistant.planPanelVisible}
                planPanelWidth={assistant.planPanelWidth}
                showHistoryMenu={assistant.showHistoryMenu}
                incomingPreview={assistant.incomingPreview}
                pendingImages={assistant.pendingImages}
                activeSessionId={assistant.activeSessionId}
                sessionList={assistant.sessionList}
                canCreateSession={assistant.canCreateSession}
                onDraftChange={assistant.setDraft}
                onChatModelChange={assistant.setChatModel}
                onActionModeChange={assistant.setActionMode}
                onPlanMarkdownChange={assistant.setPlanMarkdown}
                onTogglePlanPanel={assistant.togglePlanPanel}
                onPlanPanelWidthChange={assistant.setPlanPanelWidth}
                onToggleHistoryMenu={() => assistant.setShowHistoryMenu(!assistant.showHistoryMenu)}
                onUseIncomingPreview={assistant.applyIncomingPreviewToDraft}
                onAddPendingImage={assistant.addPendingImage}
                onRemovePendingImage={assistant.removePendingImage}
                onCreateSession={assistant.createChatSession}
                onSelectSession={assistant.selectChatSession}
                onDeleteSession={assistant.deleteChatSession}
                onSend={assistant.submitMessage}
                onShow={assistant.showPanel}
                onHide={assistant.hidePanel}
                onPositionPreview={assistant.previewPanelPosition}
                onPositionCommit={assistant.commitPanelPosition}
                onSizePreview={assistant.previewPanelSize}
                onSizeCommit={assistant.commitPanelSize}
                interactionMode={props.interactionMode}
            />
        </>
    );
};
