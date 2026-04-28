import { render, screen } from '@testing-library/react';
import { DocsCategoryItem } from './DocsCategoryItem';

describe('DocsCategoryItem', () => {
  it('renders title, description, and items', () => {
    const { container } = render(
      <DocsCategoryItem
        title="AI Nodes"
        description="Prompt-based operations"
        items={['Prompt Sculpt', 'AI Paint']}
        isOpen={false}
      />
    );

    expect(screen.getByText('AI Nodes')).toBeInTheDocument();
    expect(screen.getByText('Prompt-based operations')).toBeInTheDocument();
    expect(screen.getByText('Prompt Sculpt')).toBeInTheDocument();
    expect(screen.getByText('AI Paint')).toBeInTheDocument();
    expect(container.querySelector('details')).not.toHaveAttribute('open');
  });

  it('respects the open state from props', () => {
    const { container } = render(
      <DocsCategoryItem
        title="Mesh Operations"
        description="Modeling pipeline"
        items={['Boolean Union']}
        isOpen
      />
    );

    expect(container.querySelector('details')).toHaveAttribute('open');
  });
});
