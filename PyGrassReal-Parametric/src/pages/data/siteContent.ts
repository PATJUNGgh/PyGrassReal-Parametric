import { Bot, LayoutDashboard, Network, Paintbrush, Shapes, SwatchBook, Building2, Lightbulb, Package } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { LocalizedText } from '../../i18n/language';
import type { AiProfile } from '../components/AiProfileCard';
import phraramImg512Avif from '../../assets/Profile-Ai/PHRARAM-AI-512.avif';
import phraramImg1024Avif from '../../assets/Profile-Ai/PHRARAM-AI.avif';
import phraramImg512Webp from '../../assets/Profile-Ai/PHRARAM-AI-512.webp';
import phraramImg1024Webp from '../../assets/Profile-Ai/PHRARAM-AI.webp';
import phraramImg512 from '../../assets/Profile-Ai/PHRARAM-AI-512.png';
import hanumanImg512Avif from '../../assets/Profile-Ai/HANUMAN-AI-512.avif';
import hanumanImg1024Avif from '../../assets/Profile-Ai/HANUMAN-AI.avif';
import hanumanImg512Webp from '../../assets/Profile-Ai/HANUMAN-AI-512.webp';
import hanumanImg1024Webp from '../../assets/Profile-Ai/HANUMAN-AI.webp';
import hanumanImg512 from '../../assets/Profile-Ai/HANUMAN-AI-512.png';
import phralakImg512Avif from '../../assets/Profile-Ai/PHRALAK-AI-512.avif';
import phralakImg1024Avif from '../../assets/Profile-Ai/PHRALAK-AI.avif';
import phralakImg512Webp from '../../assets/Profile-Ai/PHRALAK-AI-512.webp';
import phralakImg1024Webp from '../../assets/Profile-Ai/PHRALAK-AI.webp';
import phralakImg512 from '../../assets/Profile-Ai/PHRALAK-AI-512.png';
import phipekImg512Avif from '../../assets/Profile-Ai/PHIPEK-AI-512.avif';
import phipekImg1024Avif from '../../assets/Profile-Ai/PHIPEK-AI.avif';
import phipekImg512Webp from '../../assets/Profile-Ai/PHIPEK-AI-512.webp';
import phipekImg1024Webp from '../../assets/Profile-Ai/PHIPEK-AI.webp';
import phipekImg512 from '../../assets/Profile-Ai/PHIPEK-AI-512.png';
import phraramImg1024 from '../../assets/Profile-Ai/PHRARAM-AI.png';
import hanumanImg1024 from '../../assets/Profile-Ai/HANUMAN-AI.png';
import phralakImg1024 from '../../assets/Profile-Ai/PHRALAK-AI.png';
import phipekImg1024 from '../../assets/Profile-Ai/PHIPEK-AI.png';
import type { RoadmapItem } from '../components/RoadmapCard';

export interface FeatureItem {
  title: LocalizedText;
  description: LocalizedText;
  icon: LucideIcon;
}

export interface UseCaseItem {
  title: LocalizedText;
  description: LocalizedText;
  icon: LucideIcon;
}

export const FEATURES: FeatureItem[] = [
  {
    title: { th: 'เวิร์กโฟลว์แบบโหนด', en: 'Node Workflow' },
    description: { th: 'สร้างตรรกะงาน 3D ด้วยกราฟโหนดที่เชื่อมต่อและนำกลับมาใช้ซ้ำได้', en: 'Construct 3D logic with connected, reusable node graphs.' },
    icon: Network,
  },
  {
    title: { th: 'Mesh Boolean', en: 'Mesh Boolean' },
    description: { th: 'ทำคำสั่ง union และ difference ได้โดยตรงในโฟลว์ภาพ', en: 'Run union and difference operations directly in your visual flow.' },
    icon: Shapes,
  },
  {
    title: { th: 'AI Sculpt', en: 'AI Sculpt' },
    description: { th: 'สร้างรูปทรงปริมาตรหลายแบบจากข้อความสั้น ๆ', en: 'Generate volumetric shape variations from short text prompts.' },
    icon: Bot,
  },
  {
    title: { th: 'AI Paint', en: 'AI Paint' },
    description: { th: 'ลงเท็กซ์เจอร์ที่คุมสไตล์ พร้อมมาสก์วัสดุที่กำหนดทิศทางได้', en: 'Apply style-aware texture passes with guided material masks.' },
    icon: Paintbrush,
  },
  {
    title: { th: 'วัสดุและข้อความ', en: 'Material and Text' },
    description: { th: 'จัดการพรีเซ็ตพื้นผิวและข้อความซ้อนทับที่แก้ไขได้ในที่เดียว', en: 'Manage surface presets and editable text overlays from one place.' },
    icon: SwatchBook,
  },
  {
    title: { th: 'แดชบอร์ดเวิร์กโฟลว์', en: 'Workflow Dashboard' },
    description: { th: 'ติดตามเวอร์ชัน จัดระเบียบงาน และกลับเข้าสู่โปรเจกต์ที่กำลังทำทันที', en: 'Track iterations, sort assets, and jump back into active projects.' },
    icon: LayoutDashboard,
  },
];

