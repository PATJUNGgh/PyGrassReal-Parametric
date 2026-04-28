import type { LocalizedText } from '../../i18n/language';

export type DeveloperTabId =
  | 'gettingStarted'
  | 'apiReference'
  | 'platformRecipes'
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

interface ErrorCodeRow {
  statusCode: string;
  errorCode: string;
  cause: LocalizedText;
  handling: LocalizedText;
  retryPolicy: LocalizedText;
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
  pageTitle: { th: 'เอกสาร API', en: 'API Documentation' },
  pageDescription: {
    th: 'คู่มือการเชื่อมต่อ API ของ PyGrassReal สำหรับ Hanuman OpenAI-compatible v1 พร้อม endpoint, auth, error handling, pricing และการใช้งานจริง',
    en: 'PyGrassReal API documentation for Hanuman OpenAI-compatible v1, including endpoint/auth/error handling, pricing, and production usage.',
  },
  hero: {
    chip: { th: 'เอกสาร API', en: 'API Docs' },
    title: { th: 'คู่มือ API แบบ OpenAI-Compatible', en: 'OpenAI-Compatible API Guide' },
    description: {
      th: 'เริ่มเชื่อมต่อ Hanuman API ได้จากหน้าเดียว ครอบคลุม OpenAI routes (`/v1/models`, `/v1/chat/completions`, `/v1/responses`) พร้อม endpoint, authentication, billing และตัวอย่าง request ที่ใช้ได้จริง',
      en: 'Integrate Hanuman from one place with OpenAI routes (`/v1/models`, `/v1/chat/completions`, `/v1/responses`), including auth flow, billing behavior, and working request examples.',
    },
  },
  tabNavigationLabel: { th: 'หัวข้อเอกสาร API', en: 'API documentation sections' },
  tabs: {
    gettingStarted: { th: 'เริ่มต้นใช้งาน', en: 'Getting Started' },
    apiReference: { th: 'Endpoint และ Auth', en: 'Endpoint and Auth' },
    platformRecipes: { th: 'ตัวอย่างหลายแพลตฟอร์ม', en: 'Platform Recipes' },
    rateLimits: { th: 'Rate Limits', en: 'Rate Limits' },
    pricing: { th: 'ราคาและ Billing', en: 'Pricing and Billing' },
    faq: { th: 'คำถามที่พบบ่อย', en: 'FAQ' },
    termsPolicy: { th: 'Terms และ Policy', en: 'Terms and Policy' },
  },
  gettingStarted: {
    title: { th: 'เริ่มต้นใช้งาน', en: 'Getting Started' },
    description: {
      th: 'ทำตามขั้นตอนนี้เพื่อยิงคำขอแรกของคุณกับ Hanuman API และเตรียมระบบให้พร้อมสำหรับใช้งานจริง',
      en: 'Follow these steps to send your first authenticated Hanuman API request and prepare the integration for production use.',
    },
    steps: [
      {
        title: { th: '1) สร้าง API key และเตรียมเครดิต wallet', en: '1) Create an API key and fund the wallet' },
        description: {
          th: 'สร้าง `pgr_...` API key จากหน้า API Management และตรวจสอบว่า owner account มีเครดิตเพียงพอสำหรับการหักใช้งานจริง',
          en: 'Create a `pgr_...` API key from API Management and make sure the owning account wallet has enough credits for real debits.',
        },
      },
      {
        title: { th: '2) ทดสอบการเชื่อมต่อด้วย GET /v1/models', en: '2) Verify connectivity with GET /v1/models' },
        description: {
          th: 'ใช้คำขอ models เพื่อตรวจสอบ base URL, `Authorization: Bearer` header และชื่อโมเดลสาธารณะที่ใช้งานได้ก่อนเชื่อมต่อ workflow จริง',
          en: 'Use the models route to verify your base URL, `Authorization: Bearer` header, and discover the public model id before wiring real workflows.',
        },
      },
      {
        title: { th: '3) ส่งคำขอแรกไปที่ /v1/chat/completions', en: '3) Send your first request to /v1/chat/completions' },
        description: {
          th: 'ใช้ `model: "pygrassreal/hanuman1.1"` พร้อม `messages` แบบ OpenAI-compatible และตั้งค่า `temperature` / `max_tokens` ตามความต้องการ',
          en: 'Call `model: "pygrassreal/hanuman1.1"` with OpenAI-compatible `messages`, then tune `temperature` and `max_tokens` for your use case.',
        },
      },
      {
        title: { th: '4) รองรับ error สำคัญก่อนเปิด production', en: '4) Handle operational errors before launch' },
        description: {
          th: 'รองรับ 400, 401, 402, 405, 500, 502 และ 503 ด้วย validation, retry/backoff, queue และการตรวจสอบเครดิตก่อนขยาย traffic',
          en: 'Handle 400, 401, 402, 405, 500, 502, and 503 with validation, retry/backoff, queueing, and wallet checks before scaling traffic.',
        },
      },
    ] as GettingStartedStep[],
    modelGuideTitle: { th: 'สถานะโมเดลและพฤติกรรมสำคัญ', en: 'Current model and behavior notes' },
    modelGuideItems: [
      {
        th: '`pygrassreal/hanuman1.1` คือ public model id หลักของ endpoint นี้ในปัจจุบัน',
        en: '`pygrassreal/hanuman1.1` is the current public model id exposed by this endpoint.',
      },
      {
        th: 'สำหรับการตรวจสอบการเชื่อมต่อครั้งแรก ให้ทำตามขั้นตอน `2) GET /v1/models` ในหัวข้อเริ่มต้นใช้งาน',
        en: 'For first-time connectivity validation, follow step `2) GET /v1/models` in Getting Started.',
      },
      {
        th: '`stream: true` รองรับแบบ SSE หลาย event สำหรับ route ที่รองรับ stream และควรกำหนด `max_tokens` หรือ `max_output_tokens` ตามงานจริง',
        en: '`stream: true` is supported via multi-event SSE on streaming routes; set `max_tokens` or `max_output_tokens` for your real workload.',
      },
    ] as LocalizedText[],
  },
  apiReference: {
    title: { th: 'OpenAI API Compatibility', en: 'OpenAI API Compatibility' },
    description: {
      th: 'Public contract ปัจจุบันของ Hanuman เปิดให้ใช้งานในรูปแบบ OpenAI-compatible สำหรับ models, chat completions และ responses',
      en: 'The current Hanuman public contract is OpenAI-compatible for models, chat completions, and responses.',
    },
    showAnthropicProfile: false,
    openaiTitle: { th: 'OpenAI API Compatibility', en: 'OpenAI API Compatibility' },
    openaiDescription: {
      th: 'รองรับ OpenAI-compatible route สำหรับ `/v1/models`, `/v1/chat/completions`, และ `/v1/responses`',
      en: 'Supports OpenAI-compatible routes for `/v1/models`, `/v1/chat/completions`, and `/v1/responses`.',
    },
    endpointLabel: { th: 'Base Endpoint', en: 'Base Endpoint' },
    endpointValue: 'https://api.pygrassreal.ai/v1',
    endpointDescription: {
      th: 'เส้นทางหลักคือ `GET /models` หรือ `GET /v1/models`, `POST /chat/completions` หรือ `POST /v1/chat/completions`, และ `POST /responses` หรือ `POST /v1/responses`',
      en: 'Primary routes are `GET /models` or `GET /v1/models`, `POST /chat/completions` or `POST /v1/chat/completions`, and `POST /responses` or `POST /v1/responses`.',
    },
    authLabel: { th: 'Authentication', en: 'Authentication' },
    authDescription: {
      th: 'ใช้ `Authorization: Bearer <YOUR_API_KEY>` เป็นรูปแบบหลัก อย่าเก็บ API key ไว้ใน frontend โดยตรง หาก key ถูกปิดใช้งาน หมดอายุ หรือไม่ถูกต้อง ระบบจะตอบกลับ HTTP 401',
      en: 'Use `Authorization: Bearer <YOUR_API_KEY>` as the primary auth format. Never expose keys in frontend code. Missing, disabled, expired, or unknown keys return HTTP 401.',
    },
    requestTitle: { th: 'ตัวอย่างคำขอ', en: 'Quick Start Examples' },
    responseTitle: { th: 'ตัวอย่างผลลัพธ์', en: 'Chat Completion Response Example' },
    requestExample: `# GET /v1/models
curl "https://api.pygrassreal.ai/v1/models" \\
  -H "Authorization: Bearer <YOUR_API_KEY>"

# POST /v1/chat/completions
curl -X POST "https://api.pygrassreal.ai/v1/chat/completions" \\
  -H "Authorization: Bearer <YOUR_API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "pygrassreal/hanuman1.1",
    "messages": [
      { "role": "system", "content": "You are a concise assistant." },
      { "role": "user", "content": "Summarize the project in 3 bullets." }
    ],
    "temperature": 0.2,
    "max_tokens": 500
  }'

# POST /v1/responses
curl -X POST "https://api.pygrassreal.ai/v1/responses" \\
  -H "Authorization: Bearer <YOUR_API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "pygrassreal/hanuman1.1",
    "input": "Summarize the project in 3 bullets.",
    "temperature": 0.2,
    "max_output_tokens": 500
  }'`,
    responseExample: `{
  "id": "chatcmpl_2a9d21c3e0db49ad8b62c7",
  "object": "chat.completion",
  "created": 1775188800,
  "model": "pygrassreal/hanuman1.1",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "- Bullet one\\n- Bullet two\\n- Bullet three"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 153,
    "completion_tokens": 49,
    "total_tokens": 202
  },
  "pygrassreal": {
    "provider": "openrouter",
    "provider_model": "provider-upstream-model",
    "cost_usd": 0.000472,
    "remaining_credit_usd": 4.532128
  }
}`,
    anthropicTitle: { th: 'Anthropic API Compatibility', en: 'Anthropic API Compatibility' },
    anthropicDescription: {
      th: 'ยังไม่เปิดเป็น public contract ในเอกสารชุดนี้',
      en: 'This profile is not part of the current public contract.',
    },
    anthropicEndpointLabel: { th: 'Anthropic Endpoint', en: 'Anthropic Endpoint' },
    anthropicEndpointValue: 'https://api.pygrassreal.ai/v1/anthropic/v1/messages',
    anthropicEndpointDescription: {
      th: 'ใช้ header `x-api-key` หรือ `Authorization: Bearer` พร้อม `anthropic-version` และส่ง payload รูปแบบ Anthropic',
      en: 'Use `x-api-key` or `Authorization: Bearer` with `anthropic-version`, then send Anthropic payload format.',
    },
    anthropicRequestTitle: { th: 'ตัวอย่างคำขอ (Anthropic)', en: 'Anthropic Request Example' },
    anthropicResponseTitle: { th: 'ตัวอย่างผลลัพธ์ (Anthropic)', en: 'Anthropic Response Example' },
    anthropicRequestExample: `# POST /anthropic/v1/messages
curl -X POST "https://api.pygrassreal.ai/v1/anthropic/v1/messages" \\
  -H "x-api-key: <YOUR_API_KEY>" \\
  -H "anthropic-version: 2023-06-01" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "pygrassreal/hanuman1.1",
    "max_tokens": 500,
    "messages": [
      { "role": "user", "content": "Summarize the project in 3 bullets." }
    ]
  }'`,
    anthropicResponseExample: `{
  "id": "msg_2a9d21c3e0db49ad8b62c7",
  "type": "message",
  "role": "assistant",
  "model": "pygrassreal/hanuman1.1",
  "content": [
    {
      "type": "text",
      "text": "- Bullet one\\n- Bullet two\\n- Bullet three"
    }
  ],
  "stop_reason": "end_turn",
  "usage": {
    "input_tokens": 153,
    "output_tokens": 49,
    "total_tokens": 202
  }
}`,
  },
  rateLimits: {
    title: {
      th: 'Capacity และ Traffic Behavior (OpenAI-compatible v1)',
      en: 'Capacity and Traffic Behavior (OpenAI-compatible v1)',
    },
    description: {
      th: 'endpoint นี้ไม่มีตัวเลข rate/concurrency คงที่แบบสาธารณะ ความจุจริงขึ้นกับเครดิต wallet, ความพร้อมของ upstream provider และรูปแบบ traffic ของคุณในเวลานั้น',
      en: 'This endpoint does not publish a fixed public rate/concurrency number. Actual capacity depends on wallet state, upstream provider availability, and your traffic shape at that moment.',
    },
    columns: {
      modelType: { th: 'Route', en: 'Route' },
      modelName: { th: 'Format', en: 'Format' },
      concurrency: { th: 'Capacity Model', en: 'Capacity Model' },
      note: { th: 'Client Strategy', en: 'Client Strategy' },
    },
    rows: [
      {
        modelType: 'POST /v1/chat/completions',
        modelName: 'OpenAI format',
        concurrencyLimit: 'Dynamic',
        note: {
          th: 'จำกัด concurrency ฝั่งคุณ + ใช้ queue + retry ด้วย backoff',
          en: 'Bound your own concurrency and use queue + backoff retries.',
        },
      },
      {
        modelType: 'POST /v1/responses',
        modelName: 'OpenAI Responses format',
        concurrencyLimit: 'Dynamic',
        note: {
          th: 'ใช้ strategy เดียวกับ chat/completions และวาง queue/retry ตามปริมาณงานจริง',
          en: 'Apply the same strategy as chat/completions and size queue/retries for real workload.',
        },
      },
    ] as RateLimitRow[],
    streamBehaviorTitle: { th: 'Streaming Behavior (ไม่ใช่ Rate Limit)', en: 'Streaming Behavior (Not a Rate Limit)' },
    streamBehaviorDescription: {
      th: 'ส่วนนี้แยกจาก capacity เพื่อไม่ให้สับสนระหว่าง “รูปแบบ stream” กับ “เพดานความจุ”',
      en: 'This section is separate from capacity to avoid mixing stream format behavior with throughput limits.',
    },
    streamBehaviorItems: [
      {
        th: '`POST /v1/chat/completions` ที่ส่ง `stream=true` จะตอบแบบ SSE หลาย event: role -> content/tool_calls -> finish -> [DONE]',
        en: '`POST /v1/chat/completions` with `stream=true` emits multiple SSE events: role -> content/tool_calls -> finish -> [DONE].',
      },
      {
        th: '`POST /v1/responses` แบบ stream จะตอบเป็นชุด event ของ Responses API และปิดท้ายด้วย `response.completed` + `[DONE]`',
        en: '`POST /v1/responses` streaming emits Responses API events and ends with `response.completed` + `[DONE]`.',
      },
      {
        th: 'stream ที่นี่ไม่ใช่ token-by-token ต่อเนื่องแบบ LLM delta ละเอียดมาก ให้ฝั่ง client ออกแบบ timeout/fallback ตามงานจริง',
        en: 'Streaming here is not ultra-granular token-by-token deltas; design client timeout/fallback for your workload.',
      },
    ] as LocalizedText[],
    errorCodesTitle: {
      th: 'มาตรฐาน Error Codes (Platform Contract)',
      en: 'Error Codes (Platform Contract)',
    },
    errorCodesDescription: {
      th: 'ตารางนี้ใช้เป็นสัญญาระดับแพลตฟอร์มสำหรับการจัดการข้อผิดพลาดฝั่ง client ให้สอดคล้องกับ OpenAI-compatible public contract ปัจจุบัน',
      en: 'Use this table as the platform-level error contract for the current OpenAI-compatible public profile.',
    },
    errorColumns: {
      statusCode: { th: 'HTTP', en: 'HTTP' },
      errorCode: { th: 'Error Code', en: 'Error Code' },
      cause: { th: 'สาเหตุที่พบบ่อย', en: 'Common Cause' },
      handling: { th: 'แนวทางแก้', en: 'Recommended Handling' },
      retryPolicy: { th: 'Retry Policy', en: 'Retry Policy' },
    },
    errorRows: [
      {
        statusCode: '400',
        errorCode: 'invalid_request',
        cause: {
          th: 'JSON ไม่ถูกต้อง, field จำเป็นไม่ครบ, type/parameter ไม่ตรง schema หรือ model id ไม่ถูกต้อง',
          en: 'Malformed JSON, missing required fields, schema/type mismatch, or invalid model id.',
        },
        handling: {
          th: 'validate payload ตาม schema ก่อนยิงจริง, ตรวจ model id และ content format ให้ครบ',
          en: 'Validate payloads against schema, and verify model id plus content format before sending.',
        },
        retryPolicy: {
          th: 'ไม่ควร retry จนกว่าจะแก้ request',
          en: 'Do not retry until request payload is fixed.',
        },
      },
      {
        statusCode: '401',
        errorCode: 'invalid_api_key',
        cause: {
          th: 'API key หาย, ไม่ถูกต้อง, ถูกปิดใช้งาน หรือหมดอายุ',
          en: 'API key missing, invalid, disabled, or expired.',
        },
        handling: {
          th: 'ส่ง key ใหม่ที่ถูกต้อง, ตรวจ Authorization/api-key header และ policy การ rotate key',
          en: 'Use a valid key, verify Authorization/api-key headers, and rotate credentials safely.',
        },
        retryPolicy: {
          th: 'ไม่ควร retry อัตโนมัติด้วย key เดิม',
          en: 'Do not auto-retry with the same invalid key.',
        },
      },
      {
        statusCode: '400',
        errorCode: 'model_not_found',
        cause: {
          th: 'ส่ง model id ที่ระบบไม่รองรับในตอนนี้',
          en: 'Request uses a model id that is not supported by this deployment.',
        },
        handling: {
          th: 'ใช้ `pygrassreal/hanuman1.1` และตรวจรายการล่าสุดจาก `GET /v1/models`',
          en: 'Use `pygrassreal/hanuman1.1` and verify latest list with `GET /v1/models`.',
        },
        retryPolicy: {
          th: 'ไม่ควร retry จนกว่าจะเปลี่ยน model ให้ถูกต้อง',
          en: 'Do not retry until model id is corrected.',
        },
      },
      {
        statusCode: '400',
        errorCode: 'invalid_messages',
        cause: {
          th: '`messages` ไม่เป็น array ที่ถูกต้องหรือไม่มีข้อความที่ใช้งานได้',
          en: '`messages` is not a valid non-empty message array.',
        },
        handling: {
          th: 'ตรวจ schema ของ `messages` และ role/content ทุกรายการก่อนส่ง',
          en: 'Validate `messages` schema and each role/content item before sending.',
        },
        retryPolicy: {
          th: 'ไม่ควร retry จนกว่าจะแก้ payload',
          en: 'Do not retry until payload is fixed.',
        },
      },
      {
        statusCode: '400',
        errorCode: 'invalid_temperature',
        cause: {
          th: '`temperature` ไม่เป็นตัวเลข finite',
          en: '`temperature` is not a finite number.',
        },
        handling: {
          th: 'ส่งค่า temperature ที่เป็นตัวเลขและอยู่ในช่วงใช้งานจริง',
          en: 'Send a finite numeric temperature within your intended range.',
        },
        retryPolicy: {
          th: 'ไม่ควร retry จนกว่าจะแก้ค่า parameter',
          en: 'Do not retry until the parameter is corrected.',
        },
      },
      {
        statusCode: '400',
        errorCode: 'invalid_max_tokens',
        cause: {
          th: '`max_tokens`/`max_output_tokens` ไม่เป็นจำนวนบวก',
          en: '`max_tokens`/`max_output_tokens` is not a positive number.',
        },
        handling: {
          th: 'กำหนด max token เป็นค่าจำนวนบวกที่เหมาะกับงาน',
          en: 'Set a positive max token value appropriate for your workload.',
        },
        retryPolicy: {
          th: 'ไม่ควร retry จนกว่าจะแก้ค่า parameter',
          en: 'Do not retry until the parameter is corrected.',
        },
      },
      {
        statusCode: '402',
        errorCode: 'missing_credit_wallet',
        cause: {
          th: 'ไม่พบ credit wallet ของเจ้าของ API key',
          en: 'Credit wallet for the API key owner was not found.',
        },
        handling: {
          th: 'สร้าง/ผูก wallet ของ owner account ให้สมบูรณ์ก่อนใช้งาน',
          en: 'Ensure owner wallet is created and properly linked before use.',
        },
        retryPolicy: {
          th: 'retry ได้หลังแก้ wallet configuration แล้ว',
          en: 'Retry only after wallet configuration is fixed.',
        },
      },
      {
        statusCode: '402',
        errorCode: 'insufficient_credits',
        cause: {
          th: 'ยอดเครดิต wallet ไม่พอสำหรับคำขอนี้',
          en: 'Wallet credits are insufficient for this request.',
        },
        handling: {
          th: 'เติมเครดิตและตั้ง budget alert ก่อนรันงานปริมาณมาก',
          en: 'Top up credits and set budget alerts before running high-volume jobs.',
        },
        retryPolicy: {
          th: 'retry ได้หลังเติมเครดิตแล้วเท่านั้น',
          en: 'Retry only after credits are replenished.',
        },
      },
      {
        statusCode: '405',
        errorCode: 'method_not_allowed',
        cause: {
          th: 'เรียก route ที่รองรับด้วย method ไม่ถูกต้อง (เช่นใช้ GET แทน POST)',
          en: 'Route was called with an unsupported HTTP method.',
        },
        handling: {
          th: 'ใช้ `POST` สำหรับ completions/responses และ `GET` สำหรับ models',
          en: 'Use `POST` for completions/responses and `GET` for models.',
        },
        retryPolicy: {
          th: 'ไม่ควร retry จนกว่าจะเปลี่ยน method ให้ถูกต้อง',
          en: 'Do not retry until HTTP method is corrected.',
        },
      },
      {
        statusCode: '500',
        errorCode: 'server_misconfigured',
        cause: {
          th: 'server ขาด environment variables สำคัญ',
          en: 'Server is missing required environment variables.',
        },
        handling: {
          th: 'ตรวจ `SUPABASE_SERVICE_ROLE_KEY` และ `HANUMAN_OPENAI_V1_WEBHOOK_URL`',
          en: 'Verify `SUPABASE_SERVICE_ROLE_KEY` and `HANUMAN_OPENAI_V1_WEBHOOK_URL`.',
        },
        retryPolicy: {
          th: 'ไม่ควร retry รัว; แก้ config ฝั่ง server ก่อน',
          en: 'Do not blind-retry; fix server configuration first.',
        },
      },
      {
        statusCode: '500',
        errorCode: 'internal_error',
        cause: {
          th: 'ระบบผิดพลาดระหว่างตรวจ API key หรือโหลด wallet',
          en: 'Internal failure while validating key or loading wallet.',
        },
        handling: {
          th: 'บันทึก request context และตรวจ log ฝั่ง function/supabase',
          en: 'Log request context and inspect function/Supabase logs.',
        },
        retryPolicy: {
          th: 'retry ได้แบบจำกัดครั้งด้วย backoff',
          en: 'Retry with bounded backoff attempts.',
        },
      },
      {
        statusCode: '502',
        errorCode: 'invalid_provider_response',
        cause: {
          th: 'upstream ส่ง response ว่างหรือรูปแบบผิดจากที่ระบบคาดไว้',
          en: 'Upstream returned empty or invalid provider response format.',
        },
        handling: {
          th: 'ทำ fallback path และ monitor upstream response quality',
          en: 'Apply fallback handling and monitor upstream response quality.',
        },
        retryPolicy: {
          th: 'retry แบบจำกัดครั้งด้วย backoff',
          en: 'Retry with bounded backoff attempts.',
        },
      },
      {
        statusCode: '503',
        errorCode: 'provider_unavailable',
        cause: {
          th: 'Hanuman engine / upstream ไม่พร้อมใช้งานชั่วคราว',
          en: 'Hanuman engine/upstream is temporarily unavailable.',
        },
        handling: {
          th: 'ลด concurrency, ทำ queue และ retry แบบหน่วงเวลา',
          en: 'Lower concurrency, queue traffic, and retry with delay.',
        },
        retryPolicy: {
          th: 'retry ด้วย exponential backoff + jitter',
          en: 'Retry with exponential backoff + jitter.',
        },
      },
    ] as ErrorCodeRow[],
    behaviorTitle: {
      th: 'พฤติกรรมที่ client ควรรองรับ (ตาม implementation ปัจจุบัน)',
      en: 'Client handling guidance (based on current implementation)',
    },
    behaviorItems: [
      {
        th: 'รองรับกลุ่ม 400 (`invalid_request`, `model_not_found`, `invalid_messages`, `invalid_temperature`, `invalid_max_tokens`) ด้วย request validation ก่อนยิงจริง',
        en: 'Handle 400-class validation errors (`invalid_request`, `model_not_found`, `invalid_messages`, `invalid_temperature`, `invalid_max_tokens`) with preflight request validation.',
      },
      {
        th: 'รองรับ `401 invalid_api_key`, `402 missing_credit_wallet`, และ `402 insufficient_credits` ด้วย flow จัดการ key/wallet ที่ชัดเจน',
        en: 'Handle `401 invalid_api_key`, `402 missing_credit_wallet`, and `402 insufficient_credits` with explicit key/wallet recovery flows.',
      },
      {
        th: 'รองรับ `500/502/503` ด้วย retry แบบจำกัดครั้ง + backoff + queue และ monitor log ฝั่ง function',
        en: 'Handle `500/502/503` with bounded retries + backoff + queueing and function-side log monitoring.',
      },
    ] as LocalizedText[],
  },
  pricing: {
    title: { th: 'Pricing และ Billing', en: 'Pricing and Billing' },
    description: {
      th: 'ตารางด้านล่างคือ public price card ของโมเดลปัจจุบัน และการหักเครดิตจริงจะยืนยันกลับมาใน response ผ่านฟิลด์ `pygrassreal.cost_usd` หลังคำขอสำเร็จ',
      en: 'The table below is the current public price card. The actual debit is echoed back in each successful response via `pygrassreal.cost_usd`.',
    },
    tableColumns: {
      model: { th: 'โมเดล', en: 'Model' },
      input: { th: 'ราคา Input', en: 'Input Price' },
      cachedInput: { th: 'ราคา Output', en: 'Output Price' },
      output: { th: 'Context Window', en: 'Context Window' },
    },
    rows: [
      {
        model: 'pygrassreal/hanuman1.1',
        inputPrice: '$0.45/M input tokens',
        cachedInputPrice: '$1.70/M output tokens',
        outputPrice: '1,000,000 context',
      },
    ] as PricingRow[],
    cacheTitle: { th: 'พฤติกรรมการหักเครดิต', en: 'Wallet billing behavior' },
    cacheDescription: {
      th: 'API key หลายตัวที่เป็นของเจ้าของคนเดียวกันจะใช้เครดิตจาก wallet เดียวกันทั้งหมด ดังนั้นการแยก key ตาม environment ไม่ได้แยกยอดหักเครดิตโดยอัตโนมัติ',
      en: 'Multiple API keys under the same owner share one wallet. Separate keys by environment if you want, but billing still rolls up to the owner credit balance.',
    },
    cacheItems: [
      {
        th: 'ตรวจสอบ `pygrassreal.cost_usd` และ `pygrassreal.remaining_credit_usd` ใน response ทุกครั้งหากต้องการทำ usage reconciliation',
        en: 'Read `pygrassreal.cost_usd` and `pygrassreal.remaining_credit_usd` in each response if you need usage reconciliation.',
      },
      {
        th: '`402 insufficient_credits` หมายถึงยอดคงเหลือจริงใน wallet ไม่พอสำหรับการหักค่าบริการของคำขอนั้น',
        en: '`402 insufficient_credits` means the real wallet balance cannot cover the debit for that request.',
      },
      {
        th: 'หากหลายระบบใช้ owner account เดียวกัน ควร monitor wallet และ transaction history อย่างสม่ำเสมอ',
        en: 'If multiple services share the same owner account, monitor wallet balance and transaction history closely.',
      },
    ] as LocalizedText[],
  },
  faq: {
    title: { th: 'คำถามที่พบบ่อย (FAQ)', en: 'Frequently Asked Questions (FAQ)' },
    description: {
      th: 'คำตอบสั้นสำหรับประเด็นที่เจอบ่อยเมื่อเชื่อมต่อ Hanuman API',
      en: 'Quick answers to the most common Hanuman API integration questions.',
    },
    items: [
      {
        question: {
          th: 'ตอนนี้ endpoint นี้รองรับโมเดลอะไรบ้าง?',
          en: 'Which model is supported right now?',
        },
        answer: {
          th: 'ปัจจุบัน public model id หลักคือ `pygrassreal/hanuman1.1` และคุณสามารถตรวจสอบรายการล่าสุดได้จาก `GET /v1/models`',
          en: 'The current public model id is `pygrassreal/hanuman1.1`. Use `GET /v1/models` to verify the latest exposed list.',
        },
      },
      {
        question: {
          th: 'ทำไมจึงได้ `402 insufficient_credits` ทั้งที่ key ยังใช้ได้?',
          en: 'Why do I get `402 insufficient_credits` even though the key is valid?',
        },
        answer: {
          th: 'เพราะ key ผ่านการตรวจสอบแล้ว แต่ยอดเครดิตจริงของ wallet เจ้าของ key ไม่พอสำหรับการหักค่าบริการของคำขอนั้น (ดูรายละเอียดเพิ่มในหัวข้อราคาและ Billing)',
          en: 'The key passed authentication, but the owner wallet balance cannot cover the request debit (see Pricing and Billing for details).',
        },
      },
      {
        question: {
          th: 'ทำไม `stream=true` ใช้งานไม่ได้?',
          en: 'Why does `stream=true` fail?',
        },
        answer: {
          th: '`stream=true` บน endpoint นี้จะตอบแบบ SSE หลาย event (ไม่ใช่ token-by-token ละเอียดมาก) ให้ตรวจ client parser, timeout และ fallback strategy ตามหัวข้อ Capacity/Streaming',
          en: '`stream=true` returns multi-event SSE (not ultra-granular token-by-token deltas). Verify your client parser, timeout, and fallback strategy under Capacity/Streaming guidance.',
        },
      },
      {
        question: {
          th: 'จะดู provider model และเครดิตคงเหลือจากตรงไหน?',
          en: 'Where do I read the provider model and remaining credits?',
        },
        answer: {
          th: 'อ่านจากฟิลด์ `pygrassreal.provider_model`, `pygrassreal.cost_usd` และ `pygrassreal.remaining_credit_usd` ใน response ของ chat completion',
          en: 'Read `pygrassreal.provider_model`, `pygrassreal.cost_usd`, and `pygrassreal.remaining_credit_usd` from the chat completion response.',
        },
      },
      {
        question: {
          th: 'ตอนนี้ public docs รองรับ Anthropic-compatible หรือยัง?',
          en: 'Is Anthropic-compatible currently part of the public docs contract?',
        },
        answer: {
          th: 'ยังไม่ใช่ในเอกสาร public ชุดนี้ ปัจจุบันให้ยึด OpenAI-compatible contract สำหรับ `/v1/models`, `/v1/chat/completions` และ `/v1/responses` เป็นหลัก',
          en: 'Not in the current public docs set. Treat the OpenAI-compatible contract for `/v1/models`, `/v1/chat/completions`, and `/v1/responses` as the supported public profile today.',
        },
      },
    ] as FaqItem[],
  },
  termsPolicy: {
    title: { th: 'Terms และ Policy', en: 'Terms and Policy' },
    description: {
      th: 'ก่อนเปิดใช้งาน production ควรตรวจสอบข้อกำหนดการใช้ API, ความเป็นส่วนตัว, acceptable use และความรับผิดชอบด้าน billing ให้ครบถ้วน',
      en: 'Before production launch, review API usage terms, privacy expectations, acceptable use, and billing responsibilities.',
    },
    summaryTitle: { th: 'หัวข้อที่ควรตรวจสอบก่อนเปิดใช้งาน', en: 'What to review before launch' },
    summaryItems: [
      {
        th: 'ห้ามเปิดเผย API key ใน frontend หรือใน client bundle ที่ผู้ใช้ปลายทางเข้าถึงได้',
        en: 'Do not expose API keys in frontend code or any client bundle accessible to end users.',
      },
      {
        th: 'ตรวจสอบขอบเขตการใช้งานที่อนุญาต นโยบายความเป็นส่วนตัว และข้อกำหนดด้าน AI ก่อนเชื่อมต่อข้อมูลจริง',
        en: 'Review acceptable use, privacy requirements, and AI policy obligations before connecting real user data.',
      },
      {
        th: 'หากหลายระบบใช้ owner account เดียวกัน ควรกำหนดกระบวนการ monitor wallet และ budget alert ให้ชัดเจน',
        en: 'If multiple systems share one owner account, define clear wallet monitoring and budget alert processes.',
      },
    ] as LocalizedText[],
    linksTitle: { th: 'เอกสารนโยบายที่เกี่ยวข้อง', en: 'Related policy documents' },
    links: [
      {
        id: 'terms',
        path: '/legal/terms',
        label: { th: 'ข้อกำหนดการใช้บริการ', en: 'Terms of Service' },
        description: {
          th: 'ข้อสัญญาหลักสำหรับการใช้แพลตฟอร์มและ API',
          en: 'Core contractual terms for using the platform and API.',
        },
      },
      {
        id: 'privacy',
        path: '/legal/privacy',
        label: { th: 'นโยบายความเป็นส่วนตัว', en: 'Privacy Policy' },
        description: {
          th: 'แนวทางการจัดการข้อมูลผู้ใช้และการคุ้มครองความเป็นส่วนตัว',
          en: 'How user data is handled and protected.',
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
          th: 'ข้อกำหนดเฉพาะสำหรับ workflow ที่เกี่ยวข้องกับ AI generated content',
          en: 'Policy requirements specific to AI-generated content workflows.',
        },
      },
      {
        id: 'contact',
        path: '/legal/contact',
        label: { th: 'ติดต่อทีมสนับสนุน', en: 'Contact and Support' },
        description: {
          th: 'ช่องทางติดต่อเมื่อมีคำถามด้านสัญญา compliance หรือการใช้งาน API',
          en: 'Support channel for contract, compliance, or API usage questions.',
        },
      },
    ] as TermsPolicyLink[],
  },
} as const;

