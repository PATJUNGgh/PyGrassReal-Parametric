import { useState, type CSSProperties } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { localizeText, useLanguage } from '../../i18n/language';

interface KiloCodeConfigurationTabProps {
  id?: string;
}

export function KiloCodeConfigurationTab({ id }: KiloCodeConfigurationTabProps) {
  const { language } = useLanguage();
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const baseUrlExample = 'https://api.pygrassreal.ai/v1';
  const modelIdExample = 'pygrassreal/hanuman1.1';

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
    codeStyleOverride?: CSSProperties,
    syntaxLanguage?: string,
  ) => (
    <div style={{ position: 'relative', marginBottom: styleOverride?.marginBottom ?? '1.5rem' }}>
      <button
        type="button"
        onClick={() => void copyText(command)}
        aria-label={copiedCommand === command
          ? localizeText(language, { th: 'คัดลอกแล้ว', en: 'Copied' })
          : localizeText(language, { th: 'คัดลอก', en: 'Copy' })}
        title={copiedCommand === command
          ? localizeText(language, { th: 'คัดลอกแล้ว', en: 'Copied' })
          : localizeText(language, { th: 'คัดลอก', en: 'Copy' })}
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
      </button>
      {syntaxLanguage ? (
        <SyntaxHighlighter
          language={syntaxLanguage}
          style={vscDarkPlus as Record<string, CSSProperties>}
          PreTag="div"
          customStyle={{
            ...commandBlockStyle,
            ...styleOverride,
            marginBottom: 0,
            paddingRight: '4.25rem',
          }}
          codeTagProps={{ style: { ...commandCodeStyle, ...codeStyleOverride } }}
        >
          {command}
        </SyntaxHighlighter>
      ) : (
        <pre
          style={{
            ...commandBlockStyle,
            ...styleOverride,
            marginBottom: 0,
            paddingRight: '4.25rem',
          }}
        >
          <code style={{ ...commandCodeStyle, ...codeStyleOverride }}>{command}</code>
        </pre>
      )}
    </div>
  );

  return (
    <article id={id} className="kilocode-config-content" style={{ 
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
          {localizeText(language, { th: 'การตั้งค่า Kilo Code', en: 'Kilo Code Configuration' })}
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
            th: 'Kilo ใน VS Code รองรับการเชื่อมต่อกับ Hanuman API ผ่านโปรโตคอล OpenAI Compatible ดูขั้นตอนการตั้งค่าด้านล่างเพื่อเริ่มต้นใช้งาน',
            en: 'Kilo in VS Code supports connecting to Hanuman API via the OpenAI Compatible protocol. See the setup steps below to get started.'
          })}
        </p>
      </header>

      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{
          padding: '1rem 1.1rem',
          borderRadius: '12px',
          background: 'rgba(37, 99, 235, 0.12)',
          border: '1px solid rgba(96, 165, 250, 0.35)',
          color: 'var(--pg-text-soft, #cbd5e1)',
        }}>
          <p style={{ margin: '0 0 0.75rem 0', fontWeight: 700, color: 'var(--pg-text-bright, #fff)' }}>
            {localizeText(language, { th: 'ใช้ Base URL เดียวสำหรับ Kilo CLI และ IDE Plugin', en: 'Use the same Base URL for Kilo CLI and IDE Plugin' })}
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(96, 165, 250, 0.35)' }}>
                  <th style={{ padding: '0.75rem 0.85rem' }}>{localizeText(language, { th: 'ประเภท', en: 'Usage Type' })}</th>
                  <th style={{ padding: '0.75rem 0.85rem' }}>Base URL</th>
                  <th style={{ padding: '0.75rem 0.85rem' }}>{localizeText(language, { th: 'สิ่งที่ลูกค้าต้องทำ', en: 'Customer Action' })}</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.18)' }}>
                  <td style={{ padding: '0.9rem 0.85rem', verticalAlign: 'top', fontWeight: 700 }}>
                    {localizeText(language, { th: 'Kilo CLI', en: 'Kilo CLI' })}
                  </td>
                  <td style={{ padding: '0.9rem 0.85rem', verticalAlign: 'top' }}>
                    <code style={{ wordBreak: 'break-all' }}>{baseUrlExample}</code>
                  </td>
                  <td style={{ padding: '0.9rem 0.85rem', verticalAlign: 'top', lineHeight: 1.6 }}>
                    {localizeText(language, {
                      th: 'ใส่ API key และใช้ URL นี้ได้ทันที',
                      en: 'Enter the API key and use this URL directly.'
                    })}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '0.9rem 0.85rem', verticalAlign: 'top', fontWeight: 700 }}>
                    {localizeText(language, { th: 'Kilo IDE Plugin', en: 'Kilo IDE Plugin' })}
                  </td>
                  <td style={{ padding: '0.9rem 0.85rem', verticalAlign: 'top' }}>
                    <code style={{ wordBreak: 'break-all' }}>{baseUrlExample}</code>
                  </td>
                  <td style={{ padding: '0.9rem 0.85rem', verticalAlign: 'top', lineHeight: 1.6 }}>
                    {localizeText(language, {
                      th: 'ใส่ API key และใช้ URL เดียวกับ CLI',
                      en: 'Enter the API key and use the same URL as the CLI.'
                    })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style={{ margin: '0.75rem 0 0 0', lineHeight: 1.6 }}>
            {localizeText(language, {
              th: 'กรอก API key และใช้ Base URL นี้โดยไม่ต้องเติม /cli หรือ /v1 ซ้ำ',
              en: 'Enter the API key and use this Base URL without appending /cli or another /v1.'
            })}
          </p>
        </div>
      </section>

      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ 
          fontSize: '1.6rem', 
          marginBottom: '1rem', 
          color: 'var(--pg-text-bright, #fff)',
          wordBreak: 'break-word',
          overflowWrap: 'anywhere'
        }}>
          {localizeText(language, { th: 'ติดตั้ง Kilo Code CLI', en: 'Install Kilo Code CLI' })}
        </h2>
        <p style={{ 
          marginBottom: '1rem', 
          opacity: 0.85,
          wordBreak: 'break-word',
          overflowWrap: 'anywhere'
        }}>
          {localizeText(language, { th: 'ต้องการ Node.js 18 ขึ้นไป', en: 'Node.js 18 or later is required.' })}
        </p>

        <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{localizeText(language, { th: 'คำสั่งการติดตั้ง:', en: 'Install Command:' })}</p>
        {renderCopyableCommandBlock('npm install -g @kilocode/cli', undefined, undefined, 'bash')}
        
        <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{localizeText(language, { th: 'ตรวจสอบการติดตั้ง (หากแสดงหมายเลขเวอร์ชัน แสดงว่าการติดตั้งสำเร็จ):', en: 'Verify Installation (shows version number if successful):' })}</p>
        {renderCopyableCommandBlock('kilocode --version', { marginBottom: '2.5rem' }, undefined, 'bash')}
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
            th: 'ทั้ง CLI และ IDE Plugin ใช้ Base URL และ Model เดียวกัน:',
            en: 'Both the CLI and IDE Plugin use the same Base URL and model:'
          })}
        </p>

        <div className="pg-developer-table-wrap kilo-credentials-table-wrap" style={{ marginBottom: '2.5rem' }}>
          <table className="pg-developer-table kilo-credentials-table" style={{ textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(30, 41, 59, 0.82)' }}>
                <th style={{ padding: '0.75rem' }}>{localizeText(language, { th: 'ฟิลด์ใน Kilo CLI', en: 'Kilo CLI Field' })}</th>
                <th style={{ padding: '0.75rem' }}>{localizeText(language, { th: 'ค่าที่แนะนำให้กรอก', en: 'Recommended Value' })}</th>
                <th style={{ padding: '0.75rem' }}>{localizeText(language, { th: 'คำอธิบาย (Description)', en: 'Description' })}</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--pg-border-color)' }}>
                <td style={{ padding: '1rem 0.75rem', verticalAlign: 'top', fontWeight: 'bold' }}>Provider ID</td>
                <td style={{ padding: '1rem 0.75rem', verticalAlign: 'top' }}><code>hanuman-1-1</code></td>
                <td style={{ padding: '1rem 0.75rem', verticalAlign: 'top', opacity: 0.85 }}>{localizeText(language, { th: 'รหัสภายใน (ตัวเล็ก/ตัวเลข/ขีดกลาง)', en: 'Internal ID (lowercase letters/numbers/hyphens)' })}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--pg-border-color)' }}>
                <td style={{ padding: '1rem 0.75rem', verticalAlign: 'top', fontWeight: 'bold' }}>Display name</td>
                <td style={{ padding: '1rem 0.75rem', verticalAlign: 'top' }}><code>PyGrassReal</code></td>
                <td style={{ padding: '1rem 0.75rem', verticalAlign: 'top', opacity: 0.85 }}>{localizeText(language, { th: 'ชื่อที่โชว์ในป้ายหน้าแชท', en: 'Name displayed in the chat sidebar' })}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--pg-border-color)' }}>
                <td style={{ padding: '1rem 0.75rem', verticalAlign: 'top', fontWeight: 'bold' }}>Base URL</td>
                <td style={{ padding: '1rem 0.75rem', verticalAlign: 'top' }}><code style={{ wordBreak: 'break-all' }}>{baseUrlExample}</code></td>
                <td style={{ padding: '1rem 0.75rem', verticalAlign: 'top', opacity: 0.85 }}>{localizeText(language, { th: 'ลิงก์ API สำหรับ Kilo CLI และ IDE Plugin', en: 'API endpoint for both Kilo CLI and IDE Plugin' })}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--pg-border-color)' }}>
                <td style={{ padding: '1rem 0.75rem', verticalAlign: 'top', fontWeight: 'bold' }}>API key</td>
                <td style={{ padding: '1rem 0.75rem', verticalAlign: 'top' }}><code>pgr_...</code></td>
                <td style={{ padding: '1rem 0.75rem', verticalAlign: 'top', opacity: 0.85 }}>{localizeText(language, { th: 'คีย์ส่วนตัวของคุณ (pgr_...)', en: 'Your private key (pgr_...)' })}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--pg-border-color)' }}>
                <td style={{ padding: '1rem 0.75rem', verticalAlign: 'top', fontWeight: 'bold' }}>Models</td>
                <td style={{ padding: '1rem 0.75rem', verticalAlign: 'top' }}><code>{modelIdExample}</code></td>
                <td style={{ padding: '1rem 0.75rem', verticalAlign: 'top', opacity: 0.85 }}>{localizeText(language, { th: 'รหัสโมเดล (หรือปล่อยว่างให้ระบบดึงเองอัตโนมัติ)', en: 'Model ID (or leave blank to auto-fetch)' })}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 style={{ fontSize: '1.3rem', marginBottom: '0.75rem' }}>
          {localizeText(language, { th: 'กำหนดการตั้งค่าพื้นฐานใน config.json (CLI)', en: 'Configure Basic Settings in config.json (CLI)' })}
        </h3>
        <p style={{ marginBottom: '1rem', opacity: 0.85 }}>
          {localizeText(language, { th: 'แก้ไขหรือสร้างไฟล์กำหนดค่า ', en: 'Edit or create the ' })}
          <code style={{ padding: '2px 6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--pg-border-color)', borderRadius: '4px' }}>config.json</code>
          {localizeText(language, { th: ' ที่เส้นทางต่อไปนี้:', en: ' configuration file at the following paths:' })}
        </p>
        <ul style={{ paddingLeft: '1.5rem', marginBottom: '1.5rem', opacity: 0.85, lineHeight: 1.6 }}>
          <li><strong>macOS/Linux:</strong> <code style={{ padding: '2px 6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--pg-border-color)', borderRadius: '4px' }}>~/.config/kilo/config.json</code></li>
          <li><strong>Windows:</strong> <code style={{ padding: '2px 6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--pg-border-color)', borderRadius: '4px' }}>User Directory\.config\kilo\config.json</code></li>
        </ul>
        
        <p style={{ marginBottom: '1rem', opacity: 0.85 }}>
          {localizeText(language, { th: 'คัดลอกเนื้อหาต่อไปนี้ลงในไฟล์การตั้งค่า (แทนที่ ', en: 'Copy the following content into the configuration file (replace ' })}
          <code style={{ padding: '2px 6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--pg-border-color)', borderRadius: '4px' }}>BASE_URL</code>
          {localizeText(language, { th: ' และ ', en: ' and ' })}
          <code style={{ padding: '2px 6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--pg-border-color)', borderRadius: '4px' }}>API Key</code>
          {localizeText(language, { th: ' ตามต้องการ):', en: ' as needed):' })}
        </p>

        {renderCopyableCommandBlock(`{
  "$schema": "https://kilo.ai/config.json",
  "disabled_providers": [],
  "provider": {
    "hanuman": {
      "name": "Hanuman 1.1",
      "npm": "@ai-sdk/openai-compatible",
      "models": {
        "${modelIdExample}": {
          "name": "Hanuman 1.1",
          "options": {
            "thinking": { "type": "enabled" }
          }
        }
      },
      "options": {
        "apiKey": "pgr_...",
        "baseURL": "${baseUrlExample}"
      }
    }
  },
  "permission": { "bash": "allow" }
}`, {
          marginBottom: '2rem',
          padding: '1.25rem',
          borderRadius: '12px',
          background: '#1e1e1e',
          fontSize: '0.9rem',
          lineHeight: 1.5,
        }, {
          fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
        }, 'json')}

        <div style={{ padding: '1rem', borderRadius: '8px', backgroundColor: 'var(--pg-alert-bg, rgba(59, 130, 246, 0.1))', border: '1px solid var(--pg-alert-border, rgba(59, 130, 246, 0.3))', marginBottom: '1.5rem' }}>
          <p style={{ margin: 0, opacity: 0.9, lineHeight: 1.6 }}>
            {localizeText(language, { th: 'สำหรับข้อมูลการกำหนดค่าโดยละเอียดเพิ่มเติม โปรดไปที่เอกสารอย่างเป็นทางการของ Kilo Code CLI', en: 'For more detailed configuration information, visit the Kilo Code CLI Official Documentation.' })}
          </p>
        </div>

        <h3 style={{ fontSize: '1.3rem', marginBottom: '0.75rem' }}>
          {localizeText(language, { th: 'การใช้งาน Kilo Code CLI', en: 'Using Kilo Code CLI' })}
        </h3>
        <p style={{ marginBottom: '1rem', opacity: 0.85 }}>
          {localizeText(language, { th: 'หลังจากกำหนดค่าด้านบนเสร็จสิ้น ให้เปิด terminal ใหม่แล้วรันคำสั่งต่อไปนี้เพื่อเริ่มใช้งาน Kilo Code CLI:', en: 'After completing the above configuration, open a new terminal and run the following command to start Kilo Code CLI:' })}
        </p>
        {renderCopyableCommandBlock('kilocode', { marginBottom: '1rem' }, undefined, 'bash')}
        <p style={{ marginBottom: '1.5rem', opacity: 0.85 }}>
          {localizeText(language, { th: 'เมื่อเริ่มทำงานแล้ว ให้พิมพ์ /models เพื่อสลับโมเดล และคุณสามารถใช้โมเดล Hanuman ใน Kilo Code CLI ได้ทันที', en: 'Once started, enter /models to switch models, and you can use Hanuman models in Kilo Code CLI.' })}
        </p>
      </section>

      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.6rem', marginBottom: '1rem', color: 'var(--pg-text-bright, #fff)' }}>
          {localizeText(language, { th: 'การใช้งาน Kilo Code IDE Plugin', en: 'Using Kilo Code IDE Plugin' })}
        </h2>

        <div style={{
          padding: '1rem',
          borderRadius: '10px',
          background: 'rgba(15, 23, 42, 0.65)',
          border: '1px solid rgba(148, 163, 184, 0.25)',
          marginBottom: '1.25rem',
        }}>
          <p style={{ margin: 0, lineHeight: 1.6, opacity: 0.9 }}>
            {localizeText(language, {
              th: 'สำหรับ IDE Plugin ให้ใช้ Base URL เดียวกับ CLI และห้ามเติม /cli หรือ /v1 ซ้ำ',
              en: 'For the IDE Plugin, use the same Base URL as the CLI and do not append /cli or another /v1.'
            })}{' '}
            <code style={{ wordBreak: 'break-all' }}>{baseUrlExample}</code>
          </p>
        </div>

        <h3 style={{ fontSize: '1.3rem', marginBottom: '0.75rem' }}>
          {localizeText(language, { th: 'ติดตั้ง Plugin', en: 'Install Plugin' })}
        </h3>
        <p style={{ marginBottom: '1.5rem', opacity: 0.85 }}>
          {localizeText(language, { th: 'ค้นหาและติดตั้งปลั๊กอิน Kilo Code ใน VS Code Extensions marketplace', en: 'Search for and install the Kilo Code plugin in the VS Code Extensions marketplace.' })}
        </p>

        <h3 style={{ fontSize: '1.3rem', marginBottom: '0.75rem' }}>
          {localizeText(language, { th: 'กำหนดการตั้งค่าพื้นฐาน', en: 'Configure Basic Settings' })}
        </h3>
        <p style={{ marginBottom: '1.5rem', opacity: 0.85 }}>
          {localizeText(language, { th: 'เปิด Kilo Code ใน VS Code และทำตามขั้นตอนดังนี้:', en: 'Open Kilo Code in VS Code and follow these steps:' })}
        </p>
        <ol style={{ paddingLeft: '1.5rem', opacity: 0.85, lineHeight: 1.8 }}>
          <li>{localizeText(language, { th: 'เปิด Kilo sidebar -> กดไอคอนเฟือง (Settings) -> ไปที่แท็บ Providers', en: 'Open Kilo sidebar -> Click Gear icon (Settings) -> Go to Providers tab' })}</li>
          <li>{localizeText(language, { th: 'เลื่อนหา "Popular providers" -> กด "+" ที่ OpenAI Compatible เพื่อเริ่มหน้าจอ Edit Provider', en: 'Find "Popular providers" -> Click "+" on OpenAI Compatible to start Edit Provider' })}</li>
          <li><strong>Provider ID:</strong> <code>hanuman-1-1</code></li>
          <li><strong>Display name:</strong> <code>PyGrassReal</code> ({localizeText(language, { th: 'หรือชื่อแบรนด์ของคุณ', en: 'or your brand name' })})</li>
          <li><strong>Base URL:</strong> <code>{baseUrlExample}</code> ({localizeText(language, { th: 'ใช้ URL เดียวกับ CLI', en: 'use the same URL as the CLI' })})</li>
          <li><strong>API key:</strong> {localizeText(language, { th: 'ระบุ pgr_... API Key ของคุณ', en: 'Enter your pgr_... API Key' })}</li>
          <li><strong>Models:</strong> <code>{modelIdExample}</code> ({localizeText(language, { th: 'หรือทิ้งว่างไว้เพื่อให้ระบบ Auto-fetch', en: 'or leave empty to Auto-fetch' })})</li>
          <li><strong>Max Output Tokens:</strong> <code>4000</code></li>
          <li>{localizeText(language, { th: 'รองรับ Streaming และ Reasoning (Thinking) อัตโนมัติ บันทึกแล้วเริ่มใช้งานได้ทันที!', en: 'Streaming and Reasoning (Thinking) are supported. Save and start chatting!' })}</li>
        </ol>

      </section>

    </article>
  );
}
