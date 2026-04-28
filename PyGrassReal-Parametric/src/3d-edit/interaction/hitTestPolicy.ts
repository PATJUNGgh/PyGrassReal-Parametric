import type { NodeData } from '../types/NodeTypes';

export interface HitResult {
    hit: boolean;
    target: 'body' | 'port' | 'header' | 'gumball' | 'resize-handle' | null;
}

export interface HitTestPoint {
    x: number;
    y: number;
}

export interface HitTestTarget {
    element?: HTMLElement | null;
    nodeType?: NodeData['type'];
    bounds?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

const NODE_SELECTOR = '.custom-node-base, .widget-window-node-base, .group-node-base';
const PORT_SELECTOR = '.node-port, [data-port-id]';
const GUMBALL_SELECTOR = '[data-gumball="true"], .transform-controls, .gumball, .gizmo';
const HEADER_SELECTOR = '.node-header, [data-node-header="true"]';
const RESIZE_HANDLE_SELECTOR = '.resize-handle, .node-resize-handle, [data-resize-handle="true"]';

const isPointInRect = (
    point: HitTestPoint,
    rect: { x: number; y: number; width: number; height: number }
): boolean => {
    return (
        point.x >= rect.x &&
        point.x <= rect.x + rect.width &&
        point.y >= rect.y &&
        point.y <= rect.y + rect.height
    );
};

const isPointInCircle = (
    point: HitTestPoint,
    circle: { cx: number; cy: number; radius: number }
): boolean => {
    const dx = point.x - circle.cx;
    const dy = point.y - circle.cy;
    return dx * dx + dy * dy <= circle.radius * circle.radius;
};

export const hitTestNode = (
    point: HitTestPoint,
    node: HitTestTarget | null
): HitResult => {
    if (!node) {
        return { hit: false, target: null };
    }

    const element = node.element ?? null;
    if (element) {
        if (element.closest(RESIZE_HANDLE_SELECTOR)) {
            return { hit: true, target: 'resize-handle' };
        }
        if (element.closest(PORT_SELECTOR)) {
            return { hit: true, target: 'port' };
        }
        if (element.closest(GUMBALL_SELECTOR)) {
            return { hit: true, target: 'gumball' };
        }
        if (element.closest(HEADER_SELECTOR)) {
            return { hit: true, target: 'header' };
        }
        if (element.closest(NODE_SELECTOR)) {
            return { hit: true, target: 'body' };
        }
    }

    if (node.bounds) {
        if (node.nodeType === 'ai-agent') {
            const radius = Math.min(node.bounds.width, node.bounds.height) / 2;
            const cx = node.bounds.x + node.bounds.width / 2;
            const cy = node.bounds.y + node.bounds.height / 2;

            // TODO: sync radius with rendered AI Agent visual size for pixel-perfect hit test.
            if (isPointInCircle(point, { cx, cy, radius })) {
                return { hit: true, target: 'body' };
            }
        } else if (isPointInRect(point, node.bounds)) {
            return { hit: true, target: 'body' };
        }
    }

    return { hit: false, target: null };
};
