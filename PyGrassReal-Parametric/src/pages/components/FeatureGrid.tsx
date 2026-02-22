import { Bot, LayoutDashboard, Network, Paintbrush, Shapes, SwatchBook } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface FeatureItem {
  title: string;
  description: string;
  icon: LucideIcon;
}

const FEATURES: FeatureItem[] = [
  {
    title: 'Node Workflow',
    description: 'Construct 3D logic with connected, reusable node graphs.',
    icon: Network,
  },
  {
    title: 'Mesh Boolean',
    description: 'Run union and difference operations directly in your visual flow.',
    icon: Shapes,
  },
  {
    title: 'AI Sculpt',
    description: 'Generate volumetric shape variations from short text prompts.',
    icon: Bot,
  },
  {
    title: 'AI Paint',
    description: 'Apply style-aware texture passes with guided material masks.',
    icon: Paintbrush,
  },
  {
    title: 'Material & Text',
    description: 'Manage surface presets and editable text overlays from one place.',
    icon: SwatchBook,
  },
  {
    title: 'Workflow Dashboard',
    description: 'Track iterations, sort assets, and jump back into active projects.',
    icon: LayoutDashboard,
  },
];

export function FeatureGrid() {
  return (
    <section className="pg-section pg-fade-up pg-delay-1">
      <div className="pg-section-heading">
        <h2>Features</h2>
        <p>Focused tools for concept modeling and production-ready graph workflows.</p>
      </div>
      <div className="pg-feature-grid">
        {FEATURES.map((feature) => (
          <article key={feature.title} className="pg-feature-card">
            <span className="pg-feature-icon" aria-hidden="true">
              <feature.icon size={18} />
            </span>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
