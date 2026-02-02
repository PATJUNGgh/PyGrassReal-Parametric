import React from 'react';

interface GridBackgroundProps {
    scale: number;
    offset: { x: number; y: number };
}

export const GridBackground: React.FC<GridBackgroundProps> = ({ scale, offset }) => {
    return (
        <div
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                opacity: 0.4, // 40% visibility
                // Infinite DOT grid logic using radial-gradient
                backgroundImage: 'radial-gradient(circle, #555 1px, transparent 1px)',
                backgroundSize: `${40 * scale}px ${40 * scale}px`,
                backgroundPosition: `${offset.x}px ${offset.y}px`,
            }}
        />
    );
};