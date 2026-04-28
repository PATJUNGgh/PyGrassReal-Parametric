import { localizeText, useLanguage } from '../../i18n/language';

interface ClaudeCodeConfigurationTabProps {
  id?: string;
}

export function ClaudeCodeConfigurationTab({ id }: ClaudeCodeConfigurationTabProps) {
  const { language } = useLanguage();

  return (
    <article id={id} className="claudecode-config-content" style={{ 
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
          {localizeText(language, { th: 'การตั้งค่า Claude Code', en: 'Claude Code Configuration' })}
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
            th: 'Claude Code รองรับการเชื่อมต่อกับ Hanuman API ผ่านโปรโตคอล OpenAI Compatible ดูขั้นตอนการตั้งค่าด้านล่างเพื่อเริ่มต้นใช้งาน',
            en: 'Claude Code supports connecting to Hanuman API via the OpenAI Compatible protocol. Refer to this guide for configuration and usage.'
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
          {localizeText(language, { th: 'ติดตั้ง Claude Code CLI', en: 'Install Claude Code CLI' })}
        </h2>
        <p style={{ 
          marginBottom: '1rem', 
          opacity: 0.85,
          wordBreak: 'break-word',
          overflowWrap: 'anywhere'
        }}>
          {localizeText(language, { th: 'Claude Code ต้องการ Node.js 18 ขึ้นไป', en: 'Claude Code requires Node.js 18 or later.' })}
        </p>
        <ul style={{ paddingLeft: '1.5rem', marginBottom: '1.5rem', opacity: 0.85, lineHeight: 1.6 }}>
          <li>{localizeText(language, { th: 'Linux/macOS: ไม่จำเป็นต้องตั้งค่าเพิ่มเติม สภาพแวดล้อมเริ่มต้นเพียงพอแล้ว', en: 'Linux/macOS: No additional setup needed, the default environment is sufficient.' })}</li>
          <li>{localizeText(language, { th: 'Windows: ให้ติดตั้ง WSL หรือ Git for Windows จากนั้นรันคำสั่งด้านล่างใน WSL หรือ Git Bash', en: 'Windows: Install WSL or Git for Windows, then run the command below in WSL or Git Bash.' })}</li>
        </ul>

        <p style={{ marginBottom: '0.75rem', fontWeight: 'bold' }}>{localizeText(language, { th: 'คำสั่งการติดตั้ง:', en: 'Installation command:' })}</p>
        <pre style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: '8px', border: '1px solid var(--pg-border-color)', position: 'relative' }}>
          <code>npm install -g @anthropic-ai/claude-code</code>
        </pre>

        <p style={{ marginBottom: '0.75rem', fontWeight: 'bold' }}>{localizeText(language, { th: 'ตรวจสอบการติดตั้ง (หากแสดงหมายเลขเวอร์ชัน แสดงว่าการติดตั้งสำเร็จ):', en: 'Verify the installation (a version number output indicates success):' })}</p>
        <pre style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: '8px', border: '1px solid var(--pg-border-color)' }}>
          <code>claude --version</code>
        </pre>

        <div style={{ padding: '1rem', borderRadius: '8px', backgroundColor: 'var(--pg-alert-bg, rgba(255, 170, 0, 0.1))', border: '1px solid var(--pg-alert-border, rgba(255, 170, 0, 0.3))', marginBottom: '2.5rem' }}>
          <p style={{ margin: 0, opacity: 0.9, lineHeight: 1.6 }}>
            {localizeText(language, { th: 'อย่าเพิ่งเปิดใช้งาน Claude Code ทันทีหลังการติดตั้ง ให้ทำการตั้งค่าด้านล่างให้เสร็จสิ้นก่อน', en: 'Do not launch Claude Code immediately after installation. Complete the configuration below first.' })}
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

        <div style={{ overflowX: 'auto', marginBottom: '2.5rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
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
                  <ul style={{ margin: 0, paddingLeft: '1.5rem', opacity: 0.85, lineHeight: 1.6 }}>
                    <li>
                      <strong>Provider Type:</strong> <code>openai</code>
                    </li>
                    <li>
                      <strong>Base URL:</strong> <code style={{ wordBreak: 'break-all' }}>https://api.pygrassreal.ai/v1</code>
                    </li>
                    <li>
                      <strong>API Key:</strong> <code>pgr_...</code>
                    </li>
                    <li>
                      <strong>Model ID:</strong> <code>pygrassreal/hanuman1.1</code>
                    </li>
                  </ul>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 style={{ fontSize: '1.3rem', marginBottom: '0.75rem' }}>
          {localizeText(language, { th: 'กำหนดค่าการตั้งค่า', en: 'Configure Settings' })}
        </h3>
        
        <div style={{ padding: '1rem', borderRadius: '8px', backgroundColor: 'var(--pg-alert-bg, rgba(255, 170, 0, 0.1))', border: '1px solid var(--pg-alert-border, rgba(255, 170, 0, 0.3))', marginBottom: '1.5rem' }}>
          <p style={{ margin: 0, opacity: 0.9, lineHeight: 1.6 }}>
            {localizeText(language, { th: 'ก่อนเริ่มการกำหนดค่า โปรดลบตัวแปรสภาพแวดล้อม (Environment Variables) ต่อไปนี้ของ Anthropic ออก เพื่อป้องกันปัญหา API ชนกัน:', en: 'Before configuring, make sure to clear the following Anthropic official environment variables to avoid API conflicts:' })}
          </p>
          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
            <code style={{ padding: '2px 6px', background: 'var(--pg-code-inner-bg, rgba(0,0,0,0.08))', borderRadius: '4px' }}>ANTHROPIC_AUTH_TOKEN</code>
            <code style={{ padding: '2px 6px', background: 'var(--pg-code-inner-bg, rgba(0,0,0,0.08))', borderRadius: '4px' }}>ANTHROPIC_BASE_URL</code>
          </div>
        </div>

        <h4 style={{ fontSize: '1.15rem', marginBottom: '0.75rem' }}>
          1. {localizeText(language, { th: 'สร้าง/แก้ไข settings.json', en: 'Create/edit settings.json' })}
        </h4>
        <p style={{ marginBottom: '1rem', opacity: 0.85 }}>
          {localizeText(language, { th: 'หากไม่มีไดเรกทอรี .claude คุณสามารถสร้างขึ้นได้ด้วยตัวเอง', en: 'If the .claude directory does not exist, you can create it manually.' })}
        </p>
        <ul style={{ paddingLeft: '1.5rem', marginBottom: '1.5rem', opacity: 0.85, lineHeight: 1.6 }}>
          <li><strong>macOS/Linux:</strong> <code style={{ padding: '2px 6px', background: 'var(--pg-code-bg, rgba(0,0,0,0.05))', borderRadius: '4px' }}>~/.claude/settings.json</code></li>
          <li><strong>Windows:</strong> <code style={{ padding: '2px 6px', background: 'var(--pg-code-bg, rgba(0,0,0,0.05))', borderRadius: '4px' }}>User directory\.claude\settings.json</code></li>
        </ul>
        
        <p style={{ marginBottom: '1rem', opacity: 0.85 }}>
          {localizeText(language, { th: 'โปรดแทนที่ BASE_URL และ HANUMAN_API_KEY ตามต้องการ:', en: 'Please replace BASE_URL and HANUMAN_API_KEY as needed.' })}
        </p>

        <pre style={{ marginBottom: '2rem', padding: '1rem', borderRadius: '8px', border: '1px solid var(--pg-border-color)', fontSize: '0.9rem', overflowX: 'auto' }}>
          <code>{`{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.pygrassreal.ai/v1",
    "ANTHROPIC_AUTH_TOKEN": "pgr_...",
    "ANTHROPIC_MODEL": "pygrassreal/hanuman1.1",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "pygrassreal/hanuman1.1",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "pygrassreal/hanuman1.1",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "pygrassreal/hanuman1.1"
  }
}`}</code>
        </pre>

        <h4 style={{ fontSize: '1.15rem', marginBottom: '0.75rem' }}>
          2. {localizeText(language, { th: 'สร้าง/แก้ไข .claude.json', en: 'Create/edit .claude.json' })}
        </h4>
        <ul style={{ paddingLeft: '1.5rem', marginBottom: '1.5rem', opacity: 0.85, lineHeight: 1.6 }}>
          <li><strong>macOS/Linux:</strong> <code style={{ padding: '2px 6px', background: 'var(--pg-code-bg, rgba(0,0,0,0.05))', borderRadius: '4px' }}>~/.claude.json</code></li>
          <li><strong>Windows:</strong> <code style={{ padding: '2px 6px', background: 'var(--pg-code-bg, rgba(0,0,0,0.05))', borderRadius: '4px' }}>User directory\.claude.json</code></li>
        </ul>

        <pre style={{ marginBottom: '2rem', padding: '1rem', borderRadius: '8px', border: '1px solid var(--pg-border-color)', fontSize: '0.9rem', overflowX: 'auto' }}>
          <code>{`{
  "hasCompletedOnboarding": true
}`}</code>
        </pre>

        <h4 style={{ fontSize: '1.15rem', marginBottom: '0.75rem' }}>
          3. {localizeText(language, { th: 'นำการตั้งค่าไปใช้', en: 'Apply the configuration' })}
        </h4>
        <p style={{ marginBottom: '1.5rem', opacity: 0.85 }}>
          {localizeText(language, { th: 'หลังจากทำตามขั้นตอนเสร็จสิ้น ให้เปิดหน้าต่าง Terminal ใหม่เพื่อให้การเปลี่ยนแปลงมีผล', en: 'After completing the configuration, reopen the terminal window for the changes to take effect.' })}
        </p>

        <h3 style={{ fontSize: '1.3rem', marginBottom: '0.75rem' }}>
          {localizeText(language, { th: 'การใช้งาน Claude Code CLI', en: 'Using Claude Code CLI' })}
        </h3>
        <p style={{ marginBottom: '1rem', opacity: 0.85 }}>
          {localizeText(language, { th: 'ไปที่ไดเรกทอรีโปรเจกต์ของคุณแล้วรันคำสั่ง:', en: 'Navigate to your project directory and run:' })}
        </p>
        <pre style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: '8px', border: '1px solid var(--pg-border-color)' }}>
          <code>claude</code>
        </pre>
        <p style={{ marginBottom: '1.5rem', opacity: 0.85 }}>
          {localizeText(language, { th: 'ในการรันครั้งแรก ให้เลือก "Trust This Folder" เพื่ออนุญาตให้ Claude Code เข้าถึงไฟล์ในโปรเจกต์ได้ หลังจากนั้นคุณสามารถใช้คำสั่ง /status เพื่อตรวจสอบสถานะการกำหนดค่าและโมเดลปัจจุบันได้', en: 'On first launch, complete the following: select "Trust This Folder" to allow Claude Code to access project files. After startup, use the /status command to verify the current configuration and model status.' })}
        </p>
      </section>

      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.6rem', marginBottom: '1rem', color: 'var(--pg-text-bright, #fff)' }}>
          {localizeText(language, { th: 'การใช้งาน Claude Code IDE Plugin', en: 'Using the Claude Code IDE Plugin' })}
        </h2>
        <p style={{ marginBottom: '1.5rem', opacity: 0.85 }}>
          {localizeText(language, { th: 'Claude Code มีปลั๊กอินสำหรับ VS Code สามารถดูรายละเอียดได้ที่เอกสารอย่างเป็นทางการ', en: 'Claude Code provides a VS Code IDE plugin. For configuration reference, see the official documentation.' })}
          {' '}<a href="https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/getting-started" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--pg-primary-color, #3b82f6)' }}>Use Claude Code in VS Code</a>
        </p>
        
        <h3 style={{ fontSize: '1.3rem', marginBottom: '0.75rem' }}>
          {localizeText(language, { th: 'ติดตั้ง Plugin', en: 'Install the Plugin' })}
        </h3>
        <p style={{ marginBottom: '1.5rem', opacity: 0.85 }}>
          {localizeText(language, { th: 'ค้นหาและติดตั้งปลั๊กอิน "Claude Code for VS Code" จาก VS Code Extensions marketplace', en: 'Search for and install the Claude Code for VS Code plugin from the VS Code Extensions marketplace.' })}
        </p>

        <h3 style={{ fontSize: '1.3rem', marginBottom: '0.75rem' }}>
          {localizeText(language, { th: 'กำหนดค่าเลือกโมเดล', en: 'Configure the Model' })}
        </h3>
        <p style={{ marginBottom: '1.5rem', opacity: 0.85 }}>
          {localizeText(language, { th: 'เปิดการตั้งค่า VS Code ค้นหา "Claude Code: Environment Variables" และตั้งค่าใน settings.json ดังนี้:', en: 'Open VS Code settings, search for "Claude Code: Environment Variables", and then manually configure it in settings.json:' })}
        </p>

        <pre style={{ marginBottom: '2rem', padding: '1rem', borderRadius: '8px', border: '1px solid var(--pg-border-color)', fontSize: '0.9rem', overflowX: 'auto' }}>
          <code>{`{
  "claudeCode.preferredLocation": "panel",
  "claudeCode.selectedModel": "pygrassreal/hanuman1.1",
  "claudeCode.environmentVariables": [
    {
      "name": "ANTHROPIC_BASE_URL",
      "value": "https://api.pygrassreal.ai/v1"
    },
    {
      "name": "ANTHROPIC_AUTH_TOKEN",
      "value": "pgr_..."
    },
    {
      "name": "ANTHROPIC_DEFAULT_SONNET_MODEL",
      "value": "pygrassreal/hanuman1.1"
    },
    {
      "name": "ANTHROPIC_DEFAULT_OPUS_MODEL",
      "value": "pygrassreal/hanuman1.1"
    }
  ]
}`}</code>
        </pre>
      </section>

    </article>
  );
}
