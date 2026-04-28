import { useEffect } from 'react';
import type { LanguageCode } from '../../../i18n/language';
import {
  captureRuntimeContext,
  TELEMETRY_EVENT,
  telemetry,
} from '../../telemetry/telemetry';
import { resolveResourceFromTarget } from '../mainLayoutHelpers';

interface UseSystemMonitoringOptions {
  /** Current route path used for telemetry context. */
  resolvedPath: string;
  /** Current UI language used for runtime telemetry context. */
  language: LanguageCode;
}

/**
 * Subscribes to runtime reliability signals and forwards them to telemetry.
 *
 * Side effects:
 * - Listens for resource load failures at capture phase.
 * - Listens for `offline`/`online` transitions and emits sampled-safe events.
 */
export function useSystemMonitoring({ resolvedPath, language }: UseSystemMonitoringOptions) {
  useEffect(() => {
    const handleResourceError = (event: Event) => {
      if (event instanceof ErrorEvent) {
        return;
      }

      const resource = resolveResourceFromTarget(event.target);
      if (!resource) {
        return;
      }

      telemetry.error(TELEMETRY_EVENT.RESOURCE_LOAD_ERROR, {
        ...captureRuntimeContext({
          path: resolvedPath,
          language,
        }),
        tagName: resource.tagName,
        resourceUrl: resource.resourceUrl,
      });
    };

    window.addEventListener('error', handleResourceError, true);
    return () => {
      window.removeEventListener('error', handleResourceError, true);
    };
  }, [language, resolvedPath]);

  useEffect(() => {
    const handleOffline = () => {
      telemetry.warn(
        TELEMETRY_EVENT.NETWORK_OFFLINE,
        captureRuntimeContext({
          path: resolvedPath,
          language,
        }),
        { skipSampling: true }
      );
    };

    const handleOnline = () => {
      telemetry.info(
        TELEMETRY_EVENT.NETWORK_ONLINE,
        captureRuntimeContext({
          path: resolvedPath,
          language,
        }),
        { skipSampling: true }
      );
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [language, resolvedPath]);
}
