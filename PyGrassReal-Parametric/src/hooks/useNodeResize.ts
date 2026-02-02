import { useState, useEffect } from 'react';

interface UseNodeResizeProps {
    id: string;
    position: { x: number; y: number };
    data: {
        width?: number;
        minWidth?: number;
    };
    onDataChange: (id: string, data: any) => void;
    onPositionChange: (id: string, position: { x: number; y: number }) => void;
    computedWidth: number;
}

export const useNodeResize = ({
    id,
    position,
    data,
    onDataChange,
    onPositionChange,
    computedWidth,
}: UseNodeResizeProps) => {
    const [isResizing, setIsResizing] = useState(false);
    const [resizeStartX, setResizeStartX] = useState<number>(0);
    const [resizeStartWidth, setResizeStartWidth] = useState<number>(0);
    const [resizeStartPosX, setResizeStartPosX] = useState<number>(0);

    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            const deltaX = e.clientX - resizeStartX;
            const minWidth = data.minWidth || 200;
            const newWidth = Math.max(minWidth, Math.min(800, resizeStartWidth - deltaX));
            const isAtMinWidth = newWidth === minWidth;
            const newPosX = isAtMinWidth ? position.x : resizeStartPosX + deltaX;

            onDataChange(id, { ...data, width: newWidth });

            if (!isAtMinWidth) {
                onPositionChange(id, { x: newPosX, y: position.y });
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, resizeStartX, resizeStartWidth, resizeStartPosX, id, data, position, onDataChange, onPositionChange]);

    const handleResizeStart = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setIsResizing(true);
        setResizeStartX(e.clientX);
        setResizeStartWidth(data.width || computedWidth);
        setResizeStartPosX(position.x);
    };

    return {
        isResizing,
        handleResizeStart,
    };
};
