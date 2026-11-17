# QE Elec. Daily Job Tracker — V113

## ขอบเขต

V113 เป็นการแก้แบบเฉพาะจุดต่อจาก V112 โดยคง Business Logic, Supabase Auth/RLS/Role, Database Schema, Storage Key, Edge Function, API, LINE, Teams, รูปแบบข้อมูล, DOM ID, Function/Event, LocalStorage Key และ interface เดิมที่โมดูลอื่นใช้งาน

ไฟล์ V111/V112 เดิมไม่ได้ถูกเขียนทับ

## จุดที่แก้

1. **ป้องกันข้อมูลสูญหายก่อนเข้าถังขยะ**
   - เปลี่ยนเป็นเก็บ Trash ก่อน commit การลบ
   - ถ้า Trash เต็ม, รายการเกิน 900 KB, JSON ตรวจสอบไม่ได้ หรือ source write ล้มเหลว ระบบจะยกเลิก/rollback การลบ
2. **กู้คืนค่า falsy ได้ถูกต้อง**
   - OT/Leave ใช้การตรวจว่ามี key อยู่จริง แทน truthiness
   - ค่า `0`, `""` และ `false` ปัจจุบันไม่ถูกข้อมูลเก่าเขียนทับ
3. **แก้ความหมาย Count และ Clear ของถังขยะกลาง**
   - Count หลักเป็นจำนวนรายการ และแสดงจำนวนเหตุการณ์แยก
   - Clear ล้างเฉพาะ Checklist/7 Mission/Hoshin/Main QE Jobs ตามหมวดที่แสดง
   - ไม่อ้างว่าล้าง Tracker/ประชุม ซึ่งยังใช้ระบบถังขยะเดิมของแต่ละหน้า
4. **เพิ่มความปลอดภัย Checklist Restore/Import**
   - จำกัดไฟล์ 5 MB
   - ตรวจ object/array/date-row shape
   - ปฏิเสธ `__proto__`, `prototype`, `constructor` และโครงสร้างลึก/ใหญ่ผิดปกติ
5. **ปรับ Version/SRI**
   - App/UI version เป็น 113
   - เพิ่ม SRI ให้ `version-v113.js`
   - ตรวจ SRI ของ CSS, Bootstrap, Sidebar, Core, Trash, Lazy chunks และ optional add-ons
   - optional add-ons โหลดพร้อม `integrity` และ `crossorigin="anonymous"`
6. **UX/Accessibility แบบกระทบน้อย**
   - เปลี่ยน fixed timeout ของถังขยะประชุมเป็น bounded retry 2 วินาที
   - ปุ่มถังขยะบนมือถือมี touch target ขั้นต่ำ 44×44 px
   - Gray theme muted text เปลี่ยนจาก `#64748b` เป็น `#5b6778` เพื่อเพิ่ม contrast จากประมาณ 4.34:1 เป็น 5.24:1 บน `#f1f5f9`
   - Version observer หยุดเมื่อพบป้าย Sidebar แล้ว
7. **สร้าง manifest ที่ขาด**
   - เพิ่ม `manifest-v98.webmanifest` โดยอ้างอิง `qe-icon-v98-192.png`

## ไฟล์ใหม่ของ V113

- `indexV113.html`
- `core-v113.min.js`
- `trash-v113.js`
- `version-v113.js`
- `manifest-v98.webmanifest`

ไฟล์ dependency ที่คงเดิมถูกบรรจุในชุด Release เพื่อให้อัปโหลดและตรวจ SRI ได้ครบ

## ผลตรวจสอบ

- JavaScript syntax: **ผ่าน 12/12 ไฟล์**
- Manifest JSON: **ผ่าน**
- HTML ID: **283 ID, ไม่ซ้ำ**
- Local file references: **ครบทุกไฟล์**
- Script load order: **ผ่าน** — Sidebar → Theme early → Bootstrap → Core V113 → Trash V113 → Version V113
- HTML SRI: **ตรงกับไฟล์จริงทุก resource ที่กำหนด integrity**
- Lazy chunk SRI: **ผ่าน 4/4**
- Optional add-on SRI: **ผ่าน 2/2**
- SHA-256 package verification: **ผ่าน**
- Unit tests: **ผ่าน** — save-before-delete, quota failure, source-write rollback, malformed JSON blocking, OT/Leave falsy restore

## วิธีอัปโหลดแบบ Side-by-side

1. สำรองไฟล์ Production ปัจจุบันก่อน
2. อัปโหลดไฟล์ทั้งหมดในชุดนี้ไว้ระดับเดียวกัน
3. เปิด `indexV113.html` โดยตรงเพื่อทดสอบก่อน โดยยังไม่ลบ V111/V112
4. Hard refresh (`Ctrl+Shift+R`)
5. รัน Browser Regression ด้วย Admin/Editor/Viewer, Cloud/RLS จริง, Light/Dark/Holo และขนาด 1366×768/1920×1080/Tablet/360×800
6. Promote เป็น entry point หลักเมื่อ Regression ผ่านแล้วเท่านั้น

## ข้อจำกัดที่ยังต้องทดสอบใน Browser/Environment จริง

การตรวจครั้งนี้ยืนยัน Static Code, SRI และ unit test ใน sandbox แล้ว แต่ยังไม่ได้ยืนยัน Supabase RLS/Cloud Sync, OAuth/Graph, LINE/Teams, browser storage quota จริง, CSP/network, visual responsive และ keyboard/focus matrix ใน Browser จริง จึงควรคง V112 ไว้เป็น rollback จนกว่า Regression จะผ่าน
