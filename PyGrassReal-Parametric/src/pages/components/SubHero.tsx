import type { ReactNode } from 'react';
import { getHeroAnimationDelayClass, type HeroAnimationDelay } from './heroAnimation';

interface SubHeroProps {
  chip: ReactNode;
  title: ReactNode;
  description: ReactNode;
  children?: ReactNode;
  childrenPosition?: 'before' | 'after';
  className?: string;
  animationDelay?: HeroAnimationDelay;
}

export function SubHero({
  chip,
  title,
  description,
  children,
  childrenPosition = 'after',
  className = '',
  animationDelay = 0,
}: SubHeroProps) {
  const delayClass = getHeroAnimationDelayClass(animationDelay);

  return (
    <section className={`pg-sub-hero pg-fade-up ${delayClass} ${className}`.trim()}>
      {childrenPosition === 'before' ? children : null}
      <span className="pg-chip">{chip}</span>
      <h1>{title}</h1>
      <p>{description}</p>
      {childrenPosition === 'after' ? children : null}
    </section>
  );
}
