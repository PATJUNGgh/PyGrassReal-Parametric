/**
 * agentParser.ts
 * ---------------------------------------------------------------
 * ดึงชื่อ AI Agent จากก้อนข้อความ (Content) ใน Dashboard_ChatMemory
 * แล้วแปลงให้ตรงกับชื่อหน้าบ้าน (Frontend display name)
 * ---------------------------------------------------------------
 */

/** Map ชื่อ pattern หลังบ้าน → ชื่อ Agent หน้าบ้านพร้อม label */
export interface AgentInfo {
    agentName: string; // ตรงกับ key ใน AGENT_ICONS (Phraram-Ai, Hanuman-Ai, Phralak-Ai, Phipek-Ai)
    label: string;      // Label ที่จะแสดงใน Stepper
}

const AGENT_NAME_MAP: { pattern: RegExp; info: AgentInfo }[] = [
    {
        pattern: /hanuman|search web1|wikipedia|sonar/i,
        info: { agentName: 'Hanuman-Ai', label: 'ฝ่ายวิจัยค้นหาข้อมูลและสรุปเนื้อหาเบื้องต้น' },
    },
    {
        pattern: /phipek|reviewer|auditor|qc|security|mimo1/i, // เลื่อน Phipek ขึ้นมาก่อน และเพิ่ม mimo1
        info: { agentName: 'Phipek-Ai', label: 'ฝ่ายตรวจสอบความถูกต้องแบบเข้มงวด (QC & Security)' },
    },
    {
        pattern: /phralak|coder|programmer|python|sql|javascript|mimo\b/i, // เพิ่ม boundary \b ให้ mimo จะได้ไม่ไป match mimo1
        info: { agentName: 'Phralak-Ai', label: 'ฝ่ายสร้างสรรค์เอกสารและหัวหน้าทีมโปรแกรมเมอร์' },
    },
    {
        pattern: /phraram|orchestrator|master/i,
        info: { agentName: 'Phraram-Ai', label: 'วิเคราะห์คำสั่งและแบ่งงาน' },
    },
];

/**
 * ตรวจสอบว่า content ก้อนนี้มีการกล่าวถึง Agent ตัวไหนบ้าง
 * รองรับรูปแบบที่ n8n เขียนมาเช่น:
 *   "Tool: Hanuman-Ai, Input: ..."
 *   "Used tools: Tool: Phralak-Ai, ..."
 *   "assistantanalysis: Hanuman-Ai ..."
 */
