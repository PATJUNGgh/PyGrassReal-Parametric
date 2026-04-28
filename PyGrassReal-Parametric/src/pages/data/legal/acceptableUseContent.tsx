import type { LegalSection } from '../../legal/LegalLayout';

export const ACCEPTABLE_USE_EN: LegalSection[] = [
  {
    id: 'purpose',
    title: '1. Policy Purpose',
    content: (
      <>
        <p>This Acceptable Use Policy defines technical and behavioral rules for using PyGrassReal-Ai systems, including web clients, API endpoints, integrations, and automation workflows.</p>
        <p>Violations may trigger protective measures to safeguard platform integrity, user safety, and legal compliance.</p>
      </>
    ),
  },
  {
    id: 'prohibited-activity',
    title: '2. Prohibited Activity',
    content: (
      <>
        <p>You may not use the Service to perform or facilitate harmful, deceptive, or illegal activity.</p>
        <ul>
          <li>Unauthorized system access, scanning, intrusion attempts, or privilege escalation.</li>
          <li>Spam campaigns, credential stuffing, phishing, impersonation, or social engineering abuse.</li>
          <li>Malware distribution, exploit tooling, botnet control, or infrastructure disruption.</li>
          <li>Copyright infringement, privacy violations, or unlawful content generation.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'automation',
    title: '3. Automation, API, and Rate Limits',
    content: (
      <>
        <p>Automated usage must respect published quotas and operational limits. You are responsible for implementing safe retry logic and request backoff behavior.</p>
        <ul>
          <li>Do not bypass rate limits, authentication controls, or usage metering.</li>
          <li>Do not scrape data or build shadow datasets from the Service without authorization.</li>
          <li>Do not resell or proxy access in ways that circumvent plan restrictions.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'security-integrity',
    title: '4. Security and Platform Integrity',
    content: (
      <>
        <p>Activities that materially degrade service reliability or compromise other users are strictly prohibited.</p>
        <ul>
          <li>Abusive traffic patterns designed to exhaust compute, storage, or network resources.</li>
          <li>Tampering with client-side safeguards, anti-abuse controls, or billing workflows.</li>
          <li>Attempts to extract confidential model behavior, internal prompts, or private system data.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'enforcement',
    title: '5. Enforcement Lifecycle',
    content: (
      <>
        <p>Enforcement decisions are based on severity, recurrence, and impact. Actions can include warning, temporary limits, suspension, or permanent account closure.</p>
        <ul>
          <li>Critical threats may result in immediate suspension without prior warning.</li>
          <li>We may preserve logs and artifacts for legal and forensic review.</li>
          <li>Coordinated abuse across multiple accounts can result in broader access restrictions.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'appeals',
    title: '6. Appeals and Reporting',
    content: (
      <>
        <p>If you believe enforcement was applied in error, you may submit an appeal with supporting context through <a href="mailto:abuse@pygrassreal.ai">abuse@pygrassreal.ai</a>.</p>
        <p>Appeals should include account ID, timestamp, and a brief summary of the disputed action. We review appeals in good faith and respond according to queue priority and case complexity.</p>
      </>
    ),
  },
];

export const ACCEPTABLE_USE_TH: LegalSection[] = [
  {
    id: 'purpose',
    title: '1. วัตถุประสงค์ของนโยบาย',
    content: (
      <>
        <p>นโยบายการใช้งานที่ยอมรับได้ฉบับนี้กำหนดกติกาด้านเทคนิคและพฤติกรรมในการใช้ระบบ PyGrassReal-Ai รวมถึงเว็บไคลเอนต์ API การเชื่อมต่อ และงานอัตโนมัติ</p>
        <p>การละเมิดอาจนำไปสู่มาตรการป้องกันเพื่อคุ้มครองความสมบูรณ์ของแพลตฟอร์ม ความปลอดภัยของผู้ใช้ และการปฏิบัติตามกฎหมาย</p>
      </>
    ),
  },
  {
    id: 'prohibited-activity',
    title: '2. กิจกรรมต้องห้าม',
    content: (
      <>
        <p>ห้ามใช้บริการเพื่อดำเนินการหรือสนับสนุนกิจกรรมที่เป็นอันตราย หลอกลวง หรือผิดกฎหมาย</p>
        <ul>
          <li>การเข้าถึงระบบโดยไม่ได้รับอนุญาต การสแกนช่องโหว่ การบุกรุก หรือยกระดับสิทธิ์</li>
          <li>สแปม การยัดข้อมูลรับรอง (credential stuffing) ฟิชชิง การสวมรอย หรือการหลอกลวงทางสังคม</li>
          <li>การเผยแพร่มัลแวร์ เครื่องมือโจมตี การควบคุมบอตเน็ต หรือทำให้โครงสร้างพื้นฐานหยุดชะงัก</li>
          <li>การละเมิดลิขสิทธิ์ ละเมิดความเป็นส่วนตัว หรือสร้างเนื้อหาที่ผิดกฎหมาย</li>
        </ul>
      </>
    ),
  },
  {
    id: 'automation',
    title: '3. ระบบอัตโนมัติ, API และข้อจำกัดอัตราการใช้งาน',
    content: (
      <>
        <p>การใช้งานแบบอัตโนมัติต้องเคารพโควต้าและข้อจำกัดการปฏิบัติการที่ประกาศไว้ คุณต้องรับผิดชอบการออกแบบ retry และ backoff อย่างปลอดภัย</p>
        <ul>
          <li>ห้ามหลีกเลี่ยง rate limit ระบบยืนยันตัวตน หรือระบบวัดการใช้งาน</li>
          <li>ห้ามทำ scraping ข้อมูลหรือสร้างชุดข้อมูลเงาจากบริการโดยไม่ได้รับอนุญาต</li>
          <li>ห้ามขายต่อหรือทำ proxy การเข้าถึงในลักษณะที่เลี่ยงข้อจำกัดแพ็กเกจ</li>
        </ul>
      </>
    ),
  },
  {
    id: 'security-integrity',
    title: '4. ความปลอดภัยและความสมบูรณ์ของแพลตฟอร์ม',
    content: (
      <>
        <p>พฤติกรรมที่ลดทอนเสถียรภาพของระบบหรือกระทบผู้ใช้รายอื่นอย่างมีนัยสำคัญถือว่าเป็นข้อห้าม</p>
        <ul>
          <li>ทราฟฟิกที่ใช้ทรัพยากรเกินควรโดยเจตนาเพื่อทำให้ compute, storage หรือเครือข่ายล่ม</li>
          <li>การแก้ไขหรือเจาะระบบป้องกันฝั่งไคลเอนต์ ระบบป้องกันการ abuse หรือขั้นตอนการคิดค่าบริการ</li>
          <li>ความพยายามดึงพฤติกรรมโมเดลภายใน prompt ภายในระบบ หรือข้อมูลส่วนตัวของระบบโดยมิชอบ</li>
        </ul>
      </>
    ),
  },
  {
    id: 'enforcement',
    title: '5. ลำดับการบังคับใช้',
    content: (
      <>
        <p>การบังคับใช้พิจารณาจากความรุนแรง ความถี่ และผลกระทบของเหตุการณ์ มาตรการอาจรวมถึงการเตือน การจำกัดสิทธิชั่วคราว การระงับ หรือการปิดบัญชีถาวร</p>
        <ul>
          <li>ภัยคุกคามร้ายแรงอาจถูกระงับทันทีโดยไม่ต้องแจ้งเตือนล่วงหน้า</li>
          <li>เราอาจเก็บ log และหลักฐานเพื่อการตรวจสอบทางกฎหมายและนิติวิทยาศาสตร์ดิจิทัล</li>
          <li>การ abuse แบบประสานงานหลายบัญชีอาจนำไปสู่การจำกัดสิทธิในวงกว้าง</li>
        </ul>
      </>
    ),
  },
  {
    id: 'appeals',
    title: '6. การอุทธรณ์และการรายงาน',
    content: (
      <>
        <p>หากคุณเชื่อว่ามีการบังคับใช้ผิดพลาด คุณสามารถยื่นอุทธรณ์พร้อมข้อมูลประกอบได้ที่ <a href="mailto:abuse@pygrassreal.ai">abuse@pygrassreal.ai</a></p>
        <p>คำอุทธรณ์ควรระบุ account ID เวลาเกิดเหตุ และสรุปเหตุผลโดยย่อ เราจะตรวจสอบโดยสุจริต และตอบกลับตามลำดับคิวและความซับซ้อนของกรณี</p>
      </>
    ),
  },
];
