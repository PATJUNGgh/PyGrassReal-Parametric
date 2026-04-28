import { localizeText, useLanguage } from '../../i18n/language';
import { DEVELOPER_PAGE_DATA } from '../data/developerDataV2';

export function PricingTab() {
  const { language } = useLanguage();
  const { pricing } = DEVELOPER_PAGE_DATA;

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
        }}>{localizeText(language, pricing.title)}</h2>
        <p style={{
          wordBreak: 'break-word',
          overflowWrap: 'anywhere'
        }}>{localizeText(language, pricing.description)}</p>
      </header>

      <div className="pg-developer-table-wrap">
        <table className="pg-developer-table">
          <thead>
            <tr>
              <th>{localizeText(language, pricing.tableColumns.model)}</th>
              <th>{localizeText(language, pricing.tableColumns.input)}</th>
              <th>{localizeText(language, pricing.tableColumns.cachedInput)}</th>
              <th>{localizeText(language, pricing.tableColumns.output)}</th>
            </tr>
          </thead>
          <tbody>
            {pricing.rows.map((row) => (
              <tr key={row.model}>
                <td>{row.model}</td>
                <td>{row.inputPrice}</td>
                <td>{row.cachedInputPrice}</td>
                <td>{row.outputPrice}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <article className="pg-developer-note-card" style={{ width: '100%', boxSizing: 'border-box' }}>
        <h3 style={{
          wordBreak: 'break-word',
          overflowWrap: 'anywhere'
        }}>{localizeText(language, pricing.cacheTitle)}</h3>
        <p style={{
          wordBreak: 'break-word',
          overflowWrap: 'anywhere'
        }}>{localizeText(language, pricing.cacheDescription)}</p>
        <ul style={{ paddingLeft: '1.5rem' }}>
          {pricing.cacheItems.map((item, idx) => (
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
