/**
 * Format an ISO string to a human-readable local date and time string.
 * @param value - ISO date string or null.
 * @param lang - Language code ('th' or 'en').
 * @returns Formatted date string or 'N/A' if invalid.
 * @example formatTimestamp('2026-02-23T10:00:00Z', 'th') // "23 ก.พ. 2026, 17:00"
 */
export const formatTimestamp = (value: string | null, lang: string = 'en'): string => {
  if (!value) return 'N/A';
  try {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'N/A';
    
    return parsed.toLocaleString(lang === 'th' ? 'th-TH' : 'en-US', {
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
 * Type guard to check if a value is a non-null object (and not an array).
 * @param value - Any value to check.
 * @returns True if the value is a plain object.
 */
export const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

/**
 * Basic input sanitization to strip HTML tags and normalize whitespace.
 * Provides a secondary defense layer for stored data against XSS.
 * @param value - User provided string.
 * @param maxLength - Optional length constraint.
 * @param options - Extra behavior controls.
 * @returns Cleaned string.
 */
export const sanitizeInput = (
  value: string,
  maxLength?: number,
  options: { preserveLineBreaks?: boolean } = {},
): string => {
  if (!value) return '';
  const { preserveLineBreaks = false } = options;
  // Strip HTML tags and normalize newline format.
  const noHtml = value.replace(/<\/?[^>]+(>|$)/g, "");
  const normalizedNewlines = noHtml.replace(/\r\n?/g, '\n');
  const clean = preserveLineBreaks
    ? normalizedNewlines.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
    : normalizedNewlines.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  const trimmed = clean.trim();
  return maxLength ? trimmed.slice(0, maxLength) : trimmed;
};

/**
 * Extracts a user-friendly error message and code from an error object.
 * @param error - Caught exception or error response.
 * @returns Object containing 'details' and 'code' strings.
 */
export const getErrorDetails = (error: unknown) => {
  if (!isRecord(error)) {
    return { details: 'Unknown error', code: '' };
  }

  const details = typeof error.message === 'string' ? error.message : 'Unknown error';
  const code = error.code ? ` (Code: ${error.code})` : '';

  return { details, code };
};

/**
 * Checks if an error is a result of a request being aborted.
 * @param error - Error object to check.
 * @returns True if it's an AbortError.
 */
export const isAbortError = (error: unknown): boolean => {
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  if (error instanceof Error && (error.message === 'Aborted' || error.name === 'AbortError')) return true;
  
  const str = String(error);
  return str.includes('AbortError') || (isRecord(error) && (error.code === 'ABORT' || error.code === '20'));
};

/**
 * Filters out sensitive keys from an object to prevent accidental logging of credentials.
 * Scans keys for terms like 'token', 'key', 'password', etc.
 */
const stripSensitiveData = (data: any): any => {
  if (!isRecord(data)) return data;
  
  const SENSITIVE_KEYS = [
    'token', 'password', 'secret', 'key', 'auth', 'authorization', 
    'api_key', 'credential', 'private', 'ssn', 'phone', 'mobile'
  ];
  const clean: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS.some(k => key.toLowerCase().includes(k))) {
      clean[key] = '[REDACTED]';
    } else if (isRecord(value)) {
      clean[key] = stripSensitiveData(value);
    } else if (Array.isArray(value)) {
      clean[key] = value.map(stripSensitiveData);
    } else {
      clean[key] = value;
    }
  }
  return clean;
};

/**
 * Standardized error handler for API queries with structured logging.
 * Automatically filters out potentially sensitive error fields before logging.
 * @throws Always throws a formatted Error object.
 */
export const throwQueryError = (
  message: string, 
  error: unknown, 
  context: { user_id?: string | null; request_id?: string } = {}
): never => {
  const requestId = context.request_id || `req-${Math.random().toString(36).slice(2, 11)}`;
  
  // Sanitize error object to avoid logging sensitive fields
  const safeError = isRecord(error) ? stripSensitiveData({
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint
  }) : String(error);

  const structuredLog = {
    timestamp: new Date().toISOString(),
    message,
    user_id: context.user_id || 'anonymous',
    request_id: requestId,
    error_context: error instanceof Error ? {
      name: error.name,
      message: error.message,
    } : safeError
  };

  console.error('[API_ERROR]', JSON.stringify(structuredLog, null, 2));
  
  const { details, code } = getErrorDetails(error);
  throw new Error(`${message}: ${details}${code}`);
};

/**
 * Log a structured message for tracking and analytics.
 * Automatically redacts sensitive information like tokens or passwords from the context.
 * @param message - High-level description of the event.
 * @param context - Key-value pairs for additional metadata.
 */
export const logStructured = (
  message: string, 
  context: { user_id?: string | null; request_id?: string; [key: string]: any } = {}
) => {
  const structuredLog = stripSensitiveData({
    timestamp: new Date().toISOString(),
    level: 'INFO',
    message,
    user_id: context.user_id || 'anonymous',
    request_id: context.request_id || `req-${Math.random().toString(36).slice(2, 11)}`,
    ...context
  });
  console.info('[DASHBOARD_LOG]', JSON.stringify(structuredLog, null, 2));
};
