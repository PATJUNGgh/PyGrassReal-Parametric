import React, { useEffect, useImperativeHandle, useRef, MutableRefObject } from 'react';
import { RoundedBox } from '@react-three/drei';
import type { SceneObject } from '../../types/scene';
import { MeshStandardMaterial } from 'three';
import type { Material, Mesh } from 'three';

interface ModelProps {
    data: SceneObject;
    isSelected: boolean;
    highlightEnabled: boolean;
    interactionDisabled?: boolean;
    gumballHoveredRef?: MutableRefObject<boolean>;
    handlesHoveredRef?: MutableRefObject<boolean>;
    onClick: (e: any) => void;
}

export const Model = React.forwardRef<Mesh, ModelProps>(({ data, isSelected, highlightEnabled, interactionDisabled, gumballHoveredRef, handlesHoveredRef, onClick }, ref) => {
    const { type, color } = data;
    const resolvedColor = color ?? (type === 'box' ? '#4caf50' : '#2196f3');
    const highlight = isSelected && highlightEnabled;
    const meshRef = useRef<Mesh>(null);
    const [hovered, setHovered] = React.useState(false);

    useImperativeHandle(ref, () => meshRef.current as Mesh, []);

    useEffect(() => {
        const mesh = meshRef.current;
        if (!mesh) return;
        const baseMaterial = new MeshStandardMaterial({
            color: resolvedColor,
            roughness: 0.5,
            metalness: 0.5,
            emissive: highlight ? '#38bdf8' : '#000000',
            emissiveIntensity: highlight ? 0.6 : 0
        });
        mesh.userData.baseMaterial = baseMaterial;
        mesh.userData.baseColor = resolvedColor;
        mesh.userData.baseEmissive = highlight ? '#38bdf8' : '#000000';
        mesh.userData.baseEmissiveIntensity = highlight ? 0.6 : 0;
        mesh.userData.isGhost = data.isGhost;
    }, [resolvedColor, highlight, data.isGhost]);

    const meshProps = {
        onPointerDown: (e: any) => {
            if (interactionDisabled) return;
            // Only left-click selects; allow middle/right clicks to pass through to OrbitControls.
            if (e.button !== 0) return;
            // Event propagation is stopped by handles if they are clicked.
            // If the event reaches here, it means we clicked the model directly.
            e.stopPropagation();
            onClick(e);
        },
        onPointerOver: (e: any) => {
            if (interactionDisabled) return;
            // Handles stop propagation of pointerEnter.
            // However, we might want to know if we are hovering a handle to avoid highlighting.
            // But relying on refs caused sticky state.
            // Let's rely on the fact that if a handle is hovered, it's on top.
            if (data.isGhost) setHovered(true);
        },
        onPointerOut: (e: any) => {
            if (data.isGhost) setHovered(false);
        },
        ref: meshRef,
        userData: { isSceneObject: true, sceneId: data.id } // Embed ID for SceneInner lookup
    };

    const materialProps = {
        color: resolvedColor,
        roughness: 0.5,
        metalness: 0.5,
        emissive: (highlight && !data.isGhost) ? '#38bdf8' : '#000000',
        emissiveIntensity: (highlight && !data.isGhost) ? 0.6 : 0,
        transparent: data.isGhost,
        opacity: data.isGhost ? ((hovered || isSelected) ? 0.2 : 0.0) : 1,
    };

    if (type === 'box') {
        const rawRadius = data.radius || 0;
        // Clamp radius to max 0.5 (half of box size 1x1x1)
        const radius = Math.min(rawRadius, 0.5);
        if (radius > 0) {
            return (
                <mesh {...meshProps}>
                    <RoundedBox args={[1, 1, 1]} radius={radius} smoothness={4}>
                        <meshStandardMaterial {...materialProps} />
                    </RoundedBox>
                </mesh>
            );
        }
        return (
            <mesh {...meshProps}>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial {...materialProps} />
            </mesh>
        );
    }

    if (data.customObject) {
        return (
            <primitive
                object={data.customObject}
                ref={meshRef}
                userData={{ isSceneObject: true }}
                raycast={() => null}
            />
        );
    }

    return (
        <mesh {...meshProps}>
            <sphereGeometry args={[0.5, 32, 32]} />
            <meshStandardMaterial {...materialProps} />
        </mesh>
    );
});
