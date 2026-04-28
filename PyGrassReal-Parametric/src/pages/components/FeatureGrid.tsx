import { useMemo } from 'react';
import { localizeText, useLanguage } from '../../i18n/language';
import { useFeatureItems } from '../hooks/usePageData';
import { Section } from './Section';

export function FeatureGrid() {
  const { language } = useLanguage();
  const { data: features, isLoading } = useFeatureItems();

  const localizedFeatures = useMemo(
    () =>
      features.map((feature) => ({
        ...feature,
        title: localizeText(language, feature.title),
        description: localizeText(language, feature.description),
      })),
    [features, language]
  );

  return (
    <Section
      telemetryId="landing.features"
      delay={1}
      title={localizeText(language, {
        th: 'ฟีเจอร์',
        en: 'Features',
      })}
      description={localizeText(language, {
        th: 'เครื่องมือที่ออกแบบมาเพื่องานคอนเซ็ปต์และเวิร์กโฟลว์กราฟระดับโปรดักชัน',
        en: 'Focused tools for concept modeling and production-ready graph workflows.',
      })}
    >
      <div className="pg-feature-grid">
        {isLoading && localizedFeatures.length === 0
          ? Array.from({ length: 3 }, (_, index) => (
              <article key={`feature-loading-${index}`} className="pg-feature-card is-loading" aria-hidden="true">
                <span className="pg-feature-icon" aria-hidden="true" />
                <h3>
                  {localizeText(language, {
                    th: 'กำลังโหลดฟีเจอร์...',
                    en: 'Loading features...',
                  })}
                </h3>
                <p>
                  {localizeText(language, {
                    th: 'กำลังเตรียมข้อมูลฟีเจอร์',
                    en: 'Preparing feature data.',
                  })}
                </p>
              </article>
            ))
          : localizedFeatures.map((feature, index) => (
              <article key={`${feature.title}-${index}`} className="pg-feature-card">
                <span className="pg-feature-icon" aria-hidden="true">
                  <feature.icon size={18} />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
      </div>
    </Section>
  );
}
