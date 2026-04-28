import type { LegalSection } from '../../legal/LegalLayout';

export const CONTACT_EN: LegalSection[] = [
  {
    id: 'support',
    title: '1. Support Channels',
    content: (
      <>
        <p>Use the channel that best matches your request to speed up triage and response handling. Include workspace ID, timestamp, and screenshots when possible.</p>
        <ul>
          <li>General support: <a href="mailto:support@pygrassreal.ai">support@pygrassreal.ai</a></li>
          <li>Billing and subscription issues: <a href="mailto:billing@pygrassreal.ai">billing@pygrassreal.ai</a></li>
          <li>Legal notices: <a href="mailto:legal@pygrassreal.ai">legal@pygrassreal.ai</a></li>
        </ul>
      </>
    ),
  },
  {
    id: 'privacy-requests',
    title: '2. Privacy Requests',
    content: (
      <>
        <p>For access, correction, deletion, or objection requests related to personal data, contact our privacy team directly.</p>
        <ul>
          <li>Privacy contact: <a href="mailto:privacy@pygrassreal.ai">privacy@pygrassreal.ai</a></li>
          <li>Include account email, request type, and applicable jurisdiction if known.</li>
          <li>Identity verification may be required before processing sensitive requests.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'safety-abuse',
    title: '3. Safety, Abuse, and Moderation Reports',
    content: (
      <>
        <p>Report policy violations, harmful content, impersonation, or abusive behavior through the abuse reporting channel.</p>
        <ul>
          <li>Abuse and moderation reports: <a href="mailto:abuse@pygrassreal.ai">abuse@pygrassreal.ai</a></li>
          <li>Provide links, message IDs, and a short incident summary.</li>
          <li>Urgent safety threats should be labeled clearly in the subject line.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'security',
    title: '4. Security Vulnerability Reporting',
    content: (
      <>
        <p>We welcome responsible disclosure of suspected vulnerabilities. Please avoid public disclosure until remediation is complete.</p>
        <ul>
          <li>Security response team: <a href="mailto:security@pygrassreal.ai">security@pygrassreal.ai</a></li>
          <li>Include reproduction steps, impact assessment, and affected endpoints.</li>
          <li>Do not access or exfiltrate data beyond what is required to validate the issue.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'sla',
    title: '5. Response Time Targets',
    content: (
      <>
        <p>Standard response targets are listed below and may vary by plan and incident severity.</p>
        <ul>
          <li>General support: initial response within 1-2 business days.</li>
          <li>Privacy and legal requests: acknowledgment within 3 business days.</li>
          <li>Security and urgent abuse reports: triage target within 24 hours.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'postal',
    title: '6. Company Information',
    content: (
      <>
        <p>PyGrassReal-Ai<br />999 Parametric Avenue, Suite 300<br />San Francisco, CA 94105, United States</p>
        <p>This address is provided for legal correspondence and formal notices. Email remains the fastest path for operational support and incident reporting.</p>
      </>
    ),
  },
];

export const CONTACT_TH: LegalSection[] = [
  {
    id: 'support',
    title: '1. ช่องทางฝ่ายสนับสนุน',
    content: (
      <>
        <p>กรุณาเลือกช่องทางที่ตรงกับประเภทคำขอของคุณเพื่อให้คัดกรองและตอบกลับได้เร็วขึ้น โดยควรระบุรหัสเวิร์กสเปซ เวลาเกิดเหตุ และภาพหน้าจอประกอบเมื่อเป็นไปได้</p>
        <ul>
          <li>สนับสนุนทั่วไป: <a href="mailto:support@pygrassreal.ai">support@pygrassreal.ai</a></li>
          <li>ปัญหาการชำระเงินและสมาชิก: <a href="mailto:billing@pygrassreal.ai">billing@pygrassreal.ai</a></li>
          <li>การแจ้งทางกฎหมาย: <a href="mailto:legal@pygrassreal.ai">legal@pygrassreal.ai</a></li>
        </ul>
      </>
    ),
  },
  {
    id: 'privacy-requests',
    title: '2. คำขอด้านความเป็นส่วนตัว',
    content: (
      <>
        <p>หากต้องการเข้าถึง แก้ไข ลบ หรือคัดค้านการประมวลผลข้อมูลส่วนบุคคล กรุณาติดต่อทีมความเป็นส่วนตัวโดยตรง</p>
        <ul>
          <li>ติดต่อเรื่องความเป็นส่วนตัว: <a href="mailto:privacy@pygrassreal.ai">privacy@pygrassreal.ai</a></li>
          <li>ควรระบุอีเมลบัญชี ประเภทคำขอ และเขตอำนาจที่เกี่ยวข้อง (ถ้าทราบ)</li>
          <li>เราอาจขอการยืนยันตัวตนก่อนดำเนินการคำขอที่มีความละเอียดอ่อน</li>
        </ul>
      </>
    ),
  },
  {
    id: 'safety-abuse',
    title: '3. รายงานความปลอดภัย การละเมิด และการกลั่นกรอง',
    content: (
      <>
        <p>หากพบการละเมิดนโยบาย เนื้อหาเป็นอันตราย การสวมรอย หรือพฤติกรรมไม่เหมาะสม กรุณารายงานผ่านช่องทางรายงานการละเมิด</p>
        <ul>
          <li>รายงานการละเมิดและการกลั่นกรอง: <a href="mailto:abuse@pygrassreal.ai">abuse@pygrassreal.ai</a></li>
          <li>ควรแนบลิงก์ รหัสข้อความ และสรุปเหตุการณ์โดยย่อ</li>
          <li>กรณีภัยคุกคามเร่งด่วน โปรดระบุความเร่งด่วนชัดเจนในหัวข้ออีเมล</li>
        </ul>
      </>
    ),
  },
  {
    id: 'security',
    title: '4. การรายงานช่องโหว่ด้านความปลอดภัย',
    content: (
      <>
        <p>เราสนับสนุนการเปิดเผยช่องโหว่แบบรับผิดชอบ (การเปิดเผยอย่างรับผิดชอบ) โดยขอความร่วมมือไม่เปิดเผยสาธารณะก่อนกระบวนการแก้ไขเสร็จสิ้น</p>
        <ul>
          <li>ทีมตอบสนองด้านความปลอดภัย: <a href="mailto:security@pygrassreal.ai">security@pygrassreal.ai</a></li>
          <li>โปรดระบุขั้นตอนทำซ้ำ ผลกระทบ และปลายทางการเชื่อมต่อที่ได้รับผลกระทบ</li>
          <li>ห้ามเข้าถึงหรือดึงข้อมูลเกินขอบเขตที่จำเป็นต่อการยืนยันปัญหา</li>
        </ul>
      </>
    ),
  },
  {
    id: 'sla',
    title: '5. เป้าหมายเวลาตอบกลับ',
    content: (
      <>
        <p>เป้าหมายเวลาตอบกลับเบื้องต้นอาจแตกต่างตามแพ็กเกจบริการและระดับความรุนแรงของเหตุการณ์</p>
        <ul>
          <li>คำขอสนับสนุนทั่วไป: ตอบรับครั้งแรกภายใน 1-2 วันทำการ</li>
          <li>คำขอด้านความเป็นส่วนตัวและกฎหมาย: ตอบรับภายใน 3 วันทำการ</li>
          <li>รายงานด้านความปลอดภัยและการละเมิดที่เร่งด่วน: คัดกรองเบื้องต้นภายใน 24 ชั่วโมง</li>
        </ul>
      </>
    ),
  },
  {
    id: 'postal',
    title: '6. ข้อมูลบริษัท',
    content: (
      <>
        <p>PyGrassReal-Ai<br />999 Parametric Avenue, Suite 300<br />San Francisco, CA 94105, United States</p>
        <p>ที่อยู่นี้ใช้สำหรับการติดต่อทางกฎหมายและหนังสือแจ้งอย่างเป็นทางการ สำหรับงานสนับสนุนทั่วไปหรือรายงานเหตุการณ์เร่งด่วน แนะนำให้ใช้อีเมลจะรวดเร็วกว่า</p>
      </>
    ),
  },
];
