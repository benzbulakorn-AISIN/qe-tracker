/*! QE Elec. Daily Job Tracker — version-v124.js
    แสดงเลขเวอร์ชัน v124 ใน Sidebar โดยไม่เปลี่ยน business handler เดิม */
(function () {
  "use strict";
  var V = "v124", D = document, busy = false, obs = null;
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
      if (br && br.title) br.title = br.title.replace(/หน้าจอ \(UI\) v\d+/, "หน้าจอ (UI) " + V);
    } catch (e) {
      try { window.QE86Diagnostics && window.QE86Diagnostics.capture(e, "version124"); } catch (x) {}
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
