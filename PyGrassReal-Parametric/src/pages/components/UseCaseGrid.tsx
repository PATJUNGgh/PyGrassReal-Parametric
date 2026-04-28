import { useMemo } from 'react';
import { localizeText, useLanguage } from '../../i18n/language';
import { useUseCaseItems } from '../hooks/usePageData';
import { Section } from './Section';

export function UseCaseGrid() {
  const { language } = useLanguage();
  const { data: useCases, isLoading } = useUseCaseItems();

  const localizedUseCases = useMemo(
    () =>
      useCases.map((useCase) => ({
        ...useCase,
        title: localizeText(language, useCase.title),
        description: localizeText(language, useCase.description),
      })),
    [language, useCases]
  );

  return (
    <Section
      telemetryId="landing.use_cases"
      delay={2}
      title={localizeText(language, {
        th: 'ตัวอย่างการใช้งาน',
        en: 'Use Cases',
      })}
      description={localizeText(language, {
        th: 'ออกแบบมาสำหรับทีมและครีเอเตอร์ที่ทำงานข้ามสายงานออกแบบ',
        en: 'Built for teams and creators working across design disciplines.',
      })}
    >
      <div className="pg-usecase-grid">
        {isLoading && localizedUseCases.length === 0
          ? Array.from({ length: 3 }, (_, index) => (
              <article key={`use-case-loading-${index}`} className="pg-usecase-card is-loading" aria-hidden="true">
                <h3>
                  {localizeText(language, {
                    th: 'กำลังโหลดตัวอย่าง...',
                    en: 'Loading use cases...',
                  })}
                </h3>
                <p>
                  {localizeText(language, {
                    th: 'กำลังเตรียมข้อมูลการใช้งาน',
                    en: 'Preparing use case data.',
                  })}
                </p>
              </article>
            ))
          : localizedUseCases.map((useCase, index) => (
              <article key={`${useCase.title}-${index}`} className="pg-usecase-card">
                <useCase.icon size={20} aria-hidden="true" />
                <h3>{useCase.title}</h3>
                <p>{useCase.description}</p>
              </article>
            ))}
      </div>
    </Section>
  );
}
