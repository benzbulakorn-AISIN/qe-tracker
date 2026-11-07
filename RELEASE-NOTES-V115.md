# QE Elec. Daily Job Tracker — V115

## ขอบเขต

V115 เป็นการแก้เฉพาะจุดต่อจาก V114 สำหรับปัญหา Responsive ที่ Sidebar → “เครื่องมือ” บน Mobile 360×800 โดยสร้างชุดใหม่แบบ side-by-side และไม่เขียนทับไฟล์ V114 ที่มีชื่อเวอร์ชัน

ไม่มีการเปลี่ยน Business Logic, Supabase Auth/RLS/Role, Database Schema, Storage Key, Edge Function, API, LINE, Teams, รูปแบบข้อมูลเดิม, DOM ID, Function, Event, LocalStorage Key หรือ public interface ที่โมดูลอื่นอ้างอิง

## จุดที่แก้

1. **Mobile Tools Accordion ภายใน Sidebar**
   - ที่หน้าจอกว้างไม่เกิน 900 px เมนูเดิม `#nvMenu` ถูกย้ายเข้าแผง Accordion ใต้ปุ่ม “เครื่องมือ” ภายใน Sidebar
   - ใช้ element, ID, event listener และ handler เดิม ไม่ clone เมนูและไม่สร้าง business action ซ้ำ
   - เปิด/ปิดด้วย `aria-expanded` และ `aria-controls="nvMenu"`
   - เพิ่มสัญลักษณ์ ▸/▾ เพื่อบอกสถานะพับ/กาง
2. **ใช้งานง่ายที่ 360×800**
   - เมนูอยู่ภายในขอบ Sidebar และ viewport
   - ไม่มี horizontal overflow
   - รายการเครื่องมือมี touch target ขั้นต่ำ 44 px
   - เมื่อเลือกคำสั่งที่เปิดหน้าต่าง เช่น “ถังขยะกลาง” Sidebar จะปิดเพื่อไม่บังหน้าต่างปลายทาง
3. **Desktop คงพฤติกรรมเดิม**
   - ที่หน้าจอกว้างกว่า 900 px `#nvMenu` กลับไปอยู่ใน container เดิม `.nv-mw`
   - ยังคงเป็น fixed flyout ด้านขวาของ Sidebar ตามตำแหน่งและขนาดเดิม
4. **สร้าง Version ใหม่แบบ side-by-side**
   - App/UI version เป็น 115
   - ไฟล์ใหม่: `indexV115.html`, `core-v115.min.js`, `sidebar-v115.css`, `sidebar-v115.js`, `trash-v115.js`, `version-v115.js`
   - dependency v98 และ manifest/icon คง byte-for-byte จาก V114

## ลำดับโหลด

Sidebar V115 → Theme early → Bootstrap → Core V115 → Trash V115 → Version V115

ลำดับนี้คง contract เดิม: Sidebar เริ่มเฝ้ารอ DOM ก่อน จากนั้น Core สร้างเมนูและ business handlers แล้ว Sidebar จึงสร้าง UI mirror/Accordion โดยไม่แทรก business logic

## ผลตรวจสอบ

- JavaScript syntax: ผ่าน 12/12 ไฟล์
- Manifest JSON: ผ่าน
- HTML ID: ไม่พบ ID ซ้ำ
- Local file references: ครบ
- Script load order: ผ่าน
- HTML SRI: ตรงกับไฟล์จริงทั้งหมดที่กำหนด integrity
- Lazy-loaded module SRI: ผ่าน 4/4
- Optional add-on SRI: ผ่าน 2/2
- Shared dependency: 11/11 ไฟล์ byte-identical กับ V114
- SHA-256 ภายในแพ็กเกจ: ผ่าน 18/18 ไฟล์
- Responsive Chromium 360×800:
  - `#nvMenu` อยู่ภายใน `.qe115-tools-panel` ใน Sidebar
  - ขอบเมนูอยู่ในช่วง x=37–252 px ภายใน Sidebar x=0–262 px
  - รายการเครื่องมือ 5 รายการในชุดทดสอบสูง 44 px ทุกปุ่ม
  - ไม่มี horizontal overflow
  - กด “ถังขยะกลาง” แล้ว action เดิมทำงาน 1 ครั้ง และ Sidebar ปิด
  - ไม่พบ JavaScript page error ใน test harness
- Desktop Chromium 1366×768:
  - `#nvMenu` อยู่ใน `.nv-mw` เดิม
  - position เป็น `fixed` และเปิดด้านขวาของ Sidebar
  - ไม่พบ JavaScript page error ใน test harness

## วิธีอัปโหลดแบบ Side-by-side

1. สำรอง Production ปัจจุบันก่อน
2. แตก ZIP และอัปโหลดไฟล์ทั้งหมดในโฟลเดอร์ `release_v115` ไว้ระดับเดียวกัน
3. เปิด `indexV115.html` โดยตรง โดยยังไม่ลบ V114
4. Hard refresh (`Ctrl+Shift+R`)
5. ทดสอบ Mobile 360×800:
   - เปิด Sidebar
   - กด “เครื่องมือ”
   - กด “ถังขยะกลาง”
   - ตรวจ Modal, กู้คืน และลบถาวรตาม Role
6. ทดสอบ Desktop ว่า “เครื่องมือ” ยังเปิดเป็น flyout ด้านขวาเหมือน V114
7. ตรวจ Console/Network, Supabase RLS/Cloud Sync, LINE/Teams และ Admin/Editor/Viewer ใน environment จริงก่อน Promote

## ข้อจำกัด

ชุดนี้ผ่าน static validation และ Chromium test harness สำหรับ Responsive/interaction ที่แก้ไขแล้ว การยืนยันข้อมูลจริง, Supabase, OAuth/Graph, LINE/Teams, CSP/network และสิทธิ์ทุก Role ยังต้องทดสอบใน Staging/Production environment ของผู้ใช้ก่อนแทน Production
