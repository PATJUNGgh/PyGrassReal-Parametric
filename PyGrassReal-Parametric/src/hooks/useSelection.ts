import { useState, useCallback } from 'react';
import type { NodeData, Connection } from '../types/NodeTypes';
import { useNodeGraph } from '../context/NodeGraphContext';

interface UseSelectionProps {
    scale: number;
    offset: { x: number; y: number };
    interactionMode: 'node' | '3d' | 'wire';
    getApproximatePortPosition: (nodeId: string, portId: string) => { x: number; y: number } | null;
    firstSelectedAppId?: string | null;
}

export const useSelection = ({
    scale,
    offset,
    interactionMode,
    getApproximatePortPosition,
    firstSelectedAppId: initialFirstSelectedAppId // Rename to avoid conflict with internal state
}: UseSelectionProps) => {
    const { nodes, connections } = useNodeGraph();
    const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
    const [selectedConnectionIds, setSelectedConnectionIds] = useState<Set<string>>(new Set());
    const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);
    const [firstSelectedId, setFirstSelectedId] = useState<string | null>(initialFirstSelectedAppId ?? null);

    // Helper: Check if port is input
    const isInputPortId = (id: string) => id.includes('input');

    const toggleNodeSelection = useCallback((nodeId: string, multi: boolean) => {
        setSelectedNodeIds(prev => {
            const newSet = new Set(multi ? prev : []);
            if (!multi) {
                // If single select, just select this one.
                setFirstSelectedId(nodeId);
                return new Set([nodeId]);
            }
            // Multi select toggle
            if (newSet.has(nodeId)) {
                newSet.delete(nodeId);
                if (nodeId === firstSelectedId) {
                    setFirstSelectedId(null); // Clear if the first selected is deselected
                }
            } else {
                newSet.add(nodeId);
                if (firstSelectedId === null) {
                    setFirstSelectedId(nodeId); // Set if this is the first in multi-selection
                }
            }
            return newSet;
        });
    }, [firstSelectedId]);

    const startSelectionBox = useCallback((x: number, y: number) => {
        // Convert screen mouse coordinates to World Space 
        // Logic: (screen - offset) / scale
        const worldX = (x - offset.x) / scale;
        const worldY = (y - offset.y) / scale;
        setSelectionBox({ startX: worldX, startY: worldY, currentX: worldX, currentY: worldY });
    }, [offset, scale]);

    const updateSelectionBox = useCallback((x: number, y: number) => {
        if (!selectionBox) return;
        const worldX = (x - offset.x) / scale;
        const worldY = (y - offset.y) / scale;
        setSelectionBox(prev => prev ? { ...prev, currentX: worldX, currentY: worldY } : null);
    }, [selectionBox, offset, scale]);

    const endSelectionBox = useCallback(() => {
        if (!selectionBox) return;

        const minX = Math.min(selectionBox.startX, selectionBox.currentX);
        const maxX = Math.max(selectionBox.startX, selectionBox.currentX);
        const minY = Math.min(selectionBox.startY, selectionBox.currentY);
        const maxY = Math.max(selectionBox.startY, selectionBox.currentY);

        if (interactionMode === 'node') {
            // Find nodes that intersect with selection box
            const newSelectedIds = new Set<string>();
            let detectedFirstSelectedId: string | null = null;

            nodes.forEach(node => {
                const finalWidth = node.data.width || (node.type === 'panel' ? 340 : 280);
                const finalHeight = node.data.height || (node.type === 'panel' ? 300 : 180);

                const nodeRight = node.position.x + finalWidth;
                const nodeBottom = node.position.y + finalHeight;

                // Check intersection
                if (!(node.position.x > maxX || nodeRight < minX ||
                    node.position.y > maxY || nodeBottom < minY)) {
                    newSelectedIds.add(node.id);
                    if (detectedFirstSelectedId === null) {
                        detectedFirstSelectedId = node.id;
                    }
                }
            });
            setSelectedNodeIds(newSelectedIds);
            setFirstSelectedId(detectedFirstSelectedId);
        } else if (interactionMode === 'wire') {
            // Find connections that intersect with selection box
            const newSelectedConnIds = new Set<string>();
            connections.forEach(conn => {
                // Use the provided approximate position getter
                const sourcePos = getApproximatePortPosition(conn.sourceNodeId, conn.sourcePort);
                const targetPos = getApproximatePortPosition(conn.targetNodeId, conn.targetPort);
                if (!sourcePos || !targetPos) return;

                const startX = (sourcePos.x - offset.x) / scale;
                const startY = (sourcePos.y - offset.y) / scale;
                const endX = (targetPos.x - offset.x) / scale;
                const endY = (targetPos.y - offset.y) / scale;

                // Check if simple start/end points are inside (Fast Pass)
                const startInside = startX >= minX && startX <= maxX && startY >= minY && startY <= maxY;
                const endInside = endX >= minX && endX <= maxX && startY >= minY && endY <= maxY;

                if (startInside || endInside) {
                    newSelectedConnIds.add(conn.id);
                    return;
                }

                // Precise Bezier Curve Check in WORLD SPACE
                const dx = endX - startX;
                const controlOffset = Math.max(Math.abs(dx) * 0.5, 50);
                const sourceIsInput = isInputPortId(conn.sourcePort);
                const targetIsInput = isInputPortId(conn.targetPort);
                const cp1x = sourceIsInput ? startX - controlOffset : startX + controlOffset;
                const cp2x = targetIsInput ? endX - controlOffset : endX + controlOffset;

                const samples = 20;
                for (let i = 0; i <= samples; i++) {
                    const t = i / samples;
                    const it = 1 - t;
                    const x = (it * it * it * startX) + (3 * it * it * t * cp1x) + (3 * it * t * t * cp2x) + (t * t * t * endX);
                    const y = (it * it * it * startY) + (3 * it * it * t * startY) + (3 * it * t * t * endY) + (t * t * t * endY);

                    if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
                        newSelectedConnIds.add(conn.id);
                        break;
                    }
                }
            });
            setSelectedConnectionIds(newSelectedConnIds);
        }

        setSelectionBox(null);
    }, [selectionBox, nodes, connections, interactionMode, getApproximatePortPosition, offset, scale]);

    const clearSelection = useCallback(() => {
        setSelectedNodeIds(new Set());
        setSelectedConnectionIds(new Set());
        setFirstSelectedId(null);
    }, []);

    return {
        selectedNodeIds,
        setSelectedNodeIds,
        selectedConnectionIds,
        setSelectedConnectionIds,
        selectionBox,
        setSelectionBox,
        toggleNodeSelection,
        startSelectionBox,
        updateSelectionBox,
        endSelectionBox,
        clearSelection,
        firstSelectedId
    };
};
