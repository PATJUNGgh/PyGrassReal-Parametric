import { localizeText, useLanguage } from '../../i18n/language';
import { LegalLayout } from './LegalLayout';
import { CONTACT_EN, CONTACT_TH } from '../data/legal/contactContent';

interface ContactProps {
  onNavigate: (path: string) => void;
}

const LAST_UPDATED = 'February 22, 2026';

export default function Contact({ onNavigate }: ContactProps) {
  const { language } = useLanguage();

  return (
    <LegalLayout
      onNavigate={onNavigate}
      currentPath="/legal/contact"
      title={localizeText(language, {
        th: 'ติดต่อและรายงานปัญหา',
        en: 'Contact and Reporting',
      })}
      description={localizeText(language, {
        th: 'ช่องทางอย่างเป็นทางการสำหรับฝ่ายสนับสนุน คำขอความเป็นส่วนตัว การรายงานการละเมิด หนังสือแจ้งทางกฎหมาย และการแจ้งช่องโหว่ความปลอดภัย',
        en: 'Official channels for support, privacy, abuse, legal notices, and security disclosures.',
      })}
      lastUpdated={LAST_UPDATED}
      sections={language === 'th' ? CONTACT_TH : CONTACT_EN}
    />
  );
}
