import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DashboardPage from './DashboardPage';
import { LanguageProvider } from '../i18n/language';
import React from 'react';
import * as entitlementApi from '../pricing/services/entitlement.api';

// Mock hooks and APIs
vi.mock('../pricing/services/entitlement.api', () => ({
  getEntitlementByUserId: vi.fn().mockResolvedValue({ plan_id: 'free' }),
  resolvePricingUserId: vi.fn().mockReturnValue('user-123'),
}));

// Mock useWorkflows to avoid actual API calls
vi.mock('../hooks/useWorkflows', () => ({
  useWorkflows: () => ({
    workflows: [],
    total: 0,
    loading: false,
    isCreating: false,
    isDeleting: false,
    query: { page: 1, perPage: 6, searchTerm: '' },
    filters: { setPage: vi.fn(), setSearchTerm: vi.fn() },
    handleCreate: vi.fn(),
    handleDelete: vi.fn(),
  }),
}));

describe('DashboardPage Integration', () => {
  const defaultProps = {
    onOpenWorkflowEditor: vi.fn(),
    onUpgradePlan: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dashboard header and empty state', async () => {
    vi.mocked(entitlementApi.getEntitlementByUserId).mockImplementation(() => Promise.resolve({ plan_id: 'free' } as any));

    render(
      <LanguageProvider>
        <DashboardPage {...defaultProps} />
      </LanguageProvider>
    );

    expect(screen.getByText(/3D-Edit/i)).toBeInTheDocument();
    expect(screen.getByText(/ยังไม่มีงานของคุณ|No workflows yet/i)).toBeInTheDocument();
  });

  it('shows active plan pill when entitlement is loaded', async () => {
    vi.mocked(entitlementApi.getEntitlementByUserId).mockImplementation(() => Promise.resolve({ plan_id: 'pro' } as any));

    render(
      <LanguageProvider>
        <DashboardPage {...defaultProps} />
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Pro ใช้งานอยู่|Pro Active/i)).toBeInTheDocument();
    });
  });

  it('opens create modal when clicking create button in empty state', async () => {
    render(
      <LanguageProvider>
        <DashboardPage {...defaultProps} />
      </LanguageProvider>
    );

    const createBtn = screen.getByRole('button', { name: /สร้างเวิร์กโฟลว์ใหม่|Create workflow/i });
    fireEvent.click(createBtn);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/ตั้งชื่อให้ชัดเจน|Set a clear name/i)).toBeInTheDocument();
  });
});
