import { useMemo, useEffect } from 'react';
import type { NodeData } from '../types/NodeTypes';

interface PictureLayerProps {
    pictureLayerTransformTarget: any;
    selectedIds: Set<string>;
    nodes: NodeData[];
    setPictureLayerTransformMode: (mode: 'translate' | 'rotate' | 'scale') => void;
}

export function usePictureLayerLogic({
    pictureLayerTransformTarget,
    selectedIds,
    nodes,
    setPictureLayerTransformMode
}: PictureLayerProps) {
    const isPictureLayerTransformActive = useMemo(() => 
        !!pictureLayerTransformTarget && selectedIds?.size === 1 && selectedIds.has(pictureLayerTransformTarget.renderableNodeId)
    , [pictureLayerTransformTarget, selectedIds]);

    useEffect(() => {
        if (!isPictureLayerTransformActive) {
            setPictureLayerTransformMode('translate');
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) return;

            const key = event.key.toLowerCase();
            if (key === 'w') setPictureLayerTransformMode('translate');
            else if (key === 'e') setPictureLayerTransformMode('rotate');
            else if (key === 'r') setPictureLayerTransformMode('scale');
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPictureLayerTransformActive, setPictureLayerTransformMode]);

    const activePictureLayerPlacement = useMemo(() => {
        if (!pictureLayerTransformTarget) return null;
        const pictureNode = nodes.find(node => node.id === pictureLayerTransformTarget.pictureNodeId);
        const layers = pictureNode?.data.pictureData?.layers;
        if (!Array.isArray(layers)) return null;

        const targetLayer = layers.find(l => l?.id === pictureLayerTransformTarget.layerId);
        const placements = targetLayer?.placements;
        if (!Array.isArray(placements) || placements.length === 0) return null;

        const latest = placements[placements.length - 1];
        return {
            worldPos: latest?.worldPos,
            scale: latest?.scale,
            rotation: latest?.rotation
        };
    }, [nodes, pictureLayerTransformTarget]);

    return { isPictureLayerTransformActive, activePictureLayerPlacement };
}
