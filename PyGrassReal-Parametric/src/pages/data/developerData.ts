import type { LocalizedText } from '../../i18n/language';

export type DeveloperTabId =
  | 'gettingStarted'
  | 'apiReference'
  | 'rateLimits'
  | 'pricing'
  | 'faq'
  | 'termsPolicy';

interface GettingStartedStep {
  title: LocalizedText;
  description: LocalizedText;
}

interface RateLimitRow {
  modelType: string;
  modelName: string;
  concurrencyLimit: string;
  note: LocalizedText;
}

interface PricingRow {
  model: string;
  inputPrice: string;
  cachedInputPrice: string;
  outputPrice: string;
}

interface FaqItem {
  question: LocalizedText;
  answer: LocalizedText;
}

export interface TermsPolicyLink {
  id: string;
  path: string;
  label: LocalizedText;
  description: LocalizedText;
}

export const DEVELOPER_PAGE_DATA = {
  pageTitle: { th: 'นักพัฒนา', en: 'Developer' },
  pageDescription: {
    th: 'เอกสารอธิบายการใช้งาน API ของ PyGrassReal สำหรับนักพัฒนา',
    en: 'API usage reference and guidelines for PyGrassReal developers.',
  },
  hero: {
    chip: { th: 'Developer API', en: 'Developer API' },
    title: { th: 'API Reference และ Guidelines', en: 'API Reference and Guidelines' },
    description: {
      th: 'เริ่มต้นเชื่อมต่อ API ได้ทันที พร้อมข้อกำหนดด้าน authentication, rate limits, pricing และนโยบายที่เกี่ยวข้อง',
      en: 'Get started quickly with API authentication, rate limits, pricing, and policy guidance in one place.',
    },
  },
  tabNavigationLabel: { th: 'เมนูหัวข้อเอกสารนักพัฒนา', en: 'Developer documentation sections' },
  tabs: {
    gettingStarted: { th: 'เริ่มต้นใช้งาน', en: 'Getting Started' },
    apiReference: { th: 'Endpoint และ Auth', en: 'Endpoint and Auth' },
    rateLimits: { th: 'Rate Limits', en: 'Rate Limits' },
    pricing: { th: 'ราคาและ Billing', en: 'Pricing and Billing' },
    faq: { th: 'คำถามพบบ่อย', en: 'FAQ' },
    termsPolicy: { th: 'Terms และ Policy', en: 'Terms and Policy' },
  },
  gettingStarted: {
    title: { th: 'Getting Started', en: 'Getting Started' },
    description: {
      th: 'ทำตามขั้นตอนนี้เพื่อเริ่มใช้งาน API อย่างปลอดภัยและพร้อมใช้งานจริง',
      en: 'Follow these steps to safely launch your first production-ready API integration.',
    },
    steps: [
      {
        title: { th: '1) สร้างบัญชีและเข้าสู่ระบบ', en: '1) Create an account and sign in' },
        description: {
          th: 'ลงทะเบียนผู้ใช้งาน และยืนยันอีเมลก่อนเริ่มสร้าง API key',
          en: 'Register your account and verify your email before creating API keys.',
        },
      },
      {
        title: { th: '2) สร้าง API Key', en: '2) Create an API key' },
        description: {
          th: 'สร้าง key แยกตาม environment เช่น dev/staging/prod และเก็บไว้ใน secrets manager',
          en: 'Create separate keys per environment (dev/staging/prod) and store them in a secrets manager.',
        },
      },
      {
        title: { th: '3) เลือกโมเดลที่เหมาะกับงาน', en: '3) Choose the right model' },
        description: {
          th: 'ใช้ PyGrassReal สำหรับงาน reasoning ทั่วไป และลดต้นทุนด้วยรุ่น lightweight เมื่อเหมาะสม',
          en: 'Use PyGrassReal for general reasoning and switch to lightweight models when cost efficiency matters.',
        },
      },
      {
        title: { th: '4) ทดสอบด้วย request ชุดเล็กก่อน', en: '4) Start with small validation requests' },
        description: {
          th: 'ทดสอบ timeout, retry และ fallback ก่อนขยายปริมาณ traffic',
          en: 'Validate timeout, retry, and fallback behavior before scaling traffic.',
        },
      },
    ] as GettingStartedStep[],
    modelGuideTitle: { th: 'แนวทางเลือกโมเดล', en: 'Model selection guidance' },
    modelGuideItems: [
      {
        th: 'PyGrassReal: เหมาะกับงานตอบคำถามซับซ้อนและ workflow ที่ต้องการ reasoning',
        en: 'PyGrassReal: best for complex reasoning and advanced assistant workflows.',
      },
      {
        th: 'PyGrassReal-Air: เหมาะกับงาน latency ต่ำและคำถามทั่วไปที่ต้องการตอบเร็ว',
        en: 'PyGrassReal-Air: optimized for lower latency and lighter conversational tasks.',
      },
      {
        th: 'Embedding models: เหมาะกับ semantic search, RAG และการจัดกลุ่มเอกสาร',
        en: 'Embedding models: useful for semantic search, RAG, and document clustering.',
      },
    ] as LocalizedText[],
  },
  apiReference: {
    title: { th: 'API Endpoint และ Authentication', en: 'API Endpoint and Authentication' },
    description: {
      th: 'ทุก request ต้องส่งผ่าน HTTPS พร้อม Bearer token ที่ถูกต้อง',
      en: 'All requests must go through HTTPS with a valid Bearer token.',
    },
    endpointLabel: { th: 'Base Endpoint', en: 'Base Endpoint' },
    endpointValue: 'https://api.z.ai/api/paas/v4',
    endpointDescription: {
      th: 'สำหรับ chat completions ให้เรียก path `/chat/completions` ต่อท้ายจาก base endpoint',
      en: 'For chat completions, call the `/chat/completions` path on top of this base endpoint.',
    },
    authLabel: { th: 'Authentication', en: 'Authentication' },
    authDescription: {
      th: 'ใส่ header `Authorization: Bearer <API_KEY>` ในทุก request และห้าม hardcode key ไว้ใน frontend',
      en: 'Send `Authorization: Bearer <API_KEY>` in every request and never hardcode keys in frontend code.',
    },
    requestTitle: { th: 'ตัวอย่าง Request', en: 'Request Example' },
    responseTitle: { th: 'ตัวอย่าง Response', en: 'Response Example' },
    requestExample: `POST /chat/completions HTTP/1.1
Host: api.z.ai
Authorization: Bearer <YOUR_API_KEY>
Content-Type: application/json

{
  "model": "pygrassreal",
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "Summarize this report in 3 bullets." }
  ],
  "temperature": 0.3
}`,
    responseExample: `{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1736900000,
  "model": "pygrassreal",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "1) ... 2) ... 3) ..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 128,
    "completion_tokens": 42,
    "total_tokens": 170
  }
}`,
  },
  rateLimits: {
    title: { th: 'Rate Limits และ Concurrency', en: 'Rate Limits and Concurrency' },
    description: {
      th: 'ตรวจสอบ concurrency ต่อโมเดลเพื่อวางแผน throughput และตั้งค่า retry อย่างเหมาะสม',
      en: 'Use per-model concurrency limits to plan throughput and configure retries correctly.',
    },
    columns: {
      modelType: { th: 'ประเภทโมเดล', en: 'Model Type' },
      modelName: { th: 'ชื่อโมเดล', en: 'Model Name' },
      concurrency: { th: 'Concurrency Limit', en: 'Concurrency Limit' },
      note: { th: 'หมายเหตุ', en: 'Note' },
    },
    rows: [
      {
        modelType: 'Text / Reasoning',
        modelName: 'PyGrassReal',
        concurrencyLimit: '20',
        note: {
          th: 'เหมาะกับ production workload หลัก',
          en: 'Recommended for primary production traffic.',
        },
      },
      {
        modelType: 'Text / Fast',
        modelName: 'PyGrassReal-Air',
        concurrencyLimit: '40',
        note: {
          th: 'รองรับงานที่ต้องการ latency ต่ำ',
          en: 'Good fit for low-latency request bursts.',
        },
      },
      {
        modelType: 'Embedding',
        modelName: 'PyGrassReal-Embedding',
        concurrencyLimit: '60',
        note: {
          th: 'เหมาะกับงาน indexing ปริมาณสูง',
          en: 'Suitable for high-volume indexing jobs.',
        },
      },
    ] as RateLimitRow[],
    behaviorTitle: { th: 'พฤติกรรมเมื่อเกินลิมิต', en: 'Behavior when limit is exceeded' },
    behaviorItems: [
      {
        th: 'ระบบอาจตอบกลับด้วยสถานะ 429 และควร retry ด้วย exponential backoff',
        en: 'The API may return HTTP 429; handle it with exponential backoff retries.',
      },
      {
        th: 'หากมีงาน batch จำนวนมาก ควร queue request ฝั่ง client/server',
        en: 'For large batch jobs, queue requests on your client or server side.',
      },
      {
        th: 'ตั้ง timeout และ circuit-breaker เพื่อป้องกัน cascading failures',
        en: 'Configure timeout and circuit-breakers to avoid cascading failures.',
      },
    ] as LocalizedText[],
  },
  pricing: {
    title: { th: 'Pricing และ Billing', en: 'Pricing and Billing' },
    description: {
      th: 'ประมาณการต้นทุนตาม token usage โดยเฉพาะ input/output และ cache hit ratio',
      en: 'Estimate token costs based on input/output usage and cache hit ratio.',
    },
    tableColumns: {
      model: { th: 'โมเดล', en: 'Model' },
      input: { th: 'Input', en: 'Input' },
      cachedInput: { th: 'Cached Input', en: 'Cached Input' },
      output: { th: 'Output', en: 'Output' },
    },
    rows: [
      {
        model: 'PyGrassReal',
        inputPrice: '$0.60 / 1M tokens',
        cachedInputPrice: '$0.12 / 1M tokens',
        outputPrice: '$1.80 / 1M tokens',
      },
      {
        model: 'PyGrassReal-Air',
        inputPrice: '$0.30 / 1M tokens',
        cachedInputPrice: '$0.06 / 1M tokens',
        outputPrice: '$0.90 / 1M tokens',
      },
      {
        model: 'PyGrassReal-Embedding',
        inputPrice: '$0.08 / 1M tokens',
        cachedInputPrice: '$0.02 / 1M tokens',
        outputPrice: 'N/A',
      },
    ] as PricingRow[],
    cacheTitle: { th: 'Cache Discount Mechanism', en: 'Cache Discount Mechanism' },
    cacheDescription: {
      th: 'เมื่อ request ซ้ำและเกิด cache hit ระบบคิดค่า Cached Input ที่ประมาณ 1/5 ของราคา Input ปกติ',
      en: 'For repeated prompts with cache hits, cached input is billed at roughly one-fifth of standard input price.',
    },
    cacheItems: [
      {
        th: 'แนะนำให้ normalize prompt format เพื่อลด cache miss',
        en: 'Normalize prompt formatting to improve cache-hit consistency.',
      },
      {
        th: 'ตรวจสอบ billing dashboard แบบรายวัน เพื่อจับพฤติกรรมต้นทุนผิดปกติเร็วขึ้น',
        en: 'Review daily billing trends to detect unusual cost spikes early.',
      },
    ] as LocalizedText[],
  },
  faq: {
    title: { th: 'คำถามที่พบบ่อย (FAQ)', en: 'Frequently Asked Questions (FAQ)' },
    description: {
      th: 'คำตอบสั้นสำหรับประเด็นที่ทีมพัฒนามักเจอบ่อยในการใช้งานจริง',
      en: 'Quick answers to the most common integration questions.',
    },
    items: [
      {
        question: {
          th: 'ทำไม cache hit ยังไม่เกิด แม้ส่ง prompt คล้ายเดิม?',
          en: 'Why is there no cache hit even with similar prompts?',
        },
        answer: {
          th: 'cache จะไวต่อความต่างของข้อความและพารามิเตอร์ เช่น temperature หรือ system prompt จึงควรคุมรูปแบบให้คงที่',
          en: 'Cache behavior is sensitive to prompt and parameter differences (for example temperature or system prompt), so keep request templates consistent.',
        },
      },
      {
        question: {
          th: 'ยอดค่าใช้จ่ายแสดงช้ากว่าการใช้งานจริงหรือไม่?',
          en: 'Can billing updates lag behind real-time usage?',
        },
        answer: {
          th: 'โดยทั่วไปอาจมี delay ระยะสั้นใน dashboard billing แนะนำใช้ usage logs ฝั่งระบบของคุณร่วมตรวจสอบ',
          en: 'Yes, short billing dashboard delays can occur. Cross-check with your own usage logs when needed.',
        },
      },
      {
        question: {
          th: 'จะเช็ก rate limit ที่เหลือได้อย่างไร?',
          en: 'How can I monitor remaining rate limits?',
        },
        answer: {
          th: 'ให้บันทึก response status และ header ที่เกี่ยวข้อง แล้วสร้าง alert เมื่อเริ่มพบ 429 ต่อเนื่อง',
          en: 'Track response status and related headers, then trigger alerts when repeated 429 responses appear.',
        },
      },
      {
        question: {
          th: 'การเติมเครดิตหรือ recharge มีผลทันทีไหม?',
          en: 'Does recharge credit become available immediately?',
        },
        answer: {
          th: 'ส่วนใหญ่เครดิตจะอัปเดตเร็ว แต่บางช่องทางชำระเงินอาจใช้เวลาหลายนาที ให้ตรวจสถานะธุรกรรมใน billing history',
          en: 'Credits usually update quickly, but some payment channels may take several minutes. Check billing history for transaction status.',
        },
      },
    ] as FaqItem[],
  },
  termsPolicy: {
    title: { th: 'Terms และ Policy', en: 'Terms and Policy' },
    description: {
      th: 'ก่อนเปิดใช้งาน production ควรตรวจสอบข้อกำหนดการใช้งาน ความเป็นส่วนตัว และนโยบาย AI',
      en: 'Review usage terms, privacy requirements, and AI policy before going live in production.',
    },
    summaryTitle: { th: 'หัวข้อที่ควรตรวจสอบ', en: 'What to review before launch' },
    summaryItems: [
      {
        th: 'ขอบเขตการใช้งานที่อนุญาตและกรณีต้องห้าม',
        en: 'Allowed use cases and prohibited usage patterns.',
      },
      {
        th: 'ข้อกำหนดด้านข้อมูลส่วนบุคคลและการจัดเก็บ log',
        en: 'Personal data handling and logging requirements.',
      },
      {
        th: 'การกำกับดูแลโมเดลและความเสี่ยงเชิงนโยบาย',
        en: 'Model governance expectations and policy risk controls.',
      },
    ] as LocalizedText[],
    linksTitle: { th: 'เอกสารนโยบายที่เกี่ยวข้อง', en: 'Related policy documents' },
    links: [
      {
        id: 'terms',
        path: '/legal/terms',
        label: { th: 'ข้อกำหนดการใช้งาน', en: 'Terms of Service' },
        description: {
          th: 'เงื่อนไขหลักสำหรับการใช้แพลตฟอร์มและ API',
          en: 'Core contractual terms for using the platform and API.',
        },
      },
      {
        id: 'privacy',
        path: '/legal/privacy',
        label: { th: 'นโยบายความเป็นส่วนตัว', en: 'Privacy Policy' },
        description: {
          th: 'แนวทางการจัดการข้อมูลและความเป็นส่วนตัวของผู้ใช้',
          en: 'How user data and privacy are handled.',
        },
      },
      {
        id: 'acceptable-use',
        path: '/legal/acceptable-use',
        label: { th: 'นโยบายการใช้งานที่ยอมรับได้', en: 'Acceptable Use Policy' },
        description: {
          th: 'ข้อจำกัดการใช้งานและตัวอย่างพฤติกรรมที่ไม่อนุญาต',
          en: 'Usage restrictions and examples of disallowed behavior.',
        },
      },
      {
        id: 'ai-policy',
        path: '/legal/ai-policy',
        label: { th: 'นโยบายการใช้งาน AI', en: 'AI Use Policy' },
        description: {
          th: 'ข้อกำหนดเฉพาะสำหรับงานที่เกี่ยวข้องกับ AI generated content',
          en: 'Policy requirements specific to AI-generated content workflows.',
        },
      },
      {
        id: 'contact',
        path: '/legal/contact',
        label: { th: 'ติดต่อทีมสนับสนุน', en: 'Contact and Support' },
        description: {
          th: 'ช่องทางติดต่อเมื่อมีข้อสงสัยด้านสัญญาหรือ compliance',
          en: 'Support channel for contract or compliance questions.',
        },
      },
    ] as TermsPolicyLink[],
  },
} as const;
