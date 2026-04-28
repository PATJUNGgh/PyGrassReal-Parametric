import type { CSSProperties } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { localizeText, useLanguage, type LanguageCode, type LocalizedText } from '../../i18n/language';
import { DEVELOPER_PAGE_DATA } from '../data/developerDataV2';

const panelStyle = {
  width: '100%',
  boxSizing: 'border-box',
  maxWidth: '100%',
  overflowX: 'hidden',
} as const;

const cardStyle = {
  width: '100%',
  boxSizing: 'border-box',
} as const;

const textWrapStyle = {
  wordBreak: 'break-word',
  overflowWrap: 'anywhere',
} as const;

const codeWrapStyle = {
  wordBreak: 'break-all',
  overflowWrap: 'anywhere',
} as const;

const sectionSpacingStyle = { marginTop: '2rem' } as const;
const syntaxBlockStyle: CSSProperties = {
  margin: '8px 0 0',
  border: '1px solid rgba(125, 147, 164, 0.28)',
  borderRadius: '10px',
  background: 'rgba(2, 6, 12, 0.86)',
  padding: '10px',
  overflowX: 'auto',
};

const syntaxCodeStyle: CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  lineHeight: 1.48,
  fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
};

function renderCodeExamples(
  language: LanguageCode,
  requestTitle: LocalizedText,
  requestExample: string,
  responseTitle: LocalizedText,
  responseExample: string,
  requestLanguage = 'bash',
  responseLanguage = 'json',
) {
  return (
    <div className="pg-developer-code-grid">
      <article className="pg-developer-code-card" style={cardStyle}>
        <h3 style={textWrapStyle}>{localizeText(language, requestTitle)}</h3>
        <SyntaxHighlighter
          language={requestLanguage}
          style={vscDarkPlus as Record<string, CSSProperties>}
          customStyle={syntaxBlockStyle}
          codeTagProps={{ style: { ...syntaxCodeStyle, ...codeWrapStyle } }}
        >
          {requestExample}
        </SyntaxHighlighter>
      </article>

      <article className="pg-developer-code-card" style={cardStyle}>
        <h3 style={textWrapStyle}>{localizeText(language, responseTitle)}</h3>
        <SyntaxHighlighter
          language={responseLanguage}
          style={vscDarkPlus as Record<string, CSSProperties>}
          customStyle={syntaxBlockStyle}
          codeTagProps={{ style: { ...syntaxCodeStyle, ...codeWrapStyle } }}
        >
          {responseExample}
        </SyntaxHighlighter>
      </article>
    </div>
  );
}

export function ApiReferenceTab() {
  const { language } = useLanguage();
  const { apiReference } = DEVELOPER_PAGE_DATA;
  const showAnthropicProfile = apiReference.showAnthropicProfile === true;

  return (
    <section className="pg-developer-panel" style={panelStyle}>
      <header className="pg-developer-panel-header">
        <h2 style={textWrapStyle}>{localizeText(language, apiReference.title)}</h2>
        <p style={textWrapStyle}>{localizeText(language, apiReference.description)}</p>
      </header>

      <section style={sectionSpacingStyle}>
        <header className="pg-developer-panel-header">
          <h3 style={textWrapStyle}>{localizeText(language, apiReference.openaiTitle)}</h3>
          <p style={textWrapStyle}>{localizeText(language, apiReference.openaiDescription)}</p>
        </header>

        <div className="pg-developer-meta-grid">
          <article className="pg-developer-meta-card" style={cardStyle}>
            <h3 style={textWrapStyle}>{localizeText(language, apiReference.endpointLabel)}</h3>
            <code style={codeWrapStyle}>{apiReference.endpointValue}</code>
            <p style={textWrapStyle}>{localizeText(language, apiReference.endpointDescription)}</p>
          </article>

          <article className="pg-developer-meta-card" style={cardStyle}>
            <h3 style={textWrapStyle}>{localizeText(language, apiReference.authLabel)}</h3>
            <p style={textWrapStyle}>{localizeText(language, apiReference.authDescription)}</p>
          </article>
        </div>

        {renderCodeExamples(
          language,
          apiReference.requestTitle,
          apiReference.requestExample,
          apiReference.responseTitle,
          apiReference.responseExample
        )}
      </section>

      {showAnthropicProfile ? (
        <section style={sectionSpacingStyle}>
          <header className="pg-developer-panel-header">
            <h3 style={textWrapStyle}>{localizeText(language, apiReference.anthropicTitle)}</h3>
            <p style={textWrapStyle}>{localizeText(language, apiReference.anthropicDescription)}</p>
          </header>

          <div className="pg-developer-meta-grid">
            <article className="pg-developer-meta-card" style={cardStyle}>
              <h3 style={textWrapStyle}>{localizeText(language, apiReference.anthropicEndpointLabel)}</h3>
              <code style={codeWrapStyle}>{apiReference.anthropicEndpointValue}</code>
              <p style={textWrapStyle}>{localizeText(language, apiReference.anthropicEndpointDescription)}</p>
            </article>
          </div>

          {renderCodeExamples(
            language,
            apiReference.anthropicRequestTitle,
            apiReference.anthropicRequestExample,
            apiReference.anthropicResponseTitle,
            apiReference.anthropicResponseExample
          )}
        </section>
      ) : null}
    </section>
  );
}
