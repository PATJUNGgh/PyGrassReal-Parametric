import * as THREE from 'three';
import type {
    PaintColor,
    PaintEdgeFalloff,
    PaintOp,
    PaintPlan,
    PaintTarget,
    PaintType,
    PaintVector3,
} from '../types/NodeTypes';

export interface PaintMaskMark {
    center: PaintVector3;
    radius: number;
    smooth: boolean;
    paint: boolean;
    threshold: number;
    values?: number[];
}

const DEFAULT_TARGET: PaintTarget = {
    type: 'point',
    positions: [{ x: 0, y: 0, z: 0 }],
};

const DEFAULT_COLOR: PaintColor = {
    r: 1,
    g: 1,
    b: 1,
};

const DEFAULT_OP: PaintOp = {
    paintType: 'fill',
    target: DEFAULT_TARGET,
    color: DEFAULT_COLOR,
    opacity: 0.85,
    radius: 0.25,
    edgeFalloff: 'soft',
};

const PAINT_TYPES: PaintType[] = ['fill', 'stroke', 'gradient', 'smooth', 'erase'];
const EDGE_FALLOFF: PaintEdgeFalloff[] = ['soft', 'sharp'];
const DEFAULT_ERASE_COLOR = new THREE.Color(1, 1, 1);

const isFiniteNumber = (value: unknown): value is number => {
    return typeof value === 'number' && Number.isFinite(value);
};

const clamp01 = (value: number): number => {
    return Math.min(1, Math.max(0, value));
};

