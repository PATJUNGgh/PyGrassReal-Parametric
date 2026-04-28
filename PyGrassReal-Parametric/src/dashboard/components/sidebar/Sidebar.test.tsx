import { render, screen, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { Sidebar } from './Sidebar';
import { LanguageProvider } from '../../../i18n/language';
import React from 'react';

vi.mock('../../../auth/hooks/useProfile', () => ({
  useProfile: () => ({
    displayName: 'Test User',
    email: 'test.user@example.com',
    avatarUrl: null,
    isLoading: false,
  }),
}));

describe('Sidebar Layout', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_PLATFORM_REVENUE_ALLOWED_EMAILS', 'test.user@example.com');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const defaultProps = {
    isOpen: true,
    onToggle: vi.fn(),
    activeRoute: '/dashboard',
    onNavigate: vi.fn(),
    onSignOut: vi.fn(),
  };

  it('renders navigation links and handles navigation', () => {
    render(
      <LanguageProvider>
        <Sidebar {...defaultProps} />
      </LanguageProvider>
    );

    const dashboardBtn = screen.getByTitle(/3D-Edit/i);
    fireEvent.click(dashboardBtn);
    expect(defaultProps.onNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('calls onToggle when toggle button is clicked', () => {
    render(
      <LanguageProvider>
        <Sidebar {...defaultProps} />
      </LanguageProvider>
    );

    const toggleBtn = screen.getByLabelText(/Collapse sidebar/i);
    fireEvent.click(toggleBtn);
    expect(defaultProps.onToggle).toHaveBeenCalled();
  });

  it('navigates to the standalone Analytics page when Analytics is clicked', () => {
    render(
      <LanguageProvider>
        <Sidebar {...defaultProps} activeRoute="/dashboard/api" />
      </LanguageProvider>
    );

    const usageBtn = screen.getByTitle(/Analytics/i);
    fireEvent.click(usageBtn);
    expect(defaultProps.onNavigate).toHaveBeenCalledWith('/dashboard/usage');
  });

  it('navigates to the platform revenue page when Revenue is clicked', () => {
    render(
      <LanguageProvider>
        <Sidebar {...defaultProps} activeRoute="/dashboard/benchmark" />
      </LanguageProvider>
    );

    const revenueBtn = screen.getByTitle(/Revenue|รายรับ/i);
    fireEvent.click(revenueBtn);
    expect(defaultProps.onNavigate).toHaveBeenCalledWith('/dashboard/revenue');
  });

  it('hides the platform revenue page when the current email is not allowlisted', () => {
    vi.stubEnv('VITE_PLATFORM_REVENUE_ALLOWED_EMAILS', 'owner@example.com');

    render(
      <LanguageProvider>
        <Sidebar {...defaultProps} activeRoute="/dashboard/benchmark" />
      </LanguageProvider>
    );

    expect(screen.queryByTitle(/Revenue|à¸£à¸²à¸¢à¸£à¸±à¸š/i)).not.toBeInTheDocument();
  });

  it('navigates to landing page when logo is clicked', () => {
    render(
      <LanguageProvider>
        <Sidebar {...defaultProps} activeRoute="/dashboard/api" />
      </LanguageProvider>
    );

    const logoBtn = screen.getByRole('button', { name: /go to home|ไปหน้าแรก/i });
    fireEvent.click(logoBtn);
    expect(defaultProps.onNavigate).toHaveBeenCalledWith('/');
  });

  it('applies is-closed class when isOpen is false', () => {
    const { container } = render(
      <LanguageProvider>
        <Sidebar {...defaultProps} isOpen={false} />
      </LanguageProvider>
    );

    const aside = container.querySelector('aside');
    expect(aside).toHaveClass('is-closed');
  });
});
