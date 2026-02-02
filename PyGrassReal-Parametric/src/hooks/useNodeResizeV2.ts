import { useState, useEffect, useCallback } from 'react';

interface UseNodeResizeV2Props {
    id: string;
    data: { width?: number, minWidth?: number };
    position: { x: number, y: number };
    scale: number;
    onDataChange: (id: string, data: any) => void;
    onPositionChange: (id: string, position: { x: number, y: number }) => void;
    initialWidth: number;
    disabled?: boolean;
}

export const useNodeResizeV2 = ({
    id,
    data,
    position,
    scale,
    onDataChange,
    onPositionChange,
    initialWidth,
    disabled = false
}: UseNodeResizeV2Props) => {
    const [isResizing, setIsResizing] = useState(false);
    const [resizeStart, setResizeStart] = useState<{
        mouseX: number;
        width: number;
        nodeX: number;
    } | null>(null);

    const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button !== 0 || disabled) return;
        e.stopPropagation();
        setIsResizing(true);
        setResizeStart({
            mouseX: e.clientX,
            width: initialWidth,
            nodeX: position.x,
        });
    }, [disabled, initialWidth, position.x]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing || !resizeStart) return;

            const currentScale = Math.max(scale, 0.01);
            const delta = (resizeStart.mouseX - e.clientX) / currentScale;
            const newWidth = Math.max(data.minWidth || 320, resizeStart.width + delta);
            const widthDiff = newWidth - resizeStart.width;
            const newX = resizeStart.nodeX - widthDiff;

            onDataChange(id, { ...data, width: newWidth });
            onPositionChange(id, { x: newX, y: position.y });
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            setResizeStart(null);
        };

        if (isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, resizeStart, scale, data, id, onDataChange, onPositionChange]);

    return {
        handleResizeMouseDown,
    };
};
