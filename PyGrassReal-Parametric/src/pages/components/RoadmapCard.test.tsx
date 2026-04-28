import { render, screen } from '@testing-library/react';
import { LanguageProvider } from '../../i18n/language';
import { RoadmapCard } from './RoadmapCard';

describe('RoadmapCard', () => {
  it('renders localized roadmap content in English', () => {
    window.localStorage.setItem('pygrass-language', 'en');

    render(
      <LanguageProvider>
        <RoadmapCard
          item={{
            quarter: 'Q4',
            title: { th: 'หัวข้อภาษาไทย', en: 'Roadmap Title' },
            description: { th: 'รายละเอียดภาษาไทย', en: 'Roadmap description' },
          }}
        />
      </LanguageProvider>
    );

    expect(screen.getByText('Q4')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Roadmap Title' })).toBeInTheDocument();
    expect(screen.getByText('Roadmap description')).toBeInTheDocument();
  });

  it('renders localized roadmap content in Thai', () => {
    window.localStorage.setItem('pygrass-language', 'th');

    render(
      <LanguageProvider>
        <RoadmapCard
          item={{
            quarter: 'Q1',
            title: { th: 'แผนงานไตรมาส', en: 'Quarter Plan' },
            description: { th: 'รายละเอียดแผนงาน', en: 'Plan details' },
          }}
        />
      </LanguageProvider>
    );

    expect(screen.getByRole('heading', { name: 'แผนงานไตรมาส' })).toBeInTheDocument();
    expect(screen.getByText('รายละเอียดแผนงาน')).toBeInTheDocument();
  });
});
