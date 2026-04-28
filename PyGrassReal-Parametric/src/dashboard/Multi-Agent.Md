# การทำงานร่วมกันแบบ Multi-Agent (n8n Architecture)

เอกสารนี้ระบุสถาปัตยกรรมและการเชื่อมต่อข้อมูลระหว่าง AI Agents ในระบบ n8n

## 1. บทบาทหน้าที่ (Agent Roles)

### Phraram-Ai (The Orchestrator)
- **สถานะ:** หัวหน้าทีม / Supervisor
- **หน้าที่:** วางแผนงานย่อย บงการ Agent อื่นๆ และสรุปคำตอบสุดท้าย
- **Tool:** Call Agent Tool (สำหรับเรียก Hanuman, Phralak, Phipek)

### Hanuman-Ai (The Knowledge Scout)
- **สถานะ:** หน่วยสืบค้นความรู้
- **หน้าที่:** ใช้ Wikipedia เพื่อทำความเข้าใจบริบทก่อนสรุปข้อมูล
- **Focus:** ข้อมูลที่ถูกต้องและสรุปสาระสำคัญ

### Phralak-Ai (The Logic & Implementation)
- **สถานะ:** หน่วยตรรกะและเทคนิค
- **หน้าที่:** ใช้ Wikipedia เพื่อศึกษาทฤษฎี/อัลกอริทึม ก่อนเริ่มเขียนโค้ด (Python/Grasshopper)

### Phipek-Ai (The Quality & Security Reviewer)
- **สถานะ:** หน่วยตรวจสอบคุณภาพ
- **หน้าที่:** ใช้ Wikipedia ตั้งบรรทัดฐานความรู้เพื่อตรวจทานงานของทีม

## 2. การเชื่อมต่อข้อมูล (Data Flow)
1. **Webhook:** รับ Input จากแชท
2. **Shared Memory:** ทุก Agent ใช้ `Postgres Chat Memory` ร่วมกันเพื่อให้จดจำบริบทได้ 100%
3. **Collaboration:** เป็นแบบ Knowledge-First (ต้อง "อ่าน" ก่อน "ทำ")
4. **Step UI:** ตอบกลับ Webhook พร้อมสถานะการทำงานเพื่อแสดงบน Stepper หน้าเว็บ
