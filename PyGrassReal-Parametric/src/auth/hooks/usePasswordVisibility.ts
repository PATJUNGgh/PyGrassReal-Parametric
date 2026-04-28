import { useState } from 'react';

/**
 * Custom hook to manage password visibility state.
 */
export function usePasswordVisibility() {
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => {
    setIsVisible((prev) => !prev);
  };

  return {
    isVisible,
    toggleVisibility,
    type: isVisible ? 'text' : 'password',
  };
}
