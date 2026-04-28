import { localizeText, useLanguage } from '../../i18n/language';
import { DEVELOPER_PAGE_DATA } from '../data/developerDataV2';

interface TermsPolicyTabProps {
  onNavigate: (path: string) => void;
}

export function TermsPolicyTab({ onNavigate }: TermsPolicyTabProps) {
  const { language } = useLanguage();
  const { termsPolicy } = DEVELOPER_PAGE_DATA;

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
        }}>{localizeText(language, termsPolicy.title)}</h2>
        <p style={{
          wordBreak: 'break-word',
          overflowWrap: 'anywhere'
        }}>{localizeText(language, termsPolicy.description)}</p>
      </header>

      <article className="pg-developer-note-card" style={{ width: '100%', boxSizing: 'border-box' }}>
        <h3 style={{
          wordBreak: 'break-word',
          overflowWrap: 'anywhere'
        }}>{localizeText(language, termsPolicy.summaryTitle)}</h3>
        <ul style={{ paddingLeft: '1.5rem' }}>
          {termsPolicy.summaryItems.map((item, idx) => (
            <li key={idx} style={{
              wordBreak: 'break-word',
              overflowWrap: 'anywhere',
              marginBottom: '0.4rem'
            }}>{localizeText(language, item)}</li>
          ))}
        </ul>
      </article>

      <article className="pg-developer-links-card" style={{ width: '100%', boxSizing: 'border-box' }}>
        <h3 style={{
          wordBreak: 'break-word',
          overflowWrap: 'anywhere'
        }}>{localizeText(language, termsPolicy.linksTitle)}</h3>
        <div className="pg-developer-link-list">
          {termsPolicy.links.map((link) => (
            <button
              key={link.id}
              type="button"
              className="pg-developer-link-button"
              style={{
                width: '100%',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column'
              }}
              onClick={() => onNavigate(link.path)}
            >
              <span style={{
                wordBreak: 'break-word',
                overflowWrap: 'anywhere'
              }}>{localizeText(language, link.label)}</span>
              <small style={{
                wordBreak: 'break-word',
                overflowWrap: 'anywhere',
                opacity: 0.7
              }}>{localizeText(language, link.description)}</small>
            </button>
          ))}
        </div>
      </article>
    </section>
  );
}
