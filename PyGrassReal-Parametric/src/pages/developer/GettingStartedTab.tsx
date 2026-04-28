import { localizeText, useLanguage } from '../../i18n/language';
import { DEVELOPER_PAGE_DATA } from '../data/developerDataV2';

export function GettingStartedTab() {
  const { language } = useLanguage();
  const { gettingStarted } = DEVELOPER_PAGE_DATA;

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
        }}>{localizeText(language, gettingStarted.title)}</h2>
        <p style={{
          wordBreak: 'break-word',
          overflowWrap: 'anywhere'
        }}>{localizeText(language, gettingStarted.description)}</p>
      </header>

      <ol className="pg-developer-step-list">
        {gettingStarted.steps.map((step) => (
          <li key={step.title.en} className="pg-developer-step-item">
            <h3 style={{
              wordBreak: 'break-word',
              overflowWrap: 'anywhere'
            }}>{localizeText(language, step.title)}</h3>
            <p style={{
              wordBreak: 'break-word',
              overflowWrap: 'anywhere'
            }}>{localizeText(language, step.description)}</p>
          </li>
        ))}
      </ol>

      <article className="pg-developer-note-card" style={{ 
        width: '100%', 
        boxSizing: 'border-box' 
      }}>
        <h3 style={{
          wordBreak: 'break-word',
          overflowWrap: 'anywhere'
        }}>{localizeText(language, gettingStarted.modelGuideTitle)}</h3>
        <ul style={{ paddingLeft: '1.5rem' }}>
          {gettingStarted.modelGuideItems.map((item, idx) => (
            <li key={idx} style={{
              wordBreak: 'break-word',
              overflowWrap: 'anywhere',
              marginBottom: '0.5rem'
            }}>{localizeText(language, item)}</li>
          ))}
        </ul>
      </article>
    </section>
  );
}
