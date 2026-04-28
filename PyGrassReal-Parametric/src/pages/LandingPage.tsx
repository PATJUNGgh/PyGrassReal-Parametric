import { useAuthSession } from '../auth/hooks/useAuthSession';
import { localizeText, useLanguage } from '../i18n/language';
import { AiProfilesSection } from './components/AiProfilesSection';
import { FeatureGrid } from './components/FeatureGrid';
import { HeroSection } from './components/HeroSection';
import { MainLayout } from './components/MainLayout';
import { UseCaseGrid } from './components/UseCaseGrid';
import { getTopbarNavigation } from './config/navigation';
import './pages.css';

interface LandingPageProps {
  onNavigate: (path: string) => void;
}

export default function LandingPage({ onNavigate }: LandingPageProps) {
  const { language } = useLanguage();
  const { isAuthenticated } = useAuthSession();
  const topbarItems = getTopbarNavigation('landing', language, isAuthenticated);

  return (
    <MainLayout
      onNavigate={onNavigate}
      topbarItems={topbarItems}
      isAuthenticated={isAuthenticated}
      pageTitle={localizeText(language, {
        th: 'หน้าแรก',
        en: 'Home',
      })}
      pageDescription={localizeText(language, {
        th: 'ตัวแก้ไข Node พลัง AI สำหรับงานโมเดล 3D และการออกแบบเชิงคำนวณ',
        en: 'AI-powered Node Editor for 3D modeling and computational design.',
      })}
    >
      <main className="pg-main">
        <HeroSection />
        <AiProfilesSection />
        <FeatureGrid />
        <UseCaseGrid />
      </main>
    </MainLayout>
  );
}

