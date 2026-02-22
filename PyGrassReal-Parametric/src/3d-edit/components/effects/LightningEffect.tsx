import React, { useEffect, useState } from 'react';

interface LightningEffectProps {
    source: { x: number; y: number };
    target: { x: number; y: number };
}

export const LightningEffect: React.FC<LightningEffectProps> = ({ source, target }) => {
    const [points, setPoints] = useState<string>('');

    useEffect(() => {
        let frameId: number;
        const startTime = Date.now();
        const duration = 500; // Total duration of the effect

        const animate = () => {
            const now = Date.now();
            if (now - startTime > duration) return;

            // Generate zigzag points
            const segments = 12;
            let pathData = `M ${source.x} ${source.y}`;

            const dx = target.x - source.x;
            const dy = target.y - source.y;

            for (let i = 1; i < segments; i++) {
                const t = i / segments;
                const x = source.x + dx * t;
                const y = source.y + dy * t;

                // Add random offset perpendicular to the line
                const offset = (Math.random() - 0.5) * 30; // Random jaggedness

                // Calculate perpendicular vector roughly
                const perpX = -dy / Math.sqrt(dx * dx + dy * dy) * offset;
                const perpY = dx / Math.sqrt(dx * dx + dy * dy) * offset;

                pathData += ` L ${x + perpX} ${y + perpY}`;
            }

            pathData += ` L ${target.x} ${target.y}`;
            setPoints(pathData);

            frameId = requestAnimationFrame(animate);
        };

        animate();

        return () => cancelAnimationFrame(frameId);
    }, [source, target]);

    return (
        <path
            d={points}
            stroke="#00ffff"
            strokeWidth="3"
            fill="none"
            style={{
                filter: 'drop-shadow(0 0 8px #00ffff) drop-shadow(0 0 15px #0000ff)',
                opacity: 0.8,
                animation: 'fadeOut 0.5s ease-out forwards',
            }}
        >
            <style>{`
                @keyframes fadeOut {
                    0% { opacity: 1; stroke-width: 4; }
                    100% { opacity: 0; stroke-width: 1; }
                }
            `}</style>
        </path>
    );
};
