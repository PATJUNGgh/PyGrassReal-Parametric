import type { LocalizedText } from '../../i18n/language';

interface IntegrationField {
  label: LocalizedText;
  value: string;
  description: LocalizedText;
}

interface IntegrationStep {
  title: LocalizedText;
  description: LocalizedText;
}

export const DEVELOPER_INTEGRATION_EXTENSION = {
  title: { th: 'Integration Extension', en: 'Integration Extension' },
  description: {
    th: 'คู่มือเชื่อม Hanuman API กับ extension เช่น Kilo ใน VS Code โดยใช้ provider แบบ OpenAI-compatible',
    en: 'Guide for connecting Hanuman API to extensions such as Kilo in VS Code through an OpenAI-compatible provider.',
  },
  overviewOfAiToolsTitle: { th: 'Overview of AI Tools', en: 'Overview of AI Tools' },
  overviewOfAiToolsDesc: {
    th: 'Hanuman API รองรับการเชื่อมต่อกับเครื่องมือเขียนโปรแกรม AI ยอดนิยมผ่านโปรโตคอล OpenAI Compatible (รายการเครื่องมือมีการอัปเดตอย่างต่อเนื่อง) คลิกที่เครื่องมือด้านล่างเพื่อดูคู่มือการตั้งค่าเฉพาะ',
    en: 'Hanuman API supports connecting to popular AI programming tools via the OpenAI Compatible protocol. Click on a tool below to view its specific configuration guide.',
  },
  useToolsTitle: { th: 'Use Tools', en: 'Use Tools' },
  aiToolsList: [
    {
      id: 'opencode',
      name: 'OpenCode',
      description: { th: 'ตัวแก้ไขรหัส AI แบบ open-source เน้นทำงานบนเครื่อง (local-first)', en: 'Open-source AI programming editor, local-first' },
      iconClass: 'ai-tool-icon-opencode'
    },
    {
      id: 'openclaw',
      name: 'OpenClaw',
      description: { th: 'AI Coding CLI ขนาดเบา พัฒนาโค้ดได้อย่างมีประสิทธิภาพ', en: 'Lightweight AI Coding CLI, Efficient Development' },
      iconClass: 'ai-tool-icon-openclaw'
    },
    {
      id: 'kilocode',
      name: 'Kilo Code',
      description: { th: 'VS Code Extension ช่วยเติมเต็มโค้ดได้อย่างมีประสิทธิภาพ', en: 'VS Code Extension, Efficient Completion' },
      iconClass: 'ai-tool-icon-kilocode'
    },
    {
      id: 'cline',
      name: 'Cline',
      description: { th: 'ปลั๊กอิน VS Code โค้ดด้วยตัวเอง', en: 'VS Code Plugin, Self-coded' },
      iconClass: 'ai-tool-icon-cline'
    },
    {
      id: 'roocode',
      name: 'Roo Code',
      description: { th: 'VS Code Extension ผู้ช่วยเขียนโปรแกรมตลอดทั้งกระบวนการ', en: 'VS Code Extension, Full Process Coding Assistant' },
      iconClass: 'ai-tool-icon-roocode'
    }
  ],
  configurationMethodsTitle: { th: 'Configuration Methods for Other Tools', en: 'Configuration Methods for Other Tools' },
  coreStepsTitle: { th: 'Core Steps:', en: 'Core Steps:' },
  configurationMethodsSteps: [
    { th: '1. เลือก Provider เป็น OpenAI Compatible ในเครื่องมือที่คุณใช้งาน', en: '1. Select OpenAI Compatible as the Provider in your tool' },
    { th: '2. กรอก Base URL: https://api.pygrassreal.ai/v1', en: '2. Enter Base URL: https://api.pygrassreal.ai/v1' },
    { th: '3. ป้อน API Key แบบตรง ๆ ที่ขึ้นต้นด้วย pgr_... (ไม่ต้องเติม Bearer) และระบุ Model ID: pygrassreal/hanuman1.1', en: '3. Enter the raw API Key that starts with pgr_... (do not add Bearer) and specify Model ID: pygrassreal/hanuman1.1' }
  ],

  overviewTitle: { th: 'ค่าที่ต้องกรอก', en: 'Values to enter' },
  overviewItems: [
    {
      label: { th: 'Provider', en: 'Provider' },
      value: 'OpenAI Compatible',
      description: {
        th: 'เลือก provider ประเภทนี้ใน Kilo เพื่อให้กำหนด custom base URL และ model ได้',
        en: 'Choose this provider in Kilo so you can supply a custom base URL and model.',
      },
    },
    {
      label: { th: 'Base URL', en: 'Base URL' },
      value: 'https://api.pygrassreal.ai/v1',
      description: {
        th: 'ใช้ endpoint หลักของ Hanuman โดยไม่ต้องใส่ secret เพิ่มใน URL',
        en: 'Use the main Hanuman endpoint without embedding secrets in the URL.',
      },
    },
    {
      label: { th: 'API Key', en: 'API Key' },
      value: 'pgr_...',
      description: {
        th: 'ใช้ API key ของ Hanuman เท่านั้น โดยวางค่า pgr_... ตรง ๆ ไม่ต้องเติม Bearer และอย่า commit key ลง repo',
        en: 'Use a Hanuman API key only by pasting the raw pgr_... value without Bearer, and do not commit the key to the repository.',
      },
    },
    {
      label: { th: 'Model', en: 'Model' },
      value: 'pygrassreal/hanuman1.1',
      description: {
        th: 'เป็น public model id หลักของ endpoint นี้ในตอนนี้',
        en: 'This is the current public model id exposed by the endpoint.',
      },
    },
    {
      label: { th: 'Streaming', en: 'Streaming' },
      value: 'Off',
      description: {
        th: 'Hanuman ยังไม่รองรับ `stream=true` ถ้า extension เปิดให้อัตโนมัติให้ปิด',
        en: 'Hanuman does not support `stream=true` yet, so disable it if the extension enables it automatically.',
      },
    },
    {
      label: { th: 'Output Token Limit', en: 'Output Token Limit' },
      value: '1000 max',
      description: {
        th: 'นี่เป็นเพดานของ Hanuman endpoint ไม่ใช่ข้อบังคับพิเศษของ Kilo',
        en: 'This is a Hanuman endpoint cap, not a special Kilo-specific requirement.',
      },
    },
  ] as IntegrationField[],
  stepsTitle: { th: 'ขั้นตอนใน VS Code', en: 'Steps in VS Code' },
  steps: [
    {
      title: { th: '1) เปิด Kilo Settings', en: '1) Open Kilo settings' },
      description: {
        th: 'เปิด Kilo sidebar แล้วกดไอคอนเฟือง จากนั้นเข้าแท็บ Providers',
        en: 'Open the Kilo sidebar, click the gear icon, then go to the Providers tab.',
      },
    },
    {
      title: { th: '2) เลือก OpenAI Compatible', en: '2) Choose OpenAI Compatible' },
      description: {
        th: 'ตั้ง API Provider เป็น `OpenAI Compatible` เพื่อเปิดช่องสำหรับ base URL, key, และ model',
        en: 'Set the API provider to `OpenAI Compatible` so the base URL, key, and model fields are available.',
      },
    },
    {
      title: { th: '3) กรอก Base URL และ API Key', en: '3) Enter the base URL and API key' },
      description: {
        th: 'ใส่ Hanuman base endpoint และ API key รูปแบบ `pgr_...` ของคุณ',
        en: 'Enter the Hanuman base endpoint and your `pgr_...` API key.',
      },
    },
    {
      title: { th: '4) ตั้ง model ให้ตรง', en: '4) Set the correct model' },
      description: {
        th: 'ใส่ `pygrassreal/hanuman1.1` ให้ตรงทุกตัวอักษร ถ้า model ไม่ตรง Kilo จะมองไม่เห็นปลายทางที่ต้องใช้',
        en: 'Enter `pygrassreal/hanuman1.1` exactly. If the model id is wrong, Kilo will not target the right endpoint behavior.',
      },
    },
    {
      title: { th: '5) ปิด streaming', en: '5) Disable streaming' },
      description: {
        th: 'ถ้า extension มีสวิตช์ streaming ให้ปิดก่อน เพราะ Hanuman endpoint นี้ยังไม่รองรับ',
        en: 'If the extension exposes a streaming switch, disable it first because this Hanuman endpoint does not support streaming yet.',
      },
    },
    {
      title: { th: '6) ทดสอบด้วย prompt สั้น ๆ', en: '6) Test with a short prompt' },
      description: {
        th: 'เริ่มจากคำสั่งง่าย ๆ เช่น `ตอบคำว่า ready 1 บรรทัด` เพื่อเช็กว่า config กลางถูกต้องก่อน',
        en: 'Start with a simple prompt such as `Reply with ready in one line` to verify the shared configuration before deeper use.',
      },
    },
  ] as IntegrationStep[],
  noteTitle: { th: 'ข้อสรุปสำคัญ', en: 'Important summary' },
  noteItems: [
    {
      th: 'ตั้งค่า `1000` เฉพาะเมื่อ extension มีช่อง output token limit และค่าปัจจุบันสูงกว่านี้',
      en: 'Set `1000` only when the extension exposes an output token limit field and the current value is higher than that.',
    },
    {
      th: 'ถ้า extension ไม่มีช่องนี้ ให้ใช้ต่อได้เลย ตราบใดที่มันไม่ส่ง `max_tokens` เกินเพดานของ Hanuman',
      en: 'If the extension does not expose that field, you can keep going as long as it is not sending `max_tokens` above Hanuman\'s cap.',
    },
    {
      th: 'อย่าเก็บ key จริงใน `.kilo/kilo.json`, `.kilo/kilo.jsonc`, หรือเอกสารใน repo',
      en: 'Do not store real keys in `.kilo/kilo.json`, `.kilo/kilo.jsonc`, or repository documents.',
    },
  ] as LocalizedText[],
  troubleshootingTitle: { th: 'Troubleshooting', en: 'Troubleshooting' },
  troubleshootingItems: [
    {
      th: '`401` มักหมายถึง API key ไม่ถูกต้อง หมดอายุ หรือถูกปิดใช้งาน',
      en: '`401` usually means the API key is wrong, expired, or disabled.',
    },
    {
      th: '`400` มักเกิดจาก `stream=true` หรือ request มีค่าเกินข้อจำกัดของ Hanuman',
      en: '`400` usually comes from `stream=true` or a request that exceeds Hanuman\'s supported limits.',
    },
    {
      th: '`Model not found` ให้กลับไปเช็ก `pygrassreal/hanuman1.1` ก่อนอย่างอื่น',
      en: 'For `Model not found`, check `pygrassreal/hanuman1.1` before anything else.',
    },
    {
      th: 'ถ้า base URL ปกติใช้ไม่ได้ ค่อยลอง full endpoint URL เป็น fallback',
      en: 'If the normal base URL does not work, try the full endpoint URL as a fallback.',
    },
  ] as LocalizedText[],
  fallbackTitle: { th: 'Fallback Endpoint', en: 'Fallback endpoint' },
  fallbackDescription: {
    th: 'ใช้เฉพาะเมื่อ extension เวอร์ชันที่ใช้อยู่มีปัญหากับการต่อ path อัตโนมัติ',
    en: 'Use this only when the extension version you are using has trouble appending paths automatically.',
  },
  fallbackCode: 'https://api.pygrassreal.ai/v1/chat/completions',
} as const;
