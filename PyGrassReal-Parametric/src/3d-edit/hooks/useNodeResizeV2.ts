import type { RefObject } from 'react';
import { useState, useEffect, useCallback } from 'react';
import { hitTestNode } from '../interaction/hitTestPolicy';

interface UseNodeResizeV2Props {
    id: string;
    data: { width?: number, minWidth?: number };
    position: { x: number, y: number };
    scale: number;
    nodeRef: RefObject<HTMLDivElement | null>;
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
    nodeRef,
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
        const target = e.target instanceof HTMLElement ? e.target : null;
        const hitResult = hitTestNode(
            { x: e.clientX, y: e.clientY },
            { element: target }
        );
        if (hitResult.target !== 'resize-handle') {
            return;
        }
        e.stopPropagation();
        const safeScale = Math.max(scale, 0.01);
        const rect = nodeRef.current?.getBoundingClientRect();
        const measuredWidth = rect ? rect.width / safeScale : undefined;
        const startWidth = measuredWidth ?? data.width ?? initialWidth;

        setIsResizing(true);
        setResizeStart({
            mouseX: e.clientX,
            width: startWidth,
            nodeX: position.x,
        });
    }, [data.width, disabled, initialWidth, nodeRef, position.x, scale]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing || !resizeStart) return;

            const currentScale = Math.max(scale, 0.01);
            const delta = (resizeStart.mouseX - e.clientX) / currentScale;
            const configuredMinWidth = data.minWidth || 320;
            // If legacy nodes are currently narrower than configured minWidth,
            // avoid an immediate "jump" on first drag by anchoring min to start width.
            const effectiveMinWidth = Math.min(configuredMinWidth, resizeStart.width);
            const newWidth = Math.max(effectiveMinWidth, resizeStart.width + delta);
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