export const USE_CASES: UseCaseItem[] = [
  {
    title: { th: 'สถาปัตยกรรม', en: 'Architecture' },
    description: { th: 'ทดลองรูปทรงเบื้องต้น ตรรกะฟาซาด และแนวคิด massing แบบพาราเมตริกได้รวดเร็ว', en: 'Prototype form studies, facade logic, and parametric massing concepts quickly.' },
    icon: Building2,
  },
  {
    title: { th: 'ออกแบบผลิตภัณฑ์', en: 'Product Design' },
    description: { th: 'ทำซ้ำรูปทรงและวัสดุหลายตัวเลือกก่อนลงรายละเอียดใน CAD', en: 'Iterate shape variants and material options before detailed CAD refinement.' },
    icon: Package,
  },
  {
    title: { th: 'คอนเซ็ปต์โมเดลลิง', en: 'Concept Modeling' },
    description: { th: 'ผสานการควบคุมโหนดด้วยมือกับ AI prompt เพื่อสำรวจไอเดียอย่างรวดเร็ว', en: 'Blend manual node control with AI prompts for fast, creative exploration.' },
    icon: Lightbulb,
  },
];

export const AI_PROFILES: AiProfile[] = [
  {
    name: { th: 'พระราม', en: 'Phra Ram' },
    nameEn: 'Phra Ram AI',
    role: { th: 'ศูนย์บัญชาการและตรรกะหลัก', en: 'Core Logic and Command Center' },
    badge: { th: 'ผู้บัญชาการ', en: 'COMMANDER' },
    description: { th: 'กำกับ workflow หลักของระบบ ตัดสินใจลำดับงานภาพรวม และประสานคำสั่งไปยัง AI ผู้เชี่ยวชาญแต่ละตัว', en: 'Orchestrates the main workflow, prioritizes system-level decisions, and coordinates tasks across specialist AI agents.' },
    img: phraramImg512,
    imgAvifSrcSet: `${phraramImg512Avif} 512w, ${phraramImg1024Avif} 1024w`,
    imgWebpSrcSet: `${phraramImg512Webp} 512w, ${phraramImg1024Webp} 1024w`,
    imgSrcSet: `${phraramImg512} 512w, ${phraramImg1024} 1024w`,
    imgSizes: '(max-width: 680px) 100vw, (max-width: 980px) 50vw, 25vw',
    accent: 'rgba(56, 189, 248, 0.72)',
    accentGlow: 'rgba(56, 189, 248, 0.18)',
  },
  {
    name: { th: 'หนุมาน', en: 'Hanuman' },
    nameEn: 'Hanuman AI',
    role: { th: 'ต้นแบบรวดเร็วและงานปฏิบัติการ', en: 'Rapid Prototyping and Execution' },
    badge: { th: 'ผู้ปฏิบัติการ', en: 'EXECUTOR' },
    description: { th: 'สร้างและคำนวณโมเดล 3D ได้รวดเร็ว เหมาะกับการทดลองไอเดียและผลิตรูปแบบหลายเวอร์ชันในเวลาสั้น', en: 'Builds and evaluates 3D variations at high speed for rapid experimentation and short design cycles.' },
    img: hanumanImg512,
    imgAvifSrcSet: `${hanumanImg512Avif} 512w, ${hanumanImg1024Avif} 1024w`,
    imgWebpSrcSet: `${hanumanImg512Webp} 512w, ${hanumanImg1024Webp} 1024w`,
    imgSrcSet: `${hanumanImg512} 512w, ${hanumanImg1024} 1024w`,
    imgSizes: '(max-width: 680px) 100vw, (max-width: 980px) 50vw, 25vw',
    accent: 'rgba(251, 146, 60, 0.72)',
    accentGlow: 'rgba(251, 146, 60, 0.18)',
  },
  {
    name: { th: 'พระลักษมณ์', en: 'Phra Lak' },
    nameEn: 'Phra Lak AI',
    role: { th: 'ผู้ช่วยปรับแต่งและเพิ่มประสิทธิภาพ', en: 'Assistant and Optimization' },
    badge: { th: 'นักปรับจูน', en: 'OPTIMIZER' },
    description: { th: 'ช่วย refine โมเดล จัดระเบียบ node graph และปรับพารามิเตอร์เพื่อให้ผลลัพธ์มีความละเอียดและแม่นยำขึ้น', en: 'Refines models, organizes node graphs, and tunes parameters for higher quality and predictable output.' },
    img: phralakImg512,
    imgAvifSrcSet: `${phralakImg512Avif} 512w, ${phralakImg1024Avif} 1024w`,
    imgWebpSrcSet: `${phralakImg512Webp} 512w, ${phralakImg1024Webp} 1024w`,
    imgSrcSet: `${phralakImg512} 512w, ${phralakImg1024} 1024w`,
    imgSizes: '(max-width: 680px) 100vw, (max-width: 980px) 50vw, 25vw',
    accent: 'rgba(74, 222, 128, 0.72)',
    accentGlow: 'rgba(74, 222, 128, 0.18)',
  },
  {
    name: { th: 'พิเภก', en: 'Phipek' },
    nameEn: 'Phipek AI',
    role: { th: 'วิเคราะห์เชิงลึกและคาดการณ์', en: 'Analysis and Prediction' },
    badge: { th: 'นักวิเคราะห์', en: 'ANALYZER' },
    description: { th: 'วิเคราะห์ข้อผิดพลาด ตรวจความถูกต้องก่อนเรนเดอร์ และช่วยคาดการณ์ความเสี่ยงด้านคุณภาพของโมเดล', en: 'Performs error analysis, validates outputs before render, and predicts quality risks early in the pipeline.' },
    img: phipekImg512,
    imgAvifSrcSet: `${phipekImg512Avif} 512w, ${phipekImg1024Avif} 1024w`,
    imgWebpSrcSet: `${phipekImg512Webp} 512w, ${phipekImg1024Webp} 1024w`,
    imgSrcSet: `${phipekImg512} 512w, ${phipekImg1024} 1024w`,
    imgSizes: '(max-width: 680px) 100vw, (max-width: 980px) 50vw, 25vw',
    accent: 'rgba(192, 132, 252, 0.72)',
    accentGlow: 'rgba(192, 132, 252, 0.18)',
  },
];

