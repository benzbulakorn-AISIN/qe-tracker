/*! QE Elec. Daily Job Tracker — float-ui-v148.js  (แทน float-ui-v147.js · โหลดต่อจาก core-v125.min.js · ทำงานทุกหน้า)
    v146: ปุ่ม "แชต" (#qeChatHubFab) และ "AI" (#qeAiFab) อยู่มุมขวาบน · หน้าต่างแชตเปิดลงมาจากมุมขวาบน
    v147: ล็อกตำแหน่งปุ่ม AI / แชต · เนื้อหาระยะซ้าย = ขวา · ข้อความน้องดุ๊กดิ๊ก
    v148: 1) ปุ่มกลมแสดง/ซ่อนน้องดุ๊กดิ๊ก (.qe89-mascot-restore) ย้ายขึ้นมุมขวาบน ต่อจากปุ่ม AI
          2) แก้เนื้อหาล้นขอบขวา (มีแถบเลื่อนแนวนอน) — v147 ใช้ margin ติดลบแล้วปรับแข่งกับสคริปต์จัดขอบเดิม
             v148 กำหนด "ความกว้าง" ของหน้าแทน: ความกว้าง = ขอบจอ − ระยะซ้าย − จุดเริ่มเนื้อหา
             → ระยะขวาเท่าระยะซ้ายพอดี และไม่ล้นจอ (คำนวณจากด้านซ้ายอย่างเดียว ไม่วนปรับ)
          3) แก้ข้อความน้องกระพริบแล้วหาย — เลิกขยับกล่องข้อความด้วย JS ขณะแสดง
             กล่องข้อความวางลอยข้างตัวน้องด้วย CSS (ซ้าย/ขวาตามพื้นที่ว่าง) เลือกฝั่งเฉพาะตอนโหลด / ลากเสร็จ / ปรับจอ
    ปรับหน้าตาอย่างเดียว: ไม่แตะข้อมูล / Cloud / ระบบแชต / AI / ตำแหน่งน้อง (ux_qe_mascot_pos_v1)
    ไม่มี network และไม่มี dependency ภายนอก */
