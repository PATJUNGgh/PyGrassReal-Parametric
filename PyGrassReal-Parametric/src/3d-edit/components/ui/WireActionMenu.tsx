import React, { useState, useEffect } from 'react';

interface WireActionMenuProps {
    visible: boolean;
    center: { x: number; y: number } | null;
    onDelete: () => void;
    onToggleStyle: (style: 'dashed' | 'ghost') => void;
}

export const WireActionMenu: React.FC<WireActionMenuProps> = ({ visible, center, onDelete, onToggleStyle }) => {
    const [renderState, setRenderState] = useState<'hidden' | 'visible' | 'exiting'>('hidden');
    const [activeCenter, setActiveCenter] = useState(center);

    useEffect(() => {
        if (visible && center) {
            setRenderState('visible');
            setActiveCenter(center);
        } else if (!visible && renderState === 'visible') {
            setRenderState('exiting');
        }
    }, [visible, center, renderState]);

    // Keep center updated while visible (for dragging)
    useEffect(() => {
        if (visible && center) {
            setActiveCenter(center);
        }
    }, [center, visible]);

    if (renderState === 'hidden') return null;

    // We render a wrapper for position, and inner for animation
    return (
        <div
            style={{
                position: 'absolute',
                left: activeCenter?.x || 0,
                top: (activeCenter?.y || 0) - 40,
                transform: 'translate(-50%, -100%)',
                zIndex: 2000,
                pointerEvents: 'auto', // Important!
            }}
        >
            <style>
                {`
                @keyframes popInWireMenu {
                    0% { transform: scale(0); opacity: 0; }
                    80% { transform: scale(1.1); opacity: 1; }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes popOutWireMenu {
                    0% { transform: scale(1); opacity: 1; }
                    100% { transform: scale(0); opacity: 0; }
                }
                .wire-menu-inner {
                    display: flex;
                    gap: 8px;
                    background: #2d3748;
                    padding: 6px;
                    border-radius: 8px;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                    border: 1px solid #4a5568;
                    /* Animation */
                    animation: ${renderState === 'exiting' ? 'popOutWireMenu 0.2s cubic-bezier(0.4, 0, 1, 1) forwards' : 'popInWireMenu 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'};
                }
                .wire-action-btn {
                    border: none;
                    border-radius: 4px;
                    width: 32px;
                    height: 32px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 16px;
                    transition: transform 0.1s;
                }
                .wire-action-btn:hover { transform: scale(1.2); }
                .wire-action-btn:active { transform: scale(0.9); }
                `}
            </style>

            <div
                className="wire-menu-inner"
                onAnimationEnd={() => {
                    if (renderState === 'exiting') setRenderState('hidden');
                }}
            >
                {/* Delete Button */}
                <button
                    className="wire-action-btn"
                    onClick={onDelete}
                    title="Delete Wires"
                    style={{ background: '#e53e3e' }}
                >
                    🗑️
                </button>

                {/* Dashed Style Toggle */}
                <button
                    className="wire-action-btn"
                    onClick={() => onToggleStyle('dashed')}
                    title="Toggle Dashed Style"
                    style={{ background: '#4a5568' }}
                >
                    …
                </button>

                {/* Ghost Style Toggle */}
                <button
                    className="wire-action-btn"
                    onClick={() => onToggleStyle('ghost')}
                    title="Toggle Ghost Style"
                    style={{ background: '#4a5568' }}
                >
                    👻
                </button>
            </div>
        </div>
    );
};
