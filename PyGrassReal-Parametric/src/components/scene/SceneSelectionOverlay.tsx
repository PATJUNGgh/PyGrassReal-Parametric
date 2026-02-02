import React, { useContext, useEffect, useState } from 'react';
import { SceneInteractionContext } from '../../context/SceneInteractionContext';

interface SceneSelectionOverlayProps {
    interactionMode: '3d' | 'node' | 'wire';
}

export function SceneSelectionOverlay({ interactionMode }: SceneSelectionOverlayProps) {
    const context = useContext(SceneInteractionContext);
    if (!context) {
        throw new Error('SceneSelectionOverlay must be used within a SceneInteractionProvider');
    }

    const {
        setSelectedIds,
        isGumballDragging,
        handlesHoveredRef,
        gumballHoveredRef,
        isHandleDragging,
        setProcessingRect,
        processingRect
    } = context;

    const [selectionRect, setSelectionRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

    useEffect(() => {
        const handleCanvasPointerDown = (e: PointerEvent) => {
            // Only Left Click in 3D mode
            if (e.button !== 0 || interactionMode !== '3d') return;

            // Ignore if clicking on UI elements (Toolbar, Buttons, Labels, etc.)
            const target = e.target as HTMLElement;
            const isUIElement =
                target.tagName === 'BUTTON' ||
                target.tagName === 'INPUT' ||
                target.tagName === 'LABEL' ||
                target.closest('button') !== null ||
                target.closest('label') !== null ||
                target.draggable === true ||
                target.closest('[draggable="true"]') !== null ||
                target.closest('[data-no-selection="true"]') !== null; // Explicitly marked NO SELECTION elements (Nodes, Toolbar)

            if (isUIElement) return;

            // Don't start 2D selection if clicking on Gumball or Handles (TransformControls)
            // Check REFS for immediate feedback
            // IMPORTANT: We check context values/refs directly
            if (isGumballDragging || gumballHoveredRef.current || handlesHoveredRef.current || isHandleDragging) {
                return;
            }

            // Check if clicking on the 3D canvas (or overlay that sits on top)
            // We assume this listener is attached to window, so we filter by target being canvas or our overlay
            const isCanvasOrOverlay = target.tagName === 'CANVAS' || target.id === 'scene-selection-overlay';
            if (!isCanvasOrOverlay && !target.closest('.r3f-canvas')) {
                // Relaxed check: if we clicked "empty space" it might be the container div
                // But let's be safe: if we clicked a generic div that isn't a known UI element, we might want to allow it.
                // For now, let's stick to the logic from use2DSelection but applied globally.
            }

            // Logic from use2DSelection, adapted for global listener or overlaid div
            // Since we can't easily put this on the canvas div directly (it's inside Canvas component),
            // We attach to window but bail out if not hitting relevant areas.

            // Actually, best practice: Attach this to a full-screen transparent div that sits below UI but above Canvas?
            // Or just window listener is fine if we are careful.

            // Let's use window listener for drag tracking.

            // setProcessingRect(null); // Reset processing rect
            // setSelectionRect(null);

            // Start Drag Logic
            const startX = e.clientX;
            const startY = e.clientY;
            let isDrag = false;
            let currentRect: { x: number; y: number; width: number; height: number; } | null = null;
            let hasMoved = false;

            const onMove = (mv: PointerEvent) => {
                // Only track left-button drag
                if ((mv.buttons & 1) !== 1) {
                    cleanup();
                    return;
                }

                // SAFETY CHECK: Abort if dragging starts mid-move (Gumball takes over)
                if (isGumballDragging || gumballHoveredRef.current || handlesHoveredRef.current || isHandleDragging) {
                    cleanup();
                    return;
                }

                const dist = Math.sqrt(Math.pow(mv.clientX - startX, 2) + Math.pow(mv.clientY - startY, 2));

                // Threshold 10px to distinguish click from drag
                if (!isDrag && dist > 10) {
                    isDrag = true;
                    // Clear existing selection on drag start (unless holding Shift)
                    if (!mv.shiftKey) {
                        setSelectedIds(new Set());
                    }
                    setProcessingRect(null);
                }

                if (isDrag) {

                    currentRect = {
                        x: Math.min(startX, mv.clientX),
                        y: Math.min(startY, mv.clientY),
                        width: Math.abs(mv.clientX - startX),
                        height: Math.abs(mv.clientY - startY)
                    };
                    setSelectionRect(currentRect);
                    // Prevent default text selection during drag
                    mv.preventDefault();
                }
            };

            const onUp = (upEvent: PointerEvent) => {
                cleanup();

                if (isGumballDragging || isHandleDragging) {
                    return;
                }

                if (isDrag && currentRect) {
                    // Trigger selection calculation ONLY on mouse up
                    setProcessingRect(currentRect);
                } else {
                    // It was a click (or very small drag)
                    setProcessingRect(null);
                }
                // Clear visual rect on drag end
                setSelectionRect(null);
            };

            const cleanup = () => {
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
            }

            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
        };

        window.addEventListener('pointerdown', handleCanvasPointerDown);
        return () => window.removeEventListener('pointerdown', handleCanvasPointerDown);

    }, [
        interactionMode,
        setSelectedIds,
        isGumballDragging,
        isHandleDragging,
        gumballHoveredRef,
        handlesHoveredRef,
        setProcessingRect
    ]);

    if (!selectionRect) return null;

    return (
        <div
            id="scene-selection-overlay"
            style={{
                position: 'fixed', // Use fixed to be safe relative to viewport
                left: selectionRect.x,
                top: selectionRect.y,
                width: selectionRect.width,
                height: selectionRect.height,
                border: '2px dashed rgba(0, 191, 255, 0.8)',
                backgroundColor: 'rgba(0, 191, 255, 0.1)',
                pointerEvents: 'none',
                zIndex: 9999,
            }}
        />
    );
}
