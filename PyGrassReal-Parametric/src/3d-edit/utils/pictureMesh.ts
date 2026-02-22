import type { PictureData, PictureLayer, PicturePlacement } from '../types/NodeTypes';

const isFiniteNumber = (value: unknown): value is number => {
    return typeof value === 'number' && Number.isFinite(value);
};

const toNumber = (value: unknown): number | undefined => {
    if (isFiniteNumber(value)) return value;
    if (typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
};

const normalizeLayerId = (layerId: unknown): string => {
    if (typeof layerId !== 'string') return 'default';
    const trimmed = layerId.trim();
    return trimmed.length > 0 ? trimmed : 'default';
};

const normalizeActiveLayerId = (activeLayerId: unknown): string | null => {
    if (activeLayerId === null) return null;
    if (typeof activeLayerId !== 'string') return null;
    const trimmed = activeLayerId.trim();
    return trimmed.length > 0 ? trimmed : null;
};

const normalizeImageValue = (image: unknown): string | null => {
    if (typeof image !== 'string') return null;
    const trimmed = image.trim();
    return trimmed.length > 0 ? trimmed : null;
};

const normalizePlacement = (placement: unknown): PicturePlacement => {
    if (!placement || typeof placement !== 'object') {
        return {};
    }

    const candidate = placement as {
        uv?: unknown;
        worldPos?: unknown;
        world?: unknown;
        position?: unknown;
        scale?: unknown;
        rotation?: unknown;
    };

    const uvCandidate = candidate.uv as { u?: unknown; v?: unknown } | undefined;
    const uvU = toNumber(uvCandidate?.u);
    const uvV = toNumber(uvCandidate?.v);
    const uv = typeof uvU === 'number' && typeof uvV === 'number'
        ? { u: uvU, v: uvV }
        : undefined;

    const worldCandidate = (candidate.worldPos ?? candidate.world ?? candidate.position) as {
        x?: unknown;
        y?: unknown;
        z?: unknown;
    } | undefined;
    const worldX = toNumber(worldCandidate?.x);
    const worldY = toNumber(worldCandidate?.y);
    const worldZ = toNumber(worldCandidate?.z);
    const worldPos = typeof worldX === 'number' && typeof worldY === 'number' && typeof worldZ === 'number'
        ? { x: worldX, y: worldY, z: worldZ }
        : undefined;

    const scale = toNumber(candidate.scale);
    const rotation = toNumber(candidate.rotation);

    return {
        uv,
        worldPos,
        scale: typeof scale === 'number' ? scale : undefined,
        rotation: typeof rotation === 'number' ? rotation : undefined,
    };
};

const hasPlacementValue = (placement: PicturePlacement): boolean => {
    return Boolean(
        placement.uv
        || placement.worldPos
        || typeof placement.scale === 'number'
        || typeof placement.rotation === 'number'
    );
};

const normalizeLayer = (layer: unknown): PictureLayer | null => {
    if (!layer || typeof layer !== 'object') return null;

    const candidate = layer as {
        id?: unknown;
        image?: unknown;
        placements?: unknown;
        smooth?: unknown;
        visible?: unknown;
    };

    const placements = Array.isArray(candidate.placements)
        ? candidate.placements
            .map((item) => normalizePlacement(item))
            .filter((item) => hasPlacementValue(item))
        : [];

    return {
        id: normalizeLayerId(candidate.id),
        image: normalizeImageValue(candidate.image),
        placements,
        smooth: typeof candidate.smooth === 'boolean' ? candidate.smooth : undefined,
        visible: typeof candidate.visible === 'boolean' ? candidate.visible : undefined,
    };
};

export const ensurePictureContainer = (meshData: unknown): PictureData => {
    if (!meshData || typeof meshData !== 'object') {
        return { layers: [], activeLayerId: null };
    }

    const candidate = meshData as { layers?: unknown; activeLayerId?: unknown };
    if (!Array.isArray(candidate.layers)) {
        return { layers: [], activeLayerId: normalizeActiveLayerId(candidate.activeLayerId) };
    }

    const layers = candidate.layers
        .map((layer) => normalizeLayer(layer))
        .filter((layer): layer is PictureLayer => layer !== null);
    const normalizedActiveLayerId = normalizeActiveLayerId(candidate.activeLayerId);
    const activeLayerId = normalizedActiveLayerId && layers.some((layer) => layer.id === normalizedActiveLayerId)
        ? normalizedActiveLayerId
        : (layers[0]?.id ?? null);

    return {
        layers,
        activeLayerId,
    };
};

export const addOrUpdateLayer = (
    pictureData: PictureData,
    layerId: string,
    image: string,
    placement: PicturePlacement,
): PictureData => {
    const nextContainer = ensurePictureContainer(pictureData);
    const normalizedLayerId = normalizeLayerId(layerId);
    const normalizedImage = normalizeImageValue(image);
    const normalizedPlacement = normalizePlacement(placement);
    const shouldAppendPlacement = hasPlacementValue(normalizedPlacement);

    const layerIndex = nextContainer.layers.findIndex((layer) => layer.id === normalizedLayerId);
    if (layerIndex < 0) {
        const nextLayer: PictureLayer = {
            id: normalizedLayerId,
            image: normalizedImage,
            placements: shouldAppendPlacement ? [normalizedPlacement] : [],
        };
        return {
            layers: [...nextContainer.layers, nextLayer],
            activeLayerId: normalizedLayerId,
        };
    }

    const currentLayer = nextContainer.layers[layerIndex];
    const updatedLayer: PictureLayer = {
        ...currentLayer,
        image: normalizedImage,
        placements: shouldAppendPlacement
            ? [...currentLayer.placements, normalizedPlacement]
            : [...currentLayer.placements],
    };

    const layers = [...nextContainer.layers];
    layers[layerIndex] = updatedLayer;
    return {
        layers,
        activeLayerId: normalizedLayerId,
    };
};

export const eraseLayer = (pictureData: PictureData, layerId: string): PictureData => {
    const nextContainer = ensurePictureContainer(pictureData);
    const normalizedLayerId = normalizeLayerId(layerId);
    const layers = nextContainer.layers.filter((layer) => layer.id !== normalizedLayerId);
    const activeLayerId = nextContainer.activeLayerId === normalizedLayerId
        ? (layers[0]?.id ?? null)
        : (nextContainer.activeLayerId ?? null);
    return {
        layers,
        activeLayerId,
    };
};

export const applySmoothEdge = (pictureData: PictureData, layerId: string): PictureData => {
    const nextContainer = ensurePictureContainer(pictureData);
    const normalizedLayerId = normalizeLayerId(layerId);
    return {
        layers: nextContainer.layers.map((layer) => {
            if (layer.id !== normalizedLayerId) return layer;
            return {
                ...layer,
                smooth: true,
            };
        }),
        activeLayerId: nextContainer.activeLayerId ?? null,
    };
};

export const toggleLayerVisibility = (
    pictureData: PictureData,
    layerId: string,
    visible?: boolean,
): PictureData => {
    const nextContainer = ensurePictureContainer(pictureData);
    const normalizedLayerId = normalizeLayerId(layerId);
    const layers = nextContainer.layers.map((layer) => {
        if (layer.id !== normalizedLayerId) return layer;
        return {
            ...layer,
            visible: typeof visible === 'boolean' ? visible : layer.visible === false,
        };
    });
    return {
        layers,
        activeLayerId: nextContainer.activeLayerId ?? normalizedLayerId,
    };
};

export const updateLayerTransform = (
    pictureData: PictureData,
    layerId: string,
    transformPatch: Partial<PicturePlacement>,
): PictureData => {
    const nextContainer = ensurePictureContainer(pictureData);
    const normalizedLayerId = normalizeLayerId(layerId);
    const normalizedPatch = normalizePlacement(transformPatch);
    const layers = nextContainer.layers.map((layer) => {
        if (layer.id !== normalizedLayerId) return layer;
        if (layer.placements.length === 0) {
            return {
                ...layer,
                placements: [normalizedPatch],
            };
        }
        const placements = [...layer.placements];
        const lastPlacement = placements[placements.length - 1];
        placements[placements.length - 1] = {
            ...lastPlacement,
            ...normalizedPatch,
        };
        return {
            ...layer,
            placements,
        };
    });
    return {
        layers,
        activeLayerId: normalizedLayerId,
    };
};

export const getPictureSignature = (pictureData: PictureData): string => {
    const normalized = ensurePictureContainer(pictureData);
    return JSON.stringify(normalized);
};
