/**
 * dashboard.memory.api.ts
 * ---------------------------------------------------------------
 * Service สำหรับดึงข้อมูล Chat Memory จาก Postgres
 * ใช้ดูประวัติการคุยระหว่าง AI Agent เบื้องหลัง (Dev View)
 * ---------------------------------------------------------------
 */

import { supabase } from '../../lib/supabaseClient';

export interface MemoryMessage {
    type: 'human' | 'ai' | 'system';
    content: string;
    tool_calls?: unknown[];
}

export interface ChatMemoryRow {
    id: number;
    session_id: string;
    agent_name?: string | null;
    message: MemoryMessage;
    created_at: string;
}

/**
 * ดึงประวัติ Chat Memory ตาม session_id
 * เรียงจากเก่าไปใหม่ เพื่อให้อ่านประวัติการคุยเป็นลำดับ
 */
export async function getChatMemoryBySessionId(
    sessionId: string,
): Promise<ChatMemoryRow[]> {
    const { data, error } = await supabase
        .from('AgentChat_Memory')
        .select('id, session_id, agent_name, message, created_at')
        .eq('session_id', sessionId)
        .order('id', { ascending: true });

    if (error) {
        console.error('[Memory API] Failed to fetch chat memory', error);
        throw new Error(`Failed to fetch chat memory: ${error.message}`);
    }

    return (data ?? []) as ChatMemoryRow[];
}
