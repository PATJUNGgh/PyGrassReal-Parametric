import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ToastStack } from './ToastStack';
import React from 'react';

describe('ToastStack', () => {
  const mockToasts = [
    { id: '1', message: 'Success Message', tone: 'success' as const },
    { id: '2', message: 'Error Message', tone: 'error' as const },
  ];

  it('renders all toasts in the stack', () => {
    render(<ToastStack toasts={mockToasts} />);

    expect(screen.getByText('Success Message')).toBeInTheDocument();
    expect(screen.getByText('Error Message')).toBeInTheDocument();
  });

  it('renders nothing when toasts array is empty', () => {
    const { container } = render(<ToastStack toasts={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('applies correct classes for different tones', () => {
    const { container } = render(<ToastStack toasts={mockToasts} />);
    
    const errorToast = container.querySelector('.is-error');
    const successToast = screen.getByText('Success Message');

    expect(successToast).toBeInTheDocument();
    expect(errorToast).toBeInTheDocument();
    expect(errorToast).toHaveTextContent('Error Message');
  });
});
