import { localizeText, useLanguage } from '../../i18n/language';
import { API_MANAGEMENT_UI } from '../data/dashboardData';

interface RateLimitRow {
  id: string;
  model: string;
  inputPrice: string;
  outputPrice: string;
  contextWindow: string;
}

const CURRENT_RATE_LIMITS: RateLimitRow[] = [
  {
    id: 'hanuman-v1-pricing',
    model: 'pygrassreal/hanuman-v1',
    inputPrice: '$0.45/M input tokens',
    outputPrice: '$1.70/M output tokens',
    contextWindow: '1,000,000 context',
  },
];

export function RateLimitsTab() {
  const { language } = useLanguage();

  return (
    <section className="api-tab-block">
      <div className="api-tab-head">
        <div>
          <h2>{localizeText(language, API_MANAGEMENT_UI.rateLimits.title)}</h2>
        </div>
      </div>

      <div className="api-info-banner">
        {localizeText(language, API_MANAGEMENT_UI.rateLimits.infoBanner)}
      </div>

      <div className="api-table-wrap">
        <table className="api-data-table">
          <thead>
            <tr>
              <th>{localizeText(language, API_MANAGEMENT_UI.rateLimits.table.model)}</th>
              <th>{localizeText(language, API_MANAGEMENT_UI.rateLimits.table.input)}</th>
              <th>{localizeText(language, API_MANAGEMENT_UI.rateLimits.table.output)}</th>
              <th>{localizeText(language, API_MANAGEMENT_UI.rateLimits.table.context)}</th>
            </tr>
          </thead>
          <tbody>
            {CURRENT_RATE_LIMITS.map((item) => (
              <tr key={item.id}>
                <td>{item.model}</td>
                <td>{item.inputPrice}</td>
                <td>{item.outputPrice}</td>
                <td>{item.contextWindow}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <article className="api-note-card">
        <h3>{localizeText(language, API_MANAGEMENT_UI.rateLimits.explanationTitle)}</h3>
        <p>{localizeText(language, API_MANAGEMENT_UI.rateLimits.explanationBody)}</p>
        <ul style={{ marginTop: '0.65rem', paddingLeft: '1.15rem' }}>
          {API_MANAGEMENT_UI.rateLimits.explanationItems.map((item) => (
            <li key={item.en} style={{ marginBottom: '0.35rem' }}>
              {localizeText(language, item)}
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}
