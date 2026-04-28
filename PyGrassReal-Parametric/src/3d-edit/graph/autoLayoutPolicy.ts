import type { NodeData } from '../types/NodeTypes';

export const NODE_MARGIN = 40;
export const GRID_SNAP = 20;
const DEFAULT_SEARCH_ATTEMPTS = 96;

export interface NodePosition {
    id: string;
    x: number;
    y: number;
}

interface SpatialIndex {
    cellSize: number;
    buckets: Map<string, Array<{ x: number; y: number }>>;
}

const snapToGrid = (value: number): number => {
    return Math.round(value / GRID_SNAP) * GRID_SNAP;
};

const isOverlapping = (
    a: { x: number; y: number },
    b: { x: number; y: number },
    minDistance: number
): boolean => {
    return Math.abs(a.x - b.x) < minDistance && Math.abs(a.y - b.y) < minDistance;
};

const getCellCoord = (value: number, cellSize: number): number => {
    return Math.floor(value / cellSize);
};

const getCellKey = (cellX: number, cellY: number): string => {
    return `${cellX}:${cellY}`;
};

const addToSpatialIndex = (
    index: SpatialIndex,
    position: { x: number; y: number }
): void => {
    const cellX = getCellCoord(position.x, index.cellSize);
    const cellY = getCellCoord(position.y, index.cellSize);
    const key = getCellKey(cellX, cellY);
    const bucket = index.buckets.get(key);
    if (bucket) {
        bucket.push(position);
        return;
    }
    index.buckets.set(key, [position]);
};

const createSpatialIndex = (
    positions: Array<{ x: number; y: number }>,
    cellSize: number
): SpatialIndex => {
    const index: SpatialIndex = {
        cellSize,
        buckets: new Map<string, Array<{ x: number; y: number }>>(),
    };
    positions.forEach((position) => {
        addToSpatialIndex(index, {
            x: snapToGrid(position.x),
            y: snapToGrid(position.y),
        });
    });
    return index;
};

const hasOverlapInSpatialIndex = (
    index: SpatialIndex,
    candidate: { x: number; y: number },
    minDistance: number
): boolean => {
    const cellX = getCellCoord(candidate.x, index.cellSize);
    const cellY = getCellCoord(candidate.y, index.cellSize);
    const radiusInCells = Math.max(1, Math.ceil(minDistance / index.cellSize));

    for (let deltaX = -radiusInCells; deltaX <= radiusInCells; deltaX += 1) {
        for (let deltaY = -radiusInCells; deltaY <= radiusInCells; deltaY += 1) {
            const key = getCellKey(cellX + deltaX, cellY + deltaY);
            const bucket = index.buckets.get(key);
            if (!bucket) {
                continue;
            }

            if (bucket.some((position) => isOverlapping(candidate, position, minDistance))) {
                return true;
            }
        }
    }

    return false;
};

const generateSearchOffsets = (
    horizontalStep: number,
    verticalStep: number,
    maxAttempts: number
): Array<{ x: number; y: number }> => {
    const offsets: Array<{ x: number; y: number }> = [{ x: 0, y: 0 }];
    let radius = 1;

    while (offsets.length < maxAttempts) {
        for (let x = -radius; x <= radius && offsets.length < maxAttempts; x += 1) {
            offsets.push({ x: x * horizontalStep, y: -radius * verticalStep });
            if (offsets.length >= maxAttempts) {
                break;
            }
            offsets.push({ x: x * horizontalStep, y: radius * verticalStep });
        }

        for (let y = -radius + 1; y <= radius - 1 && offsets.length < maxAttempts; y += 1) {
            offsets.push({ x: -radius * horizontalStep, y: y * verticalStep });
            if (offsets.length >= maxAttempts) {
                break;
            }
            offsets.push({ x: radius * horizontalStep, y: y * verticalStep });
        }

        radius += 1;
    }

    return offsets;
};

const findNearestFreePositionWithSpatialIndex = (
    spatialIndex: SpatialIndex,
    anchorPos: { x: number; y: number },
    horizontalStep: number,
    verticalStep: number,
    maxAttempts = DEFAULT_SEARCH_ATTEMPTS
): { x: number; y: number } => {
    const searchOffsets = generateSearchOffsets(horizontalStep, verticalStep, maxAttempts);
    for (const offset of searchOffsets) {
        const candidate = {
            x: snapToGrid(anchorPos.x + offset.x),
            y: snapToGrid(anchorPos.y + offset.y),
        };
        if (!hasOverlapInSpatialIndex(spatialIndex, candidate, NODE_MARGIN)) {
            return candidate;
        }
    }

    return {
        x: snapToGrid(anchorPos.x + (horizontalStep * maxAttempts)),
        y: snapToGrid(anchorPos.y),
    };
};

export const findNearestFreePosition = (
    occupiedPositions: Array<{ x: number; y: number }>,
    anchorPos: { x: number; y: number },
    options?: {
        horizontalStep?: number;
        verticalStep?: number;
        maxAttempts?: number;
    }
): { x: number; y: number } => {
    const horizontalStep = options?.horizontalStep ?? NODE_MARGIN;
    const verticalStep = options?.verticalStep ?? NODE_MARGIN;
    const maxAttempts = options?.maxAttempts ?? DEFAULT_SEARCH_ATTEMPTS;
    const spatialIndex = createSpatialIndex(occupiedPositions, NODE_MARGIN);

    return findNearestFreePositionWithSpatialIndex(
        spatialIndex,
        { x: snapToGrid(anchorPos.x), y: snapToGrid(anchorPos.y) },
        horizontalStep,
        verticalStep,
        maxAttempts
    );
};

export const computeNodePosition = (
    existingNodes: Array<Pick<NodeData, 'id' | 'position'>>,
    newNodeType: NodeData['type'],
    anchorPos: { x: number; y: number }
): { x: number; y: number } => {
    const horizontalStep = newNodeType === 'panel' ? NODE_MARGIN * 2 : NODE_MARGIN * 1.5;
    const verticalStep = NODE_MARGIN;
    return findNearestFreePosition(
        existingNodes.map((node) => node.position),
        anchorPos,
        { horizontalStep, verticalStep }
    );
};

export const resolveOverlap = (nodes: NodePosition[]): NodePosition[] => {
    const spatialIndex = createSpatialIndex([], NODE_MARGIN);

    return nodes.map((node, index) => {
        const anchor = {
            x: snapToGrid(node.x + ((index % 2 === 0) ? 0 : NODE_MARGIN)),
            y: snapToGrid(node.y),
        };
        const candidate = findNearestFreePositionWithSpatialIndex(
            spatialIndex,
            anchor,
            NODE_MARGIN,
            NODE_MARGIN
        );
        addToSpatialIndex(spatialIndex, candidate);
        return { ...node, x: candidate.x, y: candidate.y };
    });
};
