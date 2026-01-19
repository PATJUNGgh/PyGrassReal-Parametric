import React, { useEffect, useState } from 'react';

interface FireEffectProps {
    x: number;
    y: number;
    onComplete?: () => void;
}

interface Flame {
    id: number;
    offsetX: number;
    size: number;
    duration: number;
    delay: number;
}

export const FireEffect: React.FC<FireEffectProps> = ({ x, y, onComplete }) => {
    const [flames] = useState<Flame[]>(() => {
        // Generate 25 flame particles rising upward
        return Array.from({ length: 25 }, (_, i) => ({
            id: i,
            offsetX: (Math.random() - 0.5) * 120, // Spread horizontally
            size: 10 + Math.random() * 15,
            duration: 0.6 + Math.random() * 0.4,
            delay: Math.random() * 0.2,
        }));
    });

    useEffect(() => {
        const timer = setTimeout(() => {
            onComplete?.();
        }, 1200);
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div
            style={{
                position: 'absolute',
                left: x,
                top: y,
                pointerEvents: 'none',
                zIndex: 1000,
            }}
        >
            {flames.map((flame) => {
                return (
                    <div
                        key={flame.id}
                        style={{
                            position: 'absolute',
                            width: `${flame.size}px`,
                            height: `${flame.size * 1.5}px`,
                            borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                            background: `radial-gradient(ellipse at center, #fff 0%, #ffeb3b 20%, #ff9800 40%, #ff5722 70%, transparent 100%)`,
                            boxShadow: `0 0 ${flame.size * 2}px #ff9800, 0 0 ${flame.size * 3}px #ff5722`,
                            animation: `fireRise ${flame.duration}s ease-out ${flame.delay}s forwards`,
                            '--flame-x': `${flame.offsetX}px`,
                        } as React.CSSProperties}
                    />
                );
            })}
        </div>
    );
};
