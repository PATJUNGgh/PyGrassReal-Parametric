import { useEffect, useRef, type ReactNode } from 'react';
import { useLanguage } from '../../i18n/language';
import { TELEMETRY_EVENT, telemetry } from '../telemetry/telemetry';
import { slugify } from './sectionUtils';

interface SectionProps {
  id?: string;
  title: ReactNode;
  description: ReactNode;
  children: ReactNode;
  delay?: 1 | 2;
  className?: string;
  telemetryId?: string;
}

/**
 * Standard section wrapper with heading and fade-up animation.
 * Used for FeatureGrid, UseCaseGrid, Roadmap, etc.
 */

export function Section({
  id,
  title,
  description,
  children,
  delay,
  className = '',
  telemetryId,
}: SectionProps) {
  const { language } = useLanguage();
  const delayClass = delay ? `pg-delay-${delay}` : '';
  const sectionRef = useRef<HTMLElement | null>(null);
  const hasLoggedVisibleRef = useRef(false);
  const fallbackTelemetryId =
    typeof title === 'string' ? `section.${slugify(title)}` : undefined;
  const resolvedTelemetryId = telemetryId ?? fallbackTelemetryId ?? 'section.unknown';

  useEffect(() => {
    if (!sectionRef.current || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const targetEntry = entries[0];
        if (!targetEntry || !targetEntry.isIntersecting || hasLoggedVisibleRef.current) {
          return;
        }

        if (targetEntry.intersectionRatio < 0.35) {
          return;
        }

        hasLoggedVisibleRef.current = true;
        telemetry.info(TELEMETRY_EVENT.SECTION_VISIBLE, {
          sectionId: resolvedTelemetryId,
          path: window.location.pathname,
          language,
          visibleRatio: Number(targetEntry.intersectionRatio.toFixed(2)),
        });

        observer.disconnect();
      },
      {
        threshold: [0.35, 0.6],
      }
    );

    observer.observe(sectionRef.current);
    return () => {
      observer.disconnect();
    };
  }, [language, resolvedTelemetryId]);

  return (
    <section id={id} ref={sectionRef} className={`pg-section pg-fade-up ${delayClass} ${className}`}>
      <div className="pg-section-heading">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {children}
    </section>
  );
}
