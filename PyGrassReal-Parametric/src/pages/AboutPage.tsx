import { useState } from 'react';
import { useAuthSession } from '../auth/hooks/useAuthSession';
import { localizeText, useLanguage } from '../i18n/language';
import { DocumentationSidebar } from './components/DocumentationSidebarOverlay';
import { MainLayout } from './components/MainLayout';
import { RoadmapCard } from './components/RoadmapCard';
import { Section } from './components/Section';
import { SubHero } from './components/SubHero';
import { getTopbarNavigation } from './config/navigation';
import { useRoadmapItems } from './hooks/usePageData';
import './pages.css';

interface AboutPageProps {
  onNavigate: (path: string) => void;
}

export default function AboutPage({ onNavigate }: AboutPageProps) {
  const { language } = useLanguage();
  const { data: roadmapItems, isLoading } = useRoadmapItems();
  const { isAuthenticated } = useAuthSession();
  const topbarItems = getTopbarNavigation('about', language, isAuthenticated);
  const [sidebarQuery, setSidebarQuery] = useState('');
  return (
    <MainLayout
      onNavigate={onNavigate}
      className="pg-subpage"
      topbarItems={topbarItems}
      isAuthenticated={isAuthenticated}
      pageTitle={localizeText(language, {
        th: 'เกี่ยวกับ',
        en: 'About',
      })}
      pageDescription={localizeText(language, {
        th: 'วิสัยทัศน์และแผนพัฒนาแพลตฟอร์ม PyGrassReal-Ai',
        en: 'Vision and product roadmap for PyGrassReal-Ai.',
      })}
    >
      <main className="pg-main pg-main-doc-shell">
        <DocumentationSidebar
          activeSection="about"
          searchValue={sidebarQuery}
          onSearchValueChange={setSidebarQuery}
          searchPlaceholder={localizeText(language, {
            th: 'Try: roadmap',
            en: 'Try: roadmap',
          })}
        />

        <div className="pg-doc-shell-content">
          <SubHero
            chip={localizeText(language, { th: 'วิสัยทัศน์', en: 'Vision' })}
            title={localizeText(language, {
              th: 'การสร้างงานแบบพาราเมตริก โดยมี AI เป็นผู้ช่วยออกแบบ',
              en: 'Parametric creation with AI as a design copilot.',
            })}
            description={localizeText(language, {
              th: 'PyGrassReal-Ai ผสานการขึ้นโมเดลแบบโหนดกับการสร้างงานด้วย AI เพื่อพานักออกแบบจากไอเดียไปสู่ผลลัพธ์ 3D ที่แก้ไขได้เร็วขึ้น',
              en: 'PyGrassReal-Ai combines node-based modeling with AI-assisted generation to help designers move from idea to editable 3D outputs faster.',
            })}
          />

          <Section
            id="about-roadmap-section"
            telemetryId="about.roadmap"
            delay={1}
            title={localizeText(language, {
              th: 'Roadmap',
              en: 'Roadmap',
            })}
            description={localizeText(language, {
              th: 'หมุดหมายระดับภาพรวมสำหรับการพัฒนารุ่นถัดไป',
              en: 'High-level milestones for the next iterations.',
            })}
          >
            <div className="pg-roadmap-grid">
              {isLoading && roadmapItems.length === 0
                ? Array.from({ length: 3 }, (_, index) => (
                    <article key={`roadmap-loading-${index}`} className="pg-roadmap-card is-loading" aria-hidden="true" />
                  ))
                : roadmapItems.map((item) => <RoadmapCard key={item.quarter} item={item} />)}
            </div>
          </Section>
        </div>
      </main>
    </MainLayout>
  );
}

