
import { useState, useRef, useCallback, useEffect } from 'react';

// --- Constants ---
const AUTO_DISMISS_MS = 2000;
const COPIED_DISMISS_MS = 800;
const COPYABLE_PORT_SELECTOR = '.node-port-label-copyable, .node-port-section-copyable';

// --- Types ---
type CopyTooltipText = 'Copy' | 'Copied!';

export interface PortCopyTooltipState {
    visible: boolean;
    x: number;
    y: number;
    text: CopyTooltipText;
    selectedText: string;
}

// --- Helper Functions ---
const isNodeInsideElement = (node: Node | null, element: HTMLElement) =>
    !!node && (node === element || element.contains(node));

const findCopyableElement = (node: Node | null, container: HTMLElement): HTMLElement | null => {
    if (!node) return null;
    const element = node instanceof HTMLElement ? node : node.parentElement;
    if (!element) return null;
    const candidate = element.closest(COPYABLE_PORT_SELECTOR);
    if (!(candidate instanceof HTMLElement)) return null;
    return container.contains(candidate) ? candidate : null;
};

const isSelectionInsideCopyablePortText = (selection: Selection, container: HTMLElement) => {
    const anchor = findCopyableElement(selection.anchorNode, container);
    const focus = findCopyableElement(selection.focusNode, container);
    return !!anchor && !!focus && isNodeInsideElement(anchor, container) && isNodeInsideElement(focus, container);
};

const fallbackCopyText = (text: string) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied;
};

// --- Custom Hook ---
export const useCopyTooltip = (containerRef: React.RefObject<HTMLElement>) => {
    const tooltipTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
    const tooltipStateRef = useRef<PortCopyTooltipState | null>(null);
    const [copyTooltip, setCopyTooltip] = useState<PortCopyTooltipState | null>(null);

    useEffect(() => {
        tooltipStateRef.current = copyTooltip;
    }, [copyTooltip]);

    const clearTooltipTimer = useCallback(() => {
        if (tooltipTimerRef.current !== null) {
            window.clearTimeout(tooltipTimerRef.current);
            tooltipTimerRef.current = null;
        }
    }, []);

    const hideCopyTooltip = useCallback(() => {
        clearTooltipTimer();
        setCopyTooltip(null);
    }, [clearTooltipTimer]);

    const scheduleTooltipDismiss = useCallback((delayMs: number) => {
        clearTooltipTimer();
        tooltipTimerRef.current = window.setTimeout(() => {
            setCopyTooltip(null);
            tooltipTimerRef.current = null;
        }, delayMs);
    }, [clearTooltipTimer]);

    const showCopiedFeedback = useCallback(() => {
        setCopyTooltip((prev) => (prev ? { ...prev, text: 'Copied!' } : prev));
        scheduleTooltipDismiss(COPIED_DISMISS_MS);
    }, [scheduleTooltipDismiss]);

    const updateTooltipFromSelection = useCallback(() => {
        const containerEl = containerRef.current;
        const selection = window.getSelection();

        if (
            !containerEl ||
            !selection ||
            selection.rangeCount === 0 ||
            selection.isCollapsed
        ) {
            hideCopyTooltip();
            return;
        }

        const selectedText = selection.toString().trim();
        if (!selectedText || !isSelectionInsideCopyablePortText(selection, containerEl)) {
            hideCopyTooltip();
            return;
        }

        const rangeRect = selection.getRangeAt(0).getBoundingClientRect();
        if (rangeRect.width === 0 && rangeRect.height === 0) {
            hideCopyTooltip();
            return;
        }

        const containerRect = containerEl.getBoundingClientRect();
        setCopyTooltip({
            visible: true,
            x: rangeRect.left + rangeRect.width / 2 - containerRect.left,
            y: rangeRect.top - containerRect.top - 8,
            text: 'Copy',
            selectedText,
        });
        scheduleTooltipDismiss(AUTO_DISMISS_MS);
    }, [containerRef, hideCopyTooltip, scheduleTooltipDismiss]);

    const handleLabelSelectionMouseUp = useCallback(() => {
        updateTooltipFromSelection();
    }, [updateTooltipFromSelection]);

    const handleTooltipMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleTooltipClick = useCallback(async (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();

        const textToCopy = copyTooltip?.selectedText?.trim() || window.getSelection()?.toString().trim();
        if (!textToCopy) return;

        let copied = false;
        if (navigator.clipboard?.writeText) {
            try {
                await navigator.clipboard.writeText(textToCopy);
                copied = true;
            } catch {
                copied = false;
            }
        }

        if (!copied) {
            copied = fallbackCopyText(textToCopy);
        }

        if (copied) {
            showCopiedFeedback();
        }
    }, [copyTooltip?.selectedText, showCopiedFeedback]);

    useEffect(() => {
        if (!copyTooltip?.visible) return;

        const handleSelectionChange = () => {
            const selection = window.getSelection();
            const containerEl = containerRef.current;
            if (
                !selection ||
                !containerEl ||
                selection.isCollapsed ||
                !selection.toString().trim() ||
                !isSelectionInsideCopyablePortText(selection, containerEl)
            ) {
                hideCopyTooltip();
            }
        };

        const handleMouseDown = () => hideCopyTooltip();

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                hideCopyTooltip();
            }
        };

        const handleCopy = () => {
            if (!tooltipStateRef.current?.visible) return;
            showCopiedFeedback();
        };

        window.addEventListener('selectionchange', handleSelectionChange);
        window.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('copy', handleCopy);

        return () => {
            window.removeEventListener('selectionchange', handleSelectionChange);
            window.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('copy', handleCopy);
        };
    }, [copyTooltip?.visible, containerRef, hideCopyTooltip, showCopiedFeedback]);

    useEffect(() => () => {
        clearTooltipTimer();
    }, [clearTooltipTimer]);


    return {
        copyTooltip,
        handleLabelSelectionMouseUp,
        handleTooltipMouseDown,
        handleTooltipClick,
    };
};
