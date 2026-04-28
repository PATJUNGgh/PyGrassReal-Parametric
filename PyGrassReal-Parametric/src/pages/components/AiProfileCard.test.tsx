import { fireEvent, render, screen } from '@testing-library/react';
import { LanguageProvider } from '../../i18n/language';
import { AiProfileCard, type AiProfile } from './AiProfileCard';

const AI_PROFILE_FIXTURE: AiProfile = {
  name: { th: 'หนุมาน', en: 'Hanuman' },
  nameEn: 'Hanuman AI',
  role: { th: 'ผู้ปฏิบัติการ', en: 'Execution Specialist' },
  badge: { th: 'ปฏิบัติการ', en: 'EXECUTOR' },
  description: { th: 'ทดสอบคำอธิบาย', en: 'Testing profile description' },
  img: '/test-ai.png',
  accent: 'rgba(251,146,60,0.7)',
  accentGlow: 'rgba(251,146,60,0.2)',
};

describe('AiProfileCard', () => {
  beforeEach(() => {
    window.localStorage.setItem('pygrass-language', 'en');
  });

  it('renders localized content and forwards click events', () => {
    const onClick = vi.fn();
    render(
      <LanguageProvider>
        <AiProfileCard ai={AI_PROFILE_FIXTURE} onClick={onClick} />
      </LanguageProvider>
    );

    const cardButton = screen.getByRole('button', {
      name: /hanuman ai - execution specialist/i,
    });
    const image = screen.getByRole('img', {
      name: /hanuman ai - execution specialist/i,
    });

    expect(screen.getByText('Hanuman')).toBeInTheDocument();
    expect(screen.getByText('EXECUTOR')).toBeInTheDocument();
    expect(screen.getByText('Testing profile description')).toBeInTheDocument();
    expect(image).toHaveAttribute('src', '/test-ai.png');

    fireEvent.click(cardButton);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(cardButton.style.getPropertyValue('--ai-accent')).toBe('rgba(251,146,60,0.7)');
    expect(cardButton.style.getPropertyValue('--ai-glow')).toBe('rgba(251,146,60,0.2)');
  });
});
