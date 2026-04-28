import { useState, type CSSProperties } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { localizeText, useLanguage } from '../../i18n/language';
import { CLINE_IMAGES } from './clineImages';

interface ClineConfigurationTabProps {
  id?: string;
}

export function ClineConfigurationTab({ id }: ClineConfigurationTabProps) {
  const { language } = useLanguage();
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const commandBlockStyle: CSSProperties = {
    marginBottom: '1.5rem',
    padding: '1rem',
    borderRadius: '10px',
    border: '1px solid var(--pg-code-border, rgba(96, 165, 250, 0.38))',
    background: 'var(--pg-code-surface, rgba(9, 18, 31, 0.72))',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 0 0 1px rgba(15, 23, 42, 0.18)',
    overflowX: 'auto',
  };
  const commandCodeStyle: CSSProperties = {
    display: 'block',
    color: 'var(--pg-text-bright, #fff)',
    fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
    fontSize: '0.95rem',
    lineHeight: 1.6,
  };

  const copyText = async (value: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        textarea.style.pointerEvents = 'none';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      setCopiedCommand(value);
      window.setTimeout(() => {
        setCopiedCommand((current) => (current === value ? null : current));
      }, 1800);
    } catch (error) {
      console.error('Failed to copy command:', error);
    }
  };

  const renderCopyIcon = (isCopied: boolean) => (
    isCopied ? (
      <span
        aria-hidden="true"
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '18px',
          height: '18px',
          lineHeight: 0,
        }}
      >
        <span
          style={{
            display: 'block',
            width: '5px',
            height: '10px',
            borderRight: '2.2px solid #22c55e',
            borderBottom: '2.2px solid #22c55e',
            transform: 'rotate(45deg)',
            transformOrigin: 'center center',
          }}
        />
      </span>
    ) : (
      <span
        aria-hidden="true"
        style={{
          position: 'relative',
          display: 'inline-block',
          width: '18px',
          height: '18px',
          lineHeight: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: '2px',
            left: '2px',
            width: '8px',
            height: '8px',
            border: '1.8px solid rgba(255, 255, 255, 0.72)',
            borderRadius: '2px',
            background: 'transparent',
          }}
        />
        <span
          style={{
            position: 'absolute',
            top: '7px',
            left: '7px',
            width: '8px',
            height: '8px',
            border: '1.8px solid #ffffff',
            borderRadius: '2px',
            background: 'transparent',
          }}
        />
      </span>
    )
  );

  const renderCopyableCommandBlock = (
    command: string,
    styleOverride?: CSSProperties,
    syntaxLanguage?: string,
  ) => (
    <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
      <button
        type="button"
        onClick={() => void copyText(command)}
        aria-label={copiedCommand === command ? 'Copied' : 'Copy'}
        title={copiedCommand === command ? 'Copied' : 'Copy'}
        style={{
          position: 'absolute',
          top: '0.8rem',
          right: '0.8rem',
          zIndex: 1,
          border: '1px solid rgba(148, 163, 184, 0.35)',
          background: copiedCommand === command ? 'rgba(34, 197, 94, 0.18)' : 'rgba(15, 23, 42, 0.9)',
          color: 'var(--pg-text-bright, #fff)',
          borderRadius: '6px',
          width: '36px',
          height: '36px',
          padding: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 0,
          flexShrink: 0,
          cursor: 'pointer',
        }}
      >
        {renderCopyIcon(copiedCommand === command)}
        <span
          aria-hidden="true"
          style={{
            display: 'none',
            fontSize: '1rem',
            lineHeight: 1,
            fontWeight: 700,
            color: copiedCommand === command ? '#22c55e' : '#ffffff',
          }}
        >
          {copiedCommand === command ? '✓' : '⧉'}
        </span>
      </button>
      {syntaxLanguage ? (
        <SyntaxHighlighter
          language={syntaxLanguage}
          style={vscDarkPlus as Record<string, CSSProperties>}
          PreTag="div"
          customStyle={{ ...commandBlockStyle, ...styleOverride, marginBottom: 0, paddingRight: '4.25rem' }}
          codeTagProps={{ style: commandCodeStyle }}
        >
          {command}
        </SyntaxHighlighter>
      ) : (
        <pre style={{ ...commandBlockStyle, ...styleOverride, marginBottom: 0, paddingRight: '4.25rem' }}>
          <code style={commandCodeStyle}>{command}</code>
        </pre>
      )}
    </div>
  );

  return (
    <article id={id} className="cline-config-content" style={{ 
      marginTop: '1rem', 
      padding: '1rem', 
      boxSizing: 'border-box',
      width: '100%',
      maxWidth: '100%',
      overflowX: 'hidden'
    }}>
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ 
          fontSize: '2.2rem', 
          marginBottom: '1rem', 
          color: 'var(--pg-text-bright, #fff)',
          wordBreak: 'break-word',
          overflowWrap: 'anywhere'
        }}>
          {localizeText(language, { th: 'การตั้งค่า Cline', en: 'Cline Configuration' })}
        </h1>
        <p style={{ 
          fontSize: '1.05rem', 
          lineHeight: 1.6, 
          color: 'var(--pg-text-soft, #cbd5e1)',
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          overflowWrap: 'anywhere',
          maxWidth: '100%',
          display: 'block'
        }}>
          {localizeText(language, {
            th: 'Cline รองรับการเชื่อมต่อกับ Hanuman API ผ่านโปรโตคอล OpenAI Compatible ดูขั้นตอนการตั้งค่าด้านล่างเพื่อเริ่มต้นใช้งาน',
            en: 'Cline supports connecting to Hanuman API via the OpenAI Compatible protocol. Refer to this guide for configuration and usage.'
          })}
        </p>
      </header>

      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ 
          fontSize: '1.6rem', 
          marginBottom: '1rem', 
          color: 'var(--pg-text-bright, #fff)',
          wordBreak: 'break-word',
          overflowWrap: 'anywhere'
        }}>
          {localizeText(language, { th: 'ติดตั้ง Cline CLI', en: 'Install Cline CLI' })}
        </h2>
        <p style={{ 
          marginBottom: '1rem', 
          opacity: 0.85,
          wordBreak: 'break-word',
          overflowWrap: 'anywhere'
        }}>
          {localizeText(language, { th: 'เงื่อนไขเบื้องต้น: ต้องการ Node.js 20 ขึ้นไป (แนะนำ Node.js 22)', en: 'Prerequisites: Node.js 20 or later is required (Node.js 22 recommended).' })}
        </p>

        <p style={{ marginBottom: '0.75rem', fontWeight: 'bold' }}>{localizeText(language, { th: 'คำสั่งการติดตั้ง:', en: 'Installation command:' })}</p>
        {renderCopyableCommandBlock('npm install -g cline', undefined, 'bash')}

        <p style={{ marginBottom: '0.75rem', fontWeight: 'bold' }}>{localizeText(language, { th: 'ตรวจสอบการติดตั้ง (หากแสดงหมายเลขเวอร์ชัน แสดงว่าการติดตั้งสำเร็จ):', en: 'Verify installation (if a version number is displayed, the installation was successful):' })}</p>
        {renderCopyableCommandBlock('cline --version', undefined, 'bash')}
      </section>

      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ 
          fontSize: '1.6rem', 
          marginBottom: '1rem', 
          color: 'var(--pg-text-bright, #fff)',
          wordBreak: 'break-word',
          overflowWrap: 'anywhere'
        }}>
          {localizeText(language, { th: 'การตั้งค่า (Configuration)', en: 'Configuration' })}
        </h2>

        <h3 style={{ fontSize: '1.3rem', marginBottom: '0.75rem' }}>
          {localizeText(language, { th: 'รับข้อมูล Credentials', en: 'Obtain Credentials' })}
        </h3>
        <p style={{ marginBottom: '1.5rem', opacity: 0.85 }}>
          {localizeText(language, {
            th: 'รองรับการใช้งานสองรูปแบบ แต่วิธีการรับข้อมูล Credentials ที่สอดคล้องกันจะแตกต่างกัน:',
            en: 'Supports two usage methods, but the corresponding credential acquisition methods are different:'
          })}
        </p>

        <div className="pg-developer-table-wrap cline-credentials-table-wrap" style={{ marginBottom: '2.5rem' }}>
          <table className="pg-developer-table cline-credentials-table" style={{ textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--pg-border-color)' }}>
                <th style={{ padding: '0.75rem' }}>{localizeText(language, { th: 'รูปแบบการใช้งาน', en: 'Usage Method' })}</th>
                <th style={{ padding: '0.75rem' }}>{localizeText(language, { th: 'คำอธิบาย', en: 'Description' })}</th>
                <th style={{ padding: '0.75rem' }}>{localizeText(language, { th: 'ค่าที่ต้องตั้งค่า', en: 'Configuration Values' })}</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--pg-border-color)' }}>
                <td style={{ padding: '1rem 0.75rem', verticalAlign: 'top', fontWeight: 'bold' }}>
                  <div style={{ color: 'var(--pgr-green, #10b981)' }}>Hanuman 1.1 (Universal)</div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.6, fontWeight: 'normal', marginTop: '4px' }}>Compatible with Cline</div>
                </td>
                <td style={{ padding: '1rem 0.75rem', verticalAlign: 'top', opacity: 0.85 }}>
                  {localizeText(language, { 
                    th: 'เชื่อมต่อโดยตรงผ่านมาตรฐาน OpenAI Compatible รองรับทั้งการเขียนโปรแกรมและการใช้งานเครื่องมือ (Tool Use)', 
                    en: 'Direct connection via OpenAI Compatible standard. Supports both coding and Tool Use.' 
                  })}
                </td>
                <td style={{ padding: '1rem 0.75rem', verticalAlign: 'top' }}>
                  <div className="cline-credentials-config-card">
                    <div className="cline-credentials-config-row">
                      <span className="cline-credentials-label">Provider:</span> <span className="cline-credentials-value cline-credentials-value-provider">OpenAI Compatible</span>
                    </div>
                    <div className="cline-credentials-config-row">
                      <span className="cline-credentials-label">Base URL:</span> <span className="cline-credentials-value cline-credentials-value-url">https://api.pygrassreal.ai/v1</span>
                    </div>
                    <div className="cline-credentials-config-row">
                      <span className="cline-credentials-label">Model ID:</span> <span className="cline-credentials-value cline-credentials-value-model">pygrassreal/hanuman1.1</span>
                    </div>
                    <div className="cline-credentials-config-row">
                      <span className="cline-credentials-label">API Key:</span> <span className="cline-credentials-value cline-credentials-value-key">pgr_... (Your API Key)</span>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 style={{ fontSize: '1.3rem', marginBottom: '0.75rem' }}>
          {localizeText(language, { th: 'กำหนดการตั้งค่าพื้นฐาน', en: 'Configure Basic Settings' })}
        </h3>
        <p style={{ marginBottom: '1rem', opacity: 0.85 }}>
          {localizeText(language, { th: 'Cline CLI ใช้คำสั่ง cline auth เพื่อกำหนดค่า API providers รันคำสั่งต่อไปนี้เพื่อกำหนดค่าโมเดล Hanuman:', en: 'Cline CLI uses the cline auth command to configure API providers. Run the following command to configure Hanuman model:' })}
        </p>
        {renderCopyableCommandBlock(`cline auth -p openai -m pygrassreal/hanuman1.1 \\
  -b https://api.pygrassreal.ai/v1 \\
  -k pgr_YOUR_API_KEY`, { fontSize: '0.9rem' }, 'bash')}
        
        <p style={{ marginBottom: '0.75rem', fontWeight: 'bold', opacity: 0.9 }}>{localizeText(language, { th: 'คำอธิบายพารามิเตอร์:', en: 'Parameter descriptions:' })}</p>
        <ul style={{ paddingLeft: '1.5rem', marginBottom: '1.5rem', opacity: 0.85, lineHeight: 1.6 }}>
          <li><code style={{ padding: '2px 6px', background: 'var(--pg-code-bg, rgba(0,0,0,0.05))', borderRadius: '4px' }}>-p openai</code>: {localizeText(language, { th: 'เลือกผู้ให้บริการที่เข้ากันได้กับ OpenAI', en: 'Select OpenAI-compatible provider' })}</li>
          <li><code style={{ padding: '2px 6px', background: 'var(--pg-code-bg, rgba(0,0,0,0.05))', borderRadius: '4px' }}>-k</code>: {localizeText(language, { th: 'ป้อน API Key ที่ได้รับจากรูปแบบการใช้งานที่เกี่ยวข้อง', en: 'Enter the API Key obtained from the corresponding usage method' })}</li>
          <li><code style={{ padding: '2px 6px', background: 'var(--pg-code-bg, rgba(0,0,0,0.05))', borderRadius: '4px' }}>-b</code>: {localizeText(language, { th: 'ป้อน BASE_URL ที่ได้รับจากรูปแบบการใช้งานที่เกี่ยวข้อง', en: 'Enter the BASE_URL obtained from the corresponding usage method' })}</li>
          <li><code style={{ padding: '2px 6px', background: 'var(--pg-code-bg, rgba(0,0,0,0.05))', borderRadius: '4px' }}>-m</code>: {localizeText(language, { th: 'ป้อน Model ID ตัวอย่างเช่น pygrassreal/hanuman1.1', en: 'Enter the model ID, e.g. pygrassreal/hanuman1.1' })}</li>
        </ul>


        <p style={{ marginBottom: '1.5rem', opacity: 0.85 }}>
          {localizeText(language, { th: 'คุณสามารถกำหนดค่าผ่านอินเทอร์เฟซแบบโต้ตอบได้โดยรันคำสั่ง cline auth และทำตามขั้นตอนที่ระบบแนะนำ', en: 'You can also configure via the interactive wizard by running cline auth and following the prompts.' })}
        </p>

        <h3 style={{ fontSize: '1.3rem', marginBottom: '0.75rem' }}>
          {localizeText(language, { th: 'การใช้งาน Cline CLI', en: 'Use Cline CLI' })}
        </h3>
        <p style={{ marginBottom: '1rem', opacity: 0.85 }}>
          {localizeText(language, { th: 'หลังจากกำหนดค่าเสร็จสิ้น ให้เปิด terminal ใหม่แล้วรันคำสั่งต่อไปนี้เพื่อเริ่มใช้งาน Cline CLI:', en: 'After completing the configuration, open a new terminal and run the following command to start Cline CLI:' })}
        </p>
        {renderCopyableCommandBlock('cline', { marginBottom: '1rem' })}
        <p style={{ marginBottom: '1.5rem', opacity: 0.85 }}>
          {localizeText(language, { th: 'หากคุณต้องการอินเทอร์เฟซแบบเทอร์มินัลคลาสสิก ให้พิมพ์ Exit แล้วรัน cline --tui เพื่อกลับสู่สภาพแวดล้อมที่คุ้นเคย', en: 'If you prefer the classic terminal interface, select Exit and run cline --tui to return to the familiar command-line environment.' })}
        </p>
      </section>

      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.6rem', marginBottom: '1rem', color: 'var(--pg-text-bright, #fff)' }}>
          {localizeText(language, { th: 'การใช้งาน Cline IDE Plugin', en: 'Use Cline IDE Plugin' })}
        </h2>
        
        <h3 style={{ fontSize: '1.3rem', marginBottom: '0.75rem' }}>
          {localizeText(language, { th: 'ติดตั้ง Plugin', en: 'Install Plugin' })}
        </h3>
        <p style={{ marginBottom: '1.5rem', opacity: 0.85 }}>
          {localizeText(language, { th: 'ค้นหาและติดตั้งปลั๊กอิน Cline ใน VS Code Extensions marketplace', en: 'Search for and install the Cline plugin in the VS Code Extensions marketplace.' })}
        </p>
        <figure style={{ margin: '0 0 2rem 0' }}>
          <img
            src={CLINE_IMAGES.installPlugin.src}
            alt={localizeText(language, CLINE_IMAGES.installPlugin.alt)}
            style={{
              display: 'block',
              width: '100%',
              maxWidth: '980px',
              height: 'auto',
              borderRadius: '12px',
              border: '1px solid rgba(148, 163, 184, 0.25)',
              boxShadow: '0 12px 30px rgba(2, 6, 23, 0.35)',
            }}
            loading="lazy"
          />
          <figcaption style={{ marginTop: '0.6rem', fontSize: '0.85rem', opacity: 0.75 }}>
            {localizeText(language, {
              th: CLINE_IMAGES.installPlugin.caption.th,
              en: CLINE_IMAGES.installPlugin.caption.en,
            })}
          </figcaption>
        </figure>

        <h3 style={{ fontSize: '1.3rem', marginBottom: '0.75rem' }}>
          {localizeText(language, { th: 'กำหนดการตั้งค่าพื้นฐาน', en: 'Configure Basic Settings' })}
        </h3>
        <p style={{ marginBottom: '1.5rem', opacity: 0.85 }}>
          {localizeText(language, { th: 'เปิดปลั๊กอิน Cline ใน VS Code และกรอกข้อมูลการตั้งค่าต่อไปนี้ (สำหรับ Hanuman API):', en: 'Open the Cline plugin in VS Code and fill in the following configuration (for Hanuman API):' })}
        </p>

        <div style={{ 
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(0, 0, 0, 0.2) 100%)',
          padding: '1.5rem',
          borderRadius: '16px',
          border: '1px solid rgba(16, 185, 129, 0.1)',
          marginBottom: '2rem'
        }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, lineHeight: 1.8 }}>
            <li style={{ display: 'flex', gap: '1rem', marginBottom: '10px' }}>
              <span style={{ color: '#888', minWidth: '120px' }}>API Provider:</span>
              <span style={{ color: '#a78bfa', fontWeight: 'bold' }}>OpenAI Compatible</span>
            </li>
            <li style={{ display: 'flex', gap: '1rem', marginBottom: '10px' }}>
              <span style={{ color: '#888', minWidth: '120px' }}>Base URL:</span>
              <span style={{ color: '#fbbf24', wordBreak: 'break-all' }}>https://api.pygrassreal.ai/v1</span>
            </li>
            <li style={{ display: 'flex', gap: '1rem', marginBottom: '10px' }}>
              <span style={{ color: '#888', minWidth: '120px' }}>API Key:</span>
              <span style={{ color: '#fff' }}>pgr_... (Your Secret Key)</span>
            </li>
            <li style={{ display: 'flex', gap: '1rem' }}>
              <span style={{ color: '#888', minWidth: '120px' }}>Model ID:</span>
              <span style={{ color: '#10b981', fontWeight: 'bold' }}>pygrassreal/hanuman1.1</span>
            </li>
          </ul>
        </div>

        <div style={{ 
          padding: '1.5rem', 
          background: 'rgba(251, 191, 36, 0.03)', 
          borderLeft: '4px solid #fbbf24', 
          borderRadius: '4px',
          marginBottom: '2rem'
        }}>
          <h4 style={{ color: '#fbbf24', marginBottom: '0.5rem', fontSize: '1.1rem' }}>
            {localizeText(language, { th: '💡 เคล็ดลับสำหรับ Cline', en: '💡 Pro Tip for Cline' })}
          </h4>
          <p style={{ fontSize: '0.9rem', opacity: 0.8, lineHeight: 1.6 }}>
            {localizeText(language, { 
              th: 'หนุมาน 1.1 รองรับการจบงานผ่าน attempt_completion โดยอัตโนมัติ คุณสามารถเปิดใช้งาน "Plan Mode" และ "Act Mode" ได้อย่างเต็มประสิทธิภาพโดยไม่เกิดข้อผิดพลาดเครื่องมือ',
              en: 'Hanuman 1.1 supports task finalization via attempt_completion automatically. You can use Plan and Act modes effectively without tool errors.'
            })}
          </p>
        </div>

        <h3 style={{ fontSize: '1.3rem', marginBottom: '0.75rem' }}>
          {localizeText(language, { th: 'ข้อแนะนำการตั้งค่าเพิ่มเติม', en: 'Additional Setting Recommendations' })}
        </h3>
        <ul style={{ paddingLeft: '1.5rem', marginBottom: '1.5rem', opacity: 0.85, lineHeight: 1.6 }}>
          <li><strong>Context Window:</strong> 1,000,000 tokens</li>
          <li><strong>Max Tokens:</strong> 4,000 (Recommended)</li>
          <li><strong>Temperature:</strong> 0.2 ถึง 0.7</li>
          <li><strong>Custom Instructions:</strong> "You are Hanuman 1.1, an architectural engineering AI specialist. Focus on CAD standards and building codes."</li>
        </ul>

        <h3 style={{ fontSize: '1.3rem', marginBottom: '0.75rem' }}>
          {localizeText(language, { th: 'เริ่มใช้งานปลั๊กอิน Cline', en: 'Start and Use Cline Plugin' })}
        </h3>
        <p style={{ marginBottom: '1.5rem', opacity: 0.85 }}>
          {localizeText(language, { th: 'หลังจากตั้งค่าสำเร็จ ให้ป้อนคำขอของคุณในกล่องข้อความ ตัวอย่างเช่น เพื่อสร้างโค้ด:', en: 'After successful configuration, enter your request in the input box, for example to generate code:' })}
        </p>
      </section>

    </article>
  );
}

