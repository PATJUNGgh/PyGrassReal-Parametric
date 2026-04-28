import { Component, type ErrorInfo, type ReactNode } from 'react';
import { localizeText, type LanguageCode } from '../../i18n/language';
import {
  captureRuntimeContext,
  DEFAULT_CLIENT_ERROR_ENDPOINT,
  getTelemetryBreadcrumbs,
  TELEMETRY_EVENT,
  telemetry,
  telemetryErrorDetails,
} from '../telemetry/telemetry';

interface GlobalErrorBoundaryProps {
  language: LanguageCode;
  children: ReactNode;
  errorLogEndpoint?: string;
  onErrorCaptured?: (error: Error, errorInfo: ErrorInfo) => void;
  currentPath?: string;
  stateSnapshot?: Record<string, unknown>;
}

interface GlobalErrorBoundaryState {
  hasError: boolean;
}

const MAX_STATE_SNAPSHOT_DEPTH = 3;
const MAX_STATE_SNAPSHOT_KEYS = 20;
const MAX_STATE_SNAPSHOT_ARRAY_ITEMS = 12;
const MAX_STATE_SNAPSHOT_STRING_LENGTH = 180;
const STATE_SNAPSHOT_SENSITIVE_KEY_REGEX =
  /token|secret|password|passwd|authorization|auth|cookie|credential|header|session/i;

const truncateStateSnapshotString = (value: string): string => {
  if (value.length <= MAX_STATE_SNAPSHOT_STRING_LENGTH) {
    return value;
  }

  return `${value.slice(0, MAX_STATE_SNAPSHOT_STRING_LENGTH)}...`;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return Object.getPrototypeOf(value) === Object.prototype;
};

const sanitizeStateSnapshotValue = (value: unknown, depth: number): unknown => {
  if (depth > MAX_STATE_SNAPSHOT_DEPTH) {
    return '[TRUNCATED]';
  }

  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null ||
    value === undefined
  ) {
    return value;
  }

  if (typeof value === 'string') {
    return truncateStateSnapshotString(value);
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_STATE_SNAPSHOT_ARRAY_ITEMS)
      .map((item) => sanitizeStateSnapshotValue(item, depth + 1));
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (!isPlainObject(value)) {
    return truncateStateSnapshotString(String(value));
  }

  const sanitizedObject: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value).slice(0, MAX_STATE_SNAPSHOT_KEYS)) {
    if (STATE_SNAPSHOT_SENSITIVE_KEY_REGEX.test(key)) {
      continue;
    }
    sanitizedObject[key] = sanitizeStateSnapshotValue(nestedValue, depth + 1);
  }

  return sanitizedObject;
};

const sanitizeStateSnapshot = (stateSnapshot: Record<string, unknown> | undefined): Record<string, unknown> | null => {
  if (!stateSnapshot) {
    return null;
  }

  const sanitized = sanitizeStateSnapshotValue(stateSnapshot, 0);
  return isPlainObject(sanitized) ? sanitized : null;
};

export class GlobalErrorBoundary extends Component<
  GlobalErrorBoundaryProps,
  GlobalErrorBoundaryState
> {
  state: GlobalErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): GlobalErrorBoundaryState {
    return { hasError: true };
  }

  private buildErrorPayload(error: Error, errorInfo: ErrorInfo) {
    return {
      ...telemetryErrorDetails(error),
      componentStack: errorInfo.componentStack,
      runtime: captureRuntimeContext({
        path: this.props.currentPath ?? window.location.pathname,
        language: this.props.language,
      }),
      stateSnapshot: sanitizeStateSnapshot(this.props.stateSnapshot),
      breadcrumbs: getTelemetryBreadcrumbs(),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('GlobalErrorBoundary captured an uncaught error:', error, errorInfo);
    telemetry.error(
      TELEMETRY_EVENT.REACT_ERROR_BOUNDARY_CAPTURED,
      this.buildErrorPayload(error, errorInfo),
      { backendEndpoint: this.props.errorLogEndpoint ?? DEFAULT_CLIENT_ERROR_ENDPOINT }
    );

    this.props.onErrorCaptured?.(error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const title = localizeText(this.props.language, {
      th: 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
      en: 'Unexpected runtime error',
    });
    const description = localizeText(this.props.language, {
      th: 'ระบบหยุดทำงานชั่วคราว กรุณารีโหลดหน้าเพื่อลองใหม่อีกครั้ง',
      en: 'The interface stopped unexpectedly. Please reload this page and try again.',
    });
    const buttonLabel = localizeText(this.props.language, {
      th: 'รีโหลดหน้า',
      en: 'Reload page',
    });

    return (
      <main className="pg-runtime-fallback" role="alert" aria-live="assertive">
        <section className="pg-runtime-fallback-card">
          <h1>{title}</h1>
          <p>{description}</p>
          <button type="button" className="pg-runtime-fallback-button" onClick={this.handleReload}>
            {buttonLabel}
          </button>
        </section>
      </main>
    );
  }
}
