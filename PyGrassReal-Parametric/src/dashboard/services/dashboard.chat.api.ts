import { supabase } from '../../lib/supabaseClient';

/**
 * dashboard.chat.api.ts
 * ---------------------------------------------------------------
 * Service เชื่อมต่อ Dashboard AI Assistant ↔ n8n Webhook
 * Supabase Tables ที่ใช้ (ทั้งหมดมี Prefix "Dashboard_"):
 *   - Dashboard_ChatSessions
 *   - Dashboard_ChatMessages
 *
 * n8n Webhook:
 *   POST https://n8n.srv1145228.hstgr.cloud/webhook/ab6443aa-e052-49c8-b1fb-3767baa0f59a
 *   Body: { text, sessionId, chatModel, userId }
 *   Response: { output: string, plan?: string | null }
 * ---------------------------------------------------------------
 */

const N8N_WEBHOOK_URL =
    import.meta.env.VITE_DASHBOARD_N8N_WEBHOOK_URL ||
    'https://n8n.srv1145228.hstgr.cloud/webhook/ab6443aa-e052-49c8-b1fb-3767baa0f59a';

const SESSION_STORAGE_KEY = 'dashboard_chat_session_id';
const USER_ID_STORAGE_KEY = 'dashboard_chat_user_id';

/** โมเดลที่รองรับ ต้องตรงกับ Switch node ใน n8n */
export type DashboardChatModel = 'hanuman' | 'phraram';

/** Map ชื่อโมเดลใน Frontend → ค่า chatModel ที่ n8n คาดหวัง */
const MODEL_MAP: Record<DashboardChatModel, string> = {
    hanuman: 'model-a',
    phraram: 'model-b',
};

// ---------------------------------------------------------------
// Session / User ID Helpers
// ---------------------------------------------------------------

/** ดึง session_id ปัจจุบัน หรือสร้างใหม่ถ้าไม่มี */
export function getDashboardSessionId(): string {
    let sessionId = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!sessionId) {
        sessionId = crypto.randomUUID?.() ?? `session-${Date.now()}`;
        window.localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    }
    return sessionId;
}

/** รีเซ็ต session ใหม่ (เรียกตอนกดปุ่ม New Chat) */
export function resetDashboardSession(): string {
    // ล้างค่าเก่าทิ้งก่อน เพื่อป้องกัน Browser จำค่าเดิม
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    const newId = crypto.randomUUID?.() ?? `session-${Date.now()}`;
    window.localStorage.setItem(SESSION_STORAGE_KEY, newId);
    console.log('[Dashboard AI] New Session Created:', newId);
    return newId;
}

/** ดึง user_id แบบ anonymous (ใช้ localStroage เพราะยังไม่มีระบบ Auth เต็ม) */
export function getDashboardUserId(): string {
    let userId = window.localStorage.getItem(USER_ID_STORAGE_KEY);
    if (!userId) {
        userId = crypto.randomUUID?.() ?? `user-${Date.now()}`;
        window.localStorage.setItem(USER_ID_STORAGE_KEY, userId);
    }
    return userId;
}

// ---------------------------------------------------------------
// Chat API
// ---------------------------------------------------------------

export interface DashboardChatRequest {
    text: string;
    model: DashboardChatModel;
    searchMode?: 'auto' | 'off';
    signal?: AbortSignal;
    requestId?: string;
}

/** ข้อมูลขั้นตอนที่ n8n ส่งกลับมา (ถ้ามี) */
export interface N8nAgentStep {
    agentName: string;
    label: string;
}

export interface DashboardChatResponse {
    output: string;
    plan?: string | null;
    /** ขั้นตอนที่ AI Agent ทำงาน (Multi-Agent mode) */
    steps?: N8nAgentStep[];
}

