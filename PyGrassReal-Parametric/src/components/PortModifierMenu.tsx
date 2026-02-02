import React from 'react';

// Define Prop types
interface PortModifierMenuProps {
    onClose: () => void;
    options: Array<{ id: string; label: string; icon: React.ReactNode }>;
    activeModifiers: Array<string>;
    onToggleModifier: (modifierId: string) => void;
    menuRadius?: number;
    itemSize?: number;
    startAngle?: number;
}

export const PortModifierMenu: React.FC<PortModifierMenuProps> = ({
    onClose,
    options,
    activeModifiers,
    onToggleModifier,
    menuRadius = 30,
    itemSize = 22,
    startAngle = -90
}) => {
    const menuDiameter = (menuRadius * 2) + itemSize;

    return (
        <>
            {/* Backdrop */}
            <div
                onPointerDown={(e) => { e.stopPropagation(); onClose(); }}
                onMouseDown={(e) => { e.stopPropagation(); onClose(); }}
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 998,
                }}
            />

            {/* Radial Menu */}
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: `${menuDiameter}px`,
                    height: `${menuDiameter}px`,
                    transform: 'translate(-50%, -50%)',
                    animation: 'popIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                    zIndex: 999,
                    pointerEvents: 'auto',
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(30, 64, 175, 0.85) 0%, rgba(30, 64, 175, 0.7) 55%, rgba(30, 64, 175, 0.25) 75%, rgba(30, 64, 175, 0) 88%)',
                        boxShadow: '0 0 12px rgba(30, 64, 175, 0.45)',
                        backdropFilter: 'blur(6px)',
                        WebkitBackdropFilter: 'blur(6px)',
                        pointerEvents: 'none',
                    }}
                />
                <button
                    onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        width: `${itemSize}px`,
                        height: `${itemSize}px`,
                        transform: 'translate(-50%, -50%)',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.75), rgba(22, 163, 74, 0.85))',
                        border: '1px solid rgba(34, 197, 94, 0.9)',
                        color: '#fff',
                        fontSize: '9px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.25)',
                        padding: 0,
                        zIndex: 2,
                    }}
                    title="Close"
                >
                    OK
                </button>
                {options.map((option, index) => {
                    const isActive = activeModifiers.includes(option.id);
                    const angle = startAngle + (360 / options.length) * index;
                    const radians = (angle * Math.PI) / 180;
                    const x = Math.cos(radians) * menuRadius;
                    const y = Math.sin(radians) * menuRadius;

                    return (
                        <button
                            key={option.id}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                            }}
                            onPointerDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                            }}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onToggleModifier(option.id);
                            }}
                            title={option.label}
                            style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                width: `${itemSize}px`,
                                height: `${itemSize}px`,
                                transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
                                borderRadius: '50%',
                                background: isActive
                                    ? 'rgba(59, 130, 246, 0.85)'
                                    : 'rgba(255, 255, 255, 0.12)',
                                border: isActive
                                    ? '1px solid rgba(59, 130, 246, 0.95)'
                                    : '1px solid rgba(255, 255, 255, 0.35)',
                                color: '#fff',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: isActive
                                    ? '0 0 0 1px rgba(59, 130, 246, 0.6), 0 4px 10px rgba(0, 0, 0, 0.25)'
                                    : '0 2px 6px rgba(0, 0, 0, 0.2)',
                                transition: 'transform 0.15s ease, background 0.15s ease, box-shadow 0.15s ease',
                                padding: 0,
                                zIndex: 1,
                            }}
                        >
                            <span style={{ color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{option.icon}</span>
                        </button>
                    );
                })}
            </div>
        </>
    );
};
