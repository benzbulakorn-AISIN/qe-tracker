/*! QE Elec. Daily Job Tracker — float-ui-v147.js  (แทน float-ui-v146.js · โหลดต่อจาก core-v125.min.js · ทำงานทุกหน้า)
    v146: ปุ่มลอย "แชต" (#qeChatHubFab) และ "AI" (#qeAiFab) อยู่มุมขวาบน · หน้าต่างแชตเปิดลงมาจากมุมขวาบน
    v147: 1) ล็อกตำแหน่งปุ่ม AI / แชต ซ้ำด้วย inline style (กันสคริปต์เดิมย้ายปุ่มกลับลงล่าง)
          2) เนื้อหาหน้าเว็บกว้างเต็มจอ — ระยะซ้าย (แถบน้ำเงิน → เนื้อหา) = ระยะขวา (เนื้อหา → ขอบจอ)
             วัดจากของจริงบนจอทุกครั้งที่เปลี่ยนหน้า / ย่อ-ขยายเมนู / ปรับขนาดหน้าต่าง
             และยกเลิกการเว้นที่ด้านขวา 64px ของหน้า "วันนี้" (ไม่ต้องเว้นให้ปุ่มลอยแล้ว)
          3) ข้อความทักทายของน้องดุ๊กดิ๊ก (.qe89-mascot-bubble) อ่านได้ครบ
             - กล่องข้อความมีความกว้างคงที่ ไม่ถูกบีบจนเหลือแค่ 👋 เมื่อน้องอยู่ชิดขอบขวา
             - ถ้าล้นขอบ → ย้ายไปอีกฝั่งของน้อง / เลื่อนเข้ามาในจอ
             ตำแหน่งของน้อง (ux_qe_mascot_pos_v1) ไม่เปลี่ยน
    ปรับหน้าตาอย่างเดียว: ไม่แตะข้อมูล / Cloud / ระบบแชต / AI · ตัวรับคลิกของปุ่มเดิมทำงานเหมือนเดิม
    ไม่มี network และไม่มี dependency ภายนอก */
