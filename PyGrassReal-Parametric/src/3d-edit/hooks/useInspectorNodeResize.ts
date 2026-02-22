import { useState, useEffect, useRef, useCallback } from 'react';

interface UseNodeResizeProps {
    id: string;
    initialWidth?: number;
    initialHeight?: number;
    minWidth?: number;
    minHeight?: number;
    scale?: number;
    position: { x: number; y: number };
    onDataChange: (id: string, data: { width?: number; height?: number }) => void;
    onPositionChange: (id: string, position: { x: number; y: number }) => void;
}

export const useNodeResize = ({
    id,
    initialWidth,
    initialHeight,
    minWidth = 100,
    minHeight = 100,
    scale = 1,
    position,
    onDataChange,
    onPositionChange,
}: UseNodeResizeProps) => {
    const [size, setSize] = useState({
        width: Math.max(minWidth, initialWidth || minWidth),
        height: Math.max(minHeight, initialHeight || minHeight)
    });
    const [isResizing, setIsResizing] = useState(false);
    const sizeRef = useRef(size);
    const resizeListenersRef = useRef<{
        move: (e: MouseEvent) => void;
        up: () => void;
        blur: () => void;
    } | null>(null);
    const resizeStartRef = useRef<{
        x: number;
        y: number;
        width: number;
        height: number;
        nodeX: number;
        nodeY: number;
        direction: string;
        minWidth: number;
        minHeight: number;
    } | null>(null);

    useEffect(() => {
        sizeRef.current = size;
    }, [size]);

    // Sync size from props if changed externally
    useEffect(() => {
        const hasValidWidth = typeof initialWidth === 'number' && initialWidth > minWidth / 3;
        const hasValidHeight = typeof initialHeight === 'number' && initialHeight > minHeight / 3;

        if (hasValidWidth || hasValidHeight) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSize((prev) => ({
                width: hasValidWidth ? initialWidth! : prev.width,
                height: hasValidHeight ? initialHeight! : prev.height,
            }));
        }
    }, [initialWidth, initialHeight, minWidth, minHeight]);

    const stopResizeSession = useCallback(() => {
        const listeners = resizeListenersRef.current;
        if (!listeners) return;

        window.removeEventListener('mousemove', listeners.move as (e: MouseEvent) => void);
        window.removeEventListener('mouseup', listeners.up as (e: MouseEvent) => void);
        window.removeEventListener('pointermove', listeners.move as (e: PointerEvent) => void);
        window.removeEventListener('pointerup', listeners.up as (e: PointerEvent) => void);
        window.removeEventListener('pointercancel', listeners.up as (e: PointerEvent) => void);
        window.removeEventListener('blur', listeners.blur);
        resizeListenersRef.current = null;
    }, []);

    const handleResizeStart = (e: React.MouseEvent | React.PointerEvent, direction: string) => {
        e.stopPropagation();
        e.preventDefault();

        stopResizeSession();
        setIsResizing(true);
        const isPointerEvent = 'pointerId' in e;
        const pointerId = isPointerEvent ? e.pointerId : null;
        const startTarget = isPointerEvent && e.currentTarget instanceof HTMLElement ? e.currentTarget : null;
        const effectiveMinWidth = Math.min(minWidth, size.width);
        const effectiveMinHeight = Math.min(minHeight, size.height);
        resizeStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            width: size.width,
            height: size.height,
            nodeX: position.x,
            nodeY: position.y,
            direction,
            minWidth: effectiveMinWidth,
            minHeight: effectiveMinHeight,
        };

        if (pointerId !== null && startTarget && typeof startTarget.setPointerCapture === 'function') {
            try {
                startTarget.setPointerCapture(pointerId);
            } catch {
                // no-op: fallback listeners below still handle resize end
            }
        }

        const handleResizeMove = (moveEvent: MouseEvent | PointerEvent) => {
            if (!resizeStartRef.current) return;
            if (pointerId !== null && 'pointerId' in moveEvent && moveEvent.pointerId !== pointerId) return;
            const { x, y, width, height, nodeX, nodeY, direction, minWidth: startMinWidth, minHeight: startMinHeight } = resizeStartRef.current;
            const safeScale = Math.max(scale, 0.01);
            const deltaX = (moveEvent.clientX - x) / safeScale;
            const deltaY = (moveEvent.clientY - y) / safeScale;

            let newWidth = width;
            let newHeight = height;
            let newX = nodeX;
            let newY = nodeY;

            if (direction.includes('e')) {
                newWidth = Math.max(startMinWidth, width + deltaX);
            }
            if (direction.includes('w')) {
                newWidth = Math.max(startMinWidth, width - deltaX);
                const widthDiff = newWidth - width;
                newX = nodeX - widthDiff;
            }
            if (direction.includes('s')) {
                newHeight = Math.max(startMinHeight, height + deltaY);
            }
            if (direction.includes('n')) {
                newHeight = Math.max(startMinHeight, height - deltaY);
                const heightDiff = newHeight - height;
                newY = nodeY - heightDiff;
            }

            const nextSize = { width: newWidth, height: newHeight };
            sizeRef.current = nextSize;
            setSize(nextSize);

            // Update position if it changed
            if (newX !== nodeX || newY !== nodeY) {
                onPositionChange(id, { x: newX, y: newY });
            }

            // Trigger real-time update for size
            onDataChange(id, { width: newWidth, height: newHeight });
        };

        const handleResizeUp = (upEvent?: MouseEvent | PointerEvent) => {
            if (!resizeStartRef.current) return;
            if (pointerId !== null && upEvent && 'pointerId' in upEvent && upEvent.pointerId !== pointerId) return;

            setIsResizing(false);
            const latestSize = sizeRef.current;
            onDataChange(id, { width: latestSize.width, height: latestSize.height });
            resizeStartRef.current = null;

            if (pointerId !== null && startTarget && typeof startTarget.releasePointerCapture === 'function') {
                try {
                    startTarget.releasePointerCapture(pointerId);
                } catch {
                    // no-op
                }
            }

            stopResizeSession();
        };

        const handleWindowBlur = () => {
            handleResizeUp();
        };

        resizeListenersRef.current = {
            move: handleResizeMove,
            up: handleResizeUp,
            blur: handleWindowBlur,
        };

        if (pointerId !== null) {
            window.addEventListener('pointermove', handleResizeMove as (e: PointerEvent) => void);
            window.addEventListener('pointerup', handleResizeUp as (e: PointerEvent) => void);
            window.addEventListener('pointercancel', handleResizeUp as (e: PointerEvent) => void);
        } else {
            window.addEventListener('mousemove', handleResizeMove as (e: MouseEvent) => void);
            window.addEventListener('mouseup', handleResizeUp as (e: MouseEvent) => void);
        }
        window.addEventListener('blur', handleWindowBlur);
    };

    useEffect(() => {
        return () => {
            stopResizeSession();
            resizeStartRef.current = null;
        };
    }, [stopResizeSession]);

    return {
        size,
        isResizing,
        handleResizeStart,
    };
};
