import type { RefObject } from 'react';

interface FocusTarget {
  hasError: boolean;
  ref: RefObject<HTMLInputElement | null>;
}

export const focusFirstInvalidField = (targets: FocusTarget[]): void => {
  const firstInvalid = targets.find((target) => target.hasError && target.ref.current);
  if (!firstInvalid?.ref.current) {
    return;
  }

  firstInvalid.ref.current.focus();
  firstInvalid.ref.current.select();
};
