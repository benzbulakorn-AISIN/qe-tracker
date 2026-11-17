/*! QE Elec. Daily Job Tracker — schedule-free-v138.js  (ไฟล์ใหม่ · โหลดใน <head> ก่อน core-v125.min.js)
    v138: ① Schedule update — กล่องรุ่น (.mj-mchip) เป็นป้ายอิสระ ไม่เปิด QE Follow-up ของ ② PV result update อีก
          คลิกกล่องรุ่น = แก้ไข/ย้ายในบอร์ด Schedule ตามระบบเดิม · ปุ่ม ◀ ▶ ทำงานเหมือนเดิม
          ② PV result update — ปุ่ม "เปิด Follow-up" ที่ชื่อรุ่นยังใช้ได้ตามเดิม
    วิธีทำงาน: core ดักคลิกที่ window (capture) แล้วเปิด Follow-up เมื่อเจอ ".mj-mchip"
      ไฟล์นี้ลงทะเบียนก่อน core จึงทำงานก่อน → ซ่อน class ชั่วคราวให้ตัวเปิด Follow-up มองไม่เห็น
      แล้วคืน class ทันทีใน document (capture) ก่อนตัวจัดการแก้ไขของบอร์ด Schedule จะทำงาน
    ไม่แตะข้อมูล / localStorage / Cloud ใด ๆ */
(function () {
  "use strict";
  if (window.__QE138_SCHED_FREE) return;
  window.__QE138_SCHED_FREE = true;
  var CLS = "mj-mchip", held = null;

  function restore() {
    if (held) { held.classList.add(CLS); held = null; }
  }
  window.addEventListener("click", function (e) {
    restore();
    var t = e.target;
    if (!t || !t.closest) return;
    var chip = t.closest("#viewMainJobs ." + CLS);
    if (!chip || t.closest(".mje-mv")) return; // ปุ่ม ◀ ▶ ให้ระบบเดิมจัดการ
    chip.classList.remove(CLS);
    held = chip;
    setTimeout(restore, 0); // กันค้าง ถ้า event ถูกหยุดก่อนถึง document
  }, true);
  document.addEventListener("click", restore, true);
})();
