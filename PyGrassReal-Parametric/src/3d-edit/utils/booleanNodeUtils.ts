import * as THREE from 'three';
import { sdBox, sdSphere, smin, smax, sdRoundedBox, sdCone, sdCappedCylinder, sdRoundedCylinder } from './sdfUtils';
import type { NodeData } from '../types/NodeTypes';
import type { SceneObject } from '../types/scene';
import { extractNumber } from './nodeUtils';

export interface Evaluable {
    type: string;
    inverseMatrix: THREE.Matrix4;
    dims: { x: number; y: number; z: number };
    radius: number;
    height: number;
    corner: number;
    color: THREE.Color;
}

export interface BooleanOperationConfig {
    sdf: (distances: { [key: string]: number }, smoothness: number) => number;
    color: string;
    // Maps input port ID on the boolean node to a named group (e.g., 'A', 'B')
    inputGroups: { [port: string]: string };
}

export const OPERATION_CONFIGS: { [key: string]: BooleanOperationConfig } = {
    'mesh-union': {
        sdf: (distances, smoothness) => Object.values(distances).reduce((d1, d2) => smin(d1, d2, smoothness)),
        color: '#f97316',
        inputGroups: { 'M': 'main' },
    },
    'mesh-intersection': {
        sdf: (distances, smoothness) => smax(distances.A, distances.B, smoothness),
        color: '#22c55e',
        inputGroups: { 'A': 'A', 'B': 'B' },
    },
    'mesh-difference': {
        sdf: (distances, smoothness) => smax(distances.A, -distances.B, smoothness),
        color: '#f59e0b',
        inputGroups: { 'A': 'A', 'B': 'B' },
    }
};

export const PASSTHROUGH_NODE_TYPES = new Set(['layer-source', 'model-material', ...Object.keys(OPERATION_CONFIGS)]);
export const BOOLEAN_BOUNDS_EPSILON = 1e-6;
export const MIN_BOOLEAN_BOUNDS_AXIS = 0.05;
export const IDW_EPSILON = 0.00001;

export const hasFiniteVector3 = (value: THREE.Vector3): boolean => {
    return Number.isFinite(value.x) && Number.isFinite(value.y) && Number.isFinite(value.z);
};

export const hasFiniteBounds = (bounds: THREE.Box3 | undefined): boolean => {
    return !!bounds && hasFiniteVector3(bounds.min) && hasFiniteVector3(bounds.max);
};

export const hasUsableBounds = (bounds: THREE.Box3 | undefined, epsilon: number = BOOLEAN_BOUNDS_EPSILON): boolean => {
    if (!bounds || bounds.isEmpty() || !hasFiniteBounds(bounds)) return false;
    const size = new THREE.Vector3();
    bounds.getSize(size);
    return size.x > epsilon || size.y > epsilon || size.z > epsilon;
};

export const ensureMinimumBoundsSize = (bounds: THREE.Box3, minAxis: number): void => {
    if (!hasFiniteBounds(bounds)) return;
    const size = new THREE.Vector3();
    bounds.getSize(size);
    const expand = new THREE.Vector3(
        Math.max(0, minAxis - size.x) * 0.5,
        Math.max(0, minAxis - size.y) * 0.5,
        Math.max(0, minAxis - size.z) * 0.5
    );
    if (expand.x > 0 || expand.y > 0 || expand.z > 0) {
        bounds.expandByVector(expand);
    }
};

export const getPrimitiveDistance = (item: Evaluable, p: THREE.Vector3): number => {
    const localP = p.clone().applyMatrix4(item.inverseMatrix);
    if (item.type === 'box') {
        const clampedCorner = Math.max(0, Math.min(item.corner, Math.min(item.dims.x, item.dims.y, item.dims.z)));
        return clampedCorner > 0
            ? sdRoundedBox(localP.x, localP.y, localP.z, item.dims.x, item.dims.y, item.dims.z, clampedCorner)
            : sdBox(localP.x, localP.y, localP.z, item.dims.x, item.dims.y, item.dims.z);
    } else if (item.type === 'sphere') {
        return sdSphere(localP.x, localP.y, localP.z, 0.5);
    } else if (item.type === 'cone') {
        const h = 1.0;
        const r = 0.5;
        const hyp = Math.sqrt(r * r + h * h);
        const sinA = r / hyp;
        const cosA = h / hyp;
        return sdCone(localP.x, localP.y, localP.z, sinA, cosA, h);
    } else if (item.type === 'cylinder') {
        return item.corner > 0
            ? sdRoundedCylinder(localP.x, localP.y, localP.z, 0.5, 0.5, item.corner)
            : sdCappedCylinder(localP.x, localP.y, localP.z, 0.5, 0.5);
    }
    return Infinity;
};

