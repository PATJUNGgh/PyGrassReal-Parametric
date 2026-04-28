import React from 'react';

/**
 * Shared background component for all pages to maintain consistent visual style.
 * Uses CSS classes defined in pages.css.
 */
export function PageBackground() {
  return (
    <>
      <div className="pg-background-glow" aria-hidden="true" />
      <div className="pg-background-grid" aria-hidden="true" />
      <div className="pg-background-dots" aria-hidden="true" />
    </>
  );
}
