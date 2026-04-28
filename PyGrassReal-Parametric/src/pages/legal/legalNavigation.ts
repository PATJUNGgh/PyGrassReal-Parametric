import type { LanguageCode, LocalizedText } from '../../i18n/language';

export const LEGAL_ROUTE_PATHS = [
  '/legal/terms',
  '/legal/privacy',
  '/legal/acceptable-use',
  '/legal/ai-policy',
  '/legal/contact',
] as const;

export type LegalRoutePath = (typeof LEGAL_ROUTE_PATHS)[number];

export interface LegalDocumentLink {
  path: LegalRoutePath;
  label: LocalizedText;
  shortLabel: LocalizedText;
  summary: LocalizedText;
}

export const LEGAL_DOCUMENT_LINKS: LegalDocumentLink[] = [
  {
    path: '/legal/terms',
    label: {
      th: 'ข้อกำหนดการใช้งาน',
      en: 'Terms of Service',
    },
    shortLabel: {
      th: 'ข้อกำหนด',
      en: 'Terms',
    },
    summary: {
      th: 'กติกาบัญชี สิทธิ์ใช้งาน ความรับผิด และการบังคับใช้',
      en: 'Account rules, license, liability, and enforcement.',
    },
  },
  {
    path: '/legal/privacy',
    label: {
      th: 'นโยบายความเป็นส่วนตัว',
      en: 'Privacy Policy',
    },
    shortLabel: {
      th: 'ความเป็นส่วนตัว',
      en: 'Privacy',
    },
    summary: {
      th: 'ข้อมูลที่เก็บ วัตถุประสงค์ และสิทธิ์ของคุณ',
      en: 'What data we collect, why, and your control options.',
    },
  },
  {
    path: '/legal/acceptable-use',
    label: {
      th: 'นโยบายการใช้งานที่ยอมรับได้',
      en: 'Acceptable Use Policy',
    },
    shortLabel: {
      th: 'การใช้งานที่ยอมรับได้',
      en: 'Acceptable Use',
    },
    summary: {
      th: 'ข้อกำหนดด้านเทคนิคและพฤติกรรมเพื่อความปลอดภัยของแพลตฟอร์ม',
      en: 'Technical and behavioral rules for safe platform access.',
    },
  },
  {
    path: '/legal/ai-policy',
    label: {
      th: 'นโยบายการใช้ AI',
      en: 'AI Use Policy',
    },
    shortLabel: {
      th: 'นโยบาย AI',
      en: 'AI Policy',
    },
    summary: {
      th: 'ความโปร่งใส ข้อจำกัด และกรณีใช้งาน AI ที่ห้าม',
      en: 'Transparency, limits, and prohibited AI use cases.',
    },
  },
  {
    path: '/legal/contact',
    label: {
      th: 'ติดต่อและรายงาน',
      en: 'Contact and Reports',
    },
    shortLabel: {
      th: 'ติดต่อ',
      en: 'Contact',
    },
    summary: {
      th: 'ช่องทางติดต่อฝ่ายสนับสนุน ความเป็นส่วนตัว การแจ้งละเมิด และความปลอดภัย',
      en: 'Support, privacy, abuse, and security reporting channels.',
    },
  },
];

export const localizeLegalDocumentLink = (language: LanguageCode, link: LegalDocumentLink) => {
  return {
    path: link.path,
    label: link.label[language],
    shortLabel: link.shortLabel[language],
    summary: link.summary[language],
  };
};
