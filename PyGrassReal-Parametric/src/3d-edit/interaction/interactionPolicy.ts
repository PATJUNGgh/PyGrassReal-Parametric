import { getGumballDragBehavior, shouldHandleGumball } from './gumballPolicy';

export interface InteractionRule {
    allow: boolean;
    reason: string;
}

type SelectionMouseEvent = Pick<MouseEvent, 'button' | 'altKey'>;
type ClickMouseEvent = Pick<MouseEvent, 'button'>;

const UI_CONTROL_SELECTOR = 'button, input, label, select, textarea, .node-port, .node-action-bar, .resize-handle, .node-resize-handle, [data-resize-handle="true"]';
const NODE_SELECTOR = '.custom-node-base, .widget-window-node-base, .group-node-base';
const GUMBALL_SELECTOR = '[data-gumball="true"], .transform-controls, .gumball, .gizmo';
const RESIZE_HANDLE_SELECTOR = '.node-resize-handle, [data-resize-handle="true"]';

const toElement = (target: EventTarget | HTMLElement | null): HTMLElement | null => {
    if (!target || !(target instanceof HTMLElement)) {
        return null;
    }
    return target;
};

const isUiControl = (element: HTMLElement): boolean => {
    return Boolean(element.closest(UI_CONTROL_SELECTOR));
};

const isNoSelectionElement = (element: HTMLElement): boolean => {
    return Boolean(element.closest('[data-no-selection="true"]'));
};

const isGumballElement = (element: HTMLElement): boolean => {
    return Boolean(element.closest(GUMBALL_SELECTOR));
};

const isResizeHandleElement = (element: HTMLElement): boolean => {
    return Boolean(element.closest(RESIZE_HANDLE_SELECTOR));
};

export const shouldStartDrag = (
    target: EventTarget | HTMLElement | null,
    event: ClickMouseEvent
): boolean => {
    const element = toElement(target);
    if (!element) {
        return false;
    }

    if (isNoSelectionElement(element) || isUiControl(element)) {
        return false;
    }
    if (isResizeHandleElement(element)) {
        return false;
    }

    const gumballActive = isGumballElement(element);
    if (shouldHandleGumball(event, gumballActive)) {
        return false;
    }

    const gumballBehavior = getGumballDragBehavior(gumballActive ? 'xyz' : null);
    return !gumballBehavior.consume;
};

export const shouldStartSelectionBox = (
    target: EventTarget | HTMLElement | null,
    event: SelectionMouseEvent
): boolean => {
    const element = toElement(target);
    if (!element) {
        return false;
    }
    if (event.button !== 0 || event.altKey) {
        return false;
    }
    if (isNoSelectionElement(element) || isUiControl(element)) {
        return false;
    }
    if (isResizeHandleElement(element)) {
        return false;
    }
    if (shouldHandleGumball(event, isGumballElement(element))) {
        return false;
    }
    return true;
};

export const shouldDeselect = (
    target: EventTarget | HTMLElement | null,
    event: ClickMouseEvent
): boolean => {
    const element = toElement(target);
    if (!element) {
        return false;
    }
    if (event.button !== 0) {
        return false;
    }

    const isBackground =
        element.classList.contains('node-canvas') ||
        Boolean(element.closest('.grid-background'));
    const isNode = Boolean(element.closest(NODE_SELECTOR));

    if (!isBackground || isUiControl(element) || isNode) {
        return false;
    }

    return true;
};
