
import * as THREE from 'three';
import { MarchingCubes } from './marchingCubesWrapper';

export function updateMarchingCubesField(
    mc: any,
    sdf: (x: number, y: number, z: number) => number,
    bounds: THREE.Box3,
    resolution: number,
    worldMatrix?: THREE.Matrix4,
    colorFn?: (x: number, y: number, z: number) => { r: number, g: number, b: number }
) {
    if (mc.resolution !== resolution) {
        mc.init(resolution);
    }

    const field = mc.field;
    if (!field) return;

    mc.reset();

    // Iterate in MC Local Space [-1, 1]
    // Map local point -> World Point -> SDF -> Value

    // MC Local space: x,y,z in [-1, 1]?
    // Usually indices are 0..resolution.
    // MC logic maps 0..res to -1..1.

    // We iterate indices 0..res.

    let idx = 0;

    // Stride check: typical MC is KJI or IJK?
    // Let's stick to KJI loops.

    const step = 2.0 / resolution; // Range length 2 (-1 to 1)

    // Local point vector reuse
    const localP = new THREE.Vector3();
    const worldP = new THREE.Vector3();

    const matrix = worldMatrix || mc.matrixWorld;

    for (let k = 0; k < resolution; k++) {
        const z = -1 + k * step; // map 0..res to -1..1
        for (let j = 0; j < resolution; j++) {
            const y = -1 + j * step;
            for (let i = 0; i < resolution; i++) {
                const x = -1 + i * step; // or 0..1? Standard MC is usually -1..1 axis aligned centered.

                localP.set(x, y, z);
                worldP.copy(localP).applyMatrix4(matrix);

                const d = sdf(worldP.x, worldP.y, worldP.z);
                const val = -d; // Inside = positive

                field[idx] = val;

                if (mc.enableColors && colorFn && mc.palette) {
                    const col = colorFn(worldP.x, worldP.y, worldP.z);
                    mc.palette[idx * 3] = col.r;
                    mc.palette[idx * 3 + 1] = col.g;
                    mc.palette[idx * 3 + 2] = col.b;
                }

                idx++;
            }
        }
    }

    mc.isolation = 0;

    // Trigger internal update
    // Some implementations might require 'addBall' with dummy to check isolate?
    // We assume 'update' uses the field we set.
}
