import React from 'react';

interface GroupButtonOverlayProps {
    count: number;
    centerX: number;
    buttonY: number;
    scale: number;
    offset: { x: number; y: number };
    onClick: () => void;
    isExiting?: boolean;
}

export const GroupButtonOverlay: React.FC<GroupButtonOverlayProps> = ({
    count,
    centerX,
    buttonY,
    scale,
    offset,
    onClick,
    isExiting = false,
}) => {
    // Generate random dust particles - MORE and BIGGER
    const dustParticles = Array.from({ length: 12 }, (_, i) => ({
        id: i,
        angle: (i * 360) / 12,
        distance: 40 + Math.random() * 40,
        delay: Math.random() * 0.15,
        size: 12 + Math.random() * 8,
    }));

    return (
        <>
            <style>
                {`
                    @keyframes popInElastic {
                        0% { 
                            transform: translate(-50%, -50%) scale(0) rotate(-180deg);
                            opacity: 0;
                            filter: blur(10px);
                        }
                        50% {
                            transform: translate(-50%, -50%) scale(calc(var(--btn-scale) * 1.3)) rotate(10deg);
                            opacity: 1;
                            filter: blur(0px);
                        }
                        70% { 
                            transform: translate(-50%, -50%) scale(calc(var(--btn-scale) * 0.9)) rotate(-5deg);
                            opacity: 1;
                            filter: blur(0px);
                        }
                        100% { 
                            transform: translate(-50%, -50%) scale(var(--btn-scale)) rotate(0deg);
                            opacity: 1;
                            filter: blur(0px);
                        }
                    }

                    @keyframes dustFade {
                        0% {
                            transform: translate(0, 0) scale(1);
                            opacity: 1;
                            filter: blur(6px);
                        }
                        100% {
                            transform: translate(var(--dust-x), var(--dust-y)) scale(0.2);
                            opacity: 0;
                            filter: blur(20px);
                        }
                    }

                    @keyframes glowPulse {
                        0%, 100% {
                            box-shadow: 
                                0 4px 12px rgba(249, 115, 22, 0.5),
                                0 0 30px rgba(249, 115, 22, 0.4),
                                0 0 60px rgba(249, 115, 22, 0.2);
                            filter: blur(0px);
                        }
                        50% {
                            box-shadow: 
                                0 4px 20px rgba(249, 115, 22, 0.8),
                                0 0 50px rgba(249, 115, 22, 0.6),
                                0 0 100px rgba(249, 115, 22, 0.4);
                            filter: blur(0.5px);
                        }
                    }

                    @keyframes popOutElastic {
                        0% {
                            transform: translate(-50%, -50%) scale(var(--btn-scale)) rotate(0deg);
                            opacity: 1;
                            filter: blur(0px);
                        }
                        50% {
                            transform: translate(-50%, -50%) scale(calc(var(--btn-scale) * 1.2)) rotate(10deg);
                            opacity: 0.8;
                            filter: blur(2px);
                        }
                        100% {
                            transform: translate(-50%, -50%) scale(0) rotate(180deg);
                            opacity: 0;
                            filter: blur(10px);
                        }
                    }

                    @keyframes dustExplode {
                        0% {
                            transform: translate(-50%, -50%) scale(1);
                            opacity: 0;
                        }
                        20% {
                            opacity: 1;
                        }
                        100% {
                            transform: translate(var(--dust-x), var(--dust-y)) scale(0.3);
                            opacity: 0;
                            filter: blur(15px);
                        }
                    }

                    @keyframes containerFadeOut {
                        0% {
                            opacity: 1;
                        }
                        100% {
                            opacity: 0;
                        }
                    }

                    .group-button-container {
                        position: absolute;
                        pointer-events: none;
                        animation: none;
                    }

                    .group-button-container.exiting {
                        animation: containerFadeOut 0.4s ease-out forwards;
                    }

                    .group-button-main {
                        animation: 
                            popInElastic 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards,
                            glowPulse 2s ease-in-out infinite;
                        pointer-events: auto;
                    }

                    .group-button-main.exiting {
                        animation: popOutElastic 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
                    }

                    .dust-particle {
                        position: absolute;
                        border-radius: 50%;
                        animation: dustFade 1s ease-out forwards;
                        pointer-events: none;
                        filter: blur(6px);
                    }

                    .dust-particle.exploding {
                        animation: dustExplode 0.6s ease-out forwards;
                    }
                `}
            </style>

            <div
                className={`group-button-container ${isExiting ? 'exiting' : ''}`}
                style={{
                    left: `${centerX * scale + offset.x}px`,
                    top: `${buttonY * scale + offset.y}px`,
                    zIndex: 1001,
                    background: 'rgba(0, 0, 0, 0.3)',
                    backdropFilter: 'blur(10px)',
                    padding: '8px 12px',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
            >
                {/* Dust Particles - BIGGER and BRIGHTER */}
                {dustParticles.map((particle) => {
                    const radians = (particle.angle * Math.PI) / 180;
                    const dustX = Math.cos(radians) * particle.distance;
                    const dustY = Math.sin(radians) * particle.distance;

                    return (
                        <div
                            key={particle.id}
                            className={`dust-particle ${isExiting ? 'exploding' : ''}`}
                            style={{
                                left: '50%',
                                top: '50%',
                                width: `${particle.size}px`,
                                height: `${particle.size}px`,
                                background: `radial-gradient(circle, rgba(249, 115, 22, 1), rgba(234, 88, 12, 0.6), transparent)`,
                                transform: 'translate(-50%, -50%)',
                                animationDelay: `${particle.delay}s`,
                                // @ts-ignore - CSS custom properties
                                '--dust-x': `${dustX}px`,
                                '--dust-y': `${dustY}px`,
                            }}
                        />
                    );
                })}

                {/* Main Button */}
                <button
                    className={`group-button-main ${isExiting ? 'exiting' : ''}`}
                    onClick={onClick}
                    style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        transform: `translate(-50%, -50%) scale(${scale})`,
                        transformOrigin: 'center center',
                        padding: '12px 24px',
                        background: 'linear-gradient(135deg, #f97316, #ea580c)',
                        border: '2px solid rgba(255, 255, 255, 0.3)',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '14px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        pointerEvents: 'auto',
                        textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                        backdropFilter: 'blur(10px)',
                        // @ts-ignore - CSS custom property
                        '--btn-scale': scale,
                    }}
                    title="Group Selected Nodes"
                    data-no-selection="true"
                >
                    🔗 Group ({count})
                </button>
            </div>
        </>
    );
};
