# QE Elec. Daily Job Tracker — V117

## จุดแก้ไข P0: False pending records บนเครื่องใหม่/มือถือ

- ป้องกันการโหลด Main QE Jobs ครั้งแรกบนอุปกรณ์ใหม่ถูกตีความเป็นการแก้ไขจากผู้ใช้ทั้งชุด
- ในช่วง 90 วินาทีแรก ระบบจะปรับ baseline เฉพาะกรณีผิดปกติที่มีอย่างน้อย 100 records และอย่างน้อย 90% เป็น Main QE Jobs hydration records
- ไม่ส่งข้อมูลขึ้น Cloud อัตโนมัติ และไม่ลบข้อมูล Cloud
- ไม่กลืนการแก้ไขปกติทีละรายการ หลัง baseline stabilization การแก้ไขใหม่ยังถูกตรวจเป็น pending ตามเดิม
- รายการ non-Main-QE-Jobs จะไม่ถูกทำให้หายจาก pending โดยเงื่อนไขนี้
- ไม่เปลี่ยน Database Schema, Storage Key, Supabase Auth/RLS/Role หรือรูปแบบข้อมูลเดิม

## วิธีทดสอบ
1. ปิดแท็บ V116 บนมือถือโดยไม่กด Save/Discard
2. อัปโหลด V117 และเปิดด้วย private/new browser profile
3. Login และรอ 10 วินาที
4. เปิดแผง Cloud: ต้องไม่ขึ้น pending Main QE Jobs หลายร้อยรายการ
5. แก้ Main QE Jobs จริง 1 รายการ: ต้องขึ้น pending 1 รายการและบันทึกได้
