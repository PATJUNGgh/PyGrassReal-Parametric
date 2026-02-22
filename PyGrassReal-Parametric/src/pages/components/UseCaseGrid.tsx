import { Building2, Lightbulb, Package } from 'lucide-react';

const USE_CASES = [
  {
    title: 'Architecture',
    description: 'Prototype form studies, facade logic, and parametric massing concepts quickly.',
    icon: Building2,
  },
  {
    title: 'Product Design',
    description: 'Iterate shape variants and material options before detailed CAD refinement.',
    icon: Package,
  },
  {
    title: 'Concept Modeling',
    description: 'Blend manual node control with AI prompts for fast, creative exploration.',
    icon: Lightbulb,
  },
];

export function UseCaseGrid() {
  return (
    <section className="pg-section pg-fade-up pg-delay-2">
      <div className="pg-section-heading">
        <h2>Use Cases</h2>
        <p>Built for teams and creators working across design disciplines.</p>
      </div>
      <div className="pg-usecase-grid">
        {USE_CASES.map((useCase) => (
          <article key={useCase.title} className="pg-usecase-card">
            <useCase.icon size={20} aria-hidden="true" />
            <h3>{useCase.title}</h3>
            <p>{useCase.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
