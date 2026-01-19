import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import React from 'react';

// Minimal interface for what we need
export interface SelectableObject {
    id: string;
    ref: React.RefObject<any>;
}

export function SelectionLogic({
    selectionRect,
    sceneObjects,
    onSelectionCalculated
}: {
    selectionRect: { x: number; y: number; width: number; height: number } | null,
    sceneObjects: SelectableObject[],
    onSelectionCalculated: (ids: Set<string>) => void
}) {
    const { camera, size } = useThree();

    useEffect(() => {
        if (!selectionRect) return;

        console.log('SelectionLogic: Processing rect', selectionRect);
        const newSelectedIds = new Set<string>();
        const tempVector = new THREE.Vector3();

        sceneObjects.forEach(obj => {
            // Check if ref and current exist
            if (obj.ref && obj.ref.current) {
                // Better Logic: Check Project Bounding Box
                // 1. Get 3D Bounding Box
                const box3 = new THREE.Box3().setFromObject(obj.ref.current);
                const corners = [
                    new THREE.Vector3(box3.min.x, box3.min.y, box3.min.z),
                    new THREE.Vector3(box3.min.x, box3.min.y, box3.max.z),
                    new THREE.Vector3(box3.min.x, box3.max.y, box3.min.z),
                    new THREE.Vector3(box3.min.x, box3.max.y, box3.max.z),
                    new THREE.Vector3(box3.max.x, box3.min.y, box3.min.z),
                    new THREE.Vector3(box3.max.x, box3.min.y, box3.max.z),
                    new THREE.Vector3(box3.max.x, box3.max.y, box3.min.z),
                    new THREE.Vector3(box3.max.x, box3.max.y, box3.max.z),
                ];

                // 2. Project all corners to Screen Space
                let minX = Infinity;
                let minY = Infinity;
                let maxX = -Infinity;
                let maxY = -Infinity;

                corners.forEach(v => {
                    v.project(camera);
                    const x = (v.x * 0.5 + 0.5) * size.width;
                    const y = (-(v.y) * 0.5 + 0.5) * size.height;

                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                });

                // 3. Check AABB Intersection (2D Box vs 2D Selection Rect)
                // Does 'selectionRect' OVERLAP with 'object2DRect'?
                const selMinX = selectionRect.x;
                const selMaxX = selectionRect.x + selectionRect.width;
                const selMinY = selectionRect.y;
                const selMaxY = selectionRect.y + selectionRect.height;

                const isOverlapping = !(
                    selMaxX < minX || // Selection is left of object
                    selMinX > maxX || // Selection is right of object
                    selMaxY < minY || // Selection is above object
                    selMinY > maxY    // Selection is below object
                );

                console.log(`Object ${obj.id}: Overlap=${isOverlapping}`);

                if (isOverlapping) {
                    newSelectedIds.add(obj.id);
                }
            }
        });

        console.log('SelectionLogic: Selected IDs', Array.from(newSelectedIds));
        onSelectionCalculated(newSelectedIds);
    }, [selectionRect, sceneObjects, camera, size, onSelectionCalculated]);

    return null;
}