function createDashboardRequestId(): string {
    return crypto.randomUUID?.() ?? `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function markChatSessionRunning(sessionId: string, userId: string, requestId: string): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await supabase
        .from('chat_sessions')
        .upsert(
            {
                id: sessionId,
                user_id: userId,
                active_request_id: requestId,
                cancel_requested_at: null,
                last_cancelled_request_id: null,
                generation_started_at: now,
                generation_finished_at: null,
                updated_at: now,
            },
            { onConflict: 'id' },
        );

    if (error) {
        console.error('[Dashboard AI] Failed to mark chat session as running', error);
    }
}

async function requestDashboardStop(sessionId: string, requestId: string): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await supabase
        .from('chat_sessions')
        .update({
            cancel_requested_at: now,
            last_cancelled_request_id: requestId,
            updated_at: now,
        })
        .eq('id', sessionId)
        .eq('active_request_id', requestId);

    if (error) {
        console.error('[Dashboard AI] Failed to request stop for chat session', error);
    }
}

async function clearChatSessionRunState(sessionId: string, requestId: string): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await supabase
        .from('chat_sessions')
        .update({
            active_request_id: null,
            cancel_requested_at: null,
            generation_finished_at: now,
            updated_at: now,
        })
        .eq('id', sessionId)
        .eq('active_request_id', requestId);

    if (error) {
        console.error('[Dashboard AI] Failed to clear chat session run state', error);
    }
}

/**
 * sendDashboardMessage
 * ส่งข้อความของผู้ใช้ไปยัง n8n Webhook แล้วรับคำตอบจาก AI กลับมา
 * n8n จะจัดการ:
 *   1. แยก AI ตามโมเดล (Switch node)
 *   2. ดึงประวัติจาก Postgres Chat Memory
 *   3. ตอบกลับด้วย Respond to Webhook node
 */
export async function sendDashboardMessage(
    req: DashboardChatRequest,
    explicitUserId?: string | null,
): Promise<DashboardChatResponse> {
    const sessionId = getDashboardSessionId();
    const userId = explicitUserId || getDashboardUserId();
    const requestId = req.requestId?.trim() || createDashboardRequestId();
    console.log(`[Dashboard AI] Sending message with SessionID: ${sessionId}`);
    const chatModel = MODEL_MAP[req.model] ?? 'model-a';

    // Sub-model routing: Auto -> 'Auto', Off -> 'Off' (ใช้ได้กับทุกโมเดล)
    const searchModel = req.searchMode === 'off' ? 'Off' : 'Auto';

    await markChatSessionRunning(sessionId, userId, requestId);

    if (req.signal?.aborted) {
        await requestDashboardStop(sessionId, requestId);
        throw new DOMException('The operation was aborted.', 'AbortError');
    }

    const abortHandler = () => {
        void requestDashboardStop(sessionId, requestId);
    };
    req.signal?.addEventListener('abort', abortHandler, { once: true });

    try {
        const body = JSON.stringify({
            text: req.text,
            sessionId,
            session_id: sessionId,
            requestId,
            request_id: requestId,
            userId,
            user_id: userId,
            chatModel,
            searchModel,
        });

        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
            signal: req.signal,
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`n8n Webhook error ${response.status}: ${errorText}`);
        }

        let data: DashboardChatResponse;
        try {
            const text = await response.text();
            if (!text) {
                throw new Error('Empty response from n8n webhook');
            }
            data = JSON.parse(text) as DashboardChatResponse;
        } catch (parseErr) {
            console.error('[Dashboard AI] JSON Parse Error:', parseErr);
            throw new Error(`Failed to parse AI response: ${parseErr instanceof Error ? parseErr.message : 'Invalid JSON'}`);
        }

        if (typeof data.output !== 'string') {
            throw new Error('Invalid response format from n8n: missing "output" field');
        }

        return data;
    } finally {
        req.signal?.removeEventListener('abort', abortHandler);
        if (!req.signal?.aborted) {
            void clearChatSessionRunState(sessionId, requestId);
        }
    }
}
