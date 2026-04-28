import React from 'react';
import { useNodeGraph } from '../../context/NodeGraphContext';
import { PromptOverlay } from './PromptOverlay';
import { usePrompt } from '../../hooks/usePrompt';
import type { NodeData, Connection } from '../../types/NodeTypes';

interface ConnectedPromptProps {
    nodeId: string;
    nodeData: NodeData['data'];
    nodes: NodeData[];
    connections: Connection[];
    interactionMode?: 'node' | '3d' | 'wire';
    onDataChange: (id: string, updates: Partial<NodeData['data']>) => void;
}

const ConnectedPrompt: React.FC<ConnectedPromptProps> = ({
    nodeId,
    nodeData,
    nodes,
    connections,
    interactionMode,
    onDataChange,
}) => {
    const prompt = usePrompt({
        nodeId,
        nodeData,
        nodes,
        connections,
        onDataChange,
    });

    return (
        <PromptOverlay
            enabled={prompt.hasWindowConnection}
            draft={prompt.draft}
            pendingImages={prompt.pendingImages}
            onDraftChange={prompt.setDraft}
            onAddPendingImage={prompt.addPendingImage}
            onRemovePendingImage={prompt.removePendingImage}
            onSubmit={prompt.submitPrompt}
            interactionMode={interactionMode}
        />
    );
};

export const GlobalPromptOverlays: React.FC<{ interactionMode?: 'node' | '3d' | 'wire' }> = ({ interactionMode }) => {
    const { nodes, connections, updateNodeData } = useNodeGraph();

    const promptNodes = nodes.filter(n => n.type === 'prompt' || n.type === 'node-prompt');

    return (
        <>
            {promptNodes.map(node => (
                <ConnectedPrompt
                    key={`prompt-overlay-${node.id}`}
                    nodeId={node.id}
                    nodeData={node.data}
                    nodes={nodes}
                    connections={connections}
                    interactionMode={interactionMode}
                    onDataChange={updateNodeData}
                />
            ))}
        </>
    );
};
