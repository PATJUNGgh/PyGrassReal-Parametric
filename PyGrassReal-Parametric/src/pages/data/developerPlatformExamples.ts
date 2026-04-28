import type { LocalizedText } from '../../i18n/language';

interface SharedConfigItem {
  label: LocalizedText;
  value: string;
  description: LocalizedText;
}

interface PlatformRecipe {
  id: string;
  name: string;
  badge: string;
  audience: LocalizedText;
  summary: LocalizedText;
  setupTitle: LocalizedText;
  setupItems: LocalizedText[];
  requestTitle: LocalizedText;
  requestExample: string;
  notesTitle: LocalizedText;
  noteItems: LocalizedText[];
}

export const DEVELOPER_PLATFORM_EXAMPLES = {
  title: { th: 'ทดลอง API บนหลายแพลตฟอร์ม', en: 'Multi-platform API Recipes' },
  description: {
    th: 'ใช้ Hanuman endpoint เดียวกับหลาย workflow ได้ ตราบใดที่แพลตฟอร์มนั้นส่งคำขอแบบ OpenAI-compatible หรือกำหนด URL, header และ body เองได้',
    en: 'Use the same Hanuman endpoint across multiple workflows as long as the platform can send OpenAI-compatible requests or lets you control the URL, headers, and request body.',
  },
  introTitle: { th: 'ค่ากลางที่ทุกแพลตฟอร์มต้องใช้', en: 'Shared values every platform must use' },
  introItems: [
    {
      label: { th: 'Base URL', en: 'Base URL' },
      value: 'https://api.pygrassreal.ai/v1',
      description: {
        th: 'บางเครื่องมือจะต่อท้าย route ให้อัตโนมัติ เช่น `/models`, `/chat/completions` หรือ `/responses`',
        en: 'Some tools append routes such as `/models`, `/chat/completions`, or `/responses` automatically.',
      },
    },
    {
      label: { th: 'Authentication', en: 'Authentication' },
      value: 'Authorization: Bearer <YOUR_API_KEY>',
      description: {
        th: 'ใช้ API key รูปแบบ `pgr_...` ผ่าน `Authorization: Bearer` และเก็บไว้ฝั่ง server หรือ secret manager',
        en: 'Use a `pgr_...` API key via `Authorization: Bearer` and keep it in your server or secret manager.',
      },
    },
    {
      label: { th: 'Model', en: 'Model' },
      value: 'pygrassreal/hanuman1.1',
      description: {
        th: 'เริ่มจาก model id นี้ก่อน แล้วตรวจรายการล่าสุดได้จาก `GET /v1/models`',
        en: 'Start with this model id, then verify the latest exposed list with `GET /v1/models`.',
      },
    },
    {
      label: { th: 'Streaming', en: 'Streaming' },
      value: 'stream=true uses multi-event SSE',
      description: {
        th: 'รองรับ SSE หลาย event สำหรับ route ที่รองรับ stream หากแพลตฟอร์ม parse SSE ไม่ได้ ให้เริ่มจาก non-streaming ก่อน',
        en: '`stream=true` emits multi-event SSE on supported routes. Start with non-streaming if your tool cannot parse SSE correctly.',
      },
    },
  ] as SharedConfigItem[],
  recipesTitle: { th: 'ตัวอย่างตามแพลตฟอร์ม', en: 'Recipes by platform' },
  recipes: [
    {
      id: 'curl-postman',
      name: 'cURL / Postman',
      badge: 'Manual test',
      audience: {
        th: 'เหมาะสำหรับ smoke test, QA, และการเช็กว่า key กับ endpoint ใช้งานได้จริงก่อนต่อระบบอื่น',
        en: 'Best for smoke tests, QA, and checking that the key and endpoint work before wiring other systems.',
      },
      summary: {
        th: 'เริ่มจาก manual request ก่อนเสมอ ถ้ายิงด้วย cURL หรือ Postman ผ่าน แปลว่า config กลางถูกแล้ว',
        en: 'Start with a manual request first. If cURL or Postman works, the shared configuration is correct.',
      },
      setupTitle: { th: 'สิ่งที่ต้องตั้งค่า', en: 'What to configure' },
      setupItems: [
        { th: 'Method: `POST`', en: 'Method: `POST`' },
        { th: 'URL: `.../v1/chat/completions`', en: 'URL: `.../v1/chat/completions`' },
        { th: 'Headers: `Authorization`, `Content-Type: application/json`', en: 'Headers: `Authorization`, `Content-Type: application/json`' },
        { th: 'Body ต้องมี `model`, `messages`, `temperature`, `max_tokens`', en: 'Body must include `model`, `messages`, `temperature`, and `max_tokens`.' },
      ] as LocalizedText[],
      requestTitle: { th: 'ตัวอย่าง request', en: 'Request example' },
      requestExample: `curl -X POST "https://api.pygrassreal.ai/v1/chat/completions" \\
  -H "Authorization: Bearer <YOUR_API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "pygrassreal/hanuman1.1",
    "messages": [
      { "role": "system", "content": "You are a concise assistant." },
      { "role": "user", "content": "Explain the API in 3 bullets." }
    ],
    "temperature": 0.2,
    "max_tokens": 300
  }'`,
      notesTitle: { th: 'หมายเหตุ', en: 'Notes' },
      noteItems: [
        { th: 'ใช้ `GET /v1/models` เป็น health check ก่อนยิง chat ได้เสมอ', en: 'Use `GET /v1/models` as a health check before chat requests.' },
        { th: 'ถ้าใช้ Postman ให้เก็บ URL และ key เป็น environment variables แยกจาก request body', en: 'If you use Postman, keep the URL and key in environment variables instead of hardcoding them in the body.' },
      ] as LocalizedText[],
    },
    {
      id: 'javascript-server',
      name: 'Node.js / Next.js / Express',
      badge: 'Server-side JS',
      audience: {
        th: 'เหมาะสำหรับ backend service, API route, cron job, และ middleware ที่ควบคุม secret ได้',
        en: 'Best for backend services, API routes, cron jobs, and middleware that can keep secrets safe.',
      },
      summary: {
        th: 'ถ้าจะเชื่อมจากเว็บแอป ให้ยิงผ่าน server ของคุณ ไม่ควรใส่ API key ไว้ใน browser bundle โดยตรง',
        en: 'If you are integrating from a web app, call Hanuman from your server. Do not ship the API key in the browser bundle.',
      },
      setupTitle: { th: 'สิ่งที่ต้องตั้งค่า', en: 'What to configure' },
      setupItems: [
        { th: 'เก็บ `HANUMAN_API_KEY` เป็น environment variable', en: 'Store `HANUMAN_API_KEY` as an environment variable.' },
        { th: 'กำหนด timeout เองเพื่อป้องกัน request ค้าง', en: 'Set your own timeout to avoid hanging requests.' },
        { th: 'อ่าน `pygrassreal.cost_usd` จาก response ถ้าต้องการเก็บต้นทุนใช้งาน', en: 'Read `pygrassreal.cost_usd` from the response if you need usage-cost tracking.' },
      ] as LocalizedText[],
      requestTitle: { th: 'ตัวอย่าง request', en: 'Request example' },
      requestExample: `const response = await fetch(
  "https://api.pygrassreal.ai/v1/chat/completions",
  {
    method: "POST",
    headers: {
      "Authorization": \`Bearer \${process.env.HANUMAN_API_KEY}\`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "pygrassreal/hanuman1.1",
      messages: [
        { role: "system", content: "You are a concise assistant." },
        { role: "user", content: "Summarize the project status." },
      ],
      temperature: 0.2,
      max_tokens: 400,
    }),
  }
);

if (!response.ok) {
  throw new Error(\`Hanuman request failed: \${response.status}\`);
}

const data = await response.json();
console.log(data.choices?.[0]?.message?.content);`,
      notesTitle: { th: 'หมายเหตุ', en: 'Notes' },
      noteItems: [
        { th: 'ถ้าระบบมีผู้ใช้หลายคน ควรทำ retry/backoff ฝั่ง server สำหรับ 429 หรือ 503', en: 'If multiple users share the service, implement retry/backoff on the server for 429 or 503 responses.' },
        { th: 'แยก route ภายในของคุณเองระหว่างงานที่ต้องการ chat completion กับงานที่เป็น health check', en: 'Separate your own internal routes for chat completions and health checks.' },
      ] as LocalizedText[],
    },
    {
      id: 'python-backend',
      name: 'Python / FastAPI / Automation',
      badge: 'Python',
      audience: {
        th: 'เหมาะสำหรับ script, notebook, FastAPI service, worker และงาน automation',
        en: 'Best for scripts, notebooks, FastAPI services, workers, and automation tasks.',
      },
      summary: {
        th: 'ฝั่ง Python ควรตั้ง timeout, ตรวจ error code, และ parse payload เฉพาะ field ที่ต้องใช้จริง',
        en: 'On Python, set timeouts, inspect error codes, and parse only the fields you actually need.',
      },
      setupTitle: { th: 'สิ่งที่ต้องตั้งค่า', en: 'What to configure' },
      setupItems: [
        { th: 'ใช้ `requests` หรือ HTTP client ที่คุณควบคุม header และ timeout ได้', en: 'Use `requests` or any HTTP client where you control headers and timeouts.' },
        { th: 'เก็บ key ใน environment variable เช่น `HANUMAN_API_KEY`', en: 'Keep the key in an environment variable such as `HANUMAN_API_KEY`.' },
        { th: 'ตรวจ `choices[0].message.content` และ `pygrassreal.remaining_credit_usd` หลังตอบกลับ', en: 'Inspect `choices[0].message.content` and `pygrassreal.remaining_credit_usd` after each response.' },
      ] as LocalizedText[],
      requestTitle: { th: 'ตัวอย่าง request', en: 'Request example' },
      requestExample: `import os
import requests

url = "https://api.pygrassreal.ai/v1/chat/completions"
headers = {
    "Authorization": f"Bearer {os.environ['HANUMAN_API_KEY']}",
    "Content-Type": "application/json",
}
payload = {
    "model": "pygrassreal/hanuman1.1",
    "messages": [
        {"role": "system", "content": "You are a concise assistant."},
        {"role": "user", "content": "Write a short project summary."},
    ],
    "temperature": 0.2,
    "max_tokens": 300,
}

response = requests.post(url, headers=headers, json=payload, timeout=60)
response.raise_for_status()

data = response.json()
print(data["choices"][0]["message"]["content"])
print(data.get("pygrassreal", {}))`,
      notesTitle: { th: 'หมายเหตุ', en: 'Notes' },
      noteItems: [
        { th: 'ถ้าใช้ worker queue ให้ผูก request id ของคุณเองไว้กับ log เพื่อ trace การคิดค่าใช้จ่ายย้อนหลัง', en: 'If you use a worker queue, log your own request id so you can trace cost and failures later.' },
        { th: 'ถ้าจะรันปริมาณมาก ให้เริ่มจาก `GET /v1/models` และทดลองทีละน้อยก่อนเพิ่ม concurrency', en: 'If you plan to run at scale, start with `GET /v1/models` and increase concurrency gradually.' },
      ] as LocalizedText[],
    },
    {
      id: 'generic-openai-compatible',
      name: 'Any OpenAI-compatible Tool',
      badge: 'No-code / SDK',
      audience: {
        th: 'เหมาะสำหรับแพลตฟอร์มที่รับ custom base URL, custom API key, และ custom model name เช่น internal tools หรือ integration layer ของทีม',
        en: 'Best for platforms that accept a custom base URL, custom API key, and custom model name such as internal tools or integration layers.',
      },
      summary: {
        th: 'ถ้าแพลตฟอร์มใดบอกว่าใช้ OpenAI-compatible ได้ ให้เริ่มจาก map ค่า base URL, key, model และ path ของ route ที่แพลตฟอร์มนั้นจะเรียก',
        en: 'If a platform says it supports OpenAI-compatible APIs, map the base URL, key, model, and route paths it will call.',
      },
      setupTitle: { th: 'สิ่งที่ต้องตั้งค่า', en: 'What to configure' },
      setupItems: [
        { th: 'Base URL: `https://api.pygrassreal.ai/v1`', en: 'Base URL: `https://api.pygrassreal.ai/v1`' },
        { th: 'Model: `pygrassreal/hanuman1.1`', en: 'Model: `pygrassreal/hanuman1.1`' },
        { th: 'Headers: `Authorization: Bearer <YOUR_API_KEY>`', en: 'Headers: `Authorization: Bearer <YOUR_API_KEY>`' },
        { th: 'Route paths: `/models`, `/chat/completions`, `/responses`', en: 'Route paths: `/models`, `/chat/completions`, `/responses`' },
        { th: 'ปิด `stream=true` ถ้าเครื่องมือเปิดให้โดยอัตโนมัติ', en: '`stream=true` is optional; keep `false` as the safest default when the tool has limited SSE support.' },
      ] as LocalizedText[],
      requestTitle: { th: 'ค่าตั้งต้นแนะนำ', en: 'Suggested starter config' },
      requestExample: `{
  "base_url": "https://api.pygrassreal.ai/v1",
  "api_key": "pgr_...",
  "model": "pygrassreal/hanuman1.1",
  "models_path": "/models",
  "chat_completions_path": "/chat/completions",
  "responses_path": "/responses",
  "stream": false
}`,
      notesTitle: { th: 'หมายเหตุ', en: 'Notes' },
      noteItems: [
        { th: 'บางเครื่องมือเรียก `/v1/models`, `/v1/chat/completions` และ `/v1/responses` โดยอัตโนมัติ ซึ่ง endpoint นี้รองรับได้', en: 'Some tools call `/v1/models`, `/v1/chat/completions`, and `/v1/responses` automatically, and this endpoint supports those paths.' },
        { th: 'ถ้าแพลตฟอร์มบังคับให้ใส่ OpenAI key ฝั่ง client โดยตรง แปลว่า workflow นั้นไม่เหมาะและควรมี proxy server คั่นกลาง', en: 'If a platform forces you to place the OpenAI key directly in a client app, that workflow is not appropriate and should be fronted by a proxy server.' },
      ] as LocalizedText[],
    },
  ] as PlatformRecipe[],
} as const;




