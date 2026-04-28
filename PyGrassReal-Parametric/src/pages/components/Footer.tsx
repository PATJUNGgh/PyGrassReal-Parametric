import { Mail } from 'lucide-react';
import { useState } from 'react';
import { localizeText, useLanguage } from '../../i18n/language';
import { FOOTER_EMAILS, FOOTER_LEGAL_LINKS } from '../data/footerContent';
import { usePageNavigation } from '../navigation/PageNavigationContext';
import { isTelemetryEnabled, setTelemetryEnabled, TELEMETRY_EVENT, telemetry } from '../telemetry/telemetry';

export function Footer() {
  const { language } = useLanguage();
  const { navigate } = usePageNavigation();
  const [telemetryEnabled, setTelemetryEnabledState] = useState<boolean>(() => isTelemetryEnabled());

  const toggleTelemetry = () => {
    if (telemetryEnabled) {
      telemetry.info(
        TELEMETRY_EVENT.TELEMETRY_OPT_OUT,
        {
          path: window.location.pathname,
          language,
        },
        { skipSampling: true }
      );
      setTelemetryEnabled(false);
      setTelemetryEnabledState(false);
      return;
    }

    setTelemetryEnabled(true);
    setTelemetryEnabledState(true);
    telemetry.info(
      TELEMETRY_EVENT.TELEMETRY_OPT_IN,
      {
        path: window.location.pathname,
        language,
      },
      { skipSampling: true }
    );
  };

  return (
    <footer className="pg-footer">
      <div className="pg-footer-top">
        <div className="pg-footer-brand">
          <strong>PyGrassReal-Ai</strong>
          <p>
            {localizeText(language, {
              th: 'แพลตฟอร์มออกแบบ 3D แบบโหนด พร้อม AI สำหรับมืออาชีพ',
              en: 'Node-based 3D design platform with AI for professionals.',
            })}
          </p>
        </div>

        <div className="pg-footer-col">
          <h4>
            {localizeText(language, {
              th: 'ผลิตภัณฑ์',
              en: 'Product',
            })}
          </h4>
          <button type="button" onClick={() => navigate('/docs', { source: 'footer.product.docs' })}>
            {localizeText(language, { th: 'เอกสาร', en: 'Documentation' })}
          </button>
          <button type="button" onClick={() => navigate('/pricing', { source: 'footer.product.pricing' })}>
            {localizeText(language, { th: 'ราคา', en: 'Pricing' })}
          </button>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer">
            {localizeText(language, { th: 'ชุมชน', en: 'Community' })}
          </a>
        </div>

        <div className="pg-footer-col">
          <h4>
            {localizeText(language, {
              th: 'กฎหมาย',
              en: 'Legal',
            })}
          </h4>
          {FOOTER_LEGAL_LINKS.map((link) => (
            <button
              key={link.path}
              type="button"
              onClick={() => navigate(link.path, { source: 'footer.legal.link' })}
            >
              {localizeText(language, link.label)}
            </button>
          ))}
        </div>

        <div className="pg-footer-col">
          <h4>
            {localizeText(language, {
              th: 'ติดต่อ',
              en: 'Contact',
            })}
          </h4>
          <a href={`mailto:${FOOTER_EMAILS.support}`}>
            <Mail size={14} aria-hidden="true" />
            {localizeText(language, { th: 'ฝ่ายสนับสนุน', en: 'Support' })}
          </a>
          <a href={`mailto:${FOOTER_EMAILS.contact}`}>
            <Mail size={14} aria-hidden="true" />
            {localizeText(language, { th: 'ติดต่อทั่วไป', en: 'General Contact' })}
          </a>
        </div>
      </div>

      <div className="pg-footer-bottom">
        <small>
          {localizeText(language, {
            th: `© ${new Date().getFullYear()} PyGrassReal-Ai สงวนลิขสิทธิ์`,
            en: `© ${new Date().getFullYear()} PyGrassReal-Ai. All rights reserved.`,
          })}
        </small>
        <div className="pg-footer-bottom-links">
          <button type="button" onClick={() => navigate('/legal/privacy', { source: 'footer.bottom.privacy' })}>
            {localizeText(language, { th: 'ความเป็นส่วนตัว', en: 'Privacy' })}
          </button>
          <button type="button" onClick={() => navigate('/legal/terms', { source: 'footer.bottom.terms' })}>
            {localizeText(language, { th: 'ข้อกำหนด', en: 'Terms' })}
          </button>
          <button type="button" onClick={toggleTelemetry}>
            {telemetryEnabled
              ? localizeText(language, { th: 'ปิด Telemetry', en: 'Disable telemetry' })
              : localizeText(language, { th: 'เปิด Telemetry', en: 'Enable telemetry' })}
          </button>
        </div>
      </div>
    </footer>
  );
}