export const calculateGroupSDF = (evaluables: Evaluable[], p: THREE.Vector3, smoothness: number): number => {
    let d = Infinity;
    for (let i = 0; i < evaluables.length; i++) {
        const dist = getPrimitiveDistance(evaluables[i], p);
        d = i === 0 ? dist : smin(d, dist, smoothness);
    }
    return d;
};

export const calculateBlendedColor = (evaluables: Evaluable[], p: THREE.Vector3): { r: number, g: number, b: number } => {
    let totalWeight = 0;
    let r = 0, g = 0, b = 0;
    let minDist = Infinity;
    let nearestColor = null;

    for (let i = 0; i < evaluables.length; i++) {
        const item = evaluables[i];
        const dist = getPrimitiveDistance(item, p);

        const absDist = Math.abs(dist);
        if (absDist < minDist) {
            minDist = absDist;
            nearestColor = item.color;
        }

        const w = 1.0 / (Math.pow(absDist, 2) + IDW_EPSILON);

        r += item.color.r * w;
        g += item.color.g * w;
        b += item.color.b * w;
        totalWeight += w;
    }

    if (totalWeight > 0) {
        return { r: r / totalWeight, g: g / totalWeight, b: b / totalWeight };
    }
    return nearestColor ? { r: nearestColor.r, g: nearestColor.g, b: nearestColor.b } : { r: 1, g: 1, b: 1 };
};

