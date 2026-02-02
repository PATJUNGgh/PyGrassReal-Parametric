import { useEffect, useRef } from 'react';
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
    onSelectionCalculated: (ids: Set<string>) => void,
    firstSelectedAppId?: string | null
}) {
    const { camera, size } = useThree();
    const lastProcessedRectStrRef = useRef<string | null>(null);

    useEffect(() => {
        if (!selectionRect) {
            // This is part of the loop-breaking logic. When the parent clears the
            // rect after processing, we don't reset our 'last processed' ref.
            return;
        }

        const currentRectStr = JSON.stringify(selectionRect);

        // If we're being asked to process the exact same rectangle again, bail out.
        // This breaks the infinite re-render loop.
        if (lastProcessedRectStrRef.current === currentRectStr) {
            return;
        }

        const newSelectedIds = new Set<string>();

        sceneObjects.forEach(obj => {
            if (obj.ref && obj.ref.current) {
                const box3 = new THREE.Box3().setFromObject(obj.ref.current);
                if (box3.isEmpty()) return;

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

                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

                corners.forEach(v => {
                    v.project(camera);
                    const x = (v.x * 0.5 + 0.5) * size.width;
                    const y = (-(v.y) * 0.5 + 0.5) * size.height;
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                });

                const selMinX = selectionRect.x;
                const selMaxX = selectionRect.x + selectionRect.width;
                const selMinY = selectionRect.y;
                const selMaxY = selectionRect.y + selectionRect.height;

                const isOverlapping = !(selMaxX < minX || selMinX > maxX || selMaxY < minY || selMinY > maxY);

                if (isOverlapping) {
                    newSelectedIds.add(obj.id);
                }
            }
        });
        
        // Mark this rect as processed *before* calling the callback to prevent
        // re-processing on the next render cycle.
        lastProcessedRectStrRef.current = currentRectStr;
        onSelectionCalculated(newSelectedIds);

    }, [selectionRect, sceneObjects, camera, size, onSelectionCalculated]);

    return null;
}
