/*! QE Elec. Daily Job Tracker — app-version-v143.js  (แทน app-version-v142.js · โหลดเป็นไฟล์สุดท้ายใน index.html)
    v143: ซ่อนเลขเวอร์ชันจากหน้าจอทั้งหมด
      - แถบชื่อหน้าต่าง / แอปที่ติดตั้ง: "QE Elec. Daily Job Tracker" (ไม่มี Vxxx)
      - ป้ายเวอร์ชันใน Sidebar (.qe105-ver) ซ่อน · tooltip โลโก้ไม่แสดงเลข UI
      - ข้อความของน้องดุ๊กดิ๊ก: ตัด " · v125" ท้ายชื่อออก
    ไฟล์เก่า (core, version-v125.js, tracker-toolbar-v131.js) ยังเขียนเลขของตัวเองอยู่
    → MutationObserver ลบออกทันทีก่อนหน้าจอวาด จึงไม่เห็นเลขโผล่
    แสดงผลอย่างเดียว: ไม่เปลี่ยน window.QE_APP_VERSION / meta qe-app-version / ระบบแจ้งอัปเดต / ข้อมูล / Cloud
    ดูเลขเวอร์ชันจริงได้ที่ Console: QEAppVersion */
(function () {
  "use strict";
  var VER = "v143";
  if (window.__QE_APP_VERSION_LABEL) return;
  window.__QE_APP_VERSION_LABEL = VER;
  try { window.QEAppVersion = VER; window.QE_UI_VERSION = VER; } catch (_) {}

  var D = document, busy = false;
  var TITLE_RE = /\s*[·\-–|]?\s*\b[Vv]\d{2,4}\b/g;
  var MASCOT_RE = /\s*[·•\-–|]\s*v\d{2,4}\b/gi;
  var MASCOT_NAME = /ดุ๊กดิ๊ก/;

  var css = D.createElement("style");
  css.id = "qe143VerCss";
  css.textContent = ".qe105-ver{display:none!important}";
  (D.head || D.documentElement).appendChild(css);

  function cleanTitle() {
    var t = D.title || "";
    if (/\b[Vv]\d{2,4}\b/.test(t)) {
      var n = t.replace(TITLE_RE, "").replace(/\s{2,}/g, " ").trim();
      if (n && n !== t) D.title = n;
    }
  }
  function cleanBrand() {
    var br = D.querySelectorAll(".qe105-brand");
    for (var i = 0; i < br.length; i++) {
      var t = br[i].title;
      if (t && /v\d{2,4}/i.test(t)) {
        var n = t.replace(/\s*[·\-–|]?\s*หน้าจอ \(UI\)\s*v\d+/gi, "").replace(/\s*[·\-–|]?\s*\b[Vv]\d{2,4}\b/g, "").trim();
        if (n !== t) br[i].title = n;
      }
    }
  }
  function cleanMascotNode(root) {
    if (!root || !root.nodeType) return;
    var host = root.nodeType === 3 ? root.parentNode : root;
    if (!host || !MASCOT_NAME.test(host.textContent || "")) return;
    var w = D.createTreeWalker(host, NodeFilter.SHOW_TEXT, null), n;
    while ((n = w.nextNode())) {
      var v = n.nodeValue;
      if (!/v\d{2,4}/i.test(v)) continue;
      var nv = /^\s*[·•\-–|]?\s*v\d{2,4}\s*$/i.test(v) ? "" : v.replace(MASCOT_RE, "");
      if (nv !== v) n.nodeValue = nv;
    }
  }
  function apply(nodes) {
    if (busy) return;
    busy = true;
    try {
      cleanTitle();
      cleanBrand();
      if (nodes) for (var i = 0; i < nodes.length; i++) cleanMascotNode(nodes[i]);
      else cleanMascotNode(D.body);
    } catch (e) {
      try { window.QE86Diagnostics && window.QE86Diagnostics.capture(e, "app-version-v143"); } catch (_) {}
    }
    busy = false;
  }

  function boot() {
    apply(null);
    if (!window.MutationObserver) return;
    new MutationObserver(function (list) {
      if (busy) return;
      var touched = [];
      for (var i = 0; i < list.length; i++) {
        var m = list[i];
        if (m.type === "characterData") touched.push(m.target);
        else if (m.type === "childList") {
          touched.push(m.target);
          for (var j = 0; j < m.addedNodes.length; j++) touched.push(m.addedNodes[j]);
        }
      }
      apply(touched);
    }).observe(D.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["title"] });
  }
  if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", boot, { once: true }); else boot();
})();
