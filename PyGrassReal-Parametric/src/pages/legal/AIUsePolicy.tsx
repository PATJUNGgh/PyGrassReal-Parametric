import { localizeText, useLanguage } from '../../i18n/language';
import { LegalLayout } from './LegalLayout';
import { AI_POLICY_EN, AI_POLICY_TH } from '../data/legal/aiPolicyContent';

interface AIUsePolicyProps {
  onNavigate: (path: string) => void;
}

const LAST_UPDATED = 'February 22, 2026';

export default function AIUsePolicy({ onNavigate }: AIUsePolicyProps) {
  const { language } = useLanguage();

  return (
    <LegalLayout
      onNavigate={onNavigate}
      currentPath="/legal/ai-policy"
      title={localizeText(language, {
        th: 'นโยบายการใช้ AI',
        en: 'AI Use Policy',
      })}
      description={localizeText(language, {
        th: 'ข้อกำหนดด้านความโปร่งใส ขอบเขตการใช้งาน และกรณีต้องห้ามของ AI บนแพลตฟอร์ม',
        en: 'Transparency commitments, operational limits, and restricted AI use on the platform.',
      })}
      lastUpdated={LAST_UPDATED}
      sections={language === 'th' ? AI_POLICY_TH : AI_POLICY_EN}
    />
  );
}
