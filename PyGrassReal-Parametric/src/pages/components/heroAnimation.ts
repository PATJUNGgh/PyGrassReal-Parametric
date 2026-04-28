export type HeroAnimationDelay = 0 | 1 | 2;

export const getHeroAnimationDelayClass = (delay: HeroAnimationDelay = 0): string => {
  if (delay === 1) {
    return 'pg-delay-1';
  }

  if (delay === 2) {
    return 'pg-delay-2';
  }

  return '';
};
