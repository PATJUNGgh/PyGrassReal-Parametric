import { memo, type CSSProperties } from 'react';
import { localizeText, type LocalizedText, useLanguage } from '../../i18n/language';

export interface AiProfile {
  name: LocalizedText;
  nameEn: string;
  role: LocalizedText;
  badge: LocalizedText;
  description: LocalizedText;
  img: string;
  imgAvifSrcSet?: string;
  imgWebpSrcSet?: string;
  imgSrcSet?: string;
  imgSizes?: string;
  accent: string;
  accentGlow: string;
}

export interface AiProfileCardProps {
  ai: AiProfile;
  onClick: () => void;
}

function AiProfileCardComponent({ ai, onClick }: AiProfileCardProps) {
  const { language } = useLanguage();

  return (
    <button
      type="button"
      className="pg-ai-card"
      onClick={onClick}
      aria-label={`${ai.nameEn} - ${localizeText(language, ai.role)}`}
      style={
        {
          '--ai-accent': ai.accent,
          '--ai-glow': ai.accentGlow,
          cursor: 'pointer',
        } as CSSProperties
      }
    >
      <div className="pg-ai-card-img-wrap">
        <picture>
          {ai.imgAvifSrcSet ? (
            <source type="image/avif" srcSet={ai.imgAvifSrcSet} sizes={ai.imgSizes} />
          ) : null}
          {ai.imgWebpSrcSet ? (
            <source type="image/webp" srcSet={ai.imgWebpSrcSet} sizes={ai.imgSizes} />
          ) : null}
          <img
            src={ai.img}
            srcSet={ai.imgSrcSet}
            sizes={ai.imgSizes}
            alt={`${ai.nameEn} - ${localizeText(language, ai.role)}`}
            className="pg-ai-card-img"
            loading="lazy"
            decoding="async"
            width={512}
            height={512}
          />
        </picture>
        <div className="pg-ai-card-img-overlay" />
      </div>
      <div className="pg-ai-card-body">
        <div className="pg-ai-card-header">
          <span className="pg-ai-badge">{localizeText(language, ai.badge)}</span>
          <h3 className="pg-ai-card-name">
            {localizeText(language, ai.name)}
            <span className="pg-ai-card-name-en">{ai.nameEn}</span>
          </h3>
          <p className="pg-ai-card-role">{localizeText(language, ai.role)}</p>
        </div>
        <p className="pg-ai-card-desc">{localizeText(language, ai.description)}</p>
      </div>
    </button>
  );
}

export const AiProfileCard = memo(
  AiProfileCardComponent,
  (previousProps, nextProps) => previousProps.ai === nextProps.ai
);
