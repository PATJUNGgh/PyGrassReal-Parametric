import React, { useState, useCallback } from 'react';

interface SelectionOverlayProps {
    onSelectionComplete: (rect: { x: number; y: number; width: number; height: number }) => void;
    enabled: boolean;
}

export const SelectionOverlay: React.FC<SelectionOverlayProps> = ({ onSelectionComplete, enabled }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
    const overlayRef = React.useRef<HTMLDivElement>(null);

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        // Only Left Click
        if (!enabled || e.button !== 0) return;

        setIsDragging(false); // Reset drag state
        setStartPos({ x: e.clientX, y: e.clientY });
        setCurrentPos({ x: e.clientX, y: e.clientY });

        // Don't capture pointer yet, let's see if it moves
    }, [enabled]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        // Update current pos regardless of drag state (for potential drag start)
        const x = e.clientX;
        const y = e.clientY;

        // Calculate distance from start
        const dist = Math.sqrt(
            Math.pow(x - startPos.x, 2) + Math.pow(y - startPos.y, 2)
        );

        // If we moved enough, treat as drag
        if (!isDragging && dist > 5 && (e.buttons === 1)) { // Check if left button is still held
            setIsDragging(true);
        }

        if (isDragging) {
            setCurrentPos({ x, y });
        }
    }, [isDragging, startPos]);

    const handlePointerUp = useCallback((e: React.PointerEvent) => {
        if (isDragging) {
            // Finish Drag Selection
            setIsDragging(false);
            const x = Math.min(startPos.x, currentPos.x);
            const y = Math.min(startPos.y, currentPos.y);
            const width = Math.abs(currentPos.x - startPos.x);
            const height = Math.abs(currentPos.y - startPos.y);

            if (width > 5 || height > 5) {
                onSelectionComplete({ x, y, width, height });
            }
        } else {
            // Was a Click! Re-dispatch to underlying element
            if (overlayRef.current) {
                // Hide overlay momentarily to find element below
                overlayRef.current.style.pointerEvents = 'none';
                const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
                overlayRef.current.style.pointerEvents = 'auto'; // Restore

                if (elementBelow) {
                    // Create new event to dispatch
                    // We dispatch 'pointerdown' AND 'pointerup' + 'click' to simulate full click?
                    // Canvas needs pointerdown/up for raycasting usually.

                    // Actually, forwarding events is tricky.
                    // Better approach: Since we blocked pointerdown, canvas never got it.
                    // We can't travel back in time.
                }
            }
        }
    }, [isDragging, startPos, currentPos, onSelectionComplete]);

    // Calculate rectangle for rendering
    const rect = isDragging ? {
        left: Math.min(startPos.x, currentPos.x),
        top: Math.min(startPos.y, currentPos.y),
        width: Math.abs(currentPos.x - startPos.x),
        height: Math.abs(currentPos.y - startPos.y),
    } : null;

    // NEW STRATEGY:
    // If not dragging, we want events to pass to canvas.
    // If dragging, we want to capture.
    // But we don't know if it's a drag until we move!

    // Compromise: 
    // Let's use `zIndex: -1` (Behind Canvas) normally.
    // User initiates drag on BACKGROUND (Canvas).
    // But Canvas swallows events.

    // Let's go with the "Shift Key" approach as a fallback, 
    // OR:
    // Make overlay `pointerEvents: none` but utilize a global window listener for drag start?

    // The previous implementation where zIndex was 1 BLOCKED the canvas.

    // Let's revert to a simpler solution:
    // We let the USER toggle selection mode? Or hold Shift?

    // Let's try: Overlay is ALWAYS on top, but `pointerEvents: 'none'`.
    // EXCEPT when we hold `Shift`.

    // Or... Let's use `onPointerDown` on the Container `div` in App.tsx?
    return null; // Don't render internal div yet, we'll fix logic first.
};
