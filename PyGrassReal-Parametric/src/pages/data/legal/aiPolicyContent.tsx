import type { LegalSection } from '../../legal/LegalLayout';

export const AI_POLICY_EN: LegalSection[] = [
  {
    id: 'disclosure',
    title: '1. AI Transparency and Disclosure',
    content: (
      <>
        <p>PyGrassReal-Ai includes AI-assisted generation and transformation features. Users should understand they are interacting with automated systems that can produce variable results.</p>
        <ul>
          <li>AI-generated results may not be unique or factually complete.</li>
          <li>Outputs should be reviewed before publication or high-stakes use.</li>
          <li>Automated responses do not replace professional legal, medical, or financial advice.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'limitations',
    title: '2. Model Limitations and Reliability',
    content: (
      <>
        <p>AI output quality depends on prompts, context, and system constraints. The Service may generate incorrect, incomplete, biased, or unsuitable content.</p>
        <p>You remain responsible for validation, downstream usage, and compliance with applicable law and organizational policy.</p>
      </>
    ),
  },
  {
    id: 'prohibited-use',
    title: '3. Prohibited AI Use Cases',
    content: (
      <>
        <ul>
          <li>Fraud, identity deception, phishing, or social manipulation.</li>
          <li>Creation of illegal content, exploit instructions, or malware enablement.</li>
          <li>Targeted harassment, hate content, and sexual exploitation material.</li>
          <li>Unauthorized deepfakes intended to mislead or impersonate real individuals.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'synthetic-content',
    title: '4. Synthetic Content Labeling',
    content: (
      <>
        <p>When AI-generated media is shared publicly, you should provide clear attribution that the content was created or materially edited with AI tools.</p>
        <ul>
          <li>Do not remove or falsify provenance indicators where supported.</li>
          <li>Do not represent synthetic media as verified documentary evidence.</li>
          <li>Apply additional safeguards when publishing sensitive or realistic human likenesses.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'logging-training',
    title: '5. Logging, Improvement, and Opt-Out',
    content: (
      <>
        <p>We may retain prompt and response metadata for safety, abuse detection, and service reliability. Training use of user data, where available, is governed by product settings and contractual terms.</p>
        <ul>
          <li>Operational logging supports incident response and quality monitoring.</li>
          <li>Enterprise controls may provide workspace-level retention and processing options.</li>
          <li>Privacy-related requests can be sent to <a href="mailto:privacy@pygrassreal.ai">privacy@pygrassreal.ai</a>.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'human-review',
    title: '6. Human-in-the-Loop for High-Risk Use',
    content: (
      <>
        <p>Use cases with legal, financial, medical, employment, or safety impact require meaningful human oversight. Fully automated decision-making without review is discouraged for high-impact scenarios.</p>
        <p>You are responsible for implementing verification controls and escalation paths before acting on AI output.</p>
      </>
    ),
  },
];

export const AI_POLICY_TH: LegalSection[] = [
  {
    id: 'disclosure',
    title: '1. ความโปร่งใสและการเปิดเผยว่าเป็น AI',
    content: (
      <>
        <p>PyGrassReal-Ai มีฟีเจอร์ที่ใช้ AI ในการสร้างและแปลงเนื้อหา ผู้ใช้ควรรับทราบว่ากำลังโต้ตอบกับระบบอัตโนมัติ ซึ่งอาจให้ผลลัพธ์ที่แตกต่างกันในแต่ละครั้ง</p>
        <ul>
          <li>ผลลัพธ์จาก AI อาจไม่เป็นเอกลักษณ์และอาจไม่ครบถ้วนเชิงข้อเท็จจริง</li>
          <li>ควรตรวจสอบผลลัพธ์ก่อนเผยแพร่หรือใช้ในกรณีที่มีความเสี่ยงสูง</li>
          <li>คำตอบจากระบบอัตโนมัติไม่ใช่คำแนะนำวิชาชีพทางกฎหมาย การแพทย์ หรือการเงิน</li>
        </ul>
      </>
    ),
  },
  {
    id: 'limitations',
    title: '2. ข้อจำกัดของโมเดลและความน่าเชื่อถือ',
    content: (
      <>
        <p>คุณภาพผลลัพธ์ของ AI ขึ้นอยู่กับ prompt บริบท และข้อจำกัดของระบบ บริการอาจสร้างเนื้อหาที่ไม่ถูกต้อง ไม่ครบถ้วน มีอคติ หรือไม่เหมาะสมได้</p>
        <p>คุณยังคงรับผิดชอบในการตรวจสอบความถูกต้อง การนำไปใช้ต่อ และการปฏิบัติตามกฎหมายหรือข้อกำหนดขององค์กร</p>
      </>
    ),
  },
  {
    id: 'prohibited-use',
    title: '3. กรณีการใช้งาน AI ที่ห้าม',
    content: (
      <>
        <ul>
          <li>การฉ้อโกง การหลอกลวงตัวตน ฟิชชิง หรือการชักจูงทางสังคม</li>
          <li>การสร้างเนื้อหาผิดกฎหมาย คำสั่งโจมตี หรือการสนับสนุนมัลแวร์</li>
          <li>การคุกคามแบบเจาะจง เนื้อหาแสดงความเกลียดชัง และการแสวงหาประโยชน์ทางเพศ</li>
          <li>การสร้าง deepfake โดยไม่ได้รับอนุญาตเพื่อทำให้เข้าใจผิดหรือสวมรอยบุคคลจริง</li>
        </ul>
      </>
    ),
  },
  {
    id: 'synthetic-content',
    title: '4. การติดป้ายกำกับเนื้อหาสังเคราะห์',
    content: (
      <>
        <p>เมื่อมีการเผยแพร่สื่อที่สร้างด้วย AI ต่อสาธารณะ คุณควรระบุอย่างชัดเจนว่าเนื้อหานั้นถูกสร้างหรือแก้ไขโดยเครื่องมือ AI</p>
        <ul>
          <li>ห้ามลบหรือปลอมแปลงตัวบ่งชี้แหล่งที่มาของเนื้อหาในระบบที่รองรับ</li>
          <li>ห้ามนำเสนอเนื้อหาสังเคราะห์ว่าเป็นหลักฐานข้อเท็จจริงที่ตรวจสอบแล้ว</li>
          <li>ควรใช้มาตรการเพิ่มความระมัดระวังเมื่อเผยแพร่ภาพบุคคลที่สมจริงหรือเนื้อหาอ่อนไหว</li>
        </ul>
      </>
    ),
  },
  {
    id: 'logging-training',
    title: '5. การบันทึกข้อมูล การปรับปรุงระบบ และการขอไม่เข้าร่วม',
    content: (
      <>
        <p>เราอาจเก็บเมตาดาต้าของ prompt และ response เพื่อความปลอดภัย การตรวจจับการ abuse และความเสถียรของบริการ การนำข้อมูลผู้ใช้ไปใช้ในการพัฒนาระบบ (หากมี) จะเป็นไปตามการตั้งค่าผลิตภัณฑ์และเงื่อนไขสัญญา</p>
        <ul>
          <li>การบันทึกเชิงปฏิบัติการช่วยสนับสนุนการตอบสนองเหตุการณ์และการควบคุมคุณภาพ</li>
          <li>ลูกค้าองค์กรอาจมีตัวเลือกกำหนดการเก็บรักษาและการประมวลผลระดับ workspace</li>
          <li>คำขอด้านความเป็นส่วนตัวส่งได้ที่ <a href="mailto:privacy@pygrassreal.ai">privacy@pygrassreal.ai</a></li>
        </ul>
      </>
    ),
  },
  {
    id: 'human-review',
    title: '6. การกำกับโดยมนุษย์สำหรับงานความเสี่ยงสูง',
    content: (
      <>
        <p>การใช้งานที่มีผลกระทบทางกฎหมาย การเงิน การแพทย์ การจ้างงาน หรือความปลอดภัย ควรมีการกำกับโดยมนุษย์อย่างมีนัยสำคัญ ไม่ควรตัดสินใจอัตโนมัติทั้งหมดโดยไม่มีการตรวจทานในกรณีผลกระทบสูง</p>
        <p>คุณต้องรับผิดชอบในการกำหนดขั้นตอนตรวจสอบและเส้นทางยกระดับก่อนนำผลลัพธ์ AI ไปใช้จริง</p>
      </>
    ),
  },
];
