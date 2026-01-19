import { useState, useCallback } from 'react';
import type { NodeData, Connection } from '../types/NodeTypes';

interface UseSelectionProps {
    nodes: NodeData[];
    connections: Connection[];
    scale: number;
    offset: { x: number; y: number };
    interactionMode: 'node' | '3d' | 'wire';
    getApproximatePortPosition: (nodeId: string, portId: string) => { x: number; y: number } | null;
}

export const useSelection = ({
    nodes,
    connections,
    scale,
    offset,
    interactionMode,
    getApproximatePortPosition
}: UseSelectionProps) => {
    const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
    const [selectedConnectionIds, setSelectedConnectionIds] = useState<Set<string>>(new Set());
    const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);

    // Helper: Check if port is input
    const isInputPortId = (id: string) => id.includes('input');

    const handleNodeSelect = useCallback((nodeId: string) => {
        setSelectedNodeIds(prev => {
            // For now, simple toggle/select. 
            // NOTE: The original code often clears others unless Ctrl is pressed.
            // The original handleNodeSelect was:
            // if (e.ctrlKey) ... else ...
            // We'll leave the complex event logic to the caller or accept a 'multi' flag.

            // Actually, looking at usages, usually we select just one unless multiselect.
            // Let's rely on NodeCanvas to pass the logic or start with simple set.
            return new Set([nodeId]);
        });
    }, []);

    const toggleNodeSelection = useCallback((nodeId: string, multi: boolean) => {
        setSelectedNodeIds(prev => {
            const newSet = new Set(multi ? prev : []);
            if (!multi) {
                // If single select, just select this one.
                return new Set([nodeId]);
            }
            // Multi select toggle
            if (newSet.has(nodeId)) {
                newSet.delete(nodeId);
            } else {
                newSet.add(nodeId);
            }
            return newSet;
        });
    }, []);

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
            nodes.forEach(node => {
                const nodeWidth = 280; // Approximate
                const nodeHeight = 300; // Approximate

                // For better accuracy, we could use the actual data width/height if available
                const finalWidth = node.data.width || (node.type === 'panel' ? 340 : 280);
                const finalHeight = node.data.height || (node.type === 'panel' ? 300 : 180);

                const nodeRight = node.position.x + finalWidth;
                const nodeBottom = node.position.y + finalHeight;

                // Check intersection
                if (!(node.position.x > maxX || nodeRight < minX ||
                    node.position.y > maxY || nodeBottom < minY)) {
                    newSelectedIds.add(node.id);
                }
            });
            setSelectedNodeIds(newSelectedIds);
        } else if (interactionMode === 'wire') {
            // Find connections that intersect with selection box
            const newSelectedConnIds = new Set<string>();
            connections.forEach(conn => {
                // Use the provided approximate position getter
                const sourcePos = getApproximatePortPosition(conn.sourceNodeId, conn.sourcePort);
                const targetPos = getApproximatePortPosition(conn.targetNodeId, conn.targetPort);
                if (!sourcePos || !targetPos) return;

                // getApproximatePortPosition return SCREEN coordinates usually (based on previous code).
                // But selectionBox is in WORLD coordinates.
                // NOTE: Previous code converted approximate positions (screen) to world:
                // const startX = (sourcePos.x - offset.x) / scale;
                // We must emulate that.

                const startX = (sourcePos.x - offset.x) / scale;
                const startY = (sourcePos.y - offset.y) / scale;
                const endX = (targetPos.x - offset.x) / scale;
                const endY = (targetPos.y - offset.y) / scale;

                // Check if simple start/end points are inside (Fast Pass)
                const startInside = startX >= minX && startX <= maxX && startY >= minY && startY <= maxY;
                const endInside = endX >= minX && endX <= maxX && endY >= minY && endY <= maxY;

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
        clearSelection
    };
};
