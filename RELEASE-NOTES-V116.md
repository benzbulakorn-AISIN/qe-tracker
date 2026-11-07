# QE Elec. Daily Job Tracker — V116

## ขอบเขต

V116 เป็นการแก้เฉพาะจุดต่อจาก V115 สำหรับปัญหา Accessibility / Keyboard Navigation ของหน้าต่าง “ถังขยะกลาง”: เมื่อปิด Modal แล้ว Focus ต้องกลับไปยังปุ่มต้นทาง และกด `Enter` เพื่อเปิด Modal ซ้ำได้

สร้างเป็นชุดใหม่แบบ side-by-side โดยไม่เขียนทับไฟล์ V115 ที่มีชื่อเวอร์ชัน ไม่มีการเปลี่ยน Database Schema, Storage Key, Supabase Auth/RLS/Role, Edge Function, API, LINE, Teams, รูปแบบข้อมูล หรือ business action ของถังขยะเดิม

## จุดที่แก้

1. **บันทึกปุ่มต้นทางก่อนเปิดถังขยะกลาง**
   - ตัวเปิดในเมนู “เครื่องมือ” ถูกส่งให้ Modal โดยตรงก่อนที่ `#nvMenu` จะถูกซ่อน
   - ตัวเปิดถังขยะของแต่ละโมดูลและปุ่ม Tracker เดิมใช้กลไกเดียวกัน
2. **คืน Focus หลังปิด Modal**
   - รองรับการปิดด้วย `Esc`
   - รองรับปุ่ม `✕`
   - รองรับการคลิกฉากหลัง
3. **ทำให้ปุ่มต้นทางมองเห็นก่อนเรียก `.focus()`**
   - บน Mobile เปิด Sidebar และ Accordion “เครื่องมือ” เดิมกลับมา
   - บน Desktop เปิด flyout “เครื่องมือ” เดิมกลับมา
   - ไม่ clone ปุ่ม ไม่สร้าง handler ซ้ำ และไม่ render เมนูใหม่จนทำลาย DOM ของปุ่มต้นทาง
4. **การเปลี่ยนไปยังถังขยะประชุม**
   - ปิดถังขยะกลางโดยไม่คืน Focus ชั่วคราว ก่อนเปิดหน้าต่างถังขยะประชุม เพื่อไม่ให้เกิดการกระโดดของ Focus ระหว่าง Modal
5. **Version ใหม่แบบ side-by-side**
   - App/UI version เป็น 116
   - ไฟล์ใหม่: `indexV116.html`, `core-v116.min.js`, `sidebar-v116.css`, `sidebar-v116.js`, `trash-v116.js`, `version-v116.js`
   - ไฟล์ dependency v98 และ manifest/icon คงเดิมจาก V115

## ผลตรวจสอบ

- JavaScript syntax: ผ่าน 12/12 ไฟล์
- Manifest JSON: ผ่าน
- HTML ID: ไม่พบ ID ซ้ำ
- Local file references: ครบ
- Script load order: ผ่าน
- HTML SRI: ตรงกับไฟล์จริงทุกไฟล์ที่กำหนด `integrity`
- Version markers: `meta`, Core, Sidebar และ Version badge เป็น 116
- Chromium 360×800:
  - ปิดด้วย `Esc` แล้ว Focus กลับปุ่ม “ถังขยะกลาง” และปุ่มมองเห็น
  - ปิดด้วย `✕` แล้ว Focus กลับปุ่ม “ถังขยะกลาง” และปุ่มมองเห็น
  - คลิกฉากหลังแล้ว Focus กลับปุ่ม “ถังขยะกลาง” และปุ่มมองเห็น
  - หลังการปิดทั้ง 3 วิธี กด `Enter` แล้วเปิดถังขยะกลางซ้ำได้
  - ผลทดสอบ 3/3 ผ่าน
- Chromium 1366×768:
  - Focus Return และ `Enter` เปิดซ้ำผ่านทั้ง 3 วิธีปิด
  - ผลทดสอบ 3/3 ผ่าน
- SHA-256 ภายในแพ็กเกจ: ดู `SHA256SUMS.txt`

## วิธีอัปโหลดแบบ Side-by-side

1. สำรอง Production ปัจจุบันก่อน
2. แตก ZIP และอัปโหลดไฟล์ทั้งหมดในโฟลเดอร์ `release_v116` ไว้ระดับเดียวกัน
3. เปิด `indexV116.html` โดยตรง โดยยังไม่ลบ V115
4. Hard refresh (`Ctrl+Shift+R`)
5. ทดสอบ Mobile 360×800:
   - เปิด Sidebar → เครื่องมือ → ถังขยะกลาง
   - ปิดด้วย `Esc` โดยไม่คลิกเมาส์
   - กด `Enter` หนึ่งครั้ง
   - ถังขยะกลางต้องเปิดซ้ำ
6. ทดสอบซ้ำด้วยปุ่ม `✕` และคลิกฉากหลัง
7. ตรวจ Console/Network, Supabase RLS/Cloud Sync, LINE/Teams และสิทธิ์ Admin/Editor/Viewer ใน environment จริงก่อน Promote

## ข้อจำกัด

ชุดนี้ผ่าน static validation และ Chromium regression test สำหรับ Focus Return บน Mobile/Desktop แล้ว การยืนยันข้อมูลจริง, Supabase, OAuth/Graph, LINE/Teams, CSP/network และสิทธิ์ทุก Role ยังต้องทดสอบใน Staging/Production environment ของผู้ใช้ก่อนแทน Production
