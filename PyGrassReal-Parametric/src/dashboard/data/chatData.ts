import type { LocalizedText } from '../../i18n/language';
import hanumanIcon from '../../assets/Profile-Ai/HANUMAN-AI-512.png';
import phraramIcon from '../../assets/Profile-Ai/PHRARAM-AI-512.png';
import phralakIcon from '../../assets/Profile-Ai/PHRALAK-AI-512.png';
import phipekIcon from '../../assets/Profile-Ai/PHIPEK-AI-512.png';

export interface PresetItem {
  id: string;
  triggerWord: string;
  content: LocalizedText;
}

export const CHAT_LIMITS = {
  MESSAGE_MAX_LENGTH: 4000,
  SESSION_MESSAGE_LIMIT: 250,
  PROJECT_NAME_MAX_LENGTH: 50,
  PRESET_CONTENT_MAX_LENGTH: 1000,
  TRIGGER_WORD_MAX_LENGTH: 30,
  CONFIRM_DELETE_TIMEOUT: 3000,
};

export const CHAT_MODELS = [
  { id: 'hanuman' as const, name: 'Hanuman-Ai', icon: hanumanIcon },
  { id: 'phraram' as const, name: 'Phraram-Ai', icon: phraramIcon },
] as const;

export const MOCK_HISTORY_DATA = [
  {
    id: '1',
    title: { th: 'การเพิ่มประสิทธิภาพแผงโซลาร์เซลล์', en: 'Solar Panel Optimization' },
    date: { th: '2 ชั่วโมงที่แล้ว', en: '2 hours ago' },
    projectId: null
  },
  {
    id: '2',
    title: { th: 'การออกแบบอาคารแบบพาราเมตริก', en: 'Parametric Facade Design' },
    date: { th: 'เมื่อวานนี้', en: 'Yesterday' },
    projectId: null
  },
  {
    id: '3',
    title: { th: 'การวิเคราะห์ความแข็งแรงของวัสดุ', en: 'Material Strength Analysis' },
    date: { th: '3 วันที่แล้ว', en: '3 days ago' },
    projectId: null
  },
];

export const MOCK_PRESETS: PresetItem[] = [
  {
    id: 'preset-1',
    triggerWord: '/brief',
    content: {
      th: 'สรุปหัวข้อนี้เป็น 5 ข้อความสั้นๆ พร้อมตัวอย่างการใช้งานจริง',
      en: 'Summarize this topic in 5 concise bullet points with practical examples.'
    }
  },
  {
    id: 'preset-2',
    triggerWord: '/email',
    content: {
      th: 'เขียนร่างอีเมลแบบมืออาชีพ พร้อมหัวข้อ เนื้อหา และคำเชิญชวน (CTA) ที่ชัดเจน',
      en: 'Write a professional email draft with clear subject, body, and CTA.'
    }
  },
  {
    id: 'preset-3',
    triggerWord: '/translate-th',
    content: {
      th: 'แปลข้อความต่อไปนี้เป็นภาษาไทย โดยรักษาความหมายทางเทคนิคไว้',
      en: 'Translate the following text to Thai while preserving technical meaning.'
    }
  },
  {
    id: 'preset-4',
    triggerWord: '/qa',
    content: {
      th: 'สร้างเคสทดสอบ (Test cases) สำหรับฟีเจอร์นี้ รวมถึงกรณีขอบเขต (Edge cases) และกรณีที่อาจล้มเหลว',
      en: 'Generate test cases for this feature including edge cases and failure paths.'
    }
  }
];

export const RANDOM_PROMPT_TEMPLATES: Array<{ triggerWord: string; content: LocalizedText }> = [
  {
    triggerWord: '/professional-translation',
    content: {
      th: 'แปลเนื้อหาเป็นภาษาไทยที่เป็นทางการ ด้วยระดับภาษาทางธุรกิจที่ชัดเจนและเป็นธรรมชาติ',
      en: 'Translate the input into professional Thai with clear and natural business tone.'
    }
  },
  {
    triggerWord: '/meeting-summary',
    content: {
      th: 'สรุปบันทึกการประชุมนี้เป็นรายการการตัดสินใจหลัก, ผู้รับผิดชอบ และกำหนดส่ง',
      en: 'Summarize this meeting transcript into key decisions, owners, and deadlines.'
    }
  }
];

