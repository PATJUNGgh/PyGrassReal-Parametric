import { useState, useEffect, useCallback } from 'react';

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
    const [dragStart, setDragStart] = useState<{
        mouseX: number;
        mouseY: number;
        nodeX: number;
        nodeY: number;
    } | null>(null);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button !== 0 || disabled) return;
        
        e.stopPropagation();
        
        setIsDragging(true);
        setDragStart({
            mouseX: e.clientX,
            mouseY: e.clientY,
            nodeX: initialPosition.x,
            nodeY: initialPosition.y,
        });
    }, [disabled, initialPosition.x, initialPosition.y]);
    
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !dragStart) return;

            const currentScale = Math.max(scale || 1, 0.01);
            const deltaX = (e.clientX - dragStart.mouseX) / currentScale;
            const deltaY = (e.clientY - dragStart.mouseY) / currentScale;

            onPositionChange({
                x: dragStart.nodeX + deltaX,
                y: dragStart.nodeY + deltaY,
            });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setDragStart(null);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragStart, scale, onPositionChange]);

    return {
        isDragging,
        handleMouseDown,
    };
};
