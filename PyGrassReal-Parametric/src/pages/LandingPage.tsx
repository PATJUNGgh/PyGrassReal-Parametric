import logoIcon from '../assets/logo-icon.png';
import { AiProfilesSection } from './components/AiProfilesSection';
import { FeatureGrid } from './components/FeatureGrid';
import { Footer } from './components/Footer';
import { HeroSection } from './components/HeroSection';
import { UseCaseGrid } from './components/UseCaseGrid';
import './pages.css';

interface LandingPageProps {
  onNavigate: (path: string) => void;
}

export default function LandingPage({ onNavigate }: LandingPageProps) {
  return (
    <div className="pg-page">
      <div className="pg-background-glow" aria-hidden="true" />
      <div className="pg-background-grid" aria-hidden="true" />
      <div className="pg-background-dots" aria-hidden="true" />

      <header className="pg-topbar">
        <button type="button" className="pg-brand" onClick={() => onNavigate('/')}>
          <img src={logoIcon} alt="PyGrassReal-Ai Logo" className="pg-brand-logo" />
          <span>PyGrassReal-Ai</span>
        </button>
        <nav className="pg-topnav" aria-label="Landing navigation">
          <button type="button" onClick={() => onNavigate('/about')}>
            About
          </button>
          <button type="button" onClick={() => onNavigate('/docs')}>
            Docs
          </button>
          <button type="button" className="pg-topnav-plan" onClick={() => onNavigate('/pricing')}>
            Upgrade plan
          </button>
          <button type="button" className="pg-topnav-cta" onClick={() => onNavigate('/auth/login')}>
            Sign in
          </button>
        </nav>
      </header>

      <main className="pg-main">
        <HeroSection onOpenDashboard={() => onNavigate('/dashboard')} onOpenEditor={() => onNavigate('/editor')} />
        <AiProfilesSection onNavigate={onNavigate} />
        <FeatureGrid />
        <UseCaseGrid />
      </main>

      <Footer onNavigate={onNavigate} />
    </div>
  );
}
