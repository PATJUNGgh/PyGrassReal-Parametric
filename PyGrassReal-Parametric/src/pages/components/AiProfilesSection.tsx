import phraramImg from '../../assets/Profile-Ai/PHRARAM-AI.png';
import hanumanImg from '../../assets/Profile-Ai/HANUMAN-AI.png';
import phralakImg from '../../assets/Profile-Ai/PHRALAK-AI.png';
import phipekImg from '../../assets/Profile-Ai/PHIPEK-AI.png';

interface AiProfile {
    name: string;
    nameEn: string;
    role: string;
    badge: string;
    description: string;
    img: string;
    accent: string;
    accentGlow: string;
}

const AI_PROFILES: AiProfile[] = [
    {
        name: 'พระราม',
        nameEn: 'Phra Ram AI',
        role: 'Core Logic & Command Center',
        badge: 'COMMANDER',
        description:
            'จัดการ Workflow หลักของระบบ ตัดสินใจกระบวนการทำงานภาพรวม และประมวลผลคำสั่งเชิงโครงสร้างทั้งหมด ก่อนส่งงานต่อไปยัง AI ทีมงาน',
        img: phraramImg,
        accent: 'rgba(56, 189, 248, 0.72)',
        accentGlow: 'rgba(56, 189, 248, 0.18)',
    },
    {
        name: 'หนุมาน',
        nameEn: 'Hanuman AI',
        role: 'Rapid Prototyping & Execution',
        badge: 'EXECUTOR',
        description:
            'ลงมือปฏิบัติการสร้าง 3D Model อย่างรวดเร็วและทรงพลัง คำนวณและ Generate ชิ้นงานได้ในเวลาอันสั้น ด้วยความสามารถที่ก้าวกระโดด',
        img: hanumanImg,
        accent: 'rgba(251, 146, 60, 0.72)',
        accentGlow: 'rgba(251, 146, 60, 0.18)',
    },
    {
        name: 'พระลักษมณ์',
        nameEn: 'Phra Lak AI',
        role: 'Assistant & Optimization',
        badge: 'OPTIMIZER',
        description:
            'ช่วยเหลือปรับแต่ง (Refine) โมเดล 3D ให้สมบูรณ์แบบ จัดระเบียบ Node Graph และบริหารพารามิเตอร์รอง เพื่อผลลัพธ์ที่ละเอียดและแม่นยำ',
        img: phralakImg,
        accent: 'rgba(74, 222, 128, 0.72)',
        accentGlow: 'rgba(74, 222, 128, 0.18)',
    },
    {
        name: 'พิเภก',
        nameEn: 'Phipek AI',
        role: 'Analysis & Prediction',
        badge: 'ANALYZER',
        description:
            'วิเคราะห์เชิงลึกและทำนายข้อผิดพลาด (Error Detection) ตรวจสอบความถูกต้องของโมเดลก่อนทำการเรนเดอร์ มั่นใจได้ว่าผลลัพธ์ถูกต้องทุกครั้ง',
        img: phipekImg,
        accent: 'rgba(192, 132, 252, 0.72)',
        accentGlow: 'rgba(192, 132, 252, 0.18)',
    },
];

interface AiProfilesSectionProps {
    onNavigate: (path: string) => void;
}

export function AiProfilesSection({ onNavigate }: AiProfilesSectionProps) {
    return (
        <section className="pg-section pg-fade-up pg-delay-2">
            <div className="pg-section-heading">
                <h2>AI Team</h2>
                <p>ทีมปัญญาประดิษฐ์สี่ตัวตนที่ทำงานร่วมกันขับเคลื่อน PyGrassReal-Ai</p>
            </div>
            <div className="pg-ai-team-grid">
                {AI_PROFILES.map((ai) => (
                    <article
                        key={ai.nameEn}
                        className="pg-ai-card"
                        onClick={() => onNavigate('/dashboard')}
                        style={{
                            '--ai-accent': ai.accent,
                            '--ai-glow': ai.accentGlow,
                            cursor: 'pointer',
                        } as React.CSSProperties}
                    >
                        <div className="pg-ai-card-img-wrap">
                            <img
                                src={ai.img}
                                alt={`${ai.nameEn} - ${ai.role}`}
                                className="pg-ai-card-img"
                                loading="lazy"
                            />
                            <div className="pg-ai-card-img-overlay" />
                        </div>
                        <div className="pg-ai-card-body">
                            <div className="pg-ai-card-header">
                                <span className="pg-ai-badge">{ai.badge}</span>
                                <h3 className="pg-ai-card-name">
                                    {ai.name}
                                    <span className="pg-ai-card-name-en">{ai.nameEn}</span>
                                </h3>
                                <p className="pg-ai-card-role">{ai.role}</p>
                            </div>
                            <p className="pg-ai-card-desc">{ai.description}</p>
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
}
