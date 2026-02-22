import logoIcon from '../assets/logo-icon.png';
import { useMemo, useState } from 'react';
import './pages.css';

interface DocsPageProps {
  onNavigate: (path: string) => void;
}

interface NodeDocCategory {
  id: string;
  title: string;
  description: string;
  items: string[];
}

const NODE_CATEGORIES: NodeDocCategory[] = [
  {
    id: 'primitive',
    title: 'Primitive Nodes',
    description: 'Base geometry creation for quick blockout and initial forms.',
    items: ['Box', 'Sphere', 'Cylinder', 'Plane'],
  },
  {
    id: 'transform',
    title: 'Transform Nodes',
    description: 'Position, rotate, and scale geometry with explicit numeric control.',
    items: ['Move', 'Rotate', 'Scale', 'Pivot Align'],
  },
  {
    id: 'mesh',
    title: 'Mesh Operations',
    description: 'Boolean and topology edits for modeling pipelines.',
    items: ['Boolean Union', 'Boolean Difference', 'Subdivision', 'Smooth'],
  },
  {
    id: 'ai',
    title: 'AI Nodes',
    description: 'Prompt-based operations for sculpting, variations, and paint assist.',
    items: ['Prompt Sculpt', 'Style Transfer', 'AI Paint Mask', 'Material Suggestion'],
  },
];

const includesIgnoreCase = (value: string, query: string): boolean => {
  return value.toLowerCase().includes(query.toLowerCase());
};

export default function DocsPage({ onNavigate }: DocsPageProps) {
  const [query, setQuery] = useState('');

  const filteredCategories = useMemo(() => {
    const normalized = query.trim();
    if (!normalized) {
      return NODE_CATEGORIES;
    }

    return NODE_CATEGORIES.map((category) => {
      const items = category.items.filter((item) => includesIgnoreCase(item, normalized));
      const categoryMatched = includesIgnoreCase(category.title, normalized) || includesIgnoreCase(category.description, normalized);
      if (categoryMatched) {
        return category;
      }

      return { ...category, items };
    }).filter((category) => category.items.length > 0 || includesIgnoreCase(category.title, normalized));
  }, [query]);

  return (
    <div className="pg-page pg-subpage">
      <div className="pg-background-glow" aria-hidden="true" />
      <div className="pg-background-grid" aria-hidden="true" />
      <div className="pg-background-dots" aria-hidden="true" />

      <header className="pg-topbar">
        <button type="button" className="pg-brand" onClick={() => onNavigate('/')}>
          <img src={logoIcon} alt="PyGrassReal-Ai Logo" className="pg-brand-logo" />
          <span>PyGrassReal-Ai</span>
        </button>
        <nav className="pg-topnav" aria-label="Docs navigation">
          <button type="button" onClick={() => onNavigate('/about')}>
            About
          </button>
          <button type="button" onClick={() => onNavigate('/dashboard')}>
            Dashboard
          </button>
          <button type="button" className="pg-topnav-cta" onClick={() => onNavigate('/editor')}>
            Open Editor
          </button>
        </nav>
      </header>

      <main className="pg-main pg-main-tight">
        <section className="pg-sub-hero pg-fade-up">
          <span className="pg-chip">Documentation</span>
          <h1>Node categories and quick lookup</h1>
          <p>Search by node name or browse grouped categories to plan your graph structure.</p>
        </section>

        <section className="pg-section pg-fade-up pg-delay-1">
          <div className="pg-search-wrap">
            <label htmlFor="docs-search">Search Nodes</label>
            <input
              id="docs-search"
              type="search"
              placeholder="Try: boolean, prompt, scale"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <div className="pg-docs-accordion">
            {filteredCategories.length === 0 ? (
              <article className="pg-docs-empty">
                <h3>No categories found</h3>
                <p>Adjust your query to discover matching node groups.</p>
              </article>
            ) : (
              filteredCategories.map((category) => (
                <details key={category.id} className="pg-docs-item" open={query.trim().length > 0}>
                  <summary>
                    <span>{category.title}</span>
                    <small>{category.description}</small>
                  </summary>
                  <ul>
                    {category.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </details>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
