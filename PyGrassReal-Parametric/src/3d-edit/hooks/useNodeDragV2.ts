import React, { useCallback, useEffect, useRef, useState } from 'react';

interface UseNodeDragV2Props {
    onPositionChange: (position: { x: number, y: number }) => void;
    initialPosition: { x: number, y: number };
    scale: number;
    disabled?: boolean;
}

export const useNodeDragV2 = ({
    onPositionChange,
    initialPosition,
    scale,
    disabled = false
}: UseNodeDragV2Props) => {
    const [isDragging, setIsDragging] = useState(false);
    const scaleRef = useRef(scale);
    const onPositionChangeRef = useRef(onPositionChange);
    const dragSessionRef = useRef<{
        target: HTMLElement;
        pointerId: number;
        handlePointerMove: (ev: PointerEvent) => void;
        handlePointerUp: (ev: PointerEvent) => void;
        handlePointerCancel: (ev: PointerEvent) => void;
        handleLostPointerCapture: (ev: PointerEvent) => void;
    } | null>(null);

    useEffect(() => {
        scaleRef.current = scale;
    }, [scale]);

    useEffect(() => {
        onPositionChangeRef.current = onPositionChange;
    }, [onPositionChange]);

    const clearDragSession = useCallback((
        options: { releaseCapture?: boolean; setDragging?: boolean } = {},
    ) => {
        const { releaseCapture = true, setDragging = true } = options;
        const session = dragSessionRef.current;
        if (!session) return;

        const {
            target,
            pointerId,
            handlePointerMove,
            handlePointerUp,
            handlePointerCancel,
            handleLostPointerCapture,
        } = session;

        target.removeEventListener('pointermove', handlePointerMove);
        target.removeEventListener('pointerup', handlePointerUp);
        target.removeEventListener('pointercancel', handlePointerCancel);
        target.removeEventListener('lostpointercapture', handleLostPointerCapture);

        if (releaseCapture) {
            try {
                if (target.hasPointerCapture(pointerId)) {
                    target.releasePointerCapture(pointerId);
                }
            } catch {
                // Ignore capture-release failures from interrupted sessions.
            }
        }

        dragSessionRef.current = null;
        if (setDragging) {
            setIsDragging(false);
        }
    }, []);

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        if (e.button !== 0 || disabled) return;

        e.stopPropagation();
        clearDragSession();

        const target = e.currentTarget as HTMLElement;
        const pointerId = e.pointerId;
        const startMouseX = e.clientX;
        const startMouseY = e.clientY;
        const startNodeX = initialPosition.x;
        const startNodeY = initialPosition.y;

        const handlePointerMove = (ev: PointerEvent) => {
            if (ev.pointerId !== pointerId) return;

            const currentScale = Math.max(scaleRef.current, 0.01);
            const deltaX = (ev.clientX - startMouseX) / currentScale;
            const deltaY = (ev.clientY - startMouseY) / currentScale;

            onPositionChangeRef.current({
                x: startNodeX + deltaX,
                y: startNodeY + deltaY,
            });
        };

        const handlePointerUp = (ev: PointerEvent) => {
            if (ev.pointerId !== pointerId) return;
            clearDragSession({ releaseCapture: true });
        };

        const handlePointerCancel = (ev: PointerEvent) => {
            if (ev.pointerId !== pointerId) return;
            clearDragSession({ releaseCapture: true });
        };

        const handleLostPointerCapture = (ev: PointerEvent) => {
            if (ev.pointerId !== pointerId) return;
            clearDragSession({ releaseCapture: false });
        };

        target.addEventListener('pointermove', handlePointerMove);
        target.addEventListener('pointerup', handlePointerUp);
        target.addEventListener('pointercancel', handlePointerCancel);
        target.addEventListener('lostpointercapture', handleLostPointerCapture);

        dragSessionRef.current = {
            target,
            pointerId,
            handlePointerMove,
            handlePointerUp,
            handlePointerCancel,
            handleLostPointerCapture,
        };

        setIsDragging(true);

        // Keep receiving pointer events even when the cursor leaves element/browser bounds.
        try {
            target.setPointerCapture(pointerId);
        } catch {
            // Fall back to regular pointer flow when capture is unavailable.
        }
    }, [clearDragSession, disabled, initialPosition.x, initialPosition.y]);

    useEffect(() => {
        return () => {
            clearDragSession({ releaseCapture: true, setDragging: false });
        };
    }, [clearDragSession]);

    return {
        isDragging,
        handlePointerDown,
    };
};