export const CHAT_HISTORY_UI = {
  title: { th: 'ประวัติการแชท', en: 'Chat History' },
  projectSection: { th: 'โปรเจกต์', en: 'Project' },
  fileSection: { th: 'ไฟล์', en: 'File' },
  recentConversations: { th: 'บทสนทนาล่าสุด', en: 'Recent Conversations' },
  newProject: { th: 'สร้างโปรเจกต์ใหม่', en: 'New Project' },
  newFile: { th: 'สร้างไฟล์ใหม่', en: 'New File' },
  noFiles: { th: 'ยังไม่มีไฟล์', en: 'No files yet.' },
  emptyHint: { th: 'สร้างไฟล์ใหม่หรือลากบทสนทนามาวางที่นี่', en: 'Create a new file or drag conversations here.' },
  confirmDelete: { th: 'ยืนยัน', en: 'Confirm' },
  confirmDeleteHint: { th: 'คลิกอีกครั้งเพื่อยืนยัน', en: 'Click again to confirm' },
  deleteConversation: { th: 'ลบบทสนทนา', en: 'Delete conversation' },
  deleteProject: { th: 'ลบโปรเจกต์', en: 'Delete project' },
  justNow: { th: 'เมื่อสักครู่', en: 'Just now' },
  successNewConversation: { th: 'สร้างการสนทนาใหม่แล้ว', en: 'New conversation created' },
  successProjectCreated: { th: 'สร้างโปรเจกต์แล้ว', en: 'Project created' },
  successProjectDeleted: { th: 'ลบโปรเจกต์แล้ว', en: 'Project deleted' },
  successConversationDeleted: { th: 'ลบบทสนทนาแล้ว', en: 'Conversation deleted' },
  successPresetCreated: { th: 'สร้างเทมเพลตสำเร็จ', en: 'Preset created' },
  successPresetUpdated: { th: 'อัปเดตเทมเพลตสำเร็จ', en: 'Preset updated' },
  successPresetDeleted: { th: 'ลบเทมเพลตสำเร็จ', en: 'Preset deleted' },
  errorTooLong: { th: 'ข้อความยาวเกินไป', en: 'Message too long' },
  errorDuplicateTrigger: { th: 'คำสั่งเรียกนี้มีอยู่แล้ว', en: 'Trigger word already exists' },
  filesCount: (count: number) => ({
    th: `${count} ไฟล์`,
    en: `${count} files`
  }),
  newProjectPlaceholder: { th: 'เช่น โปรเจกต์สุดเจ๋งของฉัน', en: 'e.g. My Awesome Project' },
  newProjectTitle: { th: 'ชื่อโปรเจกต์ใหม่', en: 'New Project Name' },
  footerStatus: { th: 'เชื่อมต่อกับ PyGrass Real-Time Engine แล้ว', en: 'Connected to PyGrass Real-Time Engine' },
};

export const CHAT_HEADER_UI = {
  newChat: { th: 'เริ่มการสนทนาใหม่', en: 'Start a new conversation' },
  toggleHistory: { th: 'เปิด/ปิดประวัติการแชท', en: 'Toggle Chat History' },
  newFile: { th: 'ไฟล์ใหม่', en: 'New File' },
  projectChat: { th: 'แชทโปรเจกต์', en: 'Project Chat' },
};

export const CHAT_UI = {
  userLabel: { th: 'คุณ', en: 'You' },
  thinking: { th: 'กำลังคิด...', en: 'Thinking...' },
  untitled: { th: 'ไฟล์ใหม่', en: 'Untitled' },
  mockResponse: (model: string, content: string) => ({
    th: `ได้รับคำขอของคุณผ่านโมเดล **${model}** แล้ว: "${content}" นี่คืออินเทอร์เฟซใหม่ของระบบ AI ผู้ช่วย ส่วนการเชื่อมต่อจริงกำลังจะมาเร็วๆ นี้!`,
    en: `I received your request using **${model}** model: "${content}". This is the new AI Assistant UI. Real integration is coming soon!`,
  }),
};

export const CHAT_COMPOSER_UI = {
  placeholder: { th: 'ถามอะไรก็ได้...', en: 'Ask anything...' },
  attachFile: { th: 'แนบไฟล์', en: 'Attach file' },
  addFiles: { th: 'เพิ่มไฟล์และรูปภาพ', en: 'Add files and photos' },
  presets: { th: 'เทมเพลต', en: 'Presets' },
  setting: { th: 'ตั้งค่า', en: 'Setting' },
  webSearch: { th: 'ค้นหาเว็บ', en: 'Web search' },
  auto: { th: 'อัตโนมัติ', en: 'Auto' },
  autoDesc: { th: 'ค้นหาเมื่อจำเป็น', en: 'Browses the web when needed' },
  off: { th: 'ปิด', en: 'Off' },
  offDesc: { th: 'ไม่มีการเข้าถึงเว็บ', en: 'No web access' },
  noPresets: { th: 'ไม่พบเทมเพลต', en: 'No presets available.' },
  newPrompts: { th: 'สร้างเทมเพลตใหม่', en: 'New prompts' },
  searchPrompts: { th: 'ค้นหาเทมเพลตที่บันทึกไว้', en: 'Search Saved Prompts' },
  addPrompts: { th: 'เพิ่มเทมเพลต', en: 'Add Prompts' },
  triggerWord: { th: 'คำสั่งเรียก', en: 'Trigger Word' },
  content: { th: 'เนื้อหา', en: 'Content' },
  confirm: { th: 'ยืนยัน', en: 'Confirm' },
  noSavedPrompts: { th: 'ไม่พบเทมเพลตที่บันทึกไว้', en: 'No saved prompts found.' },
  createSubtitle: { th: 'คุณสามารถบันทึกข้อความที่ใช้บ่อยเป็นเทมเพลตได้', en: 'You can set frequently used content as prompts' },
  randomOne: { th: 'สุ่มตัวอย่าง', en: 'Random One' },
  contentLabel: { th: 'เนื้อหา', en: 'Content' },
  contentPlaceholder: { th: 'เช่น เขียนข้อความนี้ใหม่ให้กระชับและเป็นทางการ', en: 'e.g. Rewrite this text into a concise and professional response.' },
  triggerLabel: { th: 'คำสั่งเรียก (Trigger)', en: 'Trigger Word' },
  triggerPlaceholder: { th: 'เช่น /translate', en: 'e.g. /translate' },
  cancel: { th: 'ยกเลิก', en: 'Cancel' },
  save: { th: 'บันทึก', en: 'Save' },
  new: { th: 'สร้างใหม่', en: 'New' },
  stop: { th: 'หยุด', en: 'Stop' },
  sendMessage: { th: 'ส่งข้อความ', en: 'Send message' },
  disclaimer: { th: 'AI อาจให้ข้อมูลที่ไม่ถูกต้อง โปรดตรวจสอบข้อมูลสำคัญอีกครั้ง', en: 'AI can make mistakes. Check important info.' },
};
