import { useCallback, useEffect, useState } from 'react';
import type { NodeData } from '../types/NodeTypes';
import { hitTestNode } from '../interaction/hitTestPolicy';
import { shouldDeselect, shouldStartDrag, shouldStartSelectionBox } from '../interaction/interactionPolicy';

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
    showSearchBox: (x: number, y: number, context?: { sourceNodeId: string, sourcePortId: string }) => void;
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
    const [mouseDownPos, setMouseDownPos] = useState({ x: 0, y: 0 });

    const onClick = useCallback((e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const hitResult = hitTestNode(
            { x: e.clientX, y: e.clientY },
            { element: target }
        );
        if (hitResult.hit) return;
        if (!shouldDeselect(target, e)) return;

        // Threshold to distinguish click from drag panning
        const dist = Math.sqrt(Math.pow(e.clientX - mouseDownPos.x, 2) + Math.pow(e.clientY - mouseDownPos.y, 2));
        if (dist > 5) return;

        if (draggingConnection) {
            cancelConnection();
            return;
        }

        clearSelection();
    }, [mouseDownPos, draggingConnection, cancelConnection, clearSelection]);

    const onMouseDown = useCallback((e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!shouldStartDrag(target, e)) return;

        setMouseDownPos({ x: e.clientX, y: e.clientY });

        if (handlePanStart(e)) return;

        if (
            shouldStartSelectionBox(target, e) &&
            canvasRef.current &&
            (interactionMode === 'node' || interactionMode === 'wire')
        ) {
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

    const onMouseUp = useCallback((e: React.MouseEvent) => {
        handlePanEnd();
        endSelectionBox();
        if (draggingConnection && canvasRef.current) {
            cancelConnection();
        }
    }, [handlePanEnd, endSelectionBox, draggingConnection, cancelConnection, canvasRef]);

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
        if (!interactive) return;
        const target = e.target as HTMLElement;
        if (target.closest('.custom-node-base, .widget-window-node-base, .group-node-base, button, input, select')) {
            return;
        }
        if (canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            showSearchBox(e.clientX - rect.left, e.clientY - rect.top);
        }
    }, [interactive, canvasRef, showSearchBox]);

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

    useEffect(() => {
        const handleGlobalPointerRelease = () => {
            handlePanEnd();
            endSelectionBox();
        };

        const handleWindowBlur = () => {
            handlePanEnd();
            endSelectionBox();
        };

        window.addEventListener('pointerup', handleGlobalPointerRelease, true);
        window.addEventListener('pointercancel', handleGlobalPointerRelease, true);
        window.addEventListener('blur', handleWindowBlur);

        return () => {
            window.removeEventListener('pointerup', handleGlobalPointerRelease, true);
            window.removeEventListener('pointercancel', handleGlobalPointerRelease, true);
            window.removeEventListener('blur', handleWindowBlur);
        };
    }, [handlePanEnd, endSelectionBox]);

    return {
        onClick,
        onMouseDown,
        onMouseMove,
        onMouseUp,
        onMouseLeave: () => {
            handlePanEnd();
            endSelectionBox();
            // Don't trigger search box on leave, just cancel if dragging
            if (draggingConnection) cancelConnection();
        },
        onDrop,
        onDragOver,
        onDoubleClick,
    };
}
