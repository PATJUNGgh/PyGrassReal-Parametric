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

    const isFaded = data.isFaded;
    const matParams = data.materialParams || {};

    // Unified material properties, excluding transient states like 'hovered'
    const baseMaterialProps = {
        color: resolvedColor,
        roughness: matParams.roughness ?? 0.5,
        metalness: matParams.metalness ?? 0.5,
        emissive: (highlight && !data.isGhost) ? '#38bdf8' : (matParams.emissive ? resolvedColor : '#000000'),
        emissiveIntensity: (highlight && !data.isGhost) ? 0.6 : (matParams.emissive ? matParams.emissive * 1.5 : 0),
        transparent: data.isGhost || isFaded || (matParams.transparency !== undefined && matParams.transparency > 0),
        opacity: data.isGhost
            ? 0.0 // Base opacity for a ghost is 0, hover/selection state is handled in render
            : (isFaded ? 0.35 : (matParams.transparency !== undefined ? 1 - matParams.transparency : 1)),
    };
    
    useEffect(() => {
        const mesh = meshRef.current;
        if (!mesh) return;

        // Create a "base" material for SceneInner to use, without transient hover state
        const baseMaterial = new MeshStandardMaterial(baseMaterialProps);
        
        mesh.userData.baseMaterial = baseMaterial;
        mesh.userData.isGhost = data.isGhost;
        // This is still read by SceneInner, so we keep it but ensure it uses the unified logic
        mesh.userData.baseEmissiveIntensity = baseMaterialProps.emissiveIntensity;

    }, [resolvedColor, highlight, data.isGhost, isFaded, matParams]);

    // Final material props for render, including transient states like 'hovered'
    const materialProps = {
        ...baseMaterialProps,
        opacity: data.isGhost
            ? ((hovered || isSelected) ? 0.2 : 0.0) // Override opacity for ghost hover/selection
            : baseMaterialProps.opacity,
    };

    useImperativeHandle(ref, () => meshRef.current as Mesh, []);

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

    if (type === 'box') {
        const rawRadius = data.radius || 0;
        // Clamp radius to max 0.5 (half of box size 1x1x1)
        const radius = Math.min(rawRadius, 0.5);
        
        if (radius > 0) {
            return (
                <RoundedBox {...meshProps} args={[1, 1, 1]} radius={radius} smoothness={4}>
                    <meshStandardMaterial {...materialProps} />
                </RoundedBox>
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
        // Sync visibility and ghost state to the raw THREE object
        data.customObject.visible = !data.isGhost;

        return (
            <primitive
                object={data.customObject}
                ref={meshRef}
                userData={{ isSceneObject: true }}
                raycast={data.isGhost ? (() => null) : undefined}
                onPointerDown={meshProps.onPointerDown}
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
