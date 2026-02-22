import logoIcon from '../assets/logo-icon.png';
import './pages.css';

interface AboutPageProps {
  onNavigate: (path: string) => void;
}

const ROADMAP_ITEMS = [
  {
    quarter: 'Q1',
    title: 'Core Node Canvas',
    description: 'Refine graph interactions, snapping, and component stability for daily production use.',
  },
  {
    quarter: 'Q2',
    title: 'AI Sculpt + Paint',
    description: 'Introduce guided prompts and brush pipelines for rapid concept exploration.',
  },
  {
    quarter: 'Q3',
    title: 'Team Workflows',
    description: 'Add shared presets, versioned workflows, and cloud-ready project handoff.',
  },
];

export default function AboutPage({ onNavigate }: AboutPageProps) {
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
        <nav className="pg-topnav" aria-label="About navigation">
          <button type="button" onClick={() => onNavigate('/docs')}>
            Docs
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
          <span className="pg-chip">Vision</span>
          <h1>Parametric creation with AI as a design copilot.</h1>
          <p>
            PyGrassReal-Ai combines node-based modeling with AI-assisted generation to help designers move from idea
            to editable 3D outputs faster.
          </p>
        </section>

        <section className="pg-section pg-fade-up pg-delay-1">
          <div className="pg-section-heading">
            <h2>Roadmap</h2>
            <p>High-level milestones for the next iterations.</p>
          </div>
          <div className="pg-roadmap-grid">
            {ROADMAP_ITEMS.map((item) => (
              <article key={item.title} className="pg-roadmap-card">
                <span className="pg-roadmap-quarter">{item.quarter}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
