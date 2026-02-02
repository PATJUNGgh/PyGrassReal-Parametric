import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';

interface UseCanvasTransformProps {
    canvasRef: React.RefObject<HTMLDivElement>;
    initialScale?: number;
    initialOffset?: { x: number; y: number };
}

export function useCanvasTransform({
    canvasRef,
    initialScale = 1,
    initialOffset = { x: 0, y: 0 },
}: UseCanvasTransformProps) {
    const [offset, setOffset] = useState(initialOffset);
    const [scale, setScale] = useState(initialScale);
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });

    const forceRender = useState(0)[1]; // A dummy state setter to force re-render

    // Handle canvas panning (part of mouse down/move/up)
    const handlePanStart = useCallback((e: React.MouseEvent) => {
        if (e.button === 1 || (e.button === 0 && e.altKey)) {
            setIsPanning(true);
            setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
            e.preventDefault();
            return true; // Indicates panning started
        }
        return false;
    }, [offset]);

    const handlePanMove = useCallback((e: React.MouseEvent) => {
        if (isPanning) {
            setOffset({
                x: e.clientX - panStart.x,
                y: e.clientY - panStart.y,
            });
            return true; // Indicates panning is active
        }
        return false;
    }, [isPanning, panStart]);

    const handlePanEnd = useCallback(() => {
        setIsPanning(false);
    }, []);

    // Handle zoom with mouse wheel (Native listener to support passive: false)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            setScale((prev) => Math.min(Math.max(prev * delta, 0.1), 3));
        };

        canvas.addEventListener('wheel', onWheel, { passive: false });

        return () => {
            canvas.removeEventListener('wheel', onWheel);
        };
    }, [canvasRef]);

    useLayoutEffect(() => {
        // Force a post-layout render so port positions reflect the latest zoom/pan transform.
        forceRender((prev) => prev + 1);
    }, [scale, offset]);

    return {
        offset,
        scale,
        setScale,
        setOffset,
        isPanning,
        handlePanStart,
        handlePanMove,
        handlePanEnd,
    };
}