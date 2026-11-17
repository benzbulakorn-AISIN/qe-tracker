# QE Elec. Daily Job Tracker — V114

## ขอบเขต

V114 เป็นการแก้เฉพาะจุดต่อจาก V113 เพื่อรวมถังขยะ Tracker เข้ากับหน้าต่าง “ถังขยะกลาง” เพียงจุดเดียว โดยไม่เขียนทับ V113 และไม่เปลี่ยน Business Logic, Supabase Auth/RLS/Role, Database Schema, Storage Key, Edge Function, API, LINE, Teams, รูปแบบข้อมูล, ID, Function/Event, LocalStorage Key หรือ public interface ที่โมดูลอื่นอ้างอิง

## จุดที่แก้

1. **รวมรายการ Tracker ในถังขยะกลาง**
   - แสดงรายการจาก LocalStorage key เดิม `issue_tracker_trash` เป็นรายการจริงในแท็บ “Tracker” ของถังขยะกลาง
   - แสดงเวลาลบ ผู้แจ้ง ปัญหา Countermeasure, Due Date และ Status โดยไม่เปลี่ยนรูปแบบข้อมูลเดิม
2. **คงการทำงานเดิมของ Tracker Trash**
   - ปุ่ม “กู้คืน” เรียกฟังก์ชันเดิม `trashRestore`
   - ปุ่ม “ลบถาวร” เรียกฟังก์ชันเดิม `trashPurge` และยังแสดงเฉพาะ Admin
   - ปุ่ม “ล้างถังขยะ Tracker” เรียก handler เดิมของ `trEmpty`
   - การบันทึก `issue_tracker_v2`, `issue_tracker_trash`, Cloud queue และการ render ยังใช้กลไกเดิม
3. **ยกเลิก UI ถังขยะ Tracker แยก**
   - ซ่อนปุ่ม `trBtn`, เมนู Tracker Trash เดิม และ modal `ov5` จากผู้ใช้
   - redirect การเรียกปุ่ม/เมนูเดิมไปยังแท็บ Tracker ในถังขยะกลาง
   - คง DOM ID และ handler เดิมไว้เป็น compatibility shell เพื่อไม่ให้โมดูลอื่นเสีย
4. **สร้าง Version ใหม่แบบ side-by-side**
   - App/UI version เป็น 114
   - ไฟล์ใหม่: `indexV114.html`, `core-v114.min.js`, `trash-v114.js`, `version-v114.js`
   - dependency อื่นคง byte-for-byte จากชุด V113

## ลำดับโหลด

Sidebar → Theme early → Bootstrap → Core V114 → Trash V114 → Version V114

ลำดับนี้ทำให้ฟังก์ชัน Tracker เดิมพร้อมก่อนที่ถังขยะกลางจะเชื่อมปุ่มกู้คืน/ลบถาวร

## วิธีอัปโหลดแบบ Side-by-side

1. สำรอง Production ปัจจุบันก่อน
2. อัปโหลดไฟล์ทั้งหมดใน ZIP ไว้ระดับเดียวกัน
3. เปิด `indexV114.html` โดยตรง โดยยังไม่ลบ V113
4. Hard refresh (`Ctrl+Shift+R`)
5. ทดสอบ Admin/Editor/Viewer:
   - ลบรายการ Tracker แล้วตรวจว่าปรากฏใน “ถังขยะกลาง”
   - กู้คืน Tracker
   - ลบถาวร Tracker ด้วย Admin
   - ล้างถังขยะ Tracker ด้วย Admin
   - ตรวจว่าไม่มีปุ่ม/เมนู/modal ถังขยะ Tracker แยก
6. ทดสอบ Checklist, 7 Mission, Hoshin, Main QE Jobs และประชุมว่า flow เดิมยังทำงาน
7. ทดสอบ Supabase RLS/Cloud Sync, LINE/Teams, responsive และ Console/Network ใน environment จริงก่อน promote

## ข้อจำกัด

ชุดนี้ผ่านการตรวจ static syntax, file reference, load order, SRI/hash และ compatibility checks ใน sandbox แต่การยืนยัน Supabase RLS/Cloud Sync, OAuth/Graph, LINE/Teams, CSP/network, browser storage quota และ visual interaction ทุก role ต้องทดสอบใน Browser/Environment จริงก่อนแทน Production

## ผลตรวจสอบในชุด Release

- JavaScript syntax: **ผ่าน 12/12 ไฟล์**
- Manifest JSON: **ผ่าน**
- HTML ID: **283 ID และไม่พบ ID ซ้ำ**
- Local file references: **ครบ 10 ไฟล์**
- Script load order: **ผ่าน**
- HTML SRI: **ตรงกับไฟล์จริง 8/8 resources**
- Lazy-loaded module SRI: **ผ่าน 4/4**
- Optional add-on SRI: **ผ่าน 2/2**
- Global Tracker trash functions ที่ V114 เรียกใช้: **พบครบ `saveTrash`, `renderTrash`, `trashRestore`, `trashPurge`**
- Core change isolation: **เปลี่ยนเฉพาะเลข version และข้อความตำแหน่งกู้คืน**
- Dependency isolation: **13/13 ไฟล์เดิม byte-identical กับ V113**
- SHA-256 package verification: **ผ่าน 18/18 ไฟล์ที่บันทึกใน `SHA256SUMS.txt`**
