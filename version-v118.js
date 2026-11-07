/*! QE Elec. Daily Job Tracker — version-v118.js
    แสดงเลขเวอร์ชัน v118 ใน Sidebar (ป้าย .qe105-ver) โดยไม่เปลี่ยน business handler เดิม
    - ไม่แก้ข้อมูล / ไม่เรียก network · หยุด observer เมื่อพบป้ายแล้ว */
(function () {
  "use strict";
  var V = "v118", D = document, busy = false, obs = null;
  try { window.QE_UI_VERSION = V; } catch (e) {}
  function fix() {
    if (busy) return false;
    busy = true;
    var found = false;
    try {
      var els = D.querySelectorAll(".qe105-ver");
      found = els.length > 0;
      for (var i = 0; i < els.length; i++) if (els[i].textContent !== V) els[i].textContent = V;
      var br = D.querySelector(".qe105-brand");
      if (br && br.title) {
        var t = br.title.replace(/หน้าจอ \(UI\) v\d+/, "หน้าจอ (UI) " + V);
        if (t !== br.title) br.title = t;
      }
    } catch (e) {
      try { window.QE86Diagnostics && window.QE86Diagnostics.capture(e, "version116"); } catch (x) {}
    }
    busy = false;
    return found;
  }
  function stop() { if (obs) { obs.disconnect(); obs = null; } }
  function start() {
    if (fix()) return;
    if (window.MutationObserver) {
      obs = new MutationObserver(function () { if (fix()) stop(); });
      obs.observe(D.body, { childList: true, subtree: true });
    }
    var n = 0, iv = setInterval(function () { if (fix() || ++n > 20) { clearInterval(iv); stop(); } }, 500);
  }
  if (D.body) start(); else D.addEventListener("DOMContentLoaded", start, { once: true });
})();
