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
        isGizmoDraggingRef,
        canvasElementRef,
        isHandleDragging,
        setProcessingRect,
        transformControlsRef
    } = context;

    const [selectionRect, setSelectionRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

    useEffect(() => {
        const handleCanvasPointerDown = (e: PointerEvent) => {
            // Priority Check: The VERY FIRST line of the handler must be:
            if (isGizmoDraggingRef.current) return;

            // Only Left Click in 3D mode
            if (e.button !== 0 || interactionMode !== '3d') return;

            // Check all other possible "blocking" states
            const isGumballActiveNow = 
                isGumballDragging || 
                gumballHoveredRef.current || 
                handlesHoveredRef.current || 
                isHandleDragging ||
                transformControlsRef.current?.dragging;

            if (isGumballActiveNow) {
                return;
            }

            // Ignore if clicking on UI elements
            const target = e.target as HTMLElement;
            const isUIElement =
                target.tagName === 'BUTTON' ||
                target.tagName === 'INPUT' ||
                target.tagName === 'LABEL' ||
                target.closest('button') !== null ||
                target.closest('label') !== null ||
                target.draggable === true ||
                target.closest('[draggable="true"]') !== null ||
                target.closest('[data-no-selection="true"]') !== null;

            if (isUIElement) return;

            // Start Drag Logic
            const startX = e.clientX;
            const startY = e.clientY;
            let isDrag = false;
            let currentRect: { x: number; y: number; width: number; height: number; } | null = null;

            const onMove = (mv: PointerEvent) => {
                // Priority Guard
                if (isGizmoDraggingRef.current) {
                    cleanup();
                    setSelectionRect(null);
                    return;
                }

                // Only track left-button drag
                if ((mv.buttons & 1) !== 1) {
                    cleanup();
                    return;
                }

                // SAFETY CHECK: Abort if dragging starts mid-move
                if (isGumballDragging || gumballHoveredRef.current || handlesHoveredRef.current || isHandleDragging || transformControlsRef.current?.dragging) {
                    cleanup();
                    setSelectionRect(null);
                    return;
                }

                const dist = Math.sqrt(Math.pow(mv.clientX - startX, 2) + Math.pow(mv.clientY - startY, 2));

                // Threshold 10px to distinguish click from drag
                if (!isDrag && dist > 10) {
                    if (isGizmoDraggingRef.current) {
                        cleanup();
                        return;
                    }

                    isDrag = true;
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
                    mv.preventDefault();
                }
            };

            const onUp = (upEvent: PointerEvent) => {
                cleanup();

                if (isGizmoDraggingRef.current || isGumballDragging || isHandleDragging) {
                    return;
                }

                if (isDrag && currentRect) {
                    setProcessingRect(currentRect);
                } else {
                    setProcessingRect(null);
                }
                setSelectionRect(null);
            };

            const cleanup = () => {
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
            }

            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
        };

        const canvas = canvasElementRef.current;
        if (canvas) {
            canvas.addEventListener('pointerdown', handleCanvasPointerDown);
        }
        
        return () => {
            if (canvas) {
                canvas.removeEventListener('pointerdown', handleCanvasPointerDown);
            }
        };

    }, [
        interactionMode,
        setSelectedIds,
        isGumballDragging,
        isHandleDragging,
        gumballHoveredRef,
        handlesHoveredRef,
        isGizmoDraggingRef,
        canvasElementRef,
        setProcessingRect,
        transformControlsRef
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
