export interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
}

interface Position {
    x: number;
    y: number;
}

interface Size {
    w: number;
    h: number;
}

const DEFAULT_PADDING = 20;
const SPIRAL_STEP = 40;
const SPIRAL_POINTS_PER_RING = 16;
const SPIRAL_MAX_RINGS = 200;

const isOverlapping = (a: Rect, b: Rect): boolean => {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
};

const getPaddedRect = (position: Position, size: Size, padding: number): Rect => ({
    x: position.x - padding,
    y: position.y - padding,
    w: size.w + (padding * 2),
    h: size.h + (padding * 2),
});

export const findNonOverlappingPosition = (
    candidate: Position,
    newNodeSize: Size,
    existingRects: Rect[],
    padding = DEFAULT_PADDING
): Position => {
    const normalizedPadding = Number.isFinite(padding) ? Math.max(0, padding) : DEFAULT_PADDING;
    const width = Number.isFinite(newNodeSize.w) && newNodeSize.w > 0 ? newNodeSize.w : 1;
    const height = Number.isFinite(newNodeSize.h) && newNodeSize.h > 0 ? newNodeSize.h : 1;
    const validRects = existingRects.filter((rect) =>
        Number.isFinite(rect.x) &&
        Number.isFinite(rect.y) &&
        Number.isFinite(rect.w) &&
        Number.isFinite(rect.h) &&
        rect.w > 0 &&
        rect.h > 0
    );

    const collidesAt = (position: Position): boolean => {
        const newRect = getPaddedRect(position, { w: width, h: height }, normalizedPadding);
        return validRects.some((rect) => isOverlapping(newRect, rect));
    };

    if (!collidesAt(candidate)) {
        return candidate;
    }

    for (let ring = 1; ring <= SPIRAL_MAX_RINGS; ring += 1) {
        const radius = ring * SPIRAL_STEP;

        for (let pointIndex = 0; pointIndex < SPIRAL_POINTS_PER_RING; pointIndex += 1) {
            const angle = (pointIndex / SPIRAL_POINTS_PER_RING) * Math.PI * 2;
            const position = {
                x: candidate.x + (Math.cos(angle) * radius),
                y: candidate.y + (Math.sin(angle) * radius),
            };

            if (!collidesAt(position)) {
                return position;
            }
        }
    }

    return candidate;
};
