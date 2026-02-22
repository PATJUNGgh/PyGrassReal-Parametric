import logoIcon from '../../assets/logo-icon.png';
import { ArrowRight, LayoutDashboard, Waypoints } from 'lucide-react';

interface HeroSectionProps {
  onOpenDashboard: () => void;
  onOpenEditor: () => void;
}

export function HeroSection({ onOpenDashboard, onOpenEditor }: HeroSectionProps) {
  return (
    <section className="pg-hero">
      <div className="pg-hero-copy pg-fade-up">
        <img src={logoIcon} alt="PyGrassReal-Ai Logo" className="pg-hero-logo-icon" />
        <h1 className="pg-hero-title">PyGrassReal</h1>
        <p>AI-powered Node Editor for 3D Modeling &amp; Computational Design.</p>
        <div className="pg-hero-actions">
          <button type="button" className="pg-button is-primary" onClick={onOpenDashboard}>
            <LayoutDashboard size={16} />
            <span>Open Dashboard</span>
          </button>
          <button type="button" className="pg-button is-secondary" onClick={onOpenEditor}>
            <Waypoints size={16} />
            <span>Try 3D Editor</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </section>
  );
}
