import React, { useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { RoundedBox, Cone } from '@react-three/drei';
import type { SceneObject } from '../../types/scene';
import { MeshStandardMaterial } from 'three';
import type { Mesh, Object3D } from 'three';

interface ModelProps {
    data: SceneObject;
    isSelected: boolean;
    highlightEnabled?: boolean;
    interactionDisabled?: boolean;
}

export const Model = React.forwardRef<Object3D, ModelProps>(({ data, isSelected, highlightEnabled = false, interactionDisabled }, ref) => {
    const { type, color } = data;
    const resolvedColor = color ?? '#cccccc';
    const highlight = isSelected && highlightEnabled;
    const meshRef = useRef<Mesh | null>(null);
    const objectRef = useRef<Object3D | null>(null);
    const [hovered, setHovered] = React.useState(false);

    const isFaded = data.isFaded;
    const isRaycastSelectable = !data.isGhost;
    const isHoverSelectable = !interactionDisabled && !data.isGhost;
    const matParams = data.materialParams || {};
    const baseUserData = { 
        isSceneObject: true, 
        sceneId: data.id, 
        ownerNodeId: data.id, // Explicitly identify the owning node
        isSelectable: isRaycastSelectable 
    };

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
        mesh.userData.isSelectable = isRaycastSelectable;
        // This is still read by SceneInner, so we keep it but ensure it uses the unified logic
        mesh.userData.baseEmissiveIntensity = baseMaterialProps.emissiveIntensity;

    }, [resolvedColor, highlight, data.isGhost, isFaded, matParams, isRaycastSelectable]);

    useEffect(() => {
        const mesh = meshRef.current;
        if (!mesh) return;
        // Hard-hide ghosted inputs to eliminate z-fighting with clones.
        mesh.visible = !data.isGhost;
    }, [data.isGhost]);

    // Final material props for render, including transient states like 'hovered'
    const materialProps = {
        ...baseMaterialProps,
        opacity: data.isGhost
            ? ((hovered || isSelected) ? 0.2 : 0.0) // Override opacity for ghost hover/selection
            : baseMaterialProps.opacity,
    };

    const assignObjectRef = useCallback((node: Object3D | null) => {
        objectRef.current = node;
        meshRef.current = node && (node as Mesh).isMesh ? (node as Mesh) : null;
    }, []);

    useImperativeHandle(ref, () => objectRef.current as Object3D, []);

    const meshProps = {
        onPointerOver: () => {
            if (!isHoverSelectable) return;
            if (data.isGhost) setHovered(true);
        },
        onPointerOut: () => {

            if (data.isGhost) setHovered(false);
        },
        raycast: isRaycastSelectable ? undefined : (() => null),
        ref: assignObjectRef,
        userData: baseUserData // Embed ID for SceneInner lookup
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

    if (type === 'cone') {
        // Cone in drei/three usually takes args=[radius, height, radialSegments]
        // data.radius is base radius (default 1). data.height is height (default 2).
        // BUT our transform (scale) applies to the geometry.
        // If we want the node parameters to control the actual dimensions WITHOUT scale,
        // we should pass them as args.
        // However, standard primitives in this app (Box, Sphere) use args=[1,1,1] and rely on 'scale' prop from the node for sizing?
        // Let's check Box. Box has args=[1,1,1]. Node scale controls size.
        // But Cone has 'Radius' and 'Length' inputs on the node.
        // If we rely on scale [1,1,1], we get a unit cone.
        // The Inputs 'Radius' and 'Length' updates the 'radius' and 'height' in SceneObject (via useGraphEvaluator).
        // AND useGraphEvaluator also sets 'scale' from the node's Scale input.
        // So we have a Conflict: Node Scale vs Node Params (Radius/Length).
        // Usually, separate inputs mean generating geometry of that size.
        // If we look at Box, it has 'Corner' input (radius).
        // For Cone, 'Radius' and 'Length' should likely drive the args, NOT the scale (unless user uses Scale input too).
        // But SceneObject.scale comes from Node.Data.Scale input.
        // So we should use data.radius and data.height for geometry args.

        // Use Unit Cone (Radius 0.5 -> Diameter 1, Height 1)
        // Scaling is handled via SceneObject.scale in useGraphEvaluator
        return (
            <Cone {...meshProps} args={[0.5, 1, 32]}>
                <meshStandardMaterial {...materialProps} />
            </Cone>
        );
    }

    if (type === 'cylinder') {
        return (
            <mesh {...meshProps}>
                <cylinderGeometry args={[0.5, 0.5, 1, 48]} />
                <meshStandardMaterial {...materialProps} />
            </mesh>
        );
    }

    if (data.customObject) {
        // Sync visibility and ghost state to the raw THREE object
        data.customObject.visible = !data.isGhost;
        const customGroup = data.customObject;
        if (customGroup.type === 'Group' && customGroup.children.length === 1) {
            const onlyChild = customGroup.children[0] as any;
            const isMarchingCubesChild =
                onlyChild?.type === 'MarchingCubes'
                || onlyChild?.isMarchingCubes === true
                || onlyChild?.constructor?.name === 'MarchingCubes';
            if (isMarchingCubesChild) {
                customGroup.userData.selectionBoxAsObject = true;
            }
        }

        return (
            <primitive
                object={data.customObject}
                ref={assignObjectRef}
                userData={{ ...data.customObject.userData, ...baseUserData }}
                raycast={isRaycastSelectable ? undefined : (() => null)}
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
