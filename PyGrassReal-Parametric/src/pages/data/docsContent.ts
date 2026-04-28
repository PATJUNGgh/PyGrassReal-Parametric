import type { LocalizedText } from '../../i18n/language';

export interface NodeDocCategory {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  items: LocalizedText[];
}

export const NODE_CATEGORIES: NodeDocCategory[] = [
  {
    id: 'primitive',
    title: { th: 'โหนดพื้นฐาน', en: 'Primitive Nodes' },
    description: { th: 'สร้างรูปทรงพื้นฐานเพื่อขึ้นโครงและเริ่มงานได้รวดเร็ว', en: 'Base geometry creation for quick blockout and initial forms.' },
    items: [
      { th: 'กล่อง (Box)', en: 'Box'},
      { th: 'ทรงกลม (Sphere)', en: 'Sphere'},
      { th: 'ทรงกระบอก (Cylinder)', en: 'Cylinder'},
      { th: 'ระนาบ (Plane)', en: 'Plane'},
    ],
  },
  {
    id: 'transform',
    title: { th: 'โหนดแปลงทรานส์ฟอร์ม', en: 'Transform Nodes' },
    description: { th: 'ย้าย หมุน และสเกลเรขาคณิตด้วยตัวเลขที่ควบคุมได้ชัดเจน', en: 'Position, rotate, and scale geometry with explicit numeric control.' },
    items: [
      { th: 'ย้าย (Move)', en: 'Move'},
      { th: 'หมุน (Rotate)', en: 'Rotate'},
      { th: 'สเกล (Scale)', en: 'Scale'},
      { th: 'จัดแกน Pivot', en: 'Pivot Align'},
    ],
  },
  {
    id: 'mesh',
    title: { th: 'การจัดการ Mesh', en: 'Mesh Operations' },
    description: { th: 'แก้ไข Boolean และ topology สำหรับ pipeline งานโมเดล', en: 'Boolean and topology edits for modeling pipelines.' },
    items: [
      { th: 'Boolean รวม (Union)', en: 'Boolean Union'},
      { th: 'Boolean ลบ (Difference)', en: 'Boolean Difference'},
      { th: 'แบ่งละเอียด (Subdivision)', en: 'Subdivision'},
      { th: 'เกลี่ยผิว (Smooth)', en: 'Smooth'},
    ],
  },
  {
    id: 'ai',
    title: { th: 'โหนด AI', en: 'AI Nodes' },
    description: { th: 'คำสั่งแบบ prompt สำหรับปั้นทรง สร้างเวอร์ชัน และช่วยลงสี', en: 'Prompt-based operations for sculpting, variations, and paint assist.' },
    items: [
      { th: 'Prompt Sculpt', en: 'Prompt Sculpt'},
      { th: 'โอนสไตล์ (Style Transfer)', en: 'Style Transfer'},
      { th: 'AI Paint Mask', en: 'AI Paint Mask'},
      { th: 'แนะนำวัสดุ', en: 'Material Suggestion'},
    ],
  },
];
