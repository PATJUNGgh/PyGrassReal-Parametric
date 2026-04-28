import { useState, type CSSProperties } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { localizeText, useLanguage } from '../../i18n/language';

interface OpenClawConfigurationTabProps {
  id?: string;
}

export function OpenClawConfigurationTab({ id }: OpenClawConfigurationTabProps) {
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
    styleOverride: CSSProperties = {},
    syntaxLanguage?: string,
  ) => (
    <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
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
    <article id={id} className="openclaw-config-content" style={{ 
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
          {localizeText(language, { th: 'การตั้งค่า OpenClaw', en: 'OpenClaw Configuration' })}
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
            th: 'OpenClaw รองรับการเชื่อมต่อกับ Hanuman API ผ่านโปรโตคอล OpenAI Compatible ดูคำแนะนำนี้สำหรับการตั้งค่าและการใช้งาน',
            en: 'OpenClaw supports connecting to Hanuman API via the OpenAI Compatible protocol. Refer to this guide for configuration and usage.'
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
          {localizeText(language, { th: 'ติดตั้ง OpenClaw', en: 'Install OpenClaw' })}
        </h2>
        <p style={{ 
          marginBottom: '1rem', 
          opacity: 0.85,
          wordBreak: 'break-word',
          overflowWrap: 'anywhere'
        }}>
          {localizeText(language, { th: 'เงื่อนไขเบื้องต้น: Node.js 22 ขึ้นไป', en: 'Precondition: Node.js 22 or later' })}
        </p>

        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>
          macOS/Linux:
        </h3>
        {renderCopyableCommandBlock('curl -fsSL https://openclaw.ai/install.sh | bash', {}, 'bash')}

        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>
          Windows (PowerShell):
        </h3>
        {renderCopyableCommandBlock('iwr -useb https://openclaw.ai/install.ps1 | iex', {}, 'powershell')}

        <div style={{ padding: '1rem', borderRadius: '8px', background: 'var(--pg-code-bg, #1e1e1e)', color: '#fff', marginBottom: '2.5rem', fontFamily: 'monospace', fontSize: '0.9rem' }}>
          <p style={{ color: '#ff5f56', margin: 0 }}>🦞 OpenClaw 2025.3.13 (61d171a)</p>
          <p style={{ opacity: 0.8, margin: '0.25rem 0' }}>Your terminal just grew claws—type something and let the bot pinch the busywork.</p>
          <pre style={{ color: '#fff', margin: '0.5rem 0 0 0', lineHeight: 1.1 }}>
{` ██████╗ ██████╗ ███████╗███╗   ██╗ ██████╗██╗      █████╗ ██╗    ██╗
██╔═══██╗██╔══██╗██╔════╝████╗  ██║██╔════╝██║     ██╔══██╗██║    ██║
██║   ██║██████╔╝█████╗  ██╔██╗ ██║██║     ██║     ███████║██║ █╗ ██║
██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║██║     ██║     ██╔══██║██║███╗██║
╚██████╔╝██║     ███████╗██║ ╚████║╚██████╗███████╗██║  ██║╚███╔███╔╝
 ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝ ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝ 
                     🦞 OPENCLAW 🦞`}
          </pre>
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
          {localizeText(language, { th: 'การใช้งานการตั้งค่า (Configuration Usage)', en: 'Configuration Usage' })}
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

        <div className="pg-developer-table-wrap openclaw-credentials-table-wrap" style={{ marginBottom: '2.5rem' }}>
          <table className="pg-developer-table openclaw-credentials-table" style={{ textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--pg-border-color)' }}>
                <th style={{ padding: '0.75rem' }}>{localizeText(language, { th: 'รูปแบบการใช้งาน', en: 'Usage' })}</th>
                <th style={{ padding: '0.75rem' }}>{localizeText(language, { th: 'คำอธิบาย', en: 'Description' })}</th>
                <th style={{ padding: '0.75rem' }}>{localizeText(language, { th: 'วิธีรับข้อมูล (BASE_URL และ API Key ด้านล่างเป็นเพียงตัวอย่าง)', en: 'Acquisition Method (BASE_URL and API Key below are both examples)' })}</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--pg-border-color)' }}>
                <td style={{ padding: '1rem 0.75rem', verticalAlign: 'top', fontWeight: 'bold' }}>Hanuman API (Custom)</td>
                <td style={{ padding: '1rem 0.75rem', verticalAlign: 'top', opacity: 0.85 }}>
                  {localizeText(language, { th: 'เชื่อมต่อโดยตรงผ่าน Hanuman OpenAI-compatible endpoint', en: 'Direct connection via Hanuman OpenAI-compatible endpoint' })}
                </td>
                <td style={{ padding: '1rem 0.75rem', verticalAlign: 'top' }}>
                  <ul className="openclaw-credentials-list" style={{ margin: 0, paddingLeft: '1.5rem', opacity: 0.85, lineHeight: 1.6 }}>
                    <li>
                      <strong>Base URL:</strong> <code style={{ wordBreak: 'break-all' }}>https://api.pygrassreal.ai/v1</code>
                    </li>
                    <li>
                      <strong>API Key:</strong> <code>pgr_...</code>
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
          {localizeText(language, { th: 'การตั้งค่า (Configure)', en: 'Configure' })}
        </h3>
        <p style={{ marginBottom: '1rem', opacity: 0.85 }}>
          {localizeText(language, { th: 'คุณสามารถตั้งค่าตัวแปรสภาพแวดล้อมเพื่อใช้งาน OpenClaw ได้ดังนี้:', en: 'You can set the environment variables to use OpenClaw as follows:' })}
        </p>
        {renderCopyableCommandBlock(`# macOS/Linux
export OPENCLAW_BASE_URL="https://api.pygrassreal.ai/v1"
export OPENCLAW_API_KEY="pgr_..."

# Windows (PowerShell)
$env:OPENCLAW_BASE_URL="https://api.pygrassreal.ai/v1"
$env:OPENCLAW_API_KEY="pgr_..."`, { fontSize: '0.9rem' }, 'bash')}
        
        <p style={{ marginBottom: '1rem', opacity: 0.85 }}>
          {localizeText(language, { th: 'หลังตั้งค่า Environment Variables แล้ว ให้เริ่มต้นตั้งค่า OpenClaw Onboard ให้ครบก่อนด้วยคำสั่งนี้:', en: 'After setting the environment variables, complete the initial OpenClaw onboarding first with this command:' })}
        </p>
        {renderCopyableCommandBlock('openclaw onboard')}

        <p style={{ marginBottom: '1.5rem', opacity: 0.85 }}>
          {localizeText(language, { th: 'เมื่อทำ Onboard ครบแล้ว ก่อนใช้งาน OpenClaw Dashboard หรือ OpenClaw TUI ให้รัน gateway ก่อนด้วยคำสั่งนี้:', en: 'After completing onboarding, start the gateway with this command before using OpenClaw Dashboard or OpenClaw TUI:' })}
        </p>
        {renderCopyableCommandBlock('openclaw gateway --force')}

        <p style={{ marginBottom: '1rem', opacity: 0.85 }}>
          {localizeText(language, { th: 'เมื่อ gateway พร้อมแล้ว คุณสามารถเปิดโหมดที่ต้องการใช้งานได้ดังนี้:', en: 'After the gateway is ready, you can launch the mode you want to use:' })}
        </p>
        {renderCopyableCommandBlock(`openclaw dashboard
openclaw tui`, { fontSize: '0.9rem' }, 'bash')}

        <p style={{ marginBottom: 0, opacity: 0.8 }}>
          {localizeText(language, { th: 'หากต้องการใช้งานแบบปกติจากคำสั่งหลัก สามารถใช้ openclaw ได้เช่นกัน', en: 'If you prefer the default entry command, you can still use openclaw as well.' })}
        </p>
      </section>

    </article>
  );
}
