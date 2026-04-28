import type { LocalizedText } from '../../i18n/language';

export type ChatModel = 'hanuman' | 'phraram';

/** สถานะของ Agent Step แต่ละขั้น */
export type AgentStepStatus = 'pending' | 'active' | 'done' | 'error';

/** ข้อมูลขั้นตอนการทำงานของ AI Agent */
export interface AgentStep {
  id: string;
  agentName: string;
  label: string;
  status: AgentStepStatus;
  icon?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  model?: ChatModel;
  /** ขั้นตอนที่ AI ทำงาน (เฉพาะ Multi-Agent / Phraram mode) */
  agentSteps?: AgentStep[];
  /** ข้อความย่อยจาก AI ลูกน้องแต่ละตัว (ดึงจาก Supabase ระหว่าง generate) */
  subAgentMessages?: SubAgentMessage[];
}

/** ข้อความย่อยจาก AI ลูกน้อง แต่ละตัว */
export interface SubAgentMessage {
  id: string;
  agentName: string; // ตรงกับ AGENT_ICONS key เช่น 'Hanuman-Ai'
  content: string;
  timestamp: number;
}

export type ChatAttachmentKind = 'image' | 'video' | 'file';

export interface ChatAttachment {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  kind: ChatAttachmentKind;
  previewUrl?: string;
  /** URL จาก bunny.net CDN หลังอัปโหลดสำเร็จ */
  cdnUrl?: string;
  /** Path ภายใน bunny.net Storage Zone */
  storagePath?: string;
  /** File object ดั้งเดิม (ใช้สำหรับอัปโหลด, ไม่แสดงผล) */
  _file?: File;
  createdAt: number;
}

export interface ChatProject {
  id: string;
  name: string;
}

export interface HistoryItemData {
  id: string;
  title: string | LocalizedText;
  date: string | LocalizedText;
  projectId: string | null;
}
