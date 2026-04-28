import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WorkflowCard } from './WorkflowCard';
import { LanguageProvider } from '../../i18n/language';
import type { Workflow } from '../types/workflow.types';

const mockWorkflow: Workflow = {
  id: 'test-id',
  name: 'Test Workflow',
  status: 'active',
  owner_id: 'user-1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  definition: { thumbnail: 'test-thumb.jpg' },
};

describe('WorkflowCard', () => {
  const defaultProps = {
    workflow: mockWorkflow,
    onOpen: vi.fn(),
    onToggleStatus: vi.fn(),
    onUpdateName: vi.fn(),
    onDuplicate: vi.fn(),
    onDeleteRequest: vi.fn(),
  };

  it('renders workflow name correctly', () => {
    render(
      <LanguageProvider>
        <WorkflowCard {...defaultProps} />
      </LanguageProvider>
    );

    expect(screen.getByText('Test Workflow')).toBeInTheDocument();
  });

  it('calls onOpen when clicked', () => {
    render(
      <LanguageProvider>
        <WorkflowCard {...defaultProps} />
      </LanguageProvider>
    );

    const card = screen.getByRole('button', { name: /Open Test Workflow/i });
    fireEvent.click(card);

    expect(defaultProps.onOpen).toHaveBeenCalledWith(mockWorkflow);
  });

  it('opens menu and shows actions when menu trigger is clicked', () => {
    render(
      <LanguageProvider>
        <WorkflowCard {...defaultProps} />
      </LanguageProvider>
    );

    const menuTrigger = screen.getByLabelText(/Open workflow actions for Test Workflow/i);
    fireEvent.click(menuTrigger);

    // Check for Edit name button (localized text might vary, but we can look for icon or partial text if needed, 
    // but based on dashboardData.ts it should be "แก้ไขชื่อ" (TH) or "Edit name" (EN). Default is TH in LanguageProvider mock/logic?)
    // Actually LanguageProvider defaults to localStorage or 'th'. Let's assume 'th' or just check existence.
    // We can check by role or just generic query.
    
    // Since we wrapped in LanguageProvider, it defaults to TH if no storage.
    // "แก้ไขชื่อ"
    expect(screen.getByText(/แก้ไขชื่อ/i)).toBeInTheDocument();
    expect(screen.getByText(/ทำสำเนา/i)).toBeInTheDocument();
    expect(screen.getByText(/ลบข้อมูล/i)).toBeInTheDocument();
  });
});
