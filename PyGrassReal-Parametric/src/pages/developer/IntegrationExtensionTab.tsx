import { localizeText, useLanguage } from '../../i18n/language';
import { DEVELOPER_INTEGRATION_EXTENSION } from '../data/developerIntegrationExtension';
import { OpenCodeConfigurationTab } from './OpenCodeConfigurationTab';
import { ClaudeCodeConfigurationTab } from './ClaudeCodeConfigurationTab';
import { OpenClawConfigurationTab } from './OpenClawConfigurationTab';
import { ClineConfigurationTab } from './ClineConfigurationTab';
import { KiloCodeConfigurationTab } from './KiloCodeConfigurationTab';
import { RooCodeConfigurationTab } from './RooCodeConfigurationTab';
import { CodexConfigurationTab } from './CodexConfigurationTab';

export interface IntegrationExtensionSectionIds {
  overviewOfAiTools: string;
  opencodeConfig: string;
  openclawConfig: string;
  clineConfig: string;
  kilocodeConfig: string;
  roocodeConfig: string;
}

interface IntegrationExtensionTabProps {
  activeTabId: keyof IntegrationExtensionSectionIds;
  onTabChange?: (tabId: keyof IntegrationExtensionSectionIds) => void;
}

export function IntegrationExtensionTab({ activeTabId, onTabChange }: IntegrationExtensionTabProps) {
  const { language } = useLanguage();
  const data = DEVELOPER_INTEGRATION_EXTENSION;

  return (
    <section className="pg-developer-panel">


      {activeTabId === 'overviewOfAiTools' && (
    <article className="pg-developer-integration-overview" style={{ 
      padding: '0.5rem',
      boxSizing: 'border-box',
      width: '100%',
      maxWidth: '100%',
      overflowX: 'hidden'
    }}>
          <h3 style={{
            wordBreak: 'break-word',
            overflowWrap: 'anywhere'
          }}>{localizeText(language, data.overviewOfAiToolsTitle)}</h3>
          <p style={{ 
            marginTop: '0.5rem', 
            marginBottom: '1.5rem', 
            opacity: 0.85, 
            lineHeight: 1.6,
            wordBreak: 'break-word',
            overflowWrap: 'anywhere'
          }}>
            {localizeText(language, data.overviewOfAiToolsDesc)}
          </p>
          
          <h4 style={{ 
            marginBottom: '1rem', 
            fontSize: '1.1rem',
            wordBreak: 'break-word',
            overflowWrap: 'anywhere'
          }}>{localizeText(language, data.useToolsTitle)}</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {data.aiToolsList.map((tool) => (
              <div 
                key={tool.id} 
                className="pg-developer-shared-item" 
                style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1.25rem', ...(tool.id === 'opencode' || tool.id === 'openclaw' || tool.id === 'cline' || tool.id === 'kilocode' || tool.id === 'roocode' ? { cursor: 'pointer' } : {}) }}
                onClick={() => {
                  if (tool.id === 'opencode' && onTabChange) {
                    onTabChange('opencodeConfig');
                    document.querySelector('.pg-doc-shell-content')?.scrollTo(0, 0);
                  } else if (tool.id === 'openclaw' && onTabChange) {
                    onTabChange('openclawConfig');
                    document.querySelector('.pg-doc-shell-content')?.scrollTo(0, 0);
                  } else if (tool.id === 'cline' && onTabChange) {
                    onTabChange('clineConfig');
                    document.querySelector('.pg-doc-shell-content')?.scrollTo(0, 0);
                  } else if (tool.id === 'kilocode' && onTabChange) {
                    onTabChange('kilocodeConfig');
                    document.querySelector('.pg-doc-shell-content')?.scrollTo(0, 0);
                  } else if (tool.id === 'roocode' && onTabChange) {
                    onTabChange('roocodeConfig');
                    document.querySelector('.pg-doc-shell-content')?.scrollTo(0, 0);
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                  <div className={`ai-tool-icon ${tool.iconClass}`} style={{ width: '24px', height: '24px', backgroundColor: 'var(--pg-primary-color, #3b82f6)', borderRadius: '4px', opacity: 0.8 }} />
                  <strong style={{ fontSize: '1rem' }}>{tool.name}</strong>
                </div>
                <p style={{ fontSize: '0.85rem', opacity: 0.7, margin: 0, lineHeight: 1.5 }}>{localizeText(language, tool.description)}</p>
              </div>
            ))}
          </div>

          <h4 style={{ 
            marginTop: '2.5rem', 
            marginBottom: '1rem', 
            fontSize: '1.2rem',
            wordBreak: 'break-word',
            overflowWrap: 'anywhere'
          }}>{localizeText(language, data.configurationMethodsTitle)}</h4>
          <p style={{ 
            marginBottom: '0.75rem', 
            opacity: 0.85,
            wordBreak: 'break-word',
            overflowWrap: 'anywhere'
          }}>{localizeText(language, data.coreStepsTitle)}</p>
          <ol style={{ paddingLeft: '1.5rem', marginBottom: '1.5rem', opacity: 0.85, lineHeight: 1.6 }}>
            {data.configurationMethodsSteps.map((step, idx) => (
              <li key={idx} style={{ marginBottom: '0.5rem' }}>{localizeText(language, step)}</li>
            ))}
          </ol>
        </article>
      )}

      {activeTabId === 'opencodeConfig' && (
        <OpenCodeConfigurationTab />
      )}


      {activeTabId === 'openclawConfig' && (
        <OpenClawConfigurationTab />
      )}

      {activeTabId === 'clineConfig' && (
        <ClineConfigurationTab />
      )}

      {activeTabId === 'kilocodeConfig' && (
        <KiloCodeConfigurationTab />
      )}

      {activeTabId === 'roocodeConfig' && (
        <RooCodeConfigurationTab />
      )}

    </section>


  );
}