(function () {
  "use strict";
  if (window.__QE147_FLOAT_UI) return;
  window.__QE147_FLOAT_UI = true;
  window.__QE146_FLOAT_UI = true; // กันไฟล์ v146 เดิม (ถ้ายังค้างใน cache) ทำงานซ้ำ
  var D = document, EDGE = 8, GAP = 5;

  function diag(e) { try { window.QE86Diagnostics && window.QE86Diagnostics.capture(e, "float-ui-v147"); } catch (_) {} }
  function mobile() { return (window.innerWidth || 0) <= 640; }

  /* ---------- CSS ---------- */
  var CSS = [
    "body.qe-fab-top #qeChatHubFab,body.qe-fab-top #qeAiFab{position:fixed!important;top:10px!important;bottom:auto!important;left:auto!important;width:46px!important;height:46px!important;min-width:0!important;min-height:0!important;margin:0!important;padding:0!important;border-radius:50%!important;display:flex!important;align-items:center!important;justify-content:center!important;transform:none!important;translate:none!important;z-index:10040!important}",
    "body.qe-fab-top #qeChatHubFab{right:16px!important}",
    "body.qe-fab-top #qeAiFab{right:70px!important;font-size:12px!important;line-height:1.1!important;white-space:normal!important;text-align:center!important;overflow:hidden!important}",
    "body.qe-fab-top #qeChatHubFab[hidden],body.qe-fab-top #qeAiFab[hidden]{display:none!important}",
    "body.qe-fab-top #qeChatHubFab:focus-visible,body.qe-fab-top #qeAiFab:focus-visible{outline:3px solid #f59e0b!important;outline-offset:2px!important}",
    "body.qe-fab-top #qeChatPanel,body.qe-fab-top #qeTeamsPanel{top:64px!important;bottom:auto!important;right:16px!important;max-height:calc(100vh - 76px)!important;max-height:calc(100dvh - 76px)!important}",
    "@media(min-width:901px){body.qe-fab-top #qeMain::before{content:'';display:block;height:18px}}",
    "@media(max-width:640px){body.qe-fab-top #qeChatHubFab,body.qe-fab-top #qeAiFab{top:8px!important;width:42px!important;height:42px!important}body.qe-fab-top #qeChatHubFab{right:10px!important}body.qe-fab-top #qeAiFab{right:58px!important;font-size:11px!important}body.qe-fab-top #qeChatPanel,body.qe-fab-top #qeTeamsPanel{top:58px!important;right:8px!important;left:8px!important;max-height:calc(100vh - 66px)!important;max-height:calc(100dvh - 66px)!important}}",
    "@media print{body.qe-fab-top #qeChatHubFab,body.qe-fab-top #qeAiFab{display:none!important}}",
    /* เนื้อหาเต็มจอ ระยะซ้าย = ขวา */
    "body.qe-fab-top #viewToday.tx-on{padding-right:0!important}",
    "body.qe-fit #qeMain>[id^=view]{margin-right:var(--fx-mr,0px)!important}",
    /* ข้อความน้องดุ๊กดิ๊ก */
    "#qe89Mascot{width:max-content!important;max-width:none!important}",
    "#qe89Mascot .qe89-mascot-bubble{flex:0 0 auto!important;width:max-content!important;min-width:150px!important;max-width:min(240px,calc(100vw - 90px))!important;white-space:normal!important;overflow-wrap:anywhere}",
    "@media print{#qe89Mascot{display:none!important}}"
  ].join("\n");
  function injectCss() {
    if (D.getElementById("qe147FloatCss")) return;
    var st = D.createElement("style"); st.id = "qe147FloatCss"; st.textContent = CSS; D.head.appendChild(st);
    D.body.classList.add("qe-fab-top");
  }

  /* ---------- 1) ล็อกปุ่ม AI / แชต ---------- */
  function pinFab(el) {
    if (!el) return;
    var right = el.id === "qeAiFab" ? (mobile() ? 58 : 70) : (mobile() ? 10 : 16);
    var want = { position: "fixed", top: (mobile() ? 8 : 10) + "px", bottom: "auto", left: "auto", right: right + "px" };
    Object.keys(want).forEach(function (k) {
      if (el.style.getPropertyValue(k) !== want[k] || el.style.getPropertyPriority(k) !== "important") el.style.setProperty(k, want[k], "important");
    });
  }
  function hookFabs() {
    var ok = 0;
    ["qeAiFab", "qeChatHubFab"].forEach(function (id) {
      var el = D.getElementById(id); if (!el) return;
      ok++;
      if (el.__fx147) return;
      el.__fx147 = true;
      pinFab(el);
      new MutationObserver(function () { pinFab(el); }).observe(el, { attributes: true, attributeFilter: ["style"] });
    });
    return ok === 2;
  }

  /* ---------- 2) ระยะซ้าย = ระยะขวา ---------- */
  function sidebarRight() {
    var br = D.querySelector(".qe105-brand"), el = br;
    while (el && el !== D.body) {
      var cs = getComputedStyle(el);
      if (cs.position === "fixed" || cs.position === "sticky") {
        var r = el.getBoundingClientRect();
        if (r.width > 30 && r.width < window.innerWidth * 0.6 && r.left < 10) return r.right;
      }
      el = el.parentElement;
    }
    return 0;
  }
  function activeView() {
    var vs = D.querySelectorAll("#qeMain > [id^=view]");
    for (var i = 0; i < vs.length; i++) { var r = vs[i].getBoundingClientRect(); if (r.width > 0 && r.height > 0) return vs[i]; }
    return null;
  }
  var mr = 0, fitN = 0, fitT = 0, fitPend = false;
  function fitWidth() {
    fitPend = false;
    try {
      if (mobile() || (window.innerWidth || 0) <= 900) { if (mr) { mr = 0; D.body.style.removeProperty("--fx-mr"); } if (D.body.classList.contains("qe-fit")) D.body.classList.remove("qe-fit"); return; }
      var v = activeView(); if (!v) return;
      var sb = sidebarRight(); if (!sb) return;
      var now = Date.now();
      if (now - fitT > 2000) { fitT = now; fitN = 0; }
      if (++fitN > 6) return; // กันปรับวนกับสคริปต์จัดขอบเดิม
      if (!D.body.classList.contains("qe-fit")) D.body.classList.add("qe-fit");
      var r = v.getBoundingClientRect(), vw = D.documentElement.clientWidth;
      var leftGap = r.left - sb, rightGap = vw - r.right;
      if (leftGap < 0) return;
      var diff = Math.round(rightGap - leftGap);
      if (Math.abs(diff) <= 1) return;
      mr = Math.round(mr - diff);
      if (mr > 0) mr = 0;
      D.body.style.setProperty("--fx-mr", mr + "px");
    } catch (e) { diag(e); }
  }
  function scheduleFit() { if (fitPend) return; fitPend = true; (window.requestAnimationFrame || setTimeout)(function () { setTimeout(fitWidth, 30); }); }

  /* ---------- 3) ข้อความน้องดุ๊กดิ๊ก ---------- */
  var fitting = false;
  function fitBubble() {
    if (fitting) return;
    var m = D.getElementById("qe89Mascot"); if (!m) return;
    var b = m.querySelector(".qe89-mascot-bubble"), btn = m.querySelector(".qe89-mascot-btn");
    if (!b || !btn) return;
    fitting = true;
    try {
      b.style.translate = "";
      if (m.hidden || m.classList.contains("dragging") || getComputedStyle(b).display === "none") return;
      var br = b.getBoundingClientRect(), bt = btn.getBoundingClientRect();
      if (!br.width || !bt.width) return;
      var vw = D.documentElement.clientWidth || window.innerWidth, vh = window.innerHeight;
      var dx = 0, dy = 0;
      if (br.right > vw - EDGE || br.left < EDGE) {
        var onRight = br.left >= bt.left + bt.width / 2;
        var left = onRight ? bt.left - GAP - br.width : bt.right + GAP;
        left = Math.max(EDGE, Math.min(vw - EDGE - br.width, left));
        dx = Math.round(left - br.left);
      }
      if (br.bottom > vh - EDGE) dy = Math.round(vh - EDGE - br.bottom);
      if (br.top + dy < EDGE) dy = Math.round(EDGE - br.top);
      if (dx || dy) b.style.translate = dx + "px " + dy + "px";
    } catch (e) { diag(e); }
    finally { setTimeout(function () { fitting = false; }, 0); }
  }
  function hookMascot() {
    var m = D.getElementById("qe89Mascot");
    if (!m) return false;
    if (m.__fx147) return true;
    m.__fx147 = true;
    var cb = function () { if (!fitting) fitBubble(); };
    new MutationObserver(cb).observe(m, { attributes: true, attributeFilter: ["class", "style", "hidden"] });
    var bub = m.querySelector(".qe89-mascot-bubble");
    if (bub) new MutationObserver(cb).observe(bub, { childList: true, subtree: true, characterData: true });
    fitBubble();
    return true;
  }

  function start() {
    try { injectCss(); } catch (e) { diag(e); }
    var rt = 0;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        ["qeAiFab", "qeChatHubFab"].forEach(function (id) { pinFab(D.getElementById(id)); });
        fitN = 0; scheduleFit(); fitBubble();
      }, 150);
    });
    var tryHook = function () { var a = hookFabs(), b = hookMascot(); return a && b; };
    if (!tryHook()) { var n = 0, t = setInterval(function () { if (tryHook() || ++n > 80) clearInterval(t); }, 250); }
    // เปลี่ยนหน้า / ย่อ-ขยายเมนู / เนื้อหาโหลดเสร็จ → วัดระยะใหม่
    var main = D.getElementById("qeMain");
    if (main) new MutationObserver(function () { fitN = 0; scheduleFit(); }).observe(main, { attributes: true, subtree: false, childList: false, attributeFilter: ["style", "class"] });
    Array.prototype.forEach.call(D.querySelectorAll("#qeMain > [id^=view]"), function (v) {
      new MutationObserver(function () { fitN = 0; scheduleFit(); }).observe(v, { attributes: true, attributeFilter: ["style"] });
    });
    new MutationObserver(function () { fitN = 0; scheduleFit(); }).observe(D.body, { attributes: true, attributeFilter: ["class"] });
    if (window.ResizeObserver) { var ro = new ResizeObserver(function () { scheduleFit(); }); if (main) ro.observe(main); }
    [300, 1200, 3000].forEach(function (ms) { setTimeout(function () { fitN = 0; scheduleFit(); }, ms); });
    window.QE147FloatUI = Object.freeze({ version: "v147", fitBubble: fitBubble, fitWidth: function () { fitN = 0; fitWidth(); } });
  }
  if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", start, { once: true }); else start();
})();