export const processInputGroup = (
    inputs: NodeData[],
    sceneObjectMap: Map<string, SceneObject>,
    currentHash: string,
    worldBounds: THREE.Box3,
    fallbackColor: string
): { evaluables: Evaluable[], newHash: string } => {
    const evaluables: Evaluable[] = [];
    inputs.forEach(node => {
        const sceneObj = sceneObjectMap.get(node.id);
        const worldMatrix = new THREE.Matrix4();
        let geometry: THREE.BufferGeometry | undefined;
        const object3D = sceneObj?.ref.current as THREE.Object3D | null;

        const basePosition = sceneObj
            ? new THREE.Vector3(sceneObj.position[0], sceneObj.position[1], sceneObj.position[2])
            : new THREE.Vector3(
                extractNumber(node.data.location?.x, 0),
                extractNumber(node.data.location?.y, 0),
                extractNumber(node.data.location?.z, 0)
            );
        const baseRotation = sceneObj
            ? new THREE.Euler(sceneObj.rotation[0], sceneObj.rotation[1], sceneObj.rotation[2])
            : new THREE.Euler(
                extractNumber(node.data.rotation?.x, 0),
                extractNumber(node.data.rotation?.y, 0),
                extractNumber(node.data.rotation?.z, 0)
            );

        const radiusFromNode = extractNumber(node.data.radius, 1);
        const heightFromNode = extractNumber(node.data.length, 2);
        const boxCornerFromNode = extractNumber(node.data.corner, 0);
        const cylinderCornerFromNode = extractNumber(node.data.corner, 0);

        const radius = sceneObj
            ? (node.type === 'cone' || node.type === 'cylinder' ? (sceneObj.radius || 0) : (node.type === 'box' ? (sceneObj.radius || 0) : 0))
            : (node.type === 'cone' || node.type === 'cylinder' ? radiusFromNode : (node.type === 'box' ? boxCornerFromNode : 0));
        const height = sceneObj
            ? (node.type === 'cone' || node.type === 'cylinder' ? (sceneObj.height || 0) : 0)
            : (node.type === 'cone' || node.type === 'cylinder' ? heightFromNode : 0);
        const corner = sceneObj
            ? (node.type === 'box'
                ? (sceneObj.radius || 0)
                : node.type === 'cylinder'
                    ? (sceneObj.corner || 0)
                    : 0)
            : (node.type === 'box'
                ? boxCornerFromNode
                : node.type === 'cylinder'
                    ? cylinderCornerFromNode
                    : 0);

        const baseScaleX = sceneObj ? sceneObj.scale[0] : extractNumber(node.data.scale?.x, 1);
        const baseScaleY = sceneObj ? sceneObj.scale[1] : extractNumber(node.data.scale?.y, 1);
        const baseScaleZ = sceneObj ? sceneObj.scale[2] : extractNumber(node.data.scale?.z, 1);

        const scaledX = sceneObj
            ? baseScaleX
            : (node.type === 'cone' || node.type === 'cylinder' ? baseScaleX * (radiusFromNode * 2) : baseScaleX);
        const scaledY = sceneObj
            ? baseScaleY
            : (node.type === 'cone' || node.type === 'cylinder' ? baseScaleY * heightFromNode : baseScaleY);
        const scaledZ = sceneObj
            ? baseScaleZ
            : (node.type === 'cone' || node.type === 'cylinder' ? baseScaleZ * (radiusFromNode * 2) : baseScaleZ);

        const stateQuaternion = new THREE.Quaternion().setFromEuler(baseRotation);
        const stateScale = new THREE.Vector3(
            Math.max(Math.abs(scaledX), MIN_BOOLEAN_BOUNDS_AXIS),
            Math.max(Math.abs(scaledY), MIN_BOOLEAN_BOUNDS_AXIS),
            Math.max(Math.abs(scaledZ), MIN_BOOLEAN_BOUNDS_AXIS)
        );
        worldMatrix.compose(basePosition, stateQuaternion, stateScale);

        if (object3D && (object3D as THREE.Mesh).geometry instanceof THREE.BufferGeometry) {
            geometry = (object3D as THREE.Mesh).geometry;
        }

        const m = worldMatrix.elements;
        const matrixStr = m.map(v => v.toFixed(3)).join(',');
        const sceneColor = sceneObj?.color || node.data.color || fallbackColor;
        currentHash += `|${node.id}:${matrixStr}:r${radius}:h${height}:c${corner}:col${sceneColor}`;

        const inverseMatrix = worldMatrix.clone().invert();
        let hasValidGeometryBounds = false;
        if (geometry) {
            if (!geometry.boundingBox) {
                geometry.computeBoundingBox();
            }
            if (geometry.boundingBox) {
                const worldAabb = geometry.boundingBox.clone().applyMatrix4(worldMatrix);
                if (
                    Number.isFinite(worldAabb.min.x) && Number.isFinite(worldAabb.min.y) && Number.isFinite(worldAabb.min.z) &&
                    Number.isFinite(worldAabb.max.x) && Number.isFinite(worldAabb.max.y) && Number.isFinite(worldAabb.max.z)
                ) {
                    worldBounds.union(worldAabb);
                    hasValidGeometryBounds = true;
                }
            }
        }

        if (!hasValidGeometryBounds) {
            const primitiveUnitBounds = new THREE.Box3(
                new THREE.Vector3(-0.5, -0.5, -0.5),
                new THREE.Vector3(0.5, 0.5, 0.5)
            ).applyMatrix4(worldMatrix);
            if (!primitiveUnitBounds.isEmpty() && hasFiniteBounds(primitiveUnitBounds)) {
                worldBounds.union(primitiveUnitBounds);
                hasValidGeometryBounds = true;
            }
        }

        if (!hasValidGeometryBounds) {
            const boundingSphere = new THREE.Sphere();
            const center = new THREE.Vector3().setFromMatrixPosition(worldMatrix);
            const scale = new THREE.Vector3().setFromMatrixScale(worldMatrix);
            const maxScaleAxis = Math.max(Math.abs(scale.x), Math.abs(scale.y), Math.abs(scale.z));
            const radiusBound = Math.max(
                MIN_BOOLEAN_BOUNDS_AXIS * 0.5,
                (Math.sqrt(3) / 2) * maxScaleAxis * 2.0
            );
            boundingSphere.center.copy(center);
            boundingSphere.radius = radiusBound;
            worldBounds.union(boundingSphere.getBoundingBox(new THREE.Box3()));
        }

        const dims = (node.type === 'sphere') ? { x: 0.5, y: 0, z: 0 } : { x: 0.5, y: 0.5, z: 0.5 };
        const color = sceneObj.color ? new THREE.Color(sceneObj.color) : new THREE.Color(fallbackColor);

        evaluables.push({ type: node.type, inverseMatrix, dims, radius, height, corner, color });
    });
    return { evaluables, newHash: currentHash };
};
