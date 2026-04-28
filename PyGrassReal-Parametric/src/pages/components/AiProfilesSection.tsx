import { localizeText, useLanguage } from '../../i18n/language';
import { useAiProfiles } from '../hooks/usePageData';
import { usePageNavigation } from '../navigation/PageNavigationContext';
import { AiProfileCard } from './AiProfileCard';
import { Section } from './Section';

export function AiProfilesSection() {
  const { language } = useLanguage();
  const { navigate } = usePageNavigation();
  const { data: aiProfiles, isLoading } = useAiProfiles();

  return (
    <Section
      telemetryId="landing.ai_team"
      delay={2}
      title={localizeText(language, {
        th: 'ทีม AI',
        en: 'AI Team',
      })}
      description={localizeText(language, {
        th: 'ทีมปัญญาประดิษฐ์ 4 ตัวตนที่ทำงานร่วมกันเพื่อขับเคลื่อน PyGrassReal-Ai',
        en: 'Four specialized AI agents collaborate to power the PyGrassReal-Ai workflow.',
      })}
    >
      <div className="pg-ai-team-grid">
        {isLoading && aiProfiles.length === 0
          ? Array.from({ length: 4 }, (_, index) => (
              <article
                key={`ai-profile-loading-${index}`}
                className="pg-ai-card is-loading"
                aria-hidden="true"
              />
            ))
          : aiProfiles.map((ai) => (
              <AiProfileCard
                key={ai.nameEn}
                ai={ai}
                onClick={() => navigate('/dashboard', { source: 'ai_profiles.card' })}
              />
            ))}
      </div>
    </Section>
  );
}
