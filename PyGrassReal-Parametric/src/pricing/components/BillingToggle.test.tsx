import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BillingToggle } from './BillingToggle';

describe('BillingToggle', () => {
  it('renders quarterly option and emits quarterly value', () => {
    const onChange = vi.fn();
    render(<BillingToggle value="monthly" onChange={onChange} />);

    const quarterlyButton = screen.getByRole('button', { name: /quarterly/i });
    expect(quarterlyButton).toBeInTheDocument();

    fireEvent.click(quarterlyButton);
    expect(onChange).toHaveBeenCalledWith('quarterly');
  });
});
