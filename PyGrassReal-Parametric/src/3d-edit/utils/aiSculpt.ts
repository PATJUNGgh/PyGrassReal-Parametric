import * as THREE from 'three';
import type {
    SculptBrushType,
    SculptEdgeFalloff,
    SculptEngine,
    SculptOp,
    SculptPlan,
    SculptTarget,
    SculptVector3,
} from '../types/NodeTypes';

export interface SculptMaskMark {
    center: SculptVector3;
    radius: number;
    smooth: boolean;
    paint: boolean;
}

const DEFAULT_TARGET: SculptTarget = {
    type: 'point',
    positions: [{ x: 0, y: 0, z: 0 }],
};

const DEFAULT_OP: SculptOp = {
    brushType: 'inflate',
    target: DEFAULT_TARGET,
    radius: 0.25,
    strength: 0.2,
    edgeFalloff: 'soft',
};

const BRUSH_TYPES: SculptBrushType[] = ['carve', 'inflate', 'smooth', 'flatten', 'crease', 'stamp', 'cut'];
const EDGE_FALLOFF: SculptEdgeFalloff[] = ['soft', 'sharp'];

const ENGINE_BY_BRUSH: Record<SculptBrushType, SculptEngine> = {
    inflate: 'displacement',
    smooth: 'displacement',
    flatten: 'displacement',
    crease: 'displacement',
    carve: 'boolean',
    cut: 'boolean',
    stamp: 'boolean',
};

const BRUSH_SIGN_BY_TYPE: Record<SculptBrushType, number> = {
    inflate: 1,
    smooth: -0.35,
    flatten: -0.55,
    crease: -0.95,
    carve: -1.15,
    cut: -1.35,
    stamp: 0.85,
};

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const toNumber = (value: unknown, fallback: number): number => {
    if (isFiniteNumber(value)) return value;
    if (typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
};

const toVector3 = (value: unknown, fallback: SculptVector3 = { x: 0, y: 0, z: 0 }): SculptVector3 => {
    if (!value || typeof value !== 'object') return fallback;
    const maybeVector = value as { x?: unknown; y?: unknown; z?: unknown };
    return {
        x: toNumber(maybeVector.x, fallback.x),
        y: toNumber(maybeVector.y, fallback.y),
        z: toNumber(maybeVector.z, fallback.z),
    };
};

const normalizeBrushType = (value: unknown): SculptBrushType => {
    if (typeof value !== 'string') return DEFAULT_OP.brushType;
    const normalized = value.trim().toLowerCase();
    return (BRUSH_TYPES as string[]).includes(normalized) ? (normalized as SculptBrushType) : DEFAULT_OP.brushType;
};

const normalizeEdgeFalloff = (value: unknown): SculptEdgeFalloff => {
    if (typeof value !== 'string') return DEFAULT_OP.edgeFalloff;
    const normalized = value.trim().toLowerCase();
    return (EDGE_FALLOFF as string[]).includes(normalized) ? (normalized as SculptEdgeFalloff) : DEFAULT_OP.edgeFalloff;
};

const normalizeTarget = (value: unknown): SculptTarget => {
    if (!value || typeof value !== 'object') return DEFAULT_TARGET;
    const candidate = value as { type?: unknown; positions?: unknown };
    const targetType = candidate.type === 'point' || candidate.type === 'stroke' || candidate.type === 'area'
        ? candidate.type
        : 'point';

    const positions = Array.isArray(candidate.positions)
        ? candidate.positions.map((item) => toVector3(item)).filter((item) => {
            return Number.isFinite(item.x) && Number.isFinite(item.y) && Number.isFinite(item.z);
        })
        : [];

    return {
        type: targetType,
        positions: positions.length > 0 ? positions : DEFAULT_TARGET.positions,
    };
};

const normalizeOp = (value: unknown): SculptOp | null => {
    if (!value || typeof value !== 'object') return null;
    const candidate = value as {
        brushType?: unknown;
        target?: unknown;
        radius?: unknown;
        strength?: unknown;
        depth?: unknown;
        edgeFalloff?: unknown;
        engineHint?: unknown;
    };

    const brushType = normalizeBrushType(candidate.brushType);
    const radius = Math.max(0.01, toNumber(candidate.radius, DEFAULT_OP.radius));
    const strength = Math.max(0.001, toNumber(candidate.strength ?? candidate.depth, DEFAULT_OP.strength));
    const edgeFalloff = normalizeEdgeFalloff(candidate.edgeFalloff);
    const target = normalizeTarget(candidate.target);
    const engineHint = candidate.engineHint === 'displacement' || candidate.engineHint === 'boolean'
        ? candidate.engineHint
        : undefined;

    return {
        brushType,
        target,
        radius,
        strength,
        edgeFalloff,
        engineHint,
    };
};

const tryParseJsonString = (value: string): unknown => {
    const trimmed = value.trim();
    if (!trimmed) return null;

    try {
        return JSON.parse(trimmed);
    } catch {
        const markdownJsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (markdownJsonMatch?.[1]) {
            try {
                return JSON.parse(markdownJsonMatch[1]);
            } catch {
                return null;
            }
        }
        return null;
    }
};

const extractOpsCandidate = (value: unknown): unknown[] => {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== 'object') return [];

    const candidate = value as {
        ops?: unknown;
        operations?: unknown;
        plan?: unknown;
        text?: unknown;
        content?: unknown;
    };

    if (Array.isArray(candidate.ops)) return candidate.ops;
    if (Array.isArray(candidate.operations)) return candidate.operations;

    if (candidate.plan && typeof candidate.plan === 'object') {
        const nestedPlan = candidate.plan as { ops?: unknown; operations?: unknown };
        if (Array.isArray(nestedPlan.ops)) return nestedPlan.ops;
        if (Array.isArray(nestedPlan.operations)) return nestedPlan.operations;
    }

    if (typeof candidate.text === 'string') {
        const nestedTextParsed = tryParseJsonString(candidate.text);
        if (nestedTextParsed) return extractOpsCandidate(nestedTextParsed);
    }

    if (typeof candidate.content === 'string') {
        const nestedContentParsed = tryParseJsonString(candidate.content);
        if (nestedContentParsed) return extractOpsCandidate(nestedContentParsed);
    }

    return [];
};

