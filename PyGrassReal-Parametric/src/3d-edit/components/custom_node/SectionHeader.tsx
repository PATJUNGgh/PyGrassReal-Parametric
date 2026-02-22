
import React from 'react';

interface SectionHeaderProps {
    label: string;
    align: 'left' | 'right';
    onMouseUp: (e: React.MouseEvent) => void;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ label, align, onMouseUp }) => {
    const style: React.CSSProperties = {
        fontSize: '10px',
        fontWeight: 900,
        color: '#fff',
        letterSpacing: '1px',
        textTransform: 'uppercase',
        opacity: 0.5,
        userSelect: 'text',
        WebkitUserSelect: 'text',
        pointerEvents: 'auto',
        cursor: 'text',
    };

    if (align === 'right') {
        style.marginLeft = 'auto';
    }

    return (
        <div
            className="node-port-section-copyable"
            style={style}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => {
                e.stopPropagation();
                onMouseUp(e);
            }}
            onClick={(e) => e.stopPropagation()}
        >
            {label}
        </div>
    );
};

export default SectionHeader;
