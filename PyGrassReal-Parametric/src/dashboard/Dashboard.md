# Dashboard / 3D-Edit Mode (App)

ไฟล์นี้สรุปวิธีใช้ App ให้ **เปิดมาโฟกัสที่ 3D-Edit ก่อน** และมี Dashboard เป็นโหมดสำรองสำหรับจัดการ workflow

## พฤติกรรมที่ตั้งไว้ใน App
- Default ตอนเปิดเว็บ: เข้า `3D-Edit` ทันที
- ปุ่มมุมซ้ายบน: `Dashboard`
  - กดแล้วสลับไปหน้า Dashboard
- ในหน้า Dashboard มีปุ่ม `Back to 3D-Edit`
  - กดแล้วกลับเข้า Editor
- ถ้าเปิด workflow จาก Dashboard
  - จะกลับเข้า Editor อัตโนมัติ
  - แสดงชื่อ workflow ที่เลือกไว้บน chip มุมบน

## จุดที่แก้ในโค้ด
- `src/App.tsx`
  - เพิ่ม state `view: 'editor' | 'dashboard'`
  - ตั้งค่าเริ่มต้น `editor`
  - จัด logic สลับหน้าระหว่าง `Editor` และ `DashboardPage`

## ใช้งานจริง
1. รัน `npm run dev`
2. เปิดเว็บ -> จะเจอหน้า 3D-Edit ก่อน
3. ถ้าจะเข้า Dashboard ให้กดปุ่ม `Dashboard`
4. ถ้าจะกลับมาแก้ 3D-Edit ให้กด `Back to 3D-Edit`

## หมายเหตุ
- Dashboard ยังพร้อมใช้งานสำหรับ CRUD workflows ตามแผน
- โหมดนี้เหมาะกับการทำงานที่เน้นแก้ 3D ก่อน แล้วค่อยเข้า Dashboard เมื่อต้องจัดการ workflow
