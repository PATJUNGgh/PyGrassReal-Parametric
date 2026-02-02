import { useState, useEffect } from 'react';

interface UseNodeDragProps {
    id: string;
    position: { x: number; y: number };
    onPositionChange: (id: string, position: { x: number; y: number }) => void;
    scale?: number;
    onSelect?: () => void;
    isResizing?: boolean;
    onDragStart?: () => void;
    onDragEnd?: () => void;
}

export const useNodeDrag = ({ id, position, onPositionChange, scale = 1, onSelect, isResizing = false, onDragStart, onDragEnd }: UseNodeDragProps) => {
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<{ mouseX: number; mouseY: number; nodeX: number; nodeY: number } | null>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0 || isResizing) return;

        e.stopPropagation();
        e.preventDefault();
        onSelect?.();

        setIsDragging(true);
        setDragStart({
            mouseX: e.clientX,
            mouseY: e.clientY,
            nodeX: position.x,
            nodeY: position.y,
        });

        // Trigger Drag Start Callback
        onDragStart?.();
    };

    useEffect(() => {
        if (!isDragging || !dragStart) return;

        const handleMouseMove = (e: MouseEvent) => {
            const currentScale = Math.max(scale, 0.01);
            const deltaX = (e.clientX - dragStart.mouseX) / currentScale;
            const deltaY = (e.clientY - dragStart.mouseY) / currentScale;

            onPositionChange(id, {
                x: dragStart.nodeX + deltaX,
                y: dragStart.nodeY + deltaY,
            });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setDragStart(null);

            // Trigger Drag End Callback
            onDragEnd?.();
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragStart, id, onPositionChange, scale, onDragEnd]); // Added onDragEnd to dependencies

    return {
        isDragging,
        handleMouseDown,
    };
};