export const parseSculptPlan = (input: unknown): SculptPlan => {
    let resolvedInput = input;
    if (typeof input === 'string') {
        resolvedInput = tryParseJsonString(input);
    }

    const opsCandidate = extractOpsCandidate(resolvedInput);
    const ops = opsCandidate
        .map(normalizeOp)
        .filter((op): op is SculptOp => op !== null);

    return { ops };
};

export const resolveSculptEngine = (op: SculptOp): SculptEngine => {
    return op.engineHint ?? ENGINE_BY_BRUSH[op.brushType];
};

export const resolveSculptMaskMark = (input: unknown): SculptMaskMark | null => {
    if (Array.isArray(input) && input.length >= 6) {
        const radius = Math.max(0.01, toNumber(input[3], 0.1));
        return {
            center: {
                x: toNumber(input[0], 0),
                y: toNumber(input[1], 0),
                z: toNumber(input[2], 0),
            },
            radius,
            smooth: toNumber(input[4], 0) > 0,
            paint: toNumber(input[5], 1) > 0,
        };
    }

    if (!input || typeof input !== 'object') {
        return null;
    }

    const candidate = input as {
        center?: unknown;
        position?: unknown;
        radius?: unknown;
        smooth?: unknown;
        paint?: unknown;
        enabled?: unknown;
    };

    if (candidate.enabled === false) return null;

    const center = toVector3(candidate.center ?? candidate.position);
    return {
        center,
        radius: Math.max(0.01, toNumber(candidate.radius, 0.1)),
        smooth: candidate.smooth === true,
        paint: candidate.paint !== false,
    };
};

export const getSculptOpsSignature = (ops: SculptOp[]): string => {
    if (!Array.isArray(ops) || ops.length === 0) return '[]';
    return JSON.stringify(ops);
};

const computeInfluence = (
    position: THREE.Vector3,
    targets: THREE.Vector3[],
    radius: number,
    edgeFalloff: SculptEdgeFalloff,
): { value: number; nearest: THREE.Vector3 } => {
    let minDistance = Number.POSITIVE_INFINITY;
    let nearest = targets[0];

    for (const target of targets) {
        const distance = position.distanceTo(target);
        if (distance < minDistance) {
            minDistance = distance;
            nearest = target;
        }
    }

    if (minDistance > radius) {
        return { value: 0, nearest };
    }

    const linear = 1 - (minDistance / radius);
    const value = edgeFalloff === 'sharp' ? Math.sqrt(Math.max(0, linear)) : linear * linear;
    return { value, nearest };
};

