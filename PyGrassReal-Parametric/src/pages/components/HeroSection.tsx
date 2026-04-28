import { ArrowRight, LayoutDashboard, Waypoints } from 'lucide-react';
import logoIcon512Avif from '../../assets/logo-icon-512.avif';
import logoIcon768Avif from '../../assets/logo-icon-768.avif';
import logoIcon512Webp from '../../assets/logo-icon-512.webp';
import logoIcon768Webp from '../../assets/logo-icon-768.webp';
import logoIcon512 from '../../assets/logo-icon-512.png';
import logoIcon768 from '../../assets/logo-icon-768.png';
import { localizeText, useLanguage } from '../../i18n/language';
import { usePageNavigation } from '../navigation/PageNavigationContext';
import { TELEMETRY_EVENT, telemetry } from '../telemetry/telemetry';
import { PGButton } from './PGButton';
import { resolveHeroImageFetchPriority } from './heroFetchPriority';
import { getHeroAnimationDelayClass, type HeroAnimationDelay } from './heroAnimation';

interface HeroSectionProps {
  onOpenDashboard?: () => void;
  onOpenEditor?: () => void;
  className?: string;
  animationDelay?: HeroAnimationDelay;
}

export function HeroSection({
  onOpenDashboard,
  onOpenEditor,
  className = '',
  animationDelay = 0,
}: HeroSectionProps) {
  const { language } = useLanguage();
  const { navigate, currentPath } = usePageNavigation();
  const delayClass = getHeroAnimationDelayClass(animationDelay);
  const logoFetchPriority = resolveHeroImageFetchPriority();

  const handleOpenDashboard = () => {
    telemetry.info(TELEMETRY_EVENT.CTA_CLICK, {
      area: 'hero',
      ctaId: 'open_dashboard',
      path: currentPath,
      language,
    });

    if (onOpenDashboard) {
      onOpenDashboard();
      return;
    }

    navigate('/dashboard', { source: 'hero.cta.open_dashboard' });
  };

  const handleOpenEditor = () => {
    telemetry.info(TELEMETRY_EVENT.CTA_CLICK, {
      area: 'hero',
      ctaId: 'try_3d_editor',
      path: currentPath,
      language,
    });

    if (onOpenEditor) {
      onOpenEditor();
      return;
    }

    navigate('/editor', { source: 'hero.cta.try_3d_editor' });
  };

  return (
    <section className={`pg-hero ${className}`}>
      <div className={`pg-hero-copy pg-fade-up ${delayClass}`.trim()}>
        <picture>
          <source
            type="image/avif"
            srcSet={`${logoIcon512Avif} 512w, ${logoIcon768Avif} 768w`}
            sizes="(max-width: 680px) 260px, (max-width: 980px) 500px, 768px"
          />
          <source
            type="image/webp"
            srcSet={`${logoIcon512Webp} 512w, ${logoIcon768Webp} 768w`}
            sizes="(max-width: 680px) 260px, (max-width: 980px) 500px, 768px"
          />
          <img
            src={logoIcon768}
            srcSet={`${logoIcon512} 512w, ${logoIcon768} 768w`}
            sizes="(max-width: 680px) 260px, (max-width: 980px) 500px, 768px"
            alt="PyGrassReal-Ai Logo"
            className="pg-hero-logo-icon"
            width={800}
            height={800}
            loading="eager"
            decoding="async"
            fetchPriority={logoFetchPriority}
          />
        </picture>
        <h1 className="pg-hero-title">PyGrassReal</h1>
        <p>
          {localizeText(language, {
            th: 'ตัวแก้ไข Node พลัง AI สำหรับงานโมเดล 3D และการออกแบบเชิงคำนวณ',
            en: 'AI-powered Node Editor for 3D Modeling and Computational Design.',
          })}
        </p>
        <div className="pg-hero-actions">
          <PGButton type="button" variant="primary" onClick={handleOpenDashboard}>
            <LayoutDashboard size={16} aria-hidden="true" />
            <span>
              {localizeText(language, {
                th: 'เปิดแดชบอร์ด',
                en: 'Open Dashboard',
              })}
            </span>
          </PGButton>
          <PGButton type="button" variant="secondary" onClick={handleOpenEditor}>
            <Waypoints size={16} aria-hidden="true" />
            <span>
              {localizeText(language, {
                th: 'ลองใช้ 3D Editor',
                en: 'Try 3D Editor',
              })}
            </span>
            <ArrowRight size={15} aria-hidden="true" />
          </PGButton>
        </div>
      </div>
    </section>
  );
}
