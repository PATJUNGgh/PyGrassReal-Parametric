import type { CSSProperties } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { localizeText, useLanguage } from '../../i18n/language';
import { DEVELOPER_PLATFORM_EXAMPLES } from '../data/developerPlatformExamples';

const codeBlockStyle: CSSProperties = {
  margin: '0.5rem 0 0',
  border: '1px solid rgba(125, 147, 164, 0.28)',
  borderRadius: '10px',
  background: 'rgba(2, 6, 12, 0.86)',
  padding: '10px',
  overflowX: 'auto',
};

const codeTextStyle: CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  lineHeight: 1.48,
  fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
};

const getRecipeLanguage = (recipeId: string): string => {
  if (recipeId.includes('curl')) return 'bash';
  if (recipeId.includes('javascript')) return 'javascript';
  if (recipeId.includes('python')) return 'python';
  if (recipeId.includes('generic')) return 'json';
  return 'bash';
};

export function PlatformRecipesTab() {
  const { language } = useLanguage();

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
        }}>{localizeText(language, DEVELOPER_PLATFORM_EXAMPLES.title)}</h2>
        <p style={{
          wordBreak: 'break-word',
          overflowWrap: 'anywhere'
        }}>{localizeText(language, DEVELOPER_PLATFORM_EXAMPLES.description)}</p>
      </header>

      <article className="pg-developer-note-card" style={{ width: '100%', boxSizing: 'border-box' }}>
        <h3 style={{
          wordBreak: 'break-word',
          overflowWrap: 'anywhere'
        }}>{localizeText(language, DEVELOPER_PLATFORM_EXAMPLES.introTitle)}</h3>
        <div className="pg-developer-shared-grid">
          {DEVELOPER_PLATFORM_EXAMPLES.introItems.map((item) => (
            <div key={item.value} className="pg-developer-shared-item" style={{ width: '100%', boxSizing: 'border-box' }}>
              <span className="pg-developer-shared-label" style={{
                wordBreak: 'break-word',
                overflowWrap: 'anywhere'
              }}>{localizeText(language, item.label)}</span>
              <code style={{
                wordBreak: 'break-all',
                overflowWrap: 'anywhere'
              }}>{item.value}</code>
              <p style={{
                wordBreak: 'break-word',
                overflowWrap: 'anywhere'
              }}>{localizeText(language, item.description)}</p>
            </div>
          ))}
        </div>
      </article>

      <div className="pg-developer-platform-header">
        <h3 style={{
          wordBreak: 'break-word',
          overflowWrap: 'anywhere'
        }}>{localizeText(language, DEVELOPER_PLATFORM_EXAMPLES.recipesTitle)}</h3>
      </div>

      <div className="pg-developer-platform-grid">
        {DEVELOPER_PLATFORM_EXAMPLES.recipes.map((recipe) => (
          <article key={recipe.id} className="pg-developer-platform-card" style={{ width: '100%', boxSizing: 'border-box' }}>
            <header className="pg-developer-platform-card-header">
              <span className="pg-developer-platform-badge">{recipe.badge}</span>
              <h3 style={{
                wordBreak: 'break-word',
                overflowWrap: 'anywhere'
              }}>{recipe.name}</h3>
              <p style={{
                wordBreak: 'break-word',
                overflowWrap: 'anywhere',
                opacity: 0.8
              }}>{localizeText(language, recipe.audience)}</p>
              <p style={{
                wordBreak: 'break-word',
                overflowWrap: 'anywhere'
              }}>{localizeText(language, recipe.summary)}</p>
            </header>

            <section className="pg-developer-platform-section">
              <h4 style={{
                wordBreak: 'break-word',
                overflowWrap: 'anywhere'
              }}>{localizeText(language, recipe.setupTitle)}</h4>
              <ul style={{ paddingLeft: '1.5rem' }}>
                {recipe.setupItems.map((item, idx) => (
                  <li key={idx} style={{
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                    marginBottom: '0.25rem'
                  }}>{localizeText(language, item)}</li>
                ))}
              </ul>
            </section>

            <section className="pg-developer-platform-section">
              <h4 style={{
                wordBreak: 'break-word',
                overflowWrap: 'anywhere'
              }}>{localizeText(language, recipe.requestTitle)}</h4>
              <SyntaxHighlighter
                language={getRecipeLanguage(recipe.id)}
                style={vscDarkPlus as Record<string, CSSProperties>}
                customStyle={codeBlockStyle}
                codeTagProps={{
                  style: {
                    ...codeTextStyle,
                    wordBreak: 'break-all',
                    overflowWrap: 'anywhere',
                  },
                }}
              >
                {recipe.requestExample}
              </SyntaxHighlighter>
            </section>

            <section className="pg-developer-platform-section">
              <h4 style={{
                wordBreak: 'break-word',
                overflowWrap: 'anywhere'
              }}>{localizeText(language, recipe.notesTitle)}</h4>
              <ul style={{ paddingLeft: '1.5rem' }}>
                {recipe.noteItems.map((item, idx) => (
                  <li key={idx} style={{
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                    marginBottom: '0.25rem'
                  }}>{localizeText(language, item)}</li>
                ))}
              </ul>
            </section>
          </article>
        ))}
      </div>
    </section>
  );
}
