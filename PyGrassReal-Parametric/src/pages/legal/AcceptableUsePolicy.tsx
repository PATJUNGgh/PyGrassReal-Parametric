import { localizeText, useLanguage } from '../../i18n/language';
import { LegalLayout } from './LegalLayout';
import { ACCEPTABLE_USE_EN, ACCEPTABLE_USE_TH } from '../data/legal/acceptableUseContent';

interface AcceptableUsePolicyProps {
  onNavigate: (path: string) => void;
}

const LAST_UPDATED = 'February 22, 2026';

export default function AcceptableUsePolicy({ onNavigate }: AcceptableUsePolicyProps) {
  const { language } = useLanguage();

  return (
    <LegalLayout
      onNavigate={onNavigate}
      currentPath="/legal/acceptable-use"
      title={localizeText(language, {
        th: 'นโยบายการใช้งานที่ยอมรับได้',
        en: 'Acceptable Use Policy',
      })}
      description={localizeText(language, {
        th: 'กติกาสำหรับการเข้าถึงแพลตฟอร์ม PyGrassReal-Ai อย่างปลอดภัย เป็นธรรม และถูกกฎหมาย',
        en: 'Rules for secure, fair, and lawful access to the PyGrassReal-Ai platform.',
      })}
      lastUpdated={LAST_UPDATED}
      sections={language === 'th' ? ACCEPTABLE_USE_TH : ACCEPTABLE_USE_EN}
    />
  );
}
