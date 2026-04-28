import { localizeText, useLanguage } from '../../i18n/language';
import { DEVELOPER_PAGE_DATA } from '../data/developerDataV2';

export function FaqTab() {
  const { language } = useLanguage();
  const { faq } = DEVELOPER_PAGE_DATA;

  return (
    <section className="pg-developer-panel" style={{ 
      width: '100%', 
      boxSizing: 'border-box',
      maxWidth: '100%',
      overflowX: 'hidden'
    }}>
      <header className="pg-developer-panel-header">
        <h2 style={{
          wordBreak: 'break-word',
          overflowWrap: 'anywhere'
        }}>{localizeText(language, faq.title)}</h2>
        <p style={{
          wordBreak: 'break-word',
          overflowWrap: 'anywhere'
        }}>{localizeText(language, faq.description)}</p>
      </header>

      <div className="pg-developer-faq-list">
        {faq.items.map((item, index) => (
          <details key={item.question.en} className="pg-developer-faq-item" open={index === 0} style={{ width: '100%' }}>
            <summary style={{
              wordBreak: 'break-word',
              overflowWrap: 'anywhere',
              cursor: 'pointer'
            }}>{localizeText(language, item.question)}</summary>
            <p style={{
              wordBreak: 'break-word',
              overflowWrap: 'anywhere',
              marginTop: '0.75rem',
              opacity: 0.85
            }}>{localizeText(language, item.answer)}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