export const ROADMAP_ITEMS: RoadmapItem[] = [
  {
    quarter: 'Q1',
    title: { th: 'แกนหลัก Node Canvas', en: 'Core Node Canvas' },
    description: { th: 'ยกระดับการโต้ตอบกับกราฟ ระบบ snap และเสถียรภาพคอมโพเนนต์สำหรับใช้งานจริงทุกวัน', en: 'Refine graph interactions, snapping, and component stability for daily production use.' },
  },
  {
    quarter: 'Q2',
    title: { th: 'AI Sculpt + Paint', en: 'AI Sculpt + Paint' },
    description: { th: 'เพิ่ม prompt แบบมีไกด์และ pipeline งานแปรง เพื่อสำรวจคอนเซ็ปต์ได้เร็วขึ้น', en: 'Introduce guided prompts and brush pipelines for rapid concept exploration.' },
  },
  {
    quarter: 'Q3',
    title: { th: 'เวิร์กโฟลว์แบบทีม', en: 'Team Workflows' },
    description: { th: 'รองรับพรีเซ็ตร่วมกัน การทำเวอร์ชันเวิร์กโฟลว์ และการส่งต่องานขึ้นคลาวด์', en: 'Add shared presets, versioned workflows, and cloud-ready project handoff.' },
  },
];


