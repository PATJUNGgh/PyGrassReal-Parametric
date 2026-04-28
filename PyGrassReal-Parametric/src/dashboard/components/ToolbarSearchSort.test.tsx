import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ToolbarSearchSort } from './ToolbarSearchSort';
import { LanguageProvider } from '../../i18n/language';
import React from 'react';

describe('ToolbarSearchSort', () => {
  const defaultProps = {
    searchTerm: '',
    onSearchChange: vi.fn(),
    sortBy: 'updated_desc' as const,
    onSortByChange: vi.fn(),
    statusFilter: 'all' as const,
    onStatusFilterChange: vi.fn(),
    ownerFilter: 'mine' as const,
    onOwnerFilterChange: vi.fn(),
  };

  it('renders all filter and sort options', () => {
    render(
      <LanguageProvider>
        <ToolbarSearchSort {...defaultProps} />
      </LanguageProvider>
    );

    expect(screen.getByPlaceholderText(/ค้นหาเวิร์กโฟลว์|Search workflows/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Sort workflows/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Filter by status/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Filter by owner/i)).toBeInTheDocument();
  });

  it('calls onSearchChange when typing', () => {
    render(
      <LanguageProvider>
        <ToolbarSearchSort {...defaultProps} />
      </LanguageProvider>
    );

    const input = screen.getByPlaceholderText(/ค้นหาเวิร์กโฟลว์|Search workflows/i);
    fireEvent.change(input, { target: { value: 'my project' } });
    expect(defaultProps.onSearchChange).toHaveBeenCalledWith('my project');
  });

  it('calls correct handlers when filters change', () => {
    render(
      <LanguageProvider>
        <ToolbarSearchSort {...defaultProps} />
      </LanguageProvider>
    );

    const statusSelect = screen.getByLabelText(/Filter by status/i);
    fireEvent.change(statusSelect, { target: { value: 'active' } });
    expect(defaultProps.onStatusFilterChange).toHaveBeenCalledWith('active');

    const sortSelect = screen.getByLabelText(/Sort workflows/i);
    fireEvent.change(sortSelect, { target: { value: 'name_asc' } });
    expect(defaultProps.onSortByChange).toHaveBeenCalledWith('name_asc');
  });
});
