import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Connection, NodeData, PendingImageItem } from '../types/NodeTypes';

interface UsePromptParams {
    nodeId: string;
    nodeData: NodeData['data'];
    nodes: NodeData[];
    connections: Connection[];
    onDataChange: (id: string, data: Partial<NodeData['data']>) => void;
}

const createSubmissionId = () => `prompt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const usePrompt = ({
    nodeId,
    nodeData,
    nodes,
    connections,
    onDataChange,
}: UsePromptParams) => {
    const [draft, setDraftState] = useState<string>(nodeData.promptDraft ?? '');
    const [pendingImages, setPendingImagesState] = useState<PendingImageItem[]>(
        Array.isArray(nodeData.promptPendingImages) ? nodeData.promptPendingImages : []
    );

    useEffect(() => {
        if (typeof nodeData.promptDraft === 'string') {
            setDraftState(nodeData.promptDraft);
            return;
        }
        setDraftState('');
    }, [nodeData.promptDraft]);

    useEffect(() => {
        setPendingImagesState(Array.isArray(nodeData.promptPendingImages) ? nodeData.promptPendingImages : []);
    }, [nodeData.promptPendingImages]);

    const hasWindowConnection = useMemo(() => {
        return connections.some((connection) => {
            const isPromptInLink = connection.sourceNodeId === nodeId || connection.targetNodeId === nodeId;
            if (!isPromptInLink) return false;

            const otherNodeId = connection.sourceNodeId === nodeId
                ? connection.targetNodeId
                : connection.sourceNodeId;
            const otherNode = nodes.find((node) => node.id === otherNodeId);
            return otherNode?.type === 'widget-window';
        });
    }, [connections, nodeId, nodes]);

    const setDraft = useCallback((value: string) => {
        setDraftState(value);
        onDataChange(nodeId, { promptDraft: value });
    }, [nodeId, onDataChange]);

    const addPendingImage = useCallback((item: PendingImageItem) => {
        setPendingImagesState((previous) => {
            const next = [...previous, item];
            onDataChange(nodeId, { promptPendingImages: next });
            return next;
        });
    }, [nodeId, onDataChange]);

    const removePendingImage = useCallback((imageId: string) => {
        setPendingImagesState((previous) => {
            const next = previous.filter((item) => item.id !== imageId);
            onDataChange(nodeId, { promptPendingImages: next });
            return next;
        });
    }, [nodeId, onDataChange]);

    const submitPrompt = useCallback(() => {
        const text = draft.trim();
        if (!text && pendingImages.length === 0) return;

        const promptPayload = {
            id: createSubmissionId(),
            text,
            images: pendingImages.map((item) => ({
                id: item.id,
                name: item.name,
                dataUrl: item.dataUrl,
            })),
            submittedAt: Date.now(),
        };

        const serializedOutput = JSON.stringify(promptPayload);

        setDraftState('');
        setPendingImagesState([]);
        onDataChange(nodeId, {
            promptDraft: '',
            promptPendingImages: [],
            promptOutput: serializedOutput,
        });
    }, [draft, nodeId, onDataChange, pendingImages]);

    return {
        hasWindowConnection,
        draft,
        pendingImages,
        setDraft,
        addPendingImage,
        removePendingImage,
        submitPrompt,
    };
};
