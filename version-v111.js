/*! QE Elec. Daily Job Tracker — version-v111.js
    แสดงเลขเวอร์ชัน v111 ใน Sidebar (ป้าย .qe105-ver) โดยไม่แตะ sidebar-v110.js
    - ไม่แก้ข้อมูล / ไม่เรียก network · ถ้าสคริปต์นี้ไม่ทำงาน ระบบเดิมใช้ได้ปกติ (แค่ป้ายยังเป็น v110) */
(function () {
  "use strict";
  var V = "v111", D = document, busy = false;
  try { window.QE_UI_VERSION = V; } catch (e) {}
  function fix() {
    if (busy) return;
    busy = true;
    try {
      var els = D.querySelectorAll(".qe105-ver");
      for (var i = 0; i < els.length; i++) if (els[i].textContent !== V) els[i].textContent = V;
      var br = D.querySelector(".qe105-brand");
      if (br && br.title) {
        var t = br.title.replace(/หน้าจอ \(UI\) v\d+/, "หน้าจอ (UI) " + V);
        if (t !== br.title) br.title = t;
      }
    } catch (e) {
      try { window.QE86Diagnostics && window.QE86Diagnostics.capture(e, "version111"); } catch (x) {}
    }
    busy = false;
  }
  function start() {
    fix();
    if (window.MutationObserver) {
      new MutationObserver(function () { fix(); }).observe(D.body, { childList: true, subtree: true, characterData: true });
    }
    var n = 0, iv = setInterval(function () { fix(); if (++n > 20) clearInterval(iv); }, 500);
  }
  if (D.body) start(); else D.addEventListener("DOMContentLoaded", start);
})();
