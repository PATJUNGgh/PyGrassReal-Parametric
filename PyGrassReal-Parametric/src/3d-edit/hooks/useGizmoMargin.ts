import { useState, useEffect, useCallback } from 'react';

const DEFAULT_GIZMO_MARGIN_X = 90;
const DEFAULT_GIZMO_MARGIN_Y = 80;
const GIZMO_HITBOX_SIZE = 96;
const GIZMO_TOOLBAR_GAP = 10;

export const useGizmoMargin = (gl: THREE.WebGLRenderer | null, interactionMode: string) => {
    const [gizmoMarginY, setGizmoMarginY] = useState(DEFAULT_GIZMO_MARGIN_Y);

    const recalculateGizmoMargin = useCallback(() => {
        const canvasElement = gl?.domElement;
        if (!canvasElement) return;

        const toolbarElement = document.querySelector('.ui-toolbar') as HTMLElement | null;
        if (!toolbarElement) {
            setGizmoMarginY((prev) => (prev === DEFAULT_GIZMO_MARGIN_Y ? prev : DEFAULT_GIZMO_MARGIN_Y));
            return;
        }

        const canvasRect = canvasElement.getBoundingClientRect();
        const toolbarRect = toolbarElement.getBoundingClientRect();
        if (canvasRect.width <= 0 || canvasRect.height <= 0) return;

        const halfGizmo = GIZMO_HITBOX_SIZE / 2;
        const gizmoCenterX = canvasRect.right - DEFAULT_GIZMO_MARGIN_X;
        const gizmoCenterY = canvasRect.top + DEFAULT_GIZMO_MARGIN_Y;
        const gizmoRect = {
            left: gizmoCenterX - halfGizmo,
            right: gizmoCenterX + halfGizmo,
            top: gizmoCenterY - halfGizmo,
            bottom: gizmoCenterY + halfGizmo,
        };

        const overlapsToolbarX = gizmoRect.left < toolbarRect.right && gizmoRect.right > toolbarRect.left;
        const overlapsToolbarY = gizmoRect.top < toolbarRect.bottom && gizmoRect.bottom > toolbarRect.top;

        if (overlapsToolbarX && overlapsToolbarY) {
            const toolbarBottomInsideCanvas = toolbarRect.bottom - canvasRect.top;
            const desiredMarginY = Math.ceil(toolbarBottomInsideCanvas + halfGizmo + GIZMO_TOOLBAR_GAP);
            const maxMarginY = Math.max(DEFAULT_GIZMO_MARGIN_Y, canvasRect.height - halfGizmo - 12);
            const nextMarginY = Math.min(desiredMarginY, maxMarginY);
            setGizmoMarginY((prev) => (prev === nextMarginY ? prev : nextMarginY));
            return;
        }

        setGizmoMarginY((prev) => (prev === DEFAULT_GIZMO_MARGIN_Y ? prev : DEFAULT_GIZMO_MARGIN_Y));
    }, [gl]);

    useEffect(() => {
        if (interactionMode !== '3d') {
            setGizmoMarginY((prev) => (prev === DEFAULT_GIZMO_MARGIN_Y ? prev : DEFAULT_GIZMO_MARGIN_Y));
            return;
        }

        let frameId: number | null = null;
        const queueRecalculate = () => {
            if (frameId !== null) {
                window.cancelAnimationFrame(frameId);
            }
            frameId = window.requestAnimationFrame(() => {
                frameId = null;
                recalculateGizmoMargin();
            });
        };

        const toolbarElement = document.querySelector('.ui-toolbar') as HTMLElement | null;
        let resizeObserver: ResizeObserver | null = null;
        if (toolbarElement && typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(queueRecalculate);
            resizeObserver.observe(toolbarElement);
        }

        window.addEventListener('resize', queueRecalculate);
        queueRecalculate();

        return () => {
            if (frameId !== null) {
                window.cancelAnimationFrame(frameId);
            }
            window.removeEventListener('resize', queueRecalculate);
            resizeObserver?.disconnect();
        };
    }, [interactionMode, recalculateGizmoMargin]);

    return { gizmoMarginY, DEFAULT_GIZMO_MARGIN_X };
};
