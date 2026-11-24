/*! QE Elec. Daily Job Tracker — app-version-v142.js  (ไฟล์ใหม่ · โหลดเป็นไฟล์สุดท้ายใน index.html)
    จุดเดียวที่กำหนด "เลขเวอร์ชันที่แสดงผล" ของทั้งแอป:
      - ป้ายเวอร์ชันใน Sidebar (.qe105-ver) และ tooltip ของโลโก้ (.qe105-brand)
      - ชื่อหน้าต่าง / แถบชื่อแอปที่ติดตั้ง (document.title)
    ไฟล์เก่า (version-v125.js, tracker-toolbar-v131.js) ยังเขียนเลขของตัวเองช่วงแรกหลังโหลด
    → MutationObserver คืนค่าเป็นเลขด้านล่างทันทีก่อนหน้าจอวาด จึงไม่เห็นการสลับ
    แสดงผลอย่างเดียว: ไม่เปลี่ยน window.QE_APP_VERSION / meta qe-app-version / ข้อมูล / Cloud / Cache
    อัปเดตครั้งถัดไป: แก้แค่ค่า VER ด้านล่าง แล้วเปลี่ยนชื่อไฟล์เป็นเลขใหม่ */
(function () {
  "use strict";
  var VER = "v142";
  if (window.__QE_APP_VERSION_LABEL) return;
  window.__QE_APP_VERSION_LABEL = VER;
  try { window.QE_UI_VERSION = VER; } catch (_) {}

  var D = document, busy = false;
  var TITLE_RE = /\s*\b[Vv]\d{2,4}\b/;

  function apply() {
    if (busy) return;
    busy = true;
    try {
      var nodes = D.querySelectorAll(".qe105-ver");
      for (var i = 0; i < nodes.length; i++) if (nodes[i].textContent !== VER) nodes[i].textContent = VER;
      var br = D.querySelector(".qe105-brand");
      if (br && br.title) {
        var t2 = br.title.replace(/(หน้าจอ \(UI\)\s*)v\d+/i, "$1" + VER);
        if (t2 !== br.title) br.title = t2;
      }
      var t = D.title || "";
      var want = TITLE_RE.test(t) ? t.replace(TITLE_RE, " " + VER.toUpperCase()) : (t ? t + " " + VER.toUpperCase() : "");
      if (want && t !== want) D.title = want;
    } catch (e) {
      try { window.QE86Diagnostics && window.QE86Diagnostics.capture(e, "app-version-v142"); } catch (_) {}
    }
    busy = false;
  }

  function relevant(list) {
    for (var i = 0; i < list.length; i++) {
      var m = list[i], t = m.target, el = t.nodeType === 1 ? t : t.parentNode;
      if (!el) continue;
      if (el.nodeName === "TITLE") return true;
      if (el.closest && el.closest(".qe105-ver")) return true;
      if (m.type === "attributes" && el.classList && el.classList.contains("qe105-brand")) return true;
      var ad = m.addedNodes || [];
      for (var j = 0; j < ad.length; j++) {
        var a = ad[j];
        if (a.nodeType === 1 && (a.nodeName === "TITLE" || (a.matches && a.matches(".qe105-ver,.qe105-brand")) || (a.querySelector && a.querySelector(".qe105-ver")))) return true;
      }
    }
    return false;
  }

  function boot() {
    apply();
    if (!window.MutationObserver) return;
    var mo = new MutationObserver(function (list) { if (!busy && relevant(list)) apply(); });
    mo.observe(D.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["title"] });
  }
  if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", boot, { once: true }); else boot();
})();
