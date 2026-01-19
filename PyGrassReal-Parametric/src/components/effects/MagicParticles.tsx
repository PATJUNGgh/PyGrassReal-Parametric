import React, { useEffect, useState } from 'react';

interface MagicParticlesProps {
    x: number;
    y: number;
    color?: string;
    onComplete?: () => void;
}

interface Particle {
    id: number;
    angle: number;
    distance: number;
    size: number;
    duration: number;
    delay: number;
    dynamicColor?: string;
}

export const MagicParticles: React.FC<MagicParticlesProps> = ({ x, y, color = '#646cff', onComplete }) => {
    const [particles] = useState<Particle[]>(() => {
        // Generate 30 particles with much larger size and spread to fill component
        return Array.from({ length: 30 }, (_, i) => ({
            id: i,
            angle: (Math.PI * 2 * i) / 30 + (Math.random() - 0.5) * 0.5,
            distance: 100 + Math.random() * 120, // Increased to 100-220px to cover full component
            size: 8 + Math.random() * 12, // Increased to 8-20px for more visibility
            duration: 0.8 + Math.random() * 0.5,
            delay: Math.random() * 0.2,
            // Randomly pick between cyan, blue, purple, and magenta for a magical mix
            dynamicColor: ['#00f2ff', '#0099ff', '#bd00ff', '#ff00ff'][Math.floor(Math.random() * 4)]
        }));
    });

    useEffect(() => {
        const timer = setTimeout(() => {
            onComplete?.();
        }, 1000);
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
            {particles.map((particle) => {
                const tx = Math.cos(particle.angle) * particle.distance;
                const ty = Math.sin(particle.angle) * particle.distance;

                const particleColor = particle.dynamicColor || color;

                return (
                    <div
                        key={particle.id}
                        style={{
                            position: 'absolute',
                            width: `${particle.size}px`,
                            height: `${particle.size}px`,
                            borderRadius: '50%',
                            background: `radial-gradient(circle, #ffffff 20%, ${particleColor} 90%, transparent 100%)`,
                            boxShadow: `0 0 ${particle.size}px ${particleColor}, 0 0 ${particle.size * 3}px ${particleColor}`,
                            filter: 'brightness(1.5)',
                            animation: `magicPoof ${particle.duration}s ease-out ${particle.delay}s forwards`,
                            '--tx': `${tx}px`,
                            '--ty': `${ty}px`,
                        } as React.CSSProperties}
                    />
                );
            })}
        </div>
    );
};