(function () {
  "use strict";
  if (window.__QE148_FLOAT_UI) return;
  window.__QE148_FLOAT_UI = true;
  window.__QE147_FLOAT_UI = true; window.__QE146_FLOAT_UI = true; // กันไฟล์รุ่นเก่าที่ค้างใน cache
  var D = document;

  function diag(e) { try { window.QE86Diagnostics && window.QE86Diagnostics.capture(e, "float-ui-v148"); } catch (_) {} }
  function mobile() { return (window.innerWidth || 0) <= 640; }
  var POS = { qeChatHubFab: [16, 10], qeAiFab: [70, 58] };   // right: [desktop, mobile]
  var POS_R = [124, 106];

  var CSS = [
    "body.qe-fab-top #qeChatHubFab,body.qe-fab-top #qeAiFab,body.qe-fab-top .qe89-mascot-restore{position:fixed!important;top:10px!important;bottom:auto!important;left:auto!important;width:46px!important;height:46px!important;min-width:0!important;min-height:0!important;margin:0!important;padding:0!important;border-radius:50%!important;display:flex!important;align-items:center!important;justify-content:center!important;transform:none!important;translate:none!important;z-index:10040!important}",
    "body.qe-fab-top #qeChatHubFab{right:16px!important}",
    "body.qe-fab-top #qeAiFab{right:70px!important;font-size:12px!important;line-height:1.1!important;white-space:normal!important;text-align:center!important;overflow:hidden!important}",
    "body.qe-fab-top .qe89-mascot-restore{right:124px!important}",
    "body.qe-fab-top #qeChatHubFab[hidden],body.qe-fab-top #qeAiFab[hidden],body.qe-fab-top .qe89-mascot-restore[hidden]{display:none!important}",
    "body.qe-fab-top #qeChatHubFab:focus-visible,body.qe-fab-top #qeAiFab:focus-visible,body.qe-fab-top .qe89-mascot-restore:focus-visible{outline:3px solid #f59e0b!important;outline-offset:2px!important}",
    "body.qe-fab-top #qeChatPanel,body.qe-fab-top #qeTeamsPanel{top:64px!important;bottom:auto!important;right:16px!important;max-height:calc(100vh - 76px)!important;max-height:calc(100dvh - 76px)!important}",
    "@media(min-width:901px){body.qe-fab-top #qeMain::before{content:'';display:block;height:18px}}",
    "@media(max-width:640px){body.qe-fab-top #qeChatHubFab,body.qe-fab-top #qeAiFab,body.qe-fab-top .qe89-mascot-restore{top:8px!important;width:42px!important;height:42px!important}body.qe-fab-top #qeChatHubFab{right:10px!important}body.qe-fab-top #qeAiFab{right:58px!important;font-size:11px!important}body.qe-fab-top .qe89-mascot-restore{right:106px!important}body.qe-fab-top #qeChatPanel,body.qe-fab-top #qeTeamsPanel{top:58px!important;right:8px!important;left:8px!important;max-height:calc(100vh - 66px)!important;max-height:calc(100dvh - 66px)!important}}",
    "@media print{body.qe-fab-top #qeChatHubFab,body.qe-fab-top #qeAiFab,body.qe-fab-top .qe89-mascot-restore{display:none!important}}",
    /* ความกว้างเนื้อหา: ระยะซ้าย = ขวา */
    "body.qe-fab-top #viewToday.tx-on{padding-right:0!important}",
    "body.qe-fit #qeMain>[id^=view]{box-sizing:border-box!important;width:var(--fx-w)!important;max-width:var(--fx-w)!important;margin-right:0!important}",
    /* ข้อความน้องดุ๊กดิ๊ก: ลอยข้างตัวน้อง ไม่ดันตัวน้อง */
    "#qe89Mascot{overflow:visible!important}",
    "#qe89Mascot .qe89-mascot-bubble{position:absolute!important;top:4px!important;bottom:auto!important;right:calc(100% + 6px)!important;left:auto!important;margin:0!important;width:max-content!important;min-width:150px!important;max-width:min(240px,calc(100vw - 90px))!important;white-space:normal!important;overflow-wrap:anywhere;translate:none!important}",
    "#qe89Mascot .qe89-mascot-bubble[data-fx-side=r]{right:auto!important;left:calc(100% + 6px)!important}",
    "@media print{#qe89Mascot{display:none!important}}"
  ].join("\n");
  function injectCss() {
    if (D.getElementById("qe148FloatCss")) return;
    var st = D.createElement("style"); st.id = "qe148FloatCss"; st.textContent = CSS; D.head.appendChild(st);
    D.body.classList.add("qe-fab-top");
  }

  /* ---------- 1) ล็อกปุ่มมุมขวาบน ---------- */
  function pin(el, right) {
    if (!el) return;
    var want = { position: "fixed", top: (mobile() ? 8 : 10) + "px", bottom: "auto", left: "auto", right: right + "px" };
    Object.keys(want).forEach(function (k) {
      if (el.style.getPropertyValue(k) !== want[k] || el.style.getPropertyPriority(k) !== "important") el.style.setProperty(k, want[k], "important");
    });
  }
  function pinAll() {
    Object.keys(POS).forEach(function (id) { pin(D.getElementById(id), POS[id][mobile() ? 1 : 0]); });
    pin(D.querySelector(".qe89-mascot-restore"), POS_R[mobile() ? 1 : 0]);
  }
  function watchPin(el) {
    if (!el || el.__fx148) return !!el;
    el.__fx148 = true;
    new MutationObserver(function () { pinAll(); }).observe(el, { attributes: true, attributeFilter: ["style"] });
    return true;
  }
  function hookFabs() {
    var a = watchPin(D.getElementById("qeAiFab")), b = watchPin(D.getElementById("qeChatHubFab")), c = watchPin(D.querySelector(".qe89-mascot-restore"));
    pinAll();
    return a && b && c;
  }

  /* ---------- 2) ความกว้างเนื้อหา ---------- */
  function sidebarRight() {
    var el = D.querySelector(".qe105-brand");
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
  var pend = false, lastW = "";
  function fitWidth() {
    pend = false;
    try {
      if ((window.innerWidth || 0) <= 900) { if (D.body.classList.contains("qe-fit")) D.body.classList.remove("qe-fit"); return; }
      var v = activeView(), sb = sidebarRight(); if (!v || !sb) return;
      var vw = D.documentElement.clientWidth, left = v.getBoundingClientRect().left, gap = left - sb;
      if (gap < 0 || gap > 200) return;
      var w = Math.floor(vw - gap - left);
      if (w < 400) return;
      var s = w + "px";
      if (s !== lastW) { lastW = s; D.body.style.setProperty("--fx-w", s); }
      if (!D.body.classList.contains("qe-fit")) D.body.classList.add("qe-fit");
    } catch (e) { diag(e); }
  }
  function scheduleFit() { if (pend) return; pend = true; setTimeout(fitWidth, 60); }

  /* ---------- 3) ข้อความน้องดุ๊กดิ๊ก: เลือกฝั่งเท่านั้น ---------- */
  function sideBubble() {
    try {
      var m = D.getElementById("qe89Mascot"); if (!m) return;
      var b = m.querySelector(".qe89-mascot-bubble"), btn = m.querySelector(".qe89-mascot-btn");
      if (!b || !btn) return;
      var r = btn.getBoundingClientRect(); if (!r.width) return;
      var side = r.left < 260 ? "r" : "l";
      if (b.getAttribute("data-fx-side") !== side) b.setAttribute("data-fx-side", side);
    } catch (e) { diag(e); }
  }
  function hookMascot() {
    var m = D.getElementById("qe89Mascot"); if (!m) return false;
    if (m.__fx148) return true;
    m.__fx148 = true;
    var end = function () { setTimeout(sideBubble, 80); };
    m.addEventListener("pointerup", end); m.addEventListener("pointercancel", end);
    sideBubble();
    return true;
  }

  function start() {
    try { injectCss(); } catch (e) { diag(e); }
    var rt = 0;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { pinAll(); scheduleFit(); sideBubble(); }, 150); });
    var ok = function () { var a = hookFabs(), b = hookMascot(); return a && b; };
    if (!ok()) { var n = 0, t = setInterval(function () { if (ok() || ++n > 80) clearInterval(t); }, 250); }
    Array.prototype.forEach.call(D.querySelectorAll("#qeMain > [id^=view]"), function (v) {
      new MutationObserver(scheduleFit).observe(v, { attributes: true, attributeFilter: ["style"] });
    });
    new MutationObserver(scheduleFit).observe(D.body, { attributes: true, attributeFilter: ["class"] });
    [300, 1200, 3000].forEach(function (ms) { setTimeout(function () { scheduleFit(); sideBubble(); }, ms); });
    window.QE148FloatUI = Object.freeze({ version: "v148", fit: fitWidth });
  }
  if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", start, { once: true }); else start();
})();