const toNumber = (value: unknown, fallback: number): number => {
    if (isFiniteNumber(value)) return value;
    if (typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
};

const toVector3 = (value: unknown, fallback: PaintVector3 = { x: 0, y: 0, z: 0 }): PaintVector3 => {
    if (!value || typeof value !== 'object') return fallback;
    const maybeVector = value as { x?: unknown; y?: unknown; z?: unknown };
    return {
        x: toNumber(maybeVector.x, fallback.x),
        y: toNumber(maybeVector.y, fallback.y),
        z: toNumber(maybeVector.z, fallback.z),
    };
};

const normalizeColorChannel = (value: unknown, fallback: number): number => {
    const numeric = toNumber(value, fallback);
    if (numeric > 1 || numeric < 0) {
        return clamp01(numeric / 255);
    }
    return clamp01(numeric);
};

const parseHexColor = (value: string): PaintColor | null => {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return null;

    const hexMatch = normalized.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!hexMatch) return null;

    let hex = hexMatch[1];
    if (hex.length === 3) {
        hex = `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
    }

    const intValue = Number.parseInt(hex, 16);
    return {
        r: ((intValue >> 16) & 255) / 255,
        g: ((intValue >> 8) & 255) / 255,
        b: (intValue & 255) / 255,
    };
};

export const normalizePaintType = (value: unknown): PaintType => {
    if (typeof value !== 'string') return DEFAULT_OP.paintType;
    const normalized = value.trim().toLowerCase().replace(/^paint[_\-\s]*/, '');
    return (PAINT_TYPES as string[]).includes(normalized)
        ? (normalized as PaintType)
        : DEFAULT_OP.paintType;
};

const normalizePaintEdgeFalloff = (value: unknown): PaintEdgeFalloff => {
    if (typeof value !== 'string') return DEFAULT_OP.edgeFalloff;
    const normalized = value.trim().toLowerCase();
    return (EDGE_FALLOFF as string[]).includes(normalized)
        ? (normalized as PaintEdgeFalloff)
        : DEFAULT_OP.edgeFalloff;
};

export const normalizePaintTarget = (value: unknown): PaintTarget => {
    if (!value || typeof value !== 'object') return DEFAULT_TARGET;

    const candidate = value as {
        type?: unknown;
        position?: unknown;
        center?: unknown;
        positions?: unknown;
        points?: unknown;
    };

    const rawType = typeof candidate.type === 'string' ? candidate.type.trim().toLowerCase() : 'point';
    const type = rawType === 'area' || rawType === 'stroke'
        ? rawType
        : rawType === 'line'
            ? 'stroke'
            : 'point';

    const arraySource = Array.isArray(candidate.positions)
        ? candidate.positions
        : Array.isArray(candidate.points)
            ? candidate.points
            : [];

    const positionsFromArray = arraySource
        .map((item) => toVector3(item))
        .filter((item) => {
            return Number.isFinite(item.x) && Number.isFinite(item.y) && Number.isFinite(item.z);
        });

    const fallbackPoint = toVector3(candidate.position ?? candidate.center);
    const positions = positionsFromArray.length > 0
        ? positionsFromArray
        : (Number.isFinite(fallbackPoint.x) && Number.isFinite(fallbackPoint.y) && Number.isFinite(fallbackPoint.z))
            ? [fallbackPoint]
            : DEFAULT_TARGET.positions;

    return {
        type,
        positions,
    };
};

export const normalizePaintColor = (value: unknown): PaintColor => {
    if (typeof value === 'string') {
        const parsedHex = parseHexColor(value);
        if (parsedHex) return parsedHex;
    }

    if (Array.isArray(value)) {
        return {
            r: normalizeColorChannel(value[0], DEFAULT_COLOR.r),
            g: normalizeColorChannel(value[1], DEFAULT_COLOR.g),
            b: normalizeColorChannel(value[2], DEFAULT_COLOR.b),
        };
    }

    if (!value || typeof value !== 'object') return DEFAULT_COLOR;

    const candidate = value as {
        r?: unknown;
        g?: unknown;
        b?: unknown;
        x?: unknown;
        y?: unknown;
        z?: unknown;
        hex?: unknown;
    };

    if (typeof candidate.hex === 'string') {
        const parsedHex = parseHexColor(candidate.hex);
        if (parsedHex) return parsedHex;
    }

    return {
        r: normalizeColorChannel(candidate.r ?? candidate.x, DEFAULT_COLOR.r),
        g: normalizeColorChannel(candidate.g ?? candidate.y, DEFAULT_COLOR.g),
        b: normalizeColorChannel(candidate.b ?? candidate.z, DEFAULT_COLOR.b),
    };
};

export const normalizePaintOp = (value: unknown): PaintOp | null => {
    if (!value || typeof value !== 'object') return null;

    const candidate = value as {
        paintType?: unknown;
        type?: unknown;
        operation?: unknown;
        target?: unknown;
        color?: unknown;
        colorEnd?: unknown;
        endColor?: unknown;
        gradientAxis?: unknown;
        axis?: unknown;
        direction?: unknown;
        opacity?: unknown;
        alpha?: unknown;
        radius?: unknown;
        size?: unknown;
        edgeFalloff?: unknown;
        falloff?: unknown;
        center?: unknown;
        position?: unknown;
    };

    const paintType = normalizePaintType(candidate.paintType ?? candidate.type ?? candidate.operation);
    const target = normalizePaintTarget(
        candidate.target
        ?? (candidate.position || candidate.center
            ? { type: 'point', positions: [candidate.position ?? candidate.center] }
            : undefined)
    );
    const color = normalizePaintColor(candidate.color);
    const opacity = clamp01(toNumber(candidate.opacity ?? candidate.alpha, DEFAULT_OP.opacity));
    const radius = Math.max(0.001, toNumber(candidate.radius ?? candidate.size, DEFAULT_OP.radius));
    const edgeFalloff = normalizePaintEdgeFalloff(candidate.edgeFalloff ?? candidate.falloff);

    const colorEndRaw = candidate.colorEnd ?? candidate.endColor;
    const colorEnd = typeof colorEndRaw === 'undefined' ? undefined : normalizePaintColor(colorEndRaw);
    const gradientAxisRaw = candidate.gradientAxis ?? candidate.axis ?? candidate.direction;
    const gradientAxis = typeof gradientAxisRaw === 'undefined' ? undefined : toVector3(gradientAxisRaw);

    return {
        paintType,
        target,
        color,
        opacity,
        radius,
        edgeFalloff,
        colorEnd,
        gradientAxis,
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
    }

    return null;
};

const extractOpsCandidate = (value: unknown): unknown[] => {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== 'object') return [];

    const candidate = value as {
        ops?: unknown;
        operations?: unknown;
        paintPlan?: unknown;
        paint_plan?: unknown;
        plan?: unknown;
        text?: unknown;
        content?: unknown;
    };

    if (Array.isArray(candidate.ops)) return candidate.ops;
    if (Array.isArray(candidate.operations)) return candidate.operations;

    if (candidate.paintPlan && typeof candidate.paintPlan === 'object') {
        const nestedPlan = candidate.paintPlan as { ops?: unknown; operations?: unknown };
        if (Array.isArray(nestedPlan.ops)) return nestedPlan.ops;
        if (Array.isArray(nestedPlan.operations)) return nestedPlan.operations;
    }

    if (candidate.paint_plan && typeof candidate.paint_plan === 'object') {
        const nestedPlan = candidate.paint_plan as { ops?: unknown; operations?: unknown };
        if (Array.isArray(nestedPlan.ops)) return nestedPlan.ops;
        if (Array.isArray(nestedPlan.operations)) return nestedPlan.operations;
    }

    if (candidate.plan && typeof candidate.plan === 'object') {
        const nestedPlan = candidate.plan as { ops?: unknown; operations?: unknown };
        if (Array.isArray(nestedPlan.ops)) return nestedPlan.ops;
        if (Array.isArray(nestedPlan.operations)) return nestedPlan.operations;
    }

    if (typeof candidate.text === 'string') {
        const parsedText = tryParseJsonString(candidate.text);
        if (parsedText) return extractOpsCandidate(parsedText);
    }

    if (typeof candidate.content === 'string') {
        const parsedContent = tryParseJsonString(candidate.content);
        if (parsedContent) return extractOpsCandidate(parsedContent);
    }

    return [];
};

export const parsePaintPlan = (input: unknown): PaintPlan => {
    let resolvedInput = input;
    if (typeof input === 'string') {
        resolvedInput = tryParseJsonString(input);
    }

    const opsCandidate = extractOpsCandidate(resolvedInput);
    const ops = opsCandidate
        .map(normalizePaintOp)
        .filter((op): op is PaintOp => op !== null);

    return { ops };
};

const normalizeMaskValues = (values: unknown[]): number[] => {
    return values
        .map((value) => clamp01(toNumber(value, Number.NaN)))
        .filter((value) => Number.isFinite(value));
};

export const resolvePaintMaskMark = (input: unknown): PaintMaskMark | null => {
    if (Array.isArray(input)) {
        if (input.length >= 6) {
            return {
                center: {
                    x: toNumber(input[0], 0),
                    y: toNumber(input[1], 0),
                    z: toNumber(input[2], 0),
                },
                radius: Math.max(0.001, toNumber(input[3], 0.1)),
                smooth: toNumber(input[4], 0) > 0,
                paint: toNumber(input[5], 1) > 0,
                threshold: 0,
            };
        }

        const values = normalizeMaskValues(input);
        if (values.length === 0) return null;
        return {
            center: { x: 0, y: 0, z: 0 },
            radius: 1,
            smooth: true,
            paint: true,
            threshold: 0,
            values,
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
        threshold?: unknown;
        values?: unknown;
        weights?: unknown;
        mask?: unknown;
    };

    if (candidate.enabled === false) {
        return null;
    }

    const valuesCandidate = Array.isArray(candidate.values)
        ? candidate.values
        : Array.isArray(candidate.weights)
            ? candidate.weights
            : Array.isArray(candidate.mask)
                ? candidate.mask
                : [];
    const values = normalizeMaskValues(valuesCandidate);
    const hasCenter = typeof candidate.center !== 'undefined' || typeof candidate.position !== 'undefined';
    if (!hasCenter && values.length === 0) return null;

    return {
        center: hasCenter ? toVector3(candidate.center ?? candidate.position) : { x: 0, y: 0, z: 0 },
        radius: Math.max(0.001, toNumber(candidate.radius, 0.1)),
        smooth: candidate.smooth === true,
        paint: candidate.paint !== false,
        threshold: clamp01(toNumber(candidate.threshold, 0)),
        values: values.length > 0 ? values : undefined,
    };
};

export const computePaintInfluence = (
    position: THREE.Vector3,
    targets: THREE.Vector3[],
    radius: number,
    edgeFalloff: PaintEdgeFalloff,
): { value: number; nearest: THREE.Vector3; distance: number } => {
    let minDistance = Number.POSITIVE_INFINITY;
    let nearest = targets[0];

    for (const target of targets) {
        const distance = position.distanceTo(target);
        if (distance < minDistance) {
            minDistance = distance;
            nearest = target;
        }
    }

    if (!Number.isFinite(minDistance) || minDistance > radius) {
        return { value: 0, nearest, distance: minDistance };
    }

    const linear = 1 - (minDistance / Math.max(radius, 0.0001));
    const value = edgeFalloff === 'sharp'
        ? Math.sqrt(Math.max(0, linear))
        : linear * linear;

    return { value, nearest, distance: minDistance };
};

export const computePaintMaskWeight = (
    maskMark: PaintMaskMark | null,
    worldPosition: THREE.Vector3,
    vertexIndex: number,
): number => {
    if (!maskMark) return 1;

    if (Array.isArray(maskMark.values) && maskMark.values.length > 0) {
        const byVertex = maskMark.values[vertexIndex];
        const byRgbTriplet = maskMark.values.length >= (vertexIndex * 3 + 3)
            ? (
                (maskMark.values[vertexIndex * 3] ?? 0)
                + (maskMark.values[vertexIndex * 3 + 1] ?? 0)
                + (maskMark.values[vertexIndex * 3 + 2] ?? 0)
            ) / 3
            : undefined;
        const baseValue = clamp01(typeof byRgbTriplet === 'number' ? byRgbTriplet : (byVertex ?? 1));
        if (baseValue <= maskMark.threshold) return 0;
        return maskMark.paint ? baseValue : (1 - baseValue);
    }

    const center = new THREE.Vector3(maskMark.center.x, maskMark.center.y, maskMark.center.z);
    const distance = worldPosition.distanceTo(center);
    if (distance > maskMark.radius) {
        return maskMark.paint ? 0 : 1;
    }

    const falloff = maskMark.smooth
        ? Math.max(0, 1 - (distance / Math.max(maskMark.radius, 0.0001)))
        : 1;
    const value = maskMark.paint ? falloff : (1 - falloff);
    if (value <= maskMark.threshold) return 0;
    return value;
};

const ensureVertexColorsEnabled = (material: THREE.Material): void => {
    const withVertexColors = material as THREE.Material & { vertexColors?: boolean; needsUpdate?: boolean; color?: THREE.Color };
    if (typeof withVertexColors.vertexColors !== 'undefined' && withVertexColors.vertexColors !== true) {
        withVertexColors.vertexColors = true;
        withVertexColors.needsUpdate = true;
    }

    if (withVertexColors.color && withVertexColors.color.getHex() !== 0xffffff) {
        withVertexColors.color.setHex(0xffffff);
        withVertexColors.needsUpdate = true;
    }
};

const ensureColorAttribute = (
    geometry: THREE.BufferGeometry,
    vertexCount: number,
): THREE.BufferAttribute => {
    const existing = geometry.getAttribute('color');
    if (existing && existing.itemSize >= 3) {
        if (existing instanceof THREE.BufferAttribute) {
            return existing;
        }

        const converted = new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3);
        for (let index = 0; index < vertexCount; index += 1) {
            converted.setXYZ(index, existing.getX(index), existing.getY(index), existing.getZ(index));
        }
        geometry.setAttribute('color', converted);
        return converted;
    }

    const colors = new Float32Array(vertexCount * 3);
    for (let index = 0; index < vertexCount; index += 1) {
        colors[index * 3] = 1;
        colors[index * 3 + 1] = 1;
        colors[index * 3 + 2] = 1;
    }

    const colorAttribute = new THREE.BufferAttribute(colors, 3);
    geometry.setAttribute('color', colorAttribute);
    return colorAttribute;
};

const connectAdjacency = (adjacency: Map<number, Set<number>>, a: number, b: number): void => {
    if (!adjacency.has(a)) adjacency.set(a, new Set<number>());
    if (!adjacency.has(b)) adjacency.set(b, new Set<number>());
    adjacency.get(a)?.add(b);
    adjacency.get(b)?.add(a);
};

const buildVertexAdjacency = (geometry: THREE.BufferGeometry): Map<number, Set<number>> => {
    const adjacency = new Map<number, Set<number>>();
    const position = geometry.getAttribute('position');
    if (!position) return adjacency;

    const indexAttribute = geometry.getIndex();
    if (indexAttribute) {
        for (let i = 0; i + 2 < indexAttribute.count; i += 3) {
            const a = indexAttribute.getX(i);
            const b = indexAttribute.getX(i + 1);
            const c = indexAttribute.getX(i + 2);
            connectAdjacency(adjacency, a, b);
            connectAdjacency(adjacency, b, c);
            connectAdjacency(adjacency, c, a);
        }
        return adjacency;
    }

    for (let i = 0; i + 2 < position.count; i += 3) {
        connectAdjacency(adjacency, i, i + 1);
        connectAdjacency(adjacency, i + 1, i + 2);
        connectAdjacency(adjacency, i + 2, i);
    }

    return adjacency;
};

const averageNeighborColor = (
    index: number,
    adjacency: Map<number, Set<number>>,
    colorAttribute: THREE.BufferAttribute,
    outColor: THREE.Color,
): boolean => {
    const neighbors = adjacency.get(index);
    if (!neighbors || neighbors.size === 0) return false;

    let r = 0;
    let g = 0;
    let b = 0;
    let count = 0;
    neighbors.forEach((neighborIndex) => {
        r += colorAttribute.getX(neighborIndex);
        g += colorAttribute.getY(neighborIndex);
        b += colorAttribute.getZ(neighborIndex);
        count += 1;
    });

    if (count === 0) return false;
    outColor.setRGB(r / count, g / count, b / count);
    return true;
};

const applyAutoSmoothPass = (
    colorAttribute: THREE.BufferAttribute,
    adjacency: Map<number, Set<number>>,
    affectedIndices: Set<number>,
    blendFactor: number,
): void => {
    if (affectedIndices.size === 0) return;
    const updates: Array<{ index: number; color: THREE.Color }> = [];
    const current = new THREE.Color();
    const neighborAverage = new THREE.Color();

    affectedIndices.forEach((index) => {
        if (!averageNeighborColor(index, adjacency, colorAttribute, neighborAverage)) return;
        current.setRGB(colorAttribute.getX(index), colorAttribute.getY(index), colorAttribute.getZ(index));
        current.lerp(neighborAverage, blendFactor);
        updates.push({ index, color: current.clone() });
    });

    for (const update of updates) {
        colorAttribute.setXYZ(update.index, update.color.r, update.color.g, update.color.b);
    }
};

const getGradientTargetColor = (
    op: PaintOp,
    worldPosition: THREE.Vector3,
    targets: THREE.Vector3[],
    reusableAxis: THREE.Vector3,
    reusableRelative: THREE.Vector3,
    reusableColor: THREE.Color,
): THREE.Color => {
    if (op.paintType !== 'gradient' || !op.colorEnd) {
        reusableColor.setRGB(op.color.r, op.color.g, op.color.b);
        return reusableColor;
    }

    reusableAxis.set(
        op.gradientAxis?.x ?? 0,
        op.gradientAxis?.y ?? 1,
        op.gradientAxis?.z ?? 0
    );
    if (reusableAxis.lengthSq() <= 1e-8) {
        reusableAxis.set(0, 1, 0);
    }
    reusableAxis.normalize();

    const origin = targets[0] ?? new THREE.Vector3(0, 0, 0);
    reusableRelative.copy(worldPosition).sub(origin);

    const span = Math.max(op.radius, 0.0001);
    const projected = reusableRelative.dot(reusableAxis);
    const t = clamp01((projected + span * 0.5) / span);

    reusableColor.setRGB(
        THREE.MathUtils.lerp(op.color.r, op.colorEnd.r, t),
        THREE.MathUtils.lerp(op.color.g, op.colorEnd.g, t),
        THREE.MathUtils.lerp(op.color.b, op.colorEnd.b, t),
    );
    return reusableColor;
};

export const applyPaintOpToObject = (
    object: THREE.Object3D,
    op: PaintOp,
    maskMark: PaintMaskMark | null,
): boolean => {
    const targets = op.target.positions.map((position) => new THREE.Vector3(position.x, position.y, position.z));
    if (targets.length === 0) return false;

    let changed = false;
    object.updateMatrixWorld(true);

    const vertexLocal = new THREE.Vector3();
    const vertexWorld = new THREE.Vector3();
    const existingColor = new THREE.Color();
    const targetColor = new THREE.Color();
    const gradientAxis = new THREE.Vector3();
    const gradientRelative = new THREE.Vector3();

    object.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!(mesh as any).isMesh || !mesh.geometry) return;

        const geometry = mesh.geometry as THREE.BufferGeometry;
        const positionAttribute = geometry.getAttribute('position');
        if (!positionAttribute) return;

        if (Array.isArray(mesh.material)) {
            mesh.material.forEach((material) => ensureVertexColorsEnabled(material));
        } else if (mesh.material) {
            ensureVertexColorsEnabled(mesh.material);
        }

        const colorAttribute = ensureColorAttribute(geometry, positionAttribute.count);
        const adjacency = buildVertexAdjacency(geometry);
        const affectedIndices = new Set<number>();
        const radius = Math.max(0.001, op.radius);
        const opacity = clamp01(op.opacity);

        for (let index = 0; index < positionAttribute.count; index += 1) {
            vertexLocal.set(positionAttribute.getX(index), positionAttribute.getY(index), positionAttribute.getZ(index));
            vertexWorld.copy(vertexLocal).applyMatrix4(mesh.matrixWorld);

            const influenceData = computePaintInfluence(vertexWorld, targets, radius, op.edgeFalloff);
            if (influenceData.value <= 0) continue;

            const maskWeight = computePaintMaskWeight(maskMark, vertexWorld, index);
            if (maskWeight <= 0) continue;

            const finalOpacity = clamp01(opacity * maskWeight * influenceData.value);
            if (finalOpacity <= 1e-6) continue;

            existingColor.setRGB(colorAttribute.getX(index), colorAttribute.getY(index), colorAttribute.getZ(index));

            if (op.paintType === 'smooth') {
                if (!averageNeighborColor(index, adjacency, colorAttribute, targetColor)) {
                    continue;
                }
            } else if (op.paintType === 'erase') {
                targetColor.copy(DEFAULT_ERASE_COLOR);
            } else {
                targetColor.copy(
                    getGradientTargetColor(op, vertexWorld, targets, gradientAxis, gradientRelative, targetColor)
                );
            }

            existingColor.lerp(targetColor, finalOpacity);
            colorAttribute.setXYZ(index, existingColor.r, existingColor.g, existingColor.b);
            affectedIndices.add(index);
            changed = true;
        }

        if (affectedIndices.size > 0) {
            applyAutoSmoothPass(colorAttribute, adjacency, affectedIndices, 0.18);
            colorAttribute.needsUpdate = true;
        }
    });

    return changed;
};

export const getPaintOpsSignature = (ops: PaintOp[]): string => {
    if (!Array.isArray(ops) || ops.length === 0) return '[]';
    return JSON.stringify(ops);
};
