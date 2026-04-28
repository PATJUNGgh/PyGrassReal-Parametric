import { useEffect, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

const getFocusableElements = (container: HTMLElement | null): HTMLElement[] => {
  if (!container) {
    return [];
  }

  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((element) => {
    if (element.getAttribute('aria-hidden') === 'true') {
      return false;
    }

    return element.offsetParent !== null || element === document.activeElement;
  });
};

interface UseFocusTrapOptions {
  /** Enables/disables the trap lifecycle. */
  isActive: boolean;
  /** Dialog or container that should own keyboard focus while active. */
  containerRef: RefObject<HTMLElement | null>;
  /** Optional explicit element to focus first when trap is activated. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Escape-key callback, commonly used to close the dialog. */
  onEscape?: () => void;
  /** Locks page scroll while the trap is active. */
  lockBodyScroll?: boolean;
}

/**
 * Keeps keyboard focus inside a container while active.
 *
 * Side effects:
 * - Installs a global `keydown` listener for `Tab` wrapping and `Escape`.
 * - Optionally locks/unlocks `document.body` scroll.
 * - Moves initial focus into the target container after mount.
 */
export function useFocusTrap({
  isActive,
  containerRef,
  initialFocusRef,
  onEscape,
  lockBodyScroll = true,
}: UseFocusTrapOptions) {
  useEffect(() => {
    if (!isActive) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    if (lockBodyScroll) {
      document.body.style.overflow = 'hidden';
    }

    const focusTimeout = window.setTimeout(() => {
      const focusableElements = getFocusableElements(containerRef.current);
      (focusableElements[0] ?? initialFocusRef?.current ?? null)?.focus();
    }, 0);

    const handleTrapHotkeys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onEscape?.();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusableElements = getFocusableElements(containerRef.current);
      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement as HTMLElement | null;
      const isFocusInsideDialog = activeElement !== null && containerRef.current?.contains(activeElement);

      if (event.shiftKey) {
        if (!isFocusInsideDialog || activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
        return;
      }

      if (!isFocusInsideDialog || activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleTrapHotkeys);
    return () => {
      window.clearTimeout(focusTimeout);
      if (lockBodyScroll) {
        document.body.style.overflow = previousBodyOverflow;
      }
      document.removeEventListener('keydown', handleTrapHotkeys);
    };
  }, [containerRef, initialFocusRef, isActive, lockBodyScroll, onEscape]);
}
