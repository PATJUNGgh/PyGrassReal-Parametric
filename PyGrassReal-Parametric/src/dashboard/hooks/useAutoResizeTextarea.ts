import { useEffect, useRef } from 'react';

/**
 * Hook to automatically resize a textarea based on its content.
 */
export function useAutoResizeTextarea(value: string, maxHeight: number = 200) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    }
  }, [value, maxHeight]);

  return textareaRef;
}
