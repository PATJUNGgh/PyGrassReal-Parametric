import { useState, useEffect, useRef } from 'react';

interface UseInspectorNodeResizeProps {
    id: string;
    initialWidth?: number;
    initialHeight?: number;
    scale?: number;
    position: { x: number; y: number };
    onDataChange: (id: string, data: { width?: number; height?: number }) => void;
    onPositionChange: (id: string, position: { x: number; y: number }) => void;
}

export const useInspectorNodeResize = ({
    id,
    initialWidth,
    initialHeight,
    scale = 1,
    position,
    onDataChange,
    onPositionChange,
}: UseInspectorNodeResizeProps) => {
    const [size, setSize] = useState({
        width: Math.max(340, initialWidth || 340),
        height: Math.max(300, initialHeight || 300)
    });
    const [isResizing, setIsResizing] = useState(false);
    const resizeStartRef = useRef<{
        x: number;
        y: number;
        width: number;
        height: number;
        nodeX: number;
        nodeY: number;
        direction: string
    } | null>(null);

    // Sync size from props if changed externally
    useEffect(() => {
        const hasValidWidth = typeof initialWidth === 'number' && initialWidth > 50;
        const hasValidHeight = typeof initialHeight === 'number' && initialHeight > 50;

        if (hasValidWidth || hasValidHeight) {
            setSize((prev) => ({
                width: hasValidWidth ? initialWidth! : prev.width,
                height: hasValidHeight ? initialHeight! : prev.height,
            }));
        }
    }, [initialWidth, initialHeight]);

    const handleResizeStart = (e: React.MouseEvent, direction: string) => {
        e.stopPropagation();
        e.preventDefault();
        setIsResizing(true);
        resizeStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            width: size.width,
            height: size.height,
            nodeX: position.x,
            nodeY: position.y,
            direction
        };
    };

    useEffect(() => {
        if (!isResizing) return;

        const handleResizeMove = (e: MouseEvent) => {
            if (!resizeStartRef.current) return;
            const { x, y, width, height, nodeX, nodeY, direction } = resizeStartRef.current;
            const deltaX = (e.clientX - x) / scale;
            const deltaY = (e.clientY - y) / scale;

            let newWidth = width;
            let newHeight = height;
            let newX = nodeX;
            let newY = nodeY;

            // Minimum dimensions for InspectorNode
            const MIN_WIDTH = 340;
            const MIN_HEIGHT = 300;

            if (direction.includes('e')) {
                newWidth = Math.max(MIN_WIDTH, width + deltaX);
            }
            if (direction.includes('w')) {
                newWidth = Math.max(MIN_WIDTH, width - deltaX);
                const widthDiff = newWidth - width;
                newX = nodeX - widthDiff;
            }
            if (direction.includes('s')) {
                newHeight = Math.max(MIN_HEIGHT, height + deltaY);
            }
            if (direction.includes('n')) {
                newHeight = Math.max(MIN_HEIGHT, height - deltaY);
                const heightDiff = newHeight - height;
                newY = nodeY - heightDiff;
            }

            setSize({ width: newWidth, height: newHeight });

            // Update position if it changed
            if (newX !== nodeX || newY !== nodeY) {
                onPositionChange(id, { x: newX, y: newY });
            }

            // Trigger real-time update for size
            onDataChange(id, { width: newWidth, height: newHeight });
        };

        const handleResizeUp = () => {
            setIsResizing(false);
            if (resizeStartRef.current) {
                onDataChange(id, { width: size.width, height: size.height });
            }
            resizeStartRef.current = null;
        };

        window.addEventListener('mousemove', handleResizeMove);
        window.addEventListener('mouseup', handleResizeUp);
        return () => {
            window.removeEventListener('mousemove', handleResizeMove);
            window.removeEventListener('mouseup', handleResizeUp);
        };
    }, [isResizing, size, scale, id, onDataChange, onPositionChange]);

    return {
        size,
        isResizing,
        handleResizeStart,
    };
};
