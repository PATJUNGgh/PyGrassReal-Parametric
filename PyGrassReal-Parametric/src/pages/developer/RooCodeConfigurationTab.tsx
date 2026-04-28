import { localizeText, useLanguage } from '../../i18n/language';

interface RooCodeConfigurationTabProps {
  id?: string;
}

export function RooCodeConfigurationTab({ id }: RooCodeConfigurationTabProps) {
  const { language } = useLanguage();

  return (
    <article id={id} className="roocode-config-content" style={{ 
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
          {localizeText(language, { th: 'การตั้งค่า Roo Code', en: 'Roo Code Configuration' })}
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
            th: 'Roo Code รองรับการเชื่อมต่อกับ Hanuman API ผ่านโปรโตคอล OpenAI Compatible ดูขั้นตอนการตั้งค่าด้านล่างเพื่อเริ่มต้นใช้งาน',
            en: 'Roo Code supports connecting to Hanuman API via the OpenAI Compatible protocol. Refer to this guide for configuration and usage.'
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
          {localizeText(language, { th: 'ติดตั้ง Roo Code', en: 'Install Roo Code' })}
        </h2>
        <p style={{ 
          marginBottom: '1rem', 
          opacity: 0.85,
          wordBreak: 'break-word',
          overflowWrap: 'anywhere'
        }}>
          {localizeText(language, { th: 'Roo Code เป็นปลั๊กอินการเขียนโค้ด AI สำหรับ VS Code ซึ่งจำเป็นต้องติดตั้งใน VS Code', en: 'Roo Code is an AI coding plugin for VS Code, which needs to be installed in VS Code.' })}
        </p>
        <p style={{ 
          marginBottom: '1.5rem', 
          opacity: 0.85,
          wordBreak: 'break-word',
          overflowWrap: 'anywhere'
        }}>
          {localizeText(language, { th: 'เปิด VS Code คลิกไอคอน Extensions marketplace ที่แถบด้านซ้าย ค้นหา Roo Code แล้วคลิก Install', en: 'Open VS Code, click the Extensions marketplace icon on the left sidebar, search for Roo Code and click Install.' })}
        </p>
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

        <div className="pg-developer-table-wrap roo-credentials-table-wrap" style={{ marginBottom: '2.5rem' }}>
          <table className="pg-developer-table roo-credentials-table" style={{ textAlign: 'left' }}>
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
                  <ul className="roo-credentials-list" style={{ margin: 0, paddingLeft: '1.5rem', opacity: 0.85, lineHeight: 1.6 }}>
                    <li>
                      <strong>API Provider:</strong> <code>hanuman-1-1</code>
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
          {localizeText(language, { th: 'กำหนดการตั้งค่าพื้นฐาน (Configure Basic Settings)', en: 'Configure Basic Settings' })}
        </h3>
        <p style={{ marginBottom: '1.5rem', opacity: 0.85 }}>
          {localizeText(language, { th: 'เปิดปลั๊กอิน Roo Code ใน VS Code และกรอกข้อมูลการตั้งค่าต่อไปนี้ (สำหรับ Hanuman API):', en: 'Open the Roo Code plugin in VS Code and fill in the following settings (for Hanuman API):' })}
        </p>

        <ul style={{ paddingLeft: '1.5rem', marginBottom: '1.5rem', opacity: 0.85, lineHeight: 1.6 }}>
          <li><strong>Required settings:</strong>
            <ul>
              <li><strong>API Provider:</strong> Select <code style={{ padding: '2px 6px', background: 'var(--pg-code-bg, rgba(0,0,0,0.05))', borderRadius: '4px' }}>hanuman-1-1</code></li>
              <li><strong>Base URL:</strong> {localizeText(language, { th: 'กรอก BASE_URL ที่ได้รับจากรูปแบบการใช้งานที่เกี่ยวข้อง', en: 'Fill in the BASE_URL obtained through the corresponding usage method' })}</li>
              <li><strong>API Key:</strong> {localizeText(language, { th: 'API Key ที่ได้รับจากรูปแบบการใช้งานที่เกี่ยวข้อง', en: 'API Key obtained from the corresponding usage method' })}</li>
              <li><strong>Model:</strong> {localizeText(language, { th: 'กรอกชื่อโมเดล pygrassreal/hanuman1.1', en: 'Enter model name pygrassreal/hanuman1.1' })}</li>
            </ul>
          </li>
          <li style={{ marginTop: '1rem' }}><strong>Optional settings:</strong>
            <ul>
              <li>Set <strong>Context Window Size</strong> to <code style={{ padding: '2px 6px', background: 'var(--pg-code-bg, rgba(0,0,0,0.05))', borderRadius: '4px' }}>1048576</code></li>
              <li>Uncheck <strong>Image Support</strong></li>
            </ul>
          </li>
        </ul>
        <p style={{ marginBottom: '1.5rem', opacity: 0.85 }}>
          {localizeText(language, { th: 'พารามิเตอร์อื่นๆ ที่ไม่ได้กล่าวถึงสามารถปรับเปลี่ยนได้ตามต้องการ', en: 'Other unmentioned parameters can be adjusted as needed.' })}
        </p>

        <h3 style={{ fontSize: '1.3rem', marginBottom: '0.75rem' }}>
          {localizeText(language, { th: 'การใช้งาน Roo Code', en: 'Using Roo Code' })}
        </h3>
        <p style={{ marginBottom: '1.5rem', opacity: 0.85 }}>
          {localizeText(language, { th: 'หลังจากตั้งค่าสำเร็จ ให้ป้อนคำขอของคุณในกล่องข้อความ ตัวอย่างเช่น เพื่อสร้างโค้ด:', en: 'After successful configuration, you can enter your requirements in the input box, such as generating code:' })}
        </p>
      </section>

    </article>
  );
}
