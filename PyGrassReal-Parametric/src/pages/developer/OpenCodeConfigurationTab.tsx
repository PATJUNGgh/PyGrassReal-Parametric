import { useState, type CSSProperties } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { localizeText, useLanguage } from '../../i18n/language';

interface OpenCodeConfigurationTabProps {
  id?: string;
}

export function OpenCodeConfigurationTab({ id }: OpenCodeConfigurationTabProps) {
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

  const renderLegacyCopyableCommandBlock = (command: string) => (
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
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        {copiedCommand === command
          ? localizeText(language, { th: 'คัดลอกแล้ว', en: 'Copied' })
          : localizeText(language, { th: 'คัดลอก', en: 'Copy' })}
      </button>
      <pre style={{ ...commandBlockStyle, marginBottom: 0, paddingRight: '4.25rem' }}>
        <code style={commandCodeStyle}>{command}</code>
      </pre>
    </div>
  );

  const renderCopyableCommandBlock = (command: string, syntaxLanguage?: string) => (
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
          customStyle={{ ...commandBlockStyle, marginBottom: 0, paddingRight: '4.25rem' }}
          codeTagProps={{ style: commandCodeStyle }}
        >
          {command}
        </SyntaxHighlighter>
      ) : (
        <pre style={{ ...commandBlockStyle, marginBottom: 0, paddingRight: '4.25rem' }}>
          <code style={commandCodeStyle}>{command}</code>
        </pre>
      )}
    </div>
  );

  void renderLegacyCopyableCommandBlock;

  const opencodeConfigJson = `{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "hanuman": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Hanuman",
      "options": {
        "baseURL": "https://api.pygrassreal.ai/v1",
        "apiKey": "pgr_..."
      },
      "models": {
        "hanuman-1-1": {
          "name": "pygrassreal/hanuman1.1",
          "limit": {
            "context": 4096,
            "output": 1000
          }
        }
      }
    }
  }
}`;

  return (
    <article id={id} className="opencode-config-content" style={{ 
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
          {localizeText(language, { th: 'การตั้งค่า OpenCode', en: 'OpenCode Configuration' })}
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
            th: 'OpenCode รองรับการเชื่อมต่อกับ Hanuman API ผ่านโปรโตคอล OpenAI Compatible ดูคำแนะนำนี้สำหรับการตั้งค่าและการใช้งาน',
            en: 'OpenCode supports connecting to Hanuman API via the OpenAI Compatible protocol. Refer to this guide for configuration and usage.'
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
          {localizeText(language, { th: 'ติดตั้ง OpenCode CLI', en: 'Install OpenCode CLI' })}
        </h2>
        <p style={{ 
          marginBottom: '1rem', 
          opacity: 0.85,
          wordBreak: 'break-word',
          overflowWrap: 'anywhere'
        }}>
          {localizeText(language, { th: 'OpenCode รองรับการติดตั้งสองวิธี', en: 'OpenCode supports two installation methods.' })}
        </p>

        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>
          {localizeText(language, { th: 'วิธีที่ 1: ติดตั้งผ่าน Script ทางการ (สำหรับ macOS/Linux)', en: 'Method 1: Official Script Installation (for macOS/Linux)' })}
        </h3>
        {renderCopyableCommandBlock('curl -fsSL https://opencode.ai/install | bash', 'bash')}

        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>
          {localizeText(language, { th: 'วิธีที่ 2: ติดตั้งผ่าน npm', en: 'Method 2: npm Installation' })}
        </h3>
        <p style={{ marginBottom: '0.75rem', opacity: 0.85 }}>
          {localizeText(language, { th: 'ต้องการ Node.js 18 ขึ้นไป', en: 'Node.js 18 or later is required.' })}
        </p>
        {renderCopyableCommandBlock('npm install -g opencode-ai', 'bash')}

        <p style={{ marginBottom: '0.75rem', opacity: 0.85 }}>
          {localizeText(language, { th: 'ตรวจสอบการติดตั้ง (หากแสดงหมายเลขเวอร์ชัน แสดงว่าการติดตั้งสำเร็จ):', en: 'Verify installation (if a version number is displayed, the installation was successful):' })}
        </p>
        {renderCopyableCommandBlock('opencode -v', 'bash')}
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

        <h3 style={{ 
          fontSize: '1.3rem', 
          marginBottom: '0.75rem',
          wordBreak: 'break-word',
          overflowWrap: 'anywhere'
        }}>
          {localizeText(language, { th: 'รับข้อมูล Credentials', en: 'Obtain Credentials' })}
        </h3>
        <p style={{ marginBottom: '1.5rem', opacity: 0.85 }}>
          {localizeText(language, {
            th: 'รองรับการใช้งานสองรูปแบบ แต่วิธีการรับข้อมูล Credentials ที่สอดคล้องกันจะแตกต่างกัน:',
            en: 'Supports two usage methods, but the corresponding credential acquisition methods are different:'
          })}
        </p>

        <div className="pg-developer-table-wrap opencode-credentials-table-wrap" style={{ marginBottom: '2.5rem' }}>
          <table className="pg-developer-table opencode-credentials-table" style={{ textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--pg-border-color)' }}>
                <th style={{ padding: '0.75rem' }}>{localizeText(language, { th: 'รูปแบบการใช้งาน', en: 'Usage Method' })}</th>
                <th style={{ padding: '0.75rem' }}>{localizeText(language, { th: 'คำอธิบาย', en: 'Description' })}</th>
                <th style={{ padding: '0.75rem' }}>{localizeText(language, { th: 'วิธีรับข้อมูล (BASE_URL และ API Key ด้านล่างเป็นเพียงตัวอย่าง)', en: 'Acquisition Method (BASE_URL and API Key below are examples)' })}</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--pg-border-color)' }}>
                <td style={{ padding: '1rem 0.75rem', verticalAlign: 'top', fontWeight: 'bold' }}>Hanuman API (Custom)</td>
                <td style={{ padding: '1rem 0.75rem', verticalAlign: 'top', opacity: 0.85 }}>
                  {localizeText(language, { th: 'เชื่อมต่อโดยตรงผ่าน Hanuman OpenAI-compatible endpoint', en: 'Direct connection via Hanuman OpenAI-compatible endpoint' })}
                </td>
                <td style={{ padding: '1rem 0.75rem', verticalAlign: 'top' }}>
                  <ul className="opencode-credentials-list" style={{ margin: 0, paddingLeft: '1.5rem', opacity: 0.85, lineHeight: 1.6 }}>
                    <li>
                      <strong>Provider:</strong> <code>hanuman-1-1</code>
                    </li>
                    <li>
                      <strong>Base URL:</strong> <code style={{ wordBreak: 'break-all' }}>https://api.pygrassreal.ai/v1</code>
                    </li>
                    <li>
                      <strong>API Key:</strong> <code>pgr_...</code> {localizeText(language, { th: '(วางค่า key ตรง ๆ ไม่ต้องใส่ Bearer)', en: '(paste the raw key only, without Bearer)' })}
                    </li>
                    <li>
                      <strong>Model:</strong> <code>pygrassreal/hanuman1.1</code>
                    </li>
                  </ul>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 style={{ fontSize: '1.3rem', marginBottom: '0.75rem' }}>
          {localizeText(language, { th: 'กำหนดการตั้งค่าพื้นฐาน', en: 'Configure Basic Settings' })}
        </h3>
        <p style={{ marginBottom: '1rem', opacity: 0.85 }}>
          {localizeText(language, { th: 'แก้ไขหรือสร้างไฟล์คอนฟิก opencode.json ตามพาธต่อไปนี้:', en: 'Edit or create the opencode.json configuration file at the following path:' })}
        </p>
        <ul style={{ paddingLeft: '1.5rem', marginBottom: '1.5rem', opacity: 0.85, lineHeight: 1.6 }}>
          <li style={{ marginBottom: '0.5rem' }}><strong>macOS/Linux:</strong> <code style={{ padding: '2px 6px', background: 'var(--pg-code-bg, rgba(0,0,0,0.05))', borderRadius: '4px' }}>~/.config/opencode/opencode.json</code></li>
          <li><strong>Windows:</strong> <code style={{ padding: '2px 6px', background: 'var(--pg-code-bg, rgba(0,0,0,0.05))', borderRadius: '4px' }}>User Directory\.config\opencode\opencode.json</code></li>
        </ul>
        <p style={{ marginBottom: '1rem', opacity: 0.85 }}>
          {localizeText(language, { th: 'คัดลอกเนื้อหาด้านล่างลงในไฟล์คอนฟิก (แทนที่ BASE_URL และ HANUMAN_API_KEY ตามที่ใช้งาน):', en: 'Copy the following content into the configuration file (replace BASE_URL and HANUMAN_API_KEY as needed):' })}
        </p>
        <div style={{ position: 'relative', marginBottom: '1rem' }}>
          <button
            type="button"
            onClick={() => void copyText(opencodeConfigJson)}
            aria-label={copiedCommand === opencodeConfigJson ? 'Copied' : 'Copy'}
            title={copiedCommand === opencodeConfigJson ? 'Copied' : 'Copy'}
            style={{
              position: 'absolute',
              top: '0.8rem',
              right: '0.8rem',
              zIndex: 1,
              border: '1px solid rgba(148, 163, 184, 0.35)',
              background: copiedCommand === opencodeConfigJson ? 'rgba(34, 197, 94, 0.18)' : 'rgba(15, 23, 42, 0.9)',
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
            {renderCopyIcon(copiedCommand === opencodeConfigJson)}
          </button>
          <pre style={{ ...commandBlockStyle, marginBottom: 0, padding: '1.25rem', paddingRight: '4.25rem', background: '#1e1e1e', fontSize: '0.9rem', lineHeight: 1.5 }}>
            <code style={{ fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace' }}>
              <span style={{ color: '#d4d4d4' }}>{'{'}</span><br />
              {'  '}<span style={{ color: '#9cdcfe' }}>"$schema"</span>: <span style={{ color: '#ce9178' }}>"https://opencode.ai/config.json"</span>,<br />
              {'  '}<span style={{ color: '#9cdcfe' }}>"provider"</span>: <span style={{ color: '#d4d4d4' }}>{'{'}</span><br />
              {'    '}<span style={{ color: '#9cdcfe' }}>"hanuman"</span>: <span style={{ color: '#d4d4d4' }}>{'{'}</span><br />
              {'      '}<span style={{ color: '#9cdcfe' }}>"npm"</span>: <span style={{ color: '#ce9178' }}>"@ai-sdk/openai-compatible"</span>,<br />
              {'      '}<span style={{ color: '#9cdcfe' }}>"name"</span>: <span style={{ color: '#ce9178' }}>"Hanuman"</span>,<br />
              {'      '}<span style={{ color: '#9cdcfe' }}>"options"</span>: <span style={{ color: '#d4d4d4' }}>{'{'}</span><br />
              {'        '}<span style={{ color: '#9cdcfe' }}>"baseURL"</span>: <span style={{ color: '#ce9178' }}>"https://api.pygrassreal.ai/v1"</span>,<br />
              {'        '}<span style={{ color: '#9cdcfe' }}>"apiKey"</span>: <span style={{ color: '#ce9178' }}>"pgr_..."</span><br />
              {'      '}<span style={{ color: '#d4d4d4' }}>{'}'}</span>,<br />
              {'      '}<span style={{ color: '#9cdcfe' }}>"models"</span>: <span style={{ color: '#d4d4d4' }}>{'{'}</span><br />
              {'        '}<span style={{ color: '#9cdcfe' }}>"hanuman-1-1"</span>: <span style={{ color: '#d4d4d4' }}>{'{'}</span><br />
              {'          '}<span style={{ color: '#9cdcfe' }}>"name"</span>: <span style={{ color: '#ce9178' }}>"pygrassreal/hanuman1.1"</span>,<br />
              {'          '}<span style={{ color: '#9cdcfe' }}>"limit"</span>: <span style={{ color: '#d4d4d4' }}>{'{'}</span><br />
              {'            '}<span style={{ color: '#9cdcfe' }}>"context"</span>: <span style={{ color: '#b5cea8' }}>4096</span>,<br />
              {'            '}<span style={{ color: '#9cdcfe' }}>"output"</span>: <span style={{ color: '#b5cea8' }}>1000</span><br />
              {'          '}<span style={{ color: '#d4d4d4' }}>{'}'}</span><br />
              {'        '}<span style={{ color: '#d4d4d4' }}>{'}'}</span><br />
              {'      '}<span style={{ color: '#d4d4d4' }}>{'}'}</span><br />
              {'    '}<span style={{ color: '#d4d4d4' }}>{'}'}</span><br />
              {'  '}<span style={{ color: '#d4d4d4' }}>{'}'}</span><br />
              <span style={{ color: '#d4d4d4' }}>{'}'}</span>
            </code>
          </pre>
        </div>
        <p style={{ marginTop: '0.85rem', marginBottom: '2.5rem', opacity: 0.85, lineHeight: 1.6 }}>
          {localizeText(language, {
            th: 'ในไฟล์ opencode.json ช่อง apiKey ให้ใส่ค่า key แบบตรง ๆ ที่ขึ้นต้นด้วย pgr_ เท่านั้น ไม่ต้องเติมคำว่า Bearer และไม่ต้องใส่เครื่องหมายคำพูด',
            en: 'In opencode.json, the apiKey field must contain only the raw key that starts with pgr_. Do not prepend Bearer and do not wrap the key in quotes.',
          })}
        </p>
        <div style={{ padding: '1rem', borderRadius: '8px', backgroundColor: 'var(--pg-alert-bg, rgba(255, 170, 0, 0.1))', border: '1px solid var(--pg-alert-border, rgba(255, 170, 0, 0.3))', marginBottom: '2.5rem' }}>
          <p style={{ margin: 0, opacity: 0.9, lineHeight: 1.6 }}><strong>Note:</strong> {localizeText(language, { th: 'หากคุณต้องการเปิดความสามารถในการทำความเข้าใจภาพ ให้แก้ไขหรือเพิ่มรายการคอนฟิกภายใต้ models โดยเพิ่ม image ใน modalities ดังนี้:', en: 'If you need to enable the image understanding capability, you need to modify or add the following configuration items under the configuration node of the model that supports this capability. That is, add image to the supported input modalities:' })}</p>
          <pre style={{ margin: '0.5rem 0 0 0', padding: '0.75rem', background: 'var(--pg-code-inner-bg, rgba(0,0,0,0.08))', borderRadius: '6px', overflowX: 'auto' }}>
            <code style={commandCodeStyle}>{`"modalities": {"input": ["text", "image"], "output": ["text"]}`}</code>
          </pre>
        </div>

        <h3 style={{ fontSize: '1.3rem', marginBottom: '0.75rem' }}>
          {localizeText(language, { th: 'การใช้งาน OpenCode CLI', en: 'Use OpenCode CLI' })}
        </h3>
        <p style={{ marginBottom: '1rem', opacity: 0.85 }}>
          {localizeText(language, { th: 'หลังจากตั้งค่าเสร็จสิ้น ไปที่โฟลเดอร์โปรเจกต์ของคุณและรันคำสั่งต่อไปนี้เพื่อเริ่มใช้งาน OpenCode:', en: 'After completing the configuration, navigate to the project directory and run the following command to start OpenCode:' })}
        </p>
        {renderCopyableCommandBlock('opencode')}
        <p style={{ marginBottom: '2.5rem', opacity: 0.85 }}>
          {localizeText(language, { th: 'หลังจากเริ่มต้น พิมพ์ /models เพื่อดูและสลับโมเดลที่มีให้ใช้งาน', en: 'After starting, enter /models to view and switch between available models.' })}
        </p>
      </section>

      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.6rem', marginBottom: '1rem', color: 'var(--pg-text-bright, #fff)' }}>
          {localizeText(language, { th: 'การใช้งาน OpenCode IDE Plugin', en: 'Use OpenCode IDE Plugin' })}
        </h2>
        
        <h3 style={{ fontSize: '1.3rem', marginBottom: '0.75rem' }}>
          {localizeText(language, { th: 'ติดตั้ง Plugin', en: 'Install Plugin' })}
        </h3>
        <p style={{ marginBottom: '1.5rem', opacity: 0.85 }}>
          {localizeText(language, { th: 'ค้นหาและติดตั้งปลั๊กอิน opencode ภายใน VS Code Extensions marketplace', en: 'Search for and install the opencode plugin in the VS Code Extensions marketplace.' })}
        </p>

        <h3 style={{ fontSize: '1.3rem', marginBottom: '0.75rem' }}>
          {localizeText(language, { th: 'กำหนดการตั้งค่า Plugin', en: 'Configure Plugin' })}
        </h3>
        <p style={{ marginBottom: '1.5rem', opacity: 0.85 }}>
          {localizeText(language, { th: 'เปิด OpenCode ใน VS Code และทำตามขั้นตอนดังนี้:', en: 'Open OpenCode in VS Code and follow these steps:' })}
        </p>
        <div style={{ padding: '1rem', borderRadius: '8px', backgroundColor: 'var(--pg-alert-bg, rgba(255, 170, 0, 0.1))', border: '1px solid var(--pg-alert-border, rgba(255, 170, 0, 0.3))', marginBottom: '1.25rem' }}>
          <p style={{ margin: '0 0 0.5rem 0', opacity: 0.92, lineHeight: 1.6 }}>
            <strong>API Key:</strong> {localizeText(language, {
              th: 'ในช่อง API Key ให้วางค่า key ตรง ๆ ที่ขึ้นต้นด้วย pgr_ เท่านั้น ไม่ต้องเติมคำว่า Bearer ไม่ต้องใส่เครื่องหมายคำพูด และไม่ต้องมีช่องว่างหน้า/หลัง',
              en: 'In the API Key field, paste only the raw key that starts with pgr_. Do not add Bearer, do not wrap it in quotes, and do not leave leading or trailing spaces.',
            })}
          </p>
          <pre style={{ margin: 0, padding: '0.75rem', background: 'var(--pg-code-inner-bg, rgba(0,0,0,0.08))', borderRadius: '6px', overflowX: 'auto' }}>
            <code style={commandCodeStyle}>{`Correct: pgr_xxxxxxxxxxxxx
Wrong:   Bearer pgr_xxxxxxxxxxxxx
Wrong:   "pgr_xxxxxxxxxxxxx"`}</code>
          </pre>
        </div>
        <ol style={{ paddingLeft: '1.5rem', opacity: 0.85, lineHeight: 1.8 }}>
          <li>{localizeText(language, { th: 'คลิกไอคอน OpenCode ใน sidebar', en: 'Click the OpenCode icon in the sidebar' })}</li>
          <li>{localizeText(language, { th: 'เลือก "Settings" (ไอคอนเฟือง)', en: 'Select "Settings" (gear icon)' })}</li>
          <li>{localizeText(language, { th: 'เลือก Provider เป็น "hanuman-1-1"', en: 'Select Provider as "hanuman-1-1"' })}</li>
          <li>{localizeText(language, { th: 'กรอก Base URL จากตารางด้านบน', en: 'Fill in the Base URL from the table above' })}</li>
          <li>{localizeText(language, { th: 'กรอก API Key โดยวางค่า pgr_... ตรง ๆ ไม่ต้องเติม Bearer และไม่ต้องใส่เครื่องหมายคำพูด', en: 'Fill in the API Key by pasting the raw pgr_... key directly. Do not add Bearer and do not wrap it in quotes.' })}</li>
          <li>{localizeText(language, { th: 'ในช่อง Model ID ให้ใส่: pygrassreal/hanuman1.1', en: 'In Model ID field, enter: pygrassreal/hanuman1.1' })}</li>
          <li>{localizeText(language, { th: 'บันทึกค่าแล้วเริ่มใช้งานได้ทันที หากรายชื่อโมเดลยังไม่รีเฟรช ให้ปิดและเปิด OpenCode ใหม่หนึ่งครั้ง', en: 'Save settings and start using it. If the model list does not refresh yet, close and reopen OpenCode once.' })}</li>
        </ol>
      </section>

    </article>
  );
}
