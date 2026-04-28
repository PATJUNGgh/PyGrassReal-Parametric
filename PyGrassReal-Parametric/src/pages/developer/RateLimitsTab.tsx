import { Fragment } from 'react';
import { localizeText, useLanguage } from '../../i18n/language';
import { DEVELOPER_PAGE_DATA } from '../data/developerDataV2';

const clampTwoLinesStyle = {
  margin: 0,
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical' as const,
  overflow: 'hidden',
  lineHeight: 1.45,
} as const;

const clampOneLineStyle = {
  margin: 0,
  display: '-webkit-box',
  WebkitLineClamp: 1,
  WebkitBoxOrient: 'vertical' as const,
  overflow: 'hidden',
  lineHeight: 1.4,
  opacity: 0.88,
  fontSize: '0.82rem',
} as const;

const compactHeadCellStyle = {
  fontSize: '0.9rem',
  whiteSpace: 'nowrap' as const,
} as const;

const compactBodyCellStyle = {
  fontSize: '0.9rem',
  verticalAlign: 'top' as const,
} as const;

const compactErrorCodeStyle = {
  whiteSpace: 'nowrap' as const,
  fontSize: '0.88rem',
} as const;

const compactRetryLabelStyle = {
  fontSize: '0.79rem',
  opacity: 0.78,
  marginTop: '0.3rem',
  marginBottom: '0.12rem',
} as const;

const wrapTextStyle = {
  wordBreak: 'break-word' as const,
  overflowWrap: 'anywhere' as const,
};

const statusGroupHeaderCellStyle = {
  padding: '0.45rem 0.75rem',
  fontSize: '0.8rem',
  opacity: 0.9,
  background: 'rgba(59,130,246,0.08)',
  borderTop: '1px solid rgba(59,130,246,0.25)',
  borderBottom: '1px solid rgba(59,130,246,0.2)',
} as const;

export function RateLimitsTab() {
  const { language } = useLanguage();
  const { rateLimits } = DEVELOPER_PAGE_DATA;
  const groupedErrorRows = rateLimits.errorRows.reduce<Array<{
    statusCode: string;
    rows: Array<(typeof rateLimits.errorRows)[number]>;
  }>>((groups, row) => {
    const existingGroup = groups.find((group) => group.statusCode === row.statusCode);
    if (existingGroup) {
      existingGroup.rows.push(row);
      return groups;
    }

    groups.push({
      statusCode: row.statusCode,
      rows: [row],
    });
    return groups;
  }, []);

  return (
    <section
      className="pg-developer-panel"
      style={{
        width: '100%',
        boxSizing: 'border-box',
        maxWidth: '100%',
        overflowX: 'hidden',
      }}
    >
      <header className="pg-developer-panel-header">
        <h2 style={wrapTextStyle}>{localizeText(language, rateLimits.title)}</h2>
        <p style={wrapTextStyle}>{localizeText(language, rateLimits.description)}</p>
      </header>

      <div className="pg-developer-table-wrap">
        <table className="pg-developer-table">
          <thead>
            <tr>
              <th>{localizeText(language, rateLimits.columns.modelType)}</th>
              <th>{localizeText(language, rateLimits.columns.modelName)}</th>
              <th>{localizeText(language, rateLimits.columns.concurrency)}</th>
              <th>{localizeText(language, rateLimits.columns.note)}</th>
            </tr>
          </thead>
          <tbody>
            {rateLimits.rows.map((row) => (
              <tr key={row.modelName}>
                <td>{row.modelType}</td>
                <td>{row.modelName}</td>
                <td>{row.concurrencyLimit}</td>
                <td>{localizeText(language, row.note)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <article className="pg-developer-note-card" style={{ width: '100%', boxSizing: 'border-box' }}>
        <h3 style={wrapTextStyle}>{localizeText(language, rateLimits.streamBehaviorTitle)}</h3>
        <p style={{ ...wrapTextStyle, marginTop: '0.5rem' }}>{localizeText(language, rateLimits.streamBehaviorDescription)}</p>
        <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
          {rateLimits.streamBehaviorItems.map((item, idx) => (
            <li
              key={idx}
              style={{
                ...wrapTextStyle,
                marginBottom: '0.5rem',
              }}
            >
              {localizeText(language, item)}
            </li>
          ))}
        </ul>
      </article>

      <article className="pg-developer-note-card" style={{ width: '100%', boxSizing: 'border-box' }}>
        <h3 style={wrapTextStyle}>{localizeText(language, rateLimits.errorCodesTitle)}</h3>
        <p style={{ ...wrapTextStyle, marginTop: '0.5rem' }}>{localizeText(language, rateLimits.errorCodesDescription)}</p>
        <p
          style={{
            ...wrapTextStyle,
            marginTop: '0.45rem',
            fontSize: '0.88rem',
            opacity: 0.86,
          }}
        >
          {localizeText(language, {
            th: 'โหมดสรุป: จัดกลุ่มตาม HTTP และไม่แสดงรหัสซ้ำทุกแถว',
            en: 'Compact mode: grouped by HTTP status without repeating the same status on every row',
          })}
        </p>

        <div
          className="pg-developer-table-wrap"
          style={{
            marginTop: '0.7rem',
            maxWidth: '1240px',
            marginInline: 'auto',
          }}
        >
          <table className="pg-developer-table" style={{ width: '100%', tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th style={{ ...compactHeadCellStyle, width: '24%' }}>
                  {localizeText(language, { th: 'Error', en: 'Error' })}
                </th>
                <th style={{ ...compactHeadCellStyle, width: '36%' }}>
                  {localizeText(language, { th: 'สาเหตุ', en: 'Cause' })}
                </th>
                <th style={{ ...compactHeadCellStyle, width: '40%' }}>
                  {localizeText(language, { th: 'แนวทางแก้', en: 'Solution' })}
                </th>
              </tr>
            </thead>
            <tbody>
              {groupedErrorRows.map((group) => (
                <Fragment key={`status-group-${group.statusCode}`}>
                  <tr>
                    <td colSpan={3} style={statusGroupHeaderCellStyle}>
                      <strong>{group.statusCode}</strong>
                    </td>
                  </tr>
                  {group.rows.map((row) => (
                    <tr key={`${row.statusCode}-${row.errorCode}`}>
                      <td style={compactBodyCellStyle}>
                        <code style={compactErrorCodeStyle}>{row.errorCode}</code>
                      </td>
                      <td style={compactBodyCellStyle}>
                        <p title={localizeText(language, row.cause)} style={clampTwoLinesStyle}>
                          {localizeText(language, row.cause)}
                        </p>
                      </td>
                      <td style={compactBodyCellStyle}>
                        <p title={localizeText(language, row.handling)} style={clampTwoLinesStyle}>
                          {localizeText(language, row.handling)}
                        </p>
                        <p style={compactRetryLabelStyle}>{localizeText(language, { th: 'Retry', en: 'Retry' })}</p>
                        <p title={localizeText(language, row.retryPolicy)} style={clampOneLineStyle}>
                          {localizeText(language, row.retryPolicy)}
                        </p>
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="pg-developer-note-card" style={{ width: '100%', boxSizing: 'border-box' }}>
        <h3 style={wrapTextStyle}>{localizeText(language, rateLimits.behaviorTitle)}</h3>
        <ul style={{ paddingLeft: '1.5rem' }}>
          {rateLimits.behaviorItems.map((item, idx) => (
            <li
              key={idx}
              style={{
                ...wrapTextStyle,
                marginBottom: '0.5rem',
              }}
            >
              {localizeText(language, item)}
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}
