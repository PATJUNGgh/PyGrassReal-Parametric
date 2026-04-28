import { localizeText, useLanguage } from '../../i18n/language';
import { LegalLayout } from './LegalLayout';
import { TERMS_EN, TERMS_TH } from '../data/legal/termsContent';

interface TermsOfServiceProps {
  onNavigate: (path: string) => void;
}

const LAST_UPDATED = 'February 22, 2026';

export default function TermsOfService({ onNavigate }: TermsOfServiceProps) {
  const { language } = useLanguage();

  return (
    <LegalLayout
      onNavigate={onNavigate}
      currentPath="/legal/terms"
      title={localizeText(language, {
        th: 'ข้อกำหนดการใช้บริการ',
        en: 'Terms of Service',
      })}
      description={localizeText(language, {
        th: 'ข้อตกลงหลักสำหรับการเข้าถึงและใช้งานบริการ PyGrassReal-Ai รวมถึงฟีเจอร์ AI',
        en: 'Core agreement for accessing and using PyGrassReal-Ai services and AI features.',
      })}
      lastUpdated={LAST_UPDATED}
      sections={language === 'th' ? TERMS_TH : TERMS_EN}
    />
  );
}