export function detectAgentsFromContent(content: string): AgentInfo[] {
    const found: AgentInfo[] = [];
    const seen = new Set<string>();

    const contentSnippet = content.slice(0, 100).replace(/\n/g, ' ');
    console.log(`[Parser] Detecting agents in: "${contentSnippet}..."`);

    // 1. ตรวจสอบจาก [STATUS] (ลำดับความสำคัญสูงสุด)
    const statusAgent = parseSystemStatusMessage(content);
    if (statusAgent) {
        console.log(`[Parser] Match [STATUS]: ${statusAgent.agentName}`);
        return [statusAgent];
    }

    // 2. ตรวจสอบ Technical Markers (Tool logs จาก n8n)
    const hasTechnicalMarkers = /assistantanalysis|\[\[|Tool:|Input:|Result:|\[Used tools:/i.test(content);

    if (hasTechnicalMarkers) {
        for (const { pattern, info } of AGENT_NAME_MAP) {
            if (pattern.test(content) && !seen.has(info.agentName)) {
                console.log(`[Parser] Match keyword (technical): ${info.agentName}`);
                found.push(info);
                seen.add(info.agentName);
            }
        }
        if (found.length > 0) return found;
    }

    // 3. ตรวจสอบ "Content Markers" — รูปแบบเนื้อหาที่เป็นเอกลักษณ์ของลูกน้องแต่ละตัว
    //    เช่น Hanuman จะเขียนงาน "ค้นหา/search/API", Phralak จะเขียนโค้ด, Phipek จะตรวจสอบ
    const CONTENT_MARKERS: { pattern: RegExp; info: AgentInfo }[] = [
        {
            // Hanuman: ข้อความเกี่ยวกับการค้นหา, API, แหล่งข้อมูล
            pattern: /^##\s*(ค้นหาเรื่อง|🔍|แหล่งข้อมูล|API\s+ราคา)/i,
            info: { agentName: 'Hanuman-Ai', label: 'ฝ่ายวิจัยค้นหาข้อมูลและสรุปเนื้อหาเบื้องต้น' },
        },
        {
            // Phralak: ข้อความที่มีโค้ดบล็อก (python/js/sql) หรือ Standalone app
            pattern: /^```(python|javascript|typescript|sql)|Standalone|Streamlit/im,
            info: { agentName: 'Phralak-Ai', label: 'ฝ่ายสร้างสรรค์เอกสารและหัวหน้าทีมโปรแกรมเมอร์' },
        },
        {
            // Phipek: ข้อความตรวจสอบ, audit, QC
            pattern: /^##\s*(✅|สรุปการตรวจสอบ|ตรวจสอบ|QC|Security)/i,
            info: { agentName: 'Phipek-Ai', label: 'ฝ่ายตรวจสอบความถูกต้องแบบเข้มงวด (QC & Security)' },
        },
    ];

    for (const { pattern, info } of CONTENT_MARKERS) {
        if (pattern.test(content) && !seen.has(info.agentName)) {
            console.log(`[Parser] Match content marker: ${info.agentName} (Pattern: ${pattern})`);
            found.push(info);
            seen.add(info.agentName);
            break; // ข้อความหนึ่งชิ้นมาจาก Agent เดียว → หยุดทันทีเมื่อเจอ
        }
    }

    if (found.length === 0 && content.length > 50) {
        console.log(`[Parser] No agents found in this content (general message).`);
    }

    return found;
}

/**
 * สรุปข้อความแต่ละชิ้นของ Agent ออกมาให้อ่านง่าย
 * ถ้า content ยาวเกิน maxLen ตัด + ต่อ "..."
 */
export function truncateContent(content: string, maxLen = 300): string {
    const cleaned = cleanAgentContent(content);
    if (cleaned.length <= maxLen) return cleaned;
    return cleaned.slice(0, maxLen).trimEnd() + '…';
}

/**
 * ทำความสะอาดข้อความจาก AI
 * @param isSubAgentMessage ถ้าเป็นข้อความย่อย (Tool Logs) จะลบข้อมูลน้อยลงเพื่อให้เห็นกระบวนการ
 */
export function cleanAgentContent(content: string, isSubAgentMessage = false): string {
    let cleaned = content;

    // ลบ TEAM_SUMMARY block ออก (ทั้งแบบสมบูรณ์และไม่สมบูรณ์)
    // 1) ลบ block สมบูรณ์: [[TEAM_SUMMARY]]...[[/TEAM_SUMMARY]]
    cleaned = cleaned.replace(/\[\[TEAM_SUMMARY\]\][\s\S]*?\[\[\/TEAM_SUMMARY\]\]/g, '');
    // 2) ลบ tag เปิดที่ไม่มี tag ปิด (กรณี streaming ยังไม่จบ)
    cleaned = cleaned.replace(/\[\[TEAM_SUMMARY\]\][\s\S]*/g, '');
    // 3) ลบ tag ปิดที่หลงเหลือเดี่ยวๆ
    cleaned = cleaned.replace(/\[\[\/TEAM_SUMMARY\]\]/g, '');
    cleaned = cleaned.trim();

    if (!isSubAgentMessage) {
        // สำหรับข้อความหลัก: ลบ Log และรหัสเทคนิคทั้งหมด
        cleaned = cleaned
            .replace(/\[Used tools:[\s\S]*?\]\]/g, '')
            .replace(/assistantanalysis[\s\S]*?assistantfinal/g, '')
            .replace(/assistantcommentary[\s\S]*?assistantanalysis/g, '')
            .replace(/assistantfinal/g, '');
    } else {
        // สำหรับข้อความย่อย (Sub-agent): ลบเฉพาะส่วนที่ขวางหูขวางตาเกินไป เช่น JSON ก้อนใหญ่ๆ
        cleaned = cleaned
            .replace(/Result: \[[\s\S]*?\]/g, 'Result: [Data retrieved...]')
            .replace(/assistantfinal|assistantanalysis|assistantcommentary/g, '');
    }

    cleaned = cleaned
        .replace(/\[\[.*?\]\]/g, '') // ลบ Dynamic Label ออกจากเนื้อหาหลักเสมอ
        .replace(/\\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[^\S\n]{2,}/g, ' ') // ลบช่องว่างซ้ำ แต่เก็บ newline ไว้ (เพื่อไม่ทำลาย markdown)
        .trim();

    if (!cleaned && content) {
        return content.slice(0, 100) + '...';
    }

    return cleaned;
}

/**
 * ดึง Label สถานะจาก "สมอง" AI (ตรวจจับรูปแบบ [[สถานะ...]])
 */
export function extractProgressLabel(content: string): string | null {
    const match = content.match(/\[\[(.*?)\]\]/);
    return match ? match[1].trim() : null;
}

/**
 * แปลง `type` จาก Supabase (human/ai) → role ที่ Frontend ใช้
 */
export function toMessageRole(type: string): 'user' | 'assistant' {
    return type === 'human' ? 'user' : 'assistant';
}

// ─── Team Summary ─────────────────────────────────────────────────────────────

export interface TeamSummaryItem {
    agentName: string;
    summary: string;
}

/**
 * ดึงบล็อค [[TEAM_SUMMARY]]...[[/TEAM_SUMMARY]] ออกจากข้อความ
 * แล้วแปลงแต่ละบรรทัดเป็น { agentName, summary }
 */
export function extractTeamSummary(content: string): TeamSummaryItem[] | null {
    const match = content.match(/\[\[TEAM_SUMMARY\]\]([\s\S]*?)\[\[\/TEAM_SUMMARY\]\]/);
    if (!match) return null;

    const lines = match[1].trim().split('\n');
    const items: TeamSummaryItem[] = [];

    for (const line of lines) {
        // รองรับรูปแบบ: "- AgentName: summary text"
        const m = line.match(/^-\s*([^:]+):\s*(.+)$/);
        if (m) {
            items.push({
                agentName: m[1].trim(),
                summary: m[2].trim(),
            });
        }
    }

    return items.length > 0 ? items : null;
}

/**
 * ตรวจสอบข้อความ Status ว่าเป็นของ Agent ตัวไหน (ยิงมาจาก Postgres Node ก่อนเริ่มคิด)
 * คาดหวังรูปแบบเช่น: "[STATUS] Hanuman-Ai is thinking..." 
 */
export function parseSystemStatusMessage(content: string): AgentInfo | null {
    if (!content.includes('[STATUS]')) return null;

    for (const { pattern, info } of AGENT_NAME_MAP) {
        if (pattern.test(content)) {
            return info;
        }
    }
    return null;
}
