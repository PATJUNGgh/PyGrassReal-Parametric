import { useEffect, useMemo, type MutableRefObject } from 'react';
import * as THREE from 'three';

interface Build3DAiScopeBoxProps {
    id: string;
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
    scopeRef?: MutableRefObject<THREE.Group | null>;
}

export function Build3DAiScopeBox({ id, position, rotation, scale, scopeRef }: Build3DAiScopeBoxProps) {
    const BOX_SIZE = 1.05;
    const safeScale: [number, number, number] = [
        Math.max(Math.abs(scale[0]), 0.001),
        Math.max(Math.abs(scale[1]), 0.001),
        Math.max(Math.abs(scale[2]), 0.001),
    ];

    const geometry = useMemo(() => {
        const half = BOX_SIZE / 2;
        const segments: Array<{ a: [number, number, number]; b: [number, number, number]; axis: 'x' | 'y' | 'z' }> = [
            // Bottom rectangle
            { a: [-half, -half, -half], b: [half, -half, -half], axis: 'x' },
            { a: [half, -half, -half], b: [half, -half, half], axis: 'z' },
            { a: [half, -half, half], b: [-half, -half, half], axis: 'x' },
            { a: [-half, -half, half], b: [-half, -half, -half], axis: 'z' },
            // Top rectangle
            { a: [-half, half, -half], b: [half, half, -half], axis: 'x' },
            { a: [half, half, -half], b: [half, half, half], axis: 'z' },
            { a: [half, half, half], b: [-half, half, half], axis: 'x' },
            { a: [-half, half, half], b: [-half, half, -half], axis: 'z' },
            // Vertical edges
            { a: [-half, -half, -half], b: [-half, half, -half], axis: 'y' },
            { a: [half, -half, -half], b: [half, half, -half], axis: 'y' },
            { a: [half, -half, half], b: [half, half, half], axis: 'y' },
            { a: [-half, -half, half], b: [-half, half, half], axis: 'y' },
        ];

        const positions = new Float32Array(segments.length * 2 * 3);
        const lineDistance = new Float32Array(segments.length * 2);
        const axisWorldLengths = {
            x: BOX_SIZE * safeScale[0],
            y: BOX_SIZE * safeScale[1],
            z: BOX_SIZE * safeScale[2],
        };

        segments.forEach((segment, index) => {
            const p = index * 6;
            positions[p] = segment.a[0];
            positions[p + 1] = segment.a[1];
            positions[p + 2] = segment.a[2];
            positions[p + 3] = segment.b[0];
            positions[p + 4] = segment.b[1];
            positions[p + 5] = segment.b[2];

            const d = index * 2;
            lineDistance[d] = 0;
            lineDistance[d + 1] = axisWorldLengths[segment.axis];
        });

        const built = new THREE.BufferGeometry();
        built.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        built.setAttribute('lineDistance', new THREE.BufferAttribute(lineDistance, 1));
        return built;
    }, [BOX_SIZE, safeScale]);

    useEffect(() => () => geometry.dispose(), [geometry]);

    return (
        <group
            ref={scopeRef}
            userData={{ selectionBoxAsObject: true }}
            position={position}
            rotation={rotation}
            scale={safeScale}
        >
            <lineSegments geometry={geometry}>
                <lineDashedMaterial
                    color="#22c55e"
                    dashSize={0.08}
                    gapSize={0.06}
                    scale={1}
                    transparent
                    opacity={0.95}
                />
            </lineSegments>
            <mesh
                userData={{ sceneId: id, isScopeBox: true }}
            >
                <boxGeometry args={[BOX_SIZE, BOX_SIZE, BOX_SIZE]} />
                <meshBasicMaterial transparent opacity={0.01} depthWrite={false} />
            </mesh>
        </group>
    );
}
