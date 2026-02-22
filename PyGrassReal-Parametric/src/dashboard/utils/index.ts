/**
 * Format an ISO string to a human-readable local date and time.
 */
export const formatTimestamp = (value: string | null): string => {
  if (!value) return 'N/A';
  try {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'N/A';
    
    // Using a more consistent format: 'Feb 20, 2026, 10:30 AM'
    return parsed.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (err) {
    return 'N/A';
  }
};

/**
 * Check if a value is a non-null object (and not an array).
 */
export const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

/**
 * Standardized error handler for API queries.
 */
export const throwQueryError = (message: string, error: unknown): never => {
  console.error(`API Query Error (${message}):`, error);
  const errorDetails = error && typeof error === 'object' && 'message' in error 
    ? (error as any).message 
    : 'Unknown error';
  const errorCode = error && typeof error === 'object' && 'code' in error 
    ? ` (Code: ${(error as any).code})` 
    : '';
    
  throw new Error(`${message}: ${errorDetails}${errorCode}`);
};
