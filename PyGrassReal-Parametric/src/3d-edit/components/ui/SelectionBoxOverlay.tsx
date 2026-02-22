import React from 'react';

interface SelectionBox {
    startX: number;
    startY: number;
    currentX: number;
}

interface SelectionBoxOverlayProps {
    selectionBox: SelectionBox | null;
    interactionMode: 'node' | '3d' | 'wire';
    scale: number;
    offset: { x: number; y: number };
}

export const SelectionBoxOverlay: React.FC<SelectionBoxOverlayProps> = ({ selectionBox, interactionMode, scale, offset }) => {
    if (!selectionBox) return null;

    const boxStyle = {
        position: 'absolute' as 'absolute',
        left: `${Math.min(selectionBox.startX, selectionBox.currentX) * scale + offset.x}px`,
        top: `${Math.min(selectionBox.startY, selectionBox.currentY) * scale + offset.y}px`,
        width: `${Math.abs(selectionBox.currentX - selectionBox.startX) * scale}px`,
        height: `${Math.abs(selectionBox.currentY - selectionBox.startY) * scale}px`,
        pointerEvents: 'none' as 'none',
        zIndex: 1000,
    };

    if (interactionMode === 'wire') {
        return (
            <div
                id="selection-box-wire-mode"
                title="Selection Box Wire Mode"
                style={{
                    ...boxStyle,
                    border: '2px dashed #FFD700', // Yellow for Wire Mode
                    background: 'rgba(255, 215, 0, 0.1)',
                }}
            />
        );
    } else if (interactionMode === 'node') {
        return (
            <div
                id="selection-box-node-mode"
                title="Selection Box Node Mode"
                style={{
                    ...boxStyle,
                    border: '2px dashed #2196f3', // Blue for Node Mode
                    background: 'rgba(33, 150, 243, 0.1)',
                }}
            />
        );
    }

    return null;
};