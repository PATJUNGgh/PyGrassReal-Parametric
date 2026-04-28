import { memo } from 'react';
import { localizeText, type LocalizedText, useLanguage } from '../../i18n/language';

export interface RoadmapItem {
  quarter: string;
  title: LocalizedText;
  description: LocalizedText;
}

export interface RoadmapCardProps {
  item: RoadmapItem;
}

function RoadmapCardComponent({ item }: RoadmapCardProps) {
  const { language } = useLanguage();

  return (
    <article className="pg-roadmap-card">
      <span className="pg-roadmap-quarter">{item.quarter}</span>
      <h3>{localizeText(language, item.title)}</h3>
      <p>{localizeText(language, item.description)}</p>
    </article>
  );
}

export const RoadmapCard = memo(
  RoadmapCardComponent,
  (previousProps, nextProps) => previousProps.item === nextProps.item
);
