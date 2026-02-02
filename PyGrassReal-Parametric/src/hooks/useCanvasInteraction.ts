import { useCallback, useEffect } from 'react';
import type { NodeData } from '../types/NodeTypes';

interface UseCanvasInteractionProps {
    canvasRef: React.RefObject<HTMLDivElement>;
    interactive: boolean;
    interactionMode: 'node' | '3d' | 'wire';
    handlePanStart: (e: React.MouseEvent) => boolean;
    handlePanMove: (e: React.MouseEvent) => boolean;
    handlePanEnd: () => void;
    selectionBox: { startX: number; startY: number; currentX: number; currentY: number; } | null;
    startSelectionBox: (x: number, y: number) => void;
    updateSelectionBox: (x: number, y: number) => void;
    endSelectionBox: () => void;
    clearSelection: () => void;
    draggingConnection: { sourceNodeId: string; sourcePort: string; x: number; y: number; } | null;
    cancelConnection: () => void;
    updateConnectionDrag: (e: React.MouseEvent) => void;
    addNode: (type: NodeData['type'], position: { x: number, y: number }, data?: any) => void;
    offset: { x: number; y: number };
    scale: number;
    newNodeCategory?: 'nodes' | 'widget';
    showSearchBox: (x: number, y: number) => void;
    activeDragNode: { type: NodeData['type'], x: number, y: number } | null;
    setActiveDragNode: ((node: { type: NodeData['type'], x: number, y: number } | null) => void) | undefined;
}

export function useCanvasInteraction({
    canvasRef,
    interactive,
    interactionMode,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    selectionBox,
    startSelectionBox,
    updateSelectionBox,
    endSelectionBox,
    clearSelection,
    draggingConnection,
    cancelConnection,
    updateConnectionDrag,
    addNode,
    offset,
    scale,
    newNodeCategory,
    showSearchBox,
    activeDragNode,
    setActiveDragNode,
}: UseCanvasInteractionProps) {

    const onMouseDown = useCallback((e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const isNoSelectionElement = target.closest('[data-no-selection="true"]');
        const isUIControl = target.closest('button, input, label, select, .node-port');
        if (isNoSelectionElement || isUIControl) return;

        if (handlePanStart(e)) return;

        if (e.button === 0 && !e.altKey && canvasRef.current && (interactionMode === 'node' || interactionMode === 'wire')) {
            clearSelection();
            const rect = canvasRef.current.getBoundingClientRect();
            startSelectionBox(e.clientX - rect.left, e.clientY - rect.top);
        }
    }, [handlePanStart, interactionMode, clearSelection, startSelectionBox, canvasRef]);

    const onMouseMove = useCallback((e: React.MouseEvent) => {
        if (handlePanMove(e)) return;

        if (selectionBox && canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            updateSelectionBox(e.clientX - rect.left, e.clientY - rect.top);
        }
        updateConnectionDrag(e);
    }, [handlePanMove, selectionBox, updateSelectionBox, updateConnectionDrag, canvasRef]);

    const onMouseUp = useCallback(() => {
        handlePanEnd();
        endSelectionBox();
        if (draggingConnection) {
            cancelConnection();
        }
    }, [handlePanEnd, endSelectionBox, draggingConnection, cancelConnection]);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const nodeType = e.dataTransfer.getData('nodeType');
        if (nodeType && canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            const screenX = e.clientX - rect.left;
            const screenY = e.clientY - rect.top;
            addNode(nodeType as NodeData['type'], {
                x: (screenX - offset.x) / scale,
                y: (screenY - offset.y) / scale,
            }, { editorOrigin: newNodeCategory });
        }
    }, [addNode, offset, scale, newNodeCategory, canvasRef]);

    const onDragOver = useCallback((e: React.DragEvent) => e.preventDefault(), []);

    const onDoubleClick = useCallback((e: React.MouseEvent) => {
        if (!interactive || interactionMode === '3d') return;
        const target = e.target as HTMLElement;
        if (target.closest('.custom-node-base, .widget-window-node-base, .group-node-base, button, input, select')) {
            return;
        }
        if (canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            showSearchBox(e.clientX - rect.left, e.clientY - rect.top);
        }
    }, [interactive, interactionMode, canvasRef, showSearchBox]);

    useEffect(() => {
        if (!activeDragNode || !setActiveDragNode) return;
        const handleWindowPointerUp = (e: PointerEvent) => {
            if (activeDragNode && canvasRef.current) {
                const rect = canvasRef.current.getBoundingClientRect();
                const isOverCanvas = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
                if (isOverCanvas) {
                    const screenX = e.clientX - rect.left;
                    const screenY = e.clientY - rect.top;
                    addNode(activeDragNode.type, {
                        x: (screenX - offset.x) / scale,
                        y: (screenY - offset.y) / scale,
                    }, { editorOrigin: newNodeCategory });
                }
                if (window.getSelection) window.getSelection()?.removeAllRanges();
                setActiveDragNode(null);
            }
        };
        window.addEventListener('pointerup', handleWindowPointerUp);
        return () => window.removeEventListener('pointerup', handleWindowPointerUp);
    }, [activeDragNode, setActiveDragNode, addNode, offset, scale, newNodeCategory, canvasRef]);

    return {
        onMouseDown,
        onMouseMove,
        onMouseUp,
        onMouseLeave: onMouseUp,
        onDrop,
        onDragOver,
        onDoubleClick,
    };
}