const computeMaskWeight = (maskMark: SculptMaskMark | null, worldPosition: THREE.Vector3): number => {
    if (!maskMark) return 1;
    const center = new THREE.Vector3(maskMark.center.x, maskMark.center.y, maskMark.center.z);
    const distance = worldPosition.distanceTo(center);

    if (distance > maskMark.radius) {
        return maskMark.paint ? 0 : 1;
    }

    const falloff = maskMark.smooth
        ? Math.max(0, 1 - (distance / Math.max(maskMark.radius, 0.0001)))
        : 1;

    return maskMark.paint ? falloff : (1 - falloff);
};

const applyBrushDelta = (
    brushType: SculptBrushType,
    engine: SculptEngine,
    strength: number,
    influence: number,
    radius: number,
): number => {
    const brushSign = BRUSH_SIGN_BY_TYPE[brushType] ?? 1;
    const engineFactor = engine === 'boolean' ? 1.5 : 1;
    const radiusFactor = Math.max(0.01, radius) * 0.075;
    return brushSign * strength * influence * radiusFactor * engineFactor;
};

export const cloneObjectForSculpt = (source: THREE.Object3D): THREE.Object3D => {
    const clone = source.clone(true);
    clone.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!(mesh as any).isMesh) return;

        if (mesh.geometry) {
            mesh.geometry = mesh.geometry.clone();
        }

        if (Array.isArray(mesh.material)) {
            mesh.material = mesh.material.map((material) => material.clone());
        } else if (mesh.material) {
            mesh.material = mesh.material.clone();
        }
    });
    return clone;
};

export const applySculptOpsToObject = (
    object: THREE.Object3D,
    ops: SculptOp[],
    maskMark: SculptMaskMark | null,
): boolean => {
    if (!ops.length) return false;

    let changed = false;
    object.updateMatrixWorld(true);

    const vertexLocal = new THREE.Vector3();
    const vertexWorld = new THREE.Vector3();
    const normalLocal = new THREE.Vector3();
    const normalWorld = new THREE.Vector3();
    const displacedWorld = new THREE.Vector3();
    const displacedLocal = new THREE.Vector3();
    const normalMatrix = new THREE.Matrix3();
    const inverseWorldMatrix = new THREE.Matrix4();

    object.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!(mesh as any).isMesh || !mesh.geometry || !(mesh.geometry as THREE.BufferGeometry).attributes?.position) {
            return;
        }

        const geometry = mesh.geometry as THREE.BufferGeometry;
        const positionAttribute = geometry.getAttribute('position');
        if (!positionAttribute) return;

        if (!geometry.getAttribute('normal')) {
            geometry.computeVertexNormals();
        }
        const normalAttribute = geometry.getAttribute('normal');
        if (!normalAttribute) return;

        normalMatrix.getNormalMatrix(mesh.matrixWorld);
        inverseWorldMatrix.copy(mesh.matrixWorld).invert();

        for (const op of ops) {
            const targets = op.target.positions.map((position) => new THREE.Vector3(position.x, position.y, position.z));
            if (targets.length === 0) continue;

            const engine = resolveSculptEngine(op);
            const radius = Math.max(0.01, op.radius);

            for (let index = 0; index < positionAttribute.count; index += 1) {
                vertexLocal.set(positionAttribute.getX(index), positionAttribute.getY(index), positionAttribute.getZ(index));
                vertexWorld.copy(vertexLocal).applyMatrix4(mesh.matrixWorld);

                const influenceData = computeInfluence(vertexWorld, targets, radius, op.edgeFalloff);
                if (influenceData.value <= 0) continue;

                const maskWeight = computeMaskWeight(maskMark, vertexWorld);
                if (maskWeight <= 0) continue;

                const influence = influenceData.value * maskWeight;
                const delta = applyBrushDelta(op.brushType, engine, op.strength, influence, radius);
                if (Math.abs(delta) < 1e-7) continue;

                if (op.brushType === 'smooth') {
                    displacedWorld.copy(vertexWorld).lerp(influenceData.nearest, Math.min(0.9, Math.abs(delta)));
                } else {
                    normalLocal.set(normalAttribute.getX(index), normalAttribute.getY(index), normalAttribute.getZ(index));
                    normalWorld.copy(normalLocal).applyMatrix3(normalMatrix).normalize();
                    displacedWorld.copy(vertexWorld).addScaledVector(normalWorld, delta);
                }

                displacedLocal.copy(displacedWorld).applyMatrix4(inverseWorldMatrix);
                positionAttribute.setXYZ(index, displacedLocal.x, displacedLocal.y, displacedLocal.z);
                changed = true;
            }
        }

        if (changed) {
            positionAttribute.needsUpdate = true;
            geometry.computeVertexNormals();
            geometry.computeBoundingBox();
            geometry.computeBoundingSphere();
        }
    });

    return changed;
};
