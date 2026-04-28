import type { LocalizedText } from '../../i18n/language';

interface FooterLegalLink {
  label: LocalizedText;
  path: string;
}

export const FOOTER_EMAILS = {
  support: 'support@pygrassreal.ai',
  contact: 'contact@pygrassreal.ai',
} as const;

export const FOOTER_LEGAL_LINKS: readonly FooterLegalLink[] = [
  { label: { th: 'ข้อกำหนด', en: 'Terms' }, path: '/legal/terms' },
  { label: { th: 'ความเป็นส่วนตัว', en: 'Privacy' }, path: '/legal/privacy' },
  { label: { th: 'นโยบาย AI', en: 'AI Policy' }, path: '/legal/ai-policy' },
  { label: { th: 'ติดต่อ', en: 'Contact' }, path: '/legal/contact' },
];
