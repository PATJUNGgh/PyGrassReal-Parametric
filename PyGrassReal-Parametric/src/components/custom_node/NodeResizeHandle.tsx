import React from 'react';

interface NodeResizeHandleProps {
    data: { resizable?: boolean };
    onResizeMouseDown: (e: React.MouseEvent) => void;
}

export const NodeResizeHandle: React.FC<NodeResizeHandleProps> = ({
    data,
    onResizeMouseDown,
}) => {
    if (!data.resizable) {
        return null;
    }

    return (
        <div
            onMouseDown={onResizeMouseDown}
            style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '12px',
                cursor: 'ew-resize',
                zIndex: 20,
                background: 'transparent',
                // Optional: Show a visual indicator on hover
                // transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            title="Drag to resize"
        />
    );
};
