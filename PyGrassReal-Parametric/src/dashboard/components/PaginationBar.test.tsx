import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PaginationBar } from './PaginationBar';
import { LanguageProvider } from '../../i18n/language';
import React from 'react';

describe('PaginationBar', () => {
  const defaultProps = {
    total: 25,
    page: 1,
    perPage: 10,
    onPageChange: vi.fn(),
    onPerPageChange: vi.fn(),
  };

  it('renders correct summary and disables prev on first page', () => {
    render(
      <LanguageProvider>
        <PaginationBar {...defaultProps} />
      </LanguageProvider>
    );

    // Summary: Total 25 Page 1 of 3
    // Use more specific queries to find exact summary text parts
    const summary = screen.getByText(/ทั้งหมด|Total/i).parentElement;
    expect(summary).toHaveTextContent('25');
    expect(summary).toHaveTextContent('1');
    expect(summary).toHaveTextContent('3');

    const prevBtn = screen.getByRole('button', { name: /ก่อนหน้า|Previous/i });
    const nextBtn = screen.getByRole('button', { name: /ถัดไป|Next/i });

    expect(prevBtn).toBeDisabled();
    expect(nextBtn).toBeEnabled();
  });

  it('enables both buttons on middle page', () => {
    render(
      <LanguageProvider>
        <PaginationBar {...defaultProps} page={2} />
      </LanguageProvider>
    );

    const prevBtn = screen.getByRole('button', { name: /ก่อนหน้า|Previous/i });
    const nextBtn = screen.getByRole('button', { name: /ถัดไป|Next/i });

    expect(prevBtn).toBeEnabled();
    expect(nextBtn).toBeEnabled();
  });

  it('disables next on last page', () => {
    render(
      <LanguageProvider>
        <PaginationBar {...defaultProps} page={3} />
      </LanguageProvider>
    );

    const nextBtn = screen.getByRole('button', { name: /ถัดไป|Next/i });
    expect(nextBtn).toBeDisabled();
  });

  it('calls onPerPageChange when select changes', () => {
    render(
      <LanguageProvider>
        <PaginationBar {...defaultProps} />
      </LanguageProvider>
    );

    const select = screen.getByLabelText(/Items per page/i);
    fireEvent.change(select, { target: { value: '20' } });

    expect(defaultProps.onPerPageChange).toHaveBeenCalledWith(20);
  });
});
