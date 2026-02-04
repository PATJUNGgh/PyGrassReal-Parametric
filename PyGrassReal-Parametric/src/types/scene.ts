import React from 'react';
import type * as THREE from 'three';

export interface SceneObject {
    id: string;
    type: 'box' | 'sphere' | 'custom'; // Extend with other object types as needed
    ref: React.RefObject<THREE.Object3D>; // Reference to the actual Three.js object
    position: [number, number, number];
    rotation: [number, number, number]; // Euler angles or Quaternion components
    color?: string; // Optional color property
    scale: [number, number, number];
    customObject?: THREE.Object3D;
    isGhost?: boolean;
    isFaded?: boolean;
    radius?: number;
    materialParams?: {
        roughness?: number;
        metalness?: number;
        emissive?: number;
        transparency?: number;
    };
    proxySelectionId?: string;
    // Add any other common properties that all scene objects share
}

export type TransformMode = 'translate' | 'rotate' | 'scale';
