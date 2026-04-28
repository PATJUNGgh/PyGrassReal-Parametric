import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useWorkflows } from './useWorkflows';
import * as workflowApi from '../services/workflows.api';
import { LanguageProvider } from '../../i18n/language';
import React from 'react';

// Mock the API module
vi.mock('../services/workflows.api', () => ({
  getCurrentOwnerId: vi.fn(),
  listWorkflows: vi.fn(),
  createWorkflow: vi.fn(),
  updateWorkflowName: vi.fn(),
  toggleWorkflowStatus: vi.fn(),
  duplicateWorkflow: vi.fn(),
  deleteWorkflow: vi.fn(),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => 
  React.createElement(LanguageProvider, null, children);

describe('useWorkflows', () => {
  const mockPushToast = vi.fn();
  const mockGetErrorMessage = vi.fn((err) => (err as Error).message);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads workflows on mount', async () => {
    // Setup mocks
    (workflowApi.getCurrentOwnerId as any).mockResolvedValue('user-1');
    (workflowApi.listWorkflows as any).mockResolvedValue({
      items: [{ id: '1', name: 'Workflow 1' }],
      total: 1,
    });

    const { result } = renderHook(() =>
      useWorkflows({ pushToast: mockPushToast, getErrorMessage: mockGetErrorMessage, disableThrottle: true }),
      { wrapper }
    );

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.workflows).toHaveLength(1);
    });

    expect(result.current.workflows[0].name).toBe('Workflow 1');
  });

  it('creates a new workflow successfully', async () => {
    (workflowApi.getCurrentOwnerId as any).mockResolvedValue('user-1');
    (workflowApi.listWorkflows as any).mockResolvedValue({ items: [], total: 0 });
    (workflowApi.createWorkflow as any).mockResolvedValue({ id: 'new-1', name: 'New Workflow' });

    const { result } = renderHook(() =>
      useWorkflows({ pushToast: mockPushToast, getErrorMessage: mockGetErrorMessage, disableThrottle: true }),
      { wrapper }
    );

    // Crucial: Wait for the internal resolveOwner effect to finish so ownerId is set
    await waitFor(() => expect(workflowApi.getCurrentOwnerId).toHaveBeenCalled());
    
    // Give it one more tick to update state
    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      const created = await result.current.handleCreate('New Workflow');
      expect(created).toEqual({ id: 'new-1', name: 'New Workflow' });
    });

    expect(mockPushToast).toHaveBeenCalledWith(expect.stringMatching(/สร้างเวิร์กโฟลว์สำเร็จ|Workflow created/i));
  });
});
