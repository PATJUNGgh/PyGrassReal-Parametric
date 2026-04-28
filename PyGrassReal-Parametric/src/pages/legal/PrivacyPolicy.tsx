import { localizeText, useLanguage } from '../../i18n/language';
import { LegalLayout } from './LegalLayout';
import { PRIVACY_EN, PRIVACY_TH } from '../data/legal/privacyContent';

interface PrivacyPolicyProps {
  onNavigate: (path: string) => void;
}

const LAST_UPDATED = 'February 22, 2026';

export default function PrivacyPolicy({ onNavigate }: PrivacyPolicyProps) {
  const { language } = useLanguage();

  return (
    <LegalLayout
      onNavigate={onNavigate}
      currentPath="/legal/privacy"
      title={localizeText(language, {
        th: 'นโยบายความเป็นส่วนตัว',
        en: 'Privacy Policy',
      })}
      description={localizeText(language, {
        th: 'แนวทางที่ PyGrassReal-Ai ใช้ในการเก็บ ใช้งาน และปกป้องข้อมูลบัญชีและข้อมูลการใช้งาน',
        en: 'How PyGrassReal-Ai collects, processes, and protects account and usage data.',
      })}
      lastUpdated={LAST_UPDATED}
      sections={language === 'th' ? PRIVACY_TH : PRIVACY_EN}
    />
  );
}
