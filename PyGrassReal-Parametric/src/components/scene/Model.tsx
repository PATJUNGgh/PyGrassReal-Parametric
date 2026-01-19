import React, { useRef } from 'react';
import { SceneObject } from '../types';
import { Mesh } from 'three';

interface ModelProps {
    data: SceneObject;
    isSelected: boolean;
    onClick: (e: React.MouseEvent) => void;
}

export const Model = React.forwardRef<Mesh, ModelProps>(({ data, isSelected, onClick }, ref) => {
    const { type, color, position, rotation, scale } = data;

    const meshProps = {
        position: position,
        rotation: rotation,
        scale: scale,
        onClick: (e: any) => {
            e.stopPropagation();
            onClick(e);
        },
        ref: ref
    };

    const materialProps = {
        color: color,
        roughness: 0.5,
        metalness: 0.5
    };

    if (type === 'box') {
        return (
            <mesh {...meshProps}>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial {...materialProps} />
            </mesh>
        );
    }

    return (
        <mesh {...meshProps}>
            <sphereGeometry args={[0.5, 32, 32]} />
            <meshStandardMaterial {...materialProps} />
        </mesh>
    );
});
