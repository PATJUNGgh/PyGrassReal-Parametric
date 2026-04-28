import { useMemo } from 'react';
import { useAuthSession } from '../auth/hooks/useAuthSession';
import { localizeText, useLanguage } from '../i18n/language';
import { DocumentationSidebar } from './components/DocumentationSidebarOverlay';
import { DocsCategoryItem } from './components/DocsCategoryItem';
import { MainLayout } from './components/MainLayout';
import { SubHero } from './components/SubHero';
import { getTopbarNavigation } from './config/navigation';
import { useDocsSearch } from './hooks/useDocsSearch';
import { useNodeCategories } from './hooks/usePageData';
import './pages.css';

interface DocsPageProps {
  onNavigate: (path: string) => void;
}

const getCategoryAnchorId = (categoryId: string): string => `docs-category-${categoryId}`;

export default function DocsPage({ onNavigate }: DocsPageProps) {
  const { language } = useLanguage();
  const { data: nodeCategories, isLoading: isNodeCategoriesLoading } = useNodeCategories();
  const { isAuthenticated } = useAuthSession();
  const topbarItems = getTopbarNavigation('docs', language, isAuthenticated);
  const { query, setQuery, filteredCategories } = useDocsSearch({
    language,
    categories: nodeCategories,
  });
  const isSearchActive = useMemo(() => query.trim().length > 0, [query]);

  return (
    <MainLayout
      onNavigate={onNavigate}
      className="pg-subpage"
      topbarItems={topbarItems}
      isAuthenticated={isAuthenticated}
      pageTitle={localizeText(language, {
        th: 'เอกสาร',
        en: 'Documentation',
      })}
      pageDescription={localizeText(language, {
        th: 'ค้นหาหมวดโหนดและรายละเอียดการใช้งานอย่างรวดเร็ว',
        en: 'Browse node categories and search documentation quickly.',
      })}
    >
      <main className="pg-main pg-main-doc-shell">
        <DocumentationSidebar
          activeSection="nodes"
          searchValue={query}
          onSearchValueChange={setQuery}
          searchPlaceholder={localizeText(language, {
            th: 'ลองพิมพ์: boolean, prompt, scale',
            en: 'Try: boolean, prompt, scale',
          })}
        />

        <div className="pg-doc-shell-content">
          <SubHero
            chip={localizeText(language, {
              th: 'เอกสาร Node',
              en: 'Node Docs',
            })}
            title={localizeText(language, {
              th: 'หมวดโหนดและการค้นหาอย่างรวดเร็ว',
              en: 'Node categories and quick lookup',
            })}
            description={localizeText(language, {
              th: 'ค้นหา node documentation ตามชื่อโหนด หรือสลับไปดู About และ API Docs ในหมวดเดียวกัน',
              en: 'Search node documentation by name, or switch to About and API Docs in the same section.',
            })}
          />

          <section className="pg-section pg-fade-up pg-delay-1">
            <div className="pg-docs-accordion">
              {isNodeCategoriesLoading ? (
                <article className="pg-docs-empty">
                  <h3>
                    {localizeText(language, {
                      th: 'กำลังโหลดข้อมูลเอกสาร',
                      en: 'Loading documentation',
                    })}
                  </h3>
                  <p>
                    {localizeText(language, {
                      th: 'กำลังเตรียมหมวดหมู่โหนด กรุณารอสักครู่',
                      en: 'Preparing node categories. Please wait a moment.',
                    })}
                  </p>
                </article>
              ) : filteredCategories.length === 0 ? (
                <article className="pg-docs-empty">
                  <h3>
                    {localizeText(language, {
                      th: 'ไม่พบหมวดหมู่ที่ตรงกัน',
                      en: 'No categories found',
                    })}
                  </h3>
                  <p>
                    {localizeText(language, {
                      th: 'ลองปรับคำค้นหาเพื่อดูกลุ่มโหนดที่ตรงมากขึ้น',
                      en: 'Adjust your query to discover matching node groups.',
                    })}
                  </p>
                </article>
              ) : (
                filteredCategories.map((category) => (
                  <div key={category.id} id={getCategoryAnchorId(category.id)} className="pg-doc-anchor-target">
                    <DocsCategoryItem
                      title={category.title}
                      description={category.description}
                      items={category.items}
                      isOpen={isSearchActive}
                    />
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </main>
    </MainLayout>
  );
}

