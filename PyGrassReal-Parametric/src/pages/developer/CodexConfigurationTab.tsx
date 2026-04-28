import { localizeText, useLanguage } from '../../i18n/language';

interface CodexConfigurationTabProps {
  id?: string;
}

export function CodexConfigurationTab({ id }: CodexConfigurationTabProps) {
  const { language } = useLanguage();

  return (
    <article id={id} className="codex-config-content" style={{ 
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
          {localizeText(language, { th: 'การตั้งค่า Codex', en: 'Codex Configuration' })}
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
            th: 'Codex รองรับการเชื่อมต่อกับ Hanuman API ผ่านโปรโตคอล OpenAI Compatible ดูคำแนะนำนี้สำหรับการตั้งค่าและการใช้งาน',
            en: 'Codex supports connecting to Hanuman API via the OpenAI Compatible protocol. Refer to this guide for configuration and usage.'
          })}
        </p>

        <div style={{ padding: '1rem', borderRadius: '8px', backgroundColor: 'var(--pg-alert-bg, rgba(234, 179, 8, 0.1))', border: '1px solid var(--pg-alert-border, rgba(234, 179, 8, 0.3))', marginTop: '1.5rem' }}>
          <p style={{ margin: 0, opacity: 0.9, lineHeight: 1.6 }}>
            {localizeText(language, {
              th: 'โมเดล Hanuman รองรับการใช้งานร่วมกับ Responses API และ Codex เวอร์ชันล่าสุดที่ใช้ ChatCompletions API',
              en: 'Hanuman Models are compatible with the Responses API and the latest versions of Codex that use the ChatCompletions API.'
            })}
          </p>
        </div>
      </header>

      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ 
          fontSize: '1.6rem', 
          marginBottom: '1rem', 
          color: 'var(--pg-text-bright, #fff)',
          wordBreak: 'break-word',
          overflowWrap: 'anywhere'
        }}>
          {localizeText(language, { th: 'ติดตั้ง Codex CLI', en: 'Install Codex CLI' })}
        </h2>
        <p style={{ 
          marginBottom: '1rem', 
          opacity: 0.85,
          wordBreak: 'break-word',
          overflowWrap: 'anywhere'
        }}>
          {localizeText(language, { th: 'เงื่อนไขเบื้องต้น: ต้องติดตั้ง Node.js 18 หรือสูงกว่าก่อน', en: 'Prerequisites: Node.js 18 or a later version must be installed first.' })}
        </p>

        <p style={{ marginBottom: '0.75rem', fontWeight: 'bold' }}>{localizeText(language, { th: 'คำสั่งการติดตั้ง (ตัวอย่างใช้เวอร์ชัน 0.80.0):', en: 'Installation command (here, version 0.80.0 is used as an example):' })}</p>
        <pre style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: '8px', border: '1px solid var(--pg-border-color)' }}>
          <code>npm install -g @openai/codex@0.80.0</code>
        </pre>

        <p style={{ marginBottom: '0.75rem', fontWeight: 'bold' }}>{localizeText(language, { th: 'ตรวจสอบการติดตั้ง (หากแสดงหมายเลขเวอร์ชัน แสดงว่าการติดตั้งสำเร็จ):', en: 'Verify the installation (a version number output indicates success):' })}</p>
        <pre style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: '8px', border: '1px solid var(--pg-border-color)' }}>
          <code>codex --version</code>
        </pre>
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
                      <strong>model_provider:</strong> <code>openai</code>
                    </li>
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
          {localizeText(language, { th: 'แก้ไขไฟล์กำหนดค่า (Edit Configuration File)', en: 'Edit Configuration File' })}
        </h3>
        <p style={{ marginBottom: '1rem', opacity: 0.85 }}>1. {localizeText(language, { th: 'แก้ไขหรือสร้างไฟล์การตั้งค่าตามเส้นทาง:', en: 'Edit or create the configuration file:' })}</p>
        <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem', opacity: 0.85, lineHeight: 1.6 }}>
          <li><strong>macOS/Linux:</strong> <code style={{ padding: '2px 6px', background: 'var(--pg-code-bg, rgba(0,0,0,0.05))', borderRadius: '4px' }}>~/.codex/config.toml</code></li>
          <li><strong>Windows:</strong> <code style={{ padding: '2px 6px', background: 'var(--pg-code-bg, rgba(0,0,0,0.05))', borderRadius: '4px' }}>User directory\.codex\config.toml</code></li>
        </ul>
        
        <p style={{ marginBottom: '1rem', opacity: 0.85 }}>{localizeText(language, { th: 'คัดลอกเนื้อหาต่อไปนี้ลงในไฟล์การตั้งค่า:', en: 'Copy the following content into the configuration file:' })}</p>

        <div style={{ padding: '1rem', borderRadius: '8px', backgroundColor: 'var(--pg-alert-bg, rgba(234, 179, 8, 0.1))', border: '1px solid var(--pg-alert-border, rgba(234, 179, 8, 0.3))', marginBottom: '1.5rem' }}>
          <p style={{ margin: 0, opacity: 0.9, lineHeight: 1.6 }}>
            {localizeText(language, {
              th: 'เมื่อกำหนดค่าข้อมูลพื้นฐาน คุณต้องตรวจสอบก่อนว่ามีตัวแปรสภาพแวดล้อม HANUMAN_API_KEY อยู่หรือไม่ หากมี โปรดเพิ่มค่าด้วย API Key ที่ได้รับ',
              en: 'When configuring basic information, you need to first check if the HANUMAN_API_KEY environment variable exists. If it does, please add the value with the API Key obtained.'
            })}
          </p>
        </div>

        <pre style={{ marginBottom: '2rem', padding: '1rem', borderRadius: '8px', border: '1px solid var(--pg-border-color)', fontSize: '0.9rem', overflowX: 'auto' }}>
          <code>{`model = "pygrassreal/hanuman1.1"
model_provider = "hanuman"

[model_providers.hanuman]
name = "hanuman"
env_key = "HANUMAN_API_KEY"
base_url = "https://api.pygrassreal.ai/v1"
wire_api = "chat"`}</code>
        </pre>

        <h3 style={{ fontSize: '1.3rem', marginBottom: '0.75rem' }}>
          2. {localizeText(language, { th: 'กำหนดค่าตัวแปรสภาพแวดล้อม HANUMAN_API_KEY', en: 'Configure the environment variable HANUMAN_API_KEY' })}
        </h3>
        <p style={{ marginBottom: '0.75rem', fontWeight: 'bold' }}>macOS/Linux</p>
        <pre style={{ marginBottom: '1rem', padding: '1rem', borderRadius: '8px', border: '1px solid var(--pg-border-color)' }}>
          <code>{`echo 'export HANUMAN_API_KEY="pgr_..."' >> ~/.bashrc
source ~/.bashrc`}</code>
        </pre>
        <p style={{ marginBottom: '0.75rem', fontWeight: 'bold' }}>Windows (CMD)</p>
        <pre style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: '8px', border: '1px solid var(--pg-border-color)' }}>
          <code>{`# Run the following command in CMD
setx HANUMAN_API_KEY "pgr_..."

# After success, open a new command prompt and run the following to verify the variable is set.
echo %HANUMAN_API_KEY%`}</code>
        </pre>

        <h3 style={{ fontSize: '1.3rem', marginBottom: '0.75rem' }}>
          {localizeText(language, { th: 'การใช้งาน Codex CLI', en: 'Using Codex CLI' })}
        </h3>
        <p style={{ marginBottom: '1rem', opacity: 0.85 }}>
          {localizeText(language, { th: 'หลังจากกำหนดค่าด้านบนเสร็จสิ้น ให้เปิด terminal ใหม่แล้วรันคำสั่งต่อไปนี้เพื่อเริ่มใช้งาน Codex CLI:', en: 'After completing the above configuration, open a new terminal and run the following command to start Codex CLI:' })}
        </p>
        <pre style={{ marginBottom: '1rem', padding: '1rem', borderRadius: '8px', border: '1px solid var(--pg-border-color)' }}>
          <code>codex</code>
        </pre>
        <p style={{ marginBottom: '1.5rem', opacity: 0.85 }}>
          {localizeText(language, { th: 'เมื่อเริ่มทำงานแล้ว ให้ข้ามหน้าจอแจ้งเตือนการอัปเดตเพื่อเริ่มใช้โมเดล Hanuman ใน Codex CLI โดยเลือก Skip', en: 'Once started, skip the update prompt to begin using Hanuman models in Codex CLI by selecting Skip.' })}
        </p>
      </section>

    </article>
  );
}
