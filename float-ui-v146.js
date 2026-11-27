/*! QE Elec. Daily Job Tracker — float-ui-v146.js  (ไฟล์ใหม่ · โหลดต่อจาก core-v125.min.js · ทำงานทุกหน้า)
    v146: 1) ย้ายปุ่มลอย "แชต" (#qeChatHubFab) และ "AI" (#qeAiFab) ไปไว้มุมขวาบน เรียงแถวเดียว
             หน้าต่างแชต LINE / Teams (#qeChatPanel / #qeTeamsPanel) เปิดลงมาจากมุมขวาบนให้ตรงกับปุ่ม
             เว้นที่ด้านบนเนื้อหา 18px บน Desktop เพื่อไม่ให้ปุ่มทับปุ่ม ⋯ / ชื่อหน้า
          2) ข้อความทักทายของน้องดุ๊กดิ๊ก (.qe89-mascot-bubble) ไม่ตกขอบจอ
             ถ้าล้นขอบขวา/ซ้าย → ย้ายไปอีกฝั่งของน้อง · ถ้าล้นบน/ล่าง → เลื่อนเข้ามาในจอ
             ใช้ CSS translate เฉพาะกล่องข้อความ — ตำแหน่งของน้อง (ux_qe_mascot_pos_v1) ไม่เปลี่ยน
    ปรับหน้าตาอย่างเดียว: ไม่แตะข้อมูล / Cloud / ระบบแชต / AI · ตัวรับคลิกของปุ่มเดิมทำงานเหมือนเดิม
    ไม่มี network และไม่มี dependency ภายนอก */
(function () {
  "use strict";
  if (window.__QE146_FLOAT_UI) return;
  window.__QE146_FLOAT_UI = true;
  var D = document, EDGE = 8, GAP = 5;

  function diag(e) { try { window.QE86Diagnostics && window.QE86Diagnostics.capture(e, "float-ui-v146"); } catch (_) {} }

  /* ---------- 1) ปุ่มแชต / AI มุมขวาบน ---------- */
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
    ".qe89-mascot-bubble.fx-moved{transition:opacity .18s!important}"
  ].join("\n");
  function injectCss() {
    if (D.getElementById("qe146FloatCss")) return;
    var st = D.createElement("style"); st.id = "qe146FloatCss"; st.textContent = CSS; D.head.appendChild(st);
    D.body.classList.add("qe-fab-top");
  }

  /* ---------- 2) ข้อความน้องดุ๊กดิ๊กไม่ตกขอบ ---------- */
  var fitting = false;
  function fitBubble() {
    if (fitting) return;
    var m = D.getElementById("qe89Mascot"); if (!m) return;
    var b = m.querySelector(".qe89-mascot-bubble"), btn = m.querySelector(".qe89-mascot-btn");
    if (!b || !btn) return;
    fitting = true;
    try {
      b.style.translate = ""; b.classList.remove("fx-moved");
      if (m.hidden || m.classList.contains("dragging") || getComputedStyle(b).display === "none") return;
      var br = b.getBoundingClientRect(), bt = btn.getBoundingClientRect();
      if (!br.width || !bt.width) return;
      var vw = D.documentElement.clientWidth || window.innerWidth, vh = window.innerHeight;
      var dx = 0, dy = 0, left = br.left;
      if (br.right > vw - EDGE || br.left < EDGE) {
        var onRight = br.left >= bt.left + bt.width / 2;
        left = onRight ? bt.left - GAP - br.width : bt.right + GAP; // ย้ายไปอีกฝั่งของน้อง
        left = Math.max(EDGE, Math.min(vw - EDGE - br.width, left));
        dx = Math.round(left - br.left);
      }
      if (br.bottom > vh - EDGE) dy = Math.round(vh - EDGE - br.bottom);
      if (br.top + dy < EDGE) dy = Math.round(EDGE - br.top);
      if (dx || dy) { b.style.translate = dx + "px " + dy + "px"; b.classList.add("fx-moved"); }
    } catch (e) { diag(e); }
    finally { fitting = false; }
  }
  function hookMascot() {
    var m = D.getElementById("qe89Mascot");
    if (!m) return false;
    if (m.__fx146) return true;
    m.__fx146 = true;
    var cb = function () { if (!fitting) fitBubble(); };
    // ดูเฉพาะตัวน้อง (class/style/hidden) + ข้อความในกล่อง — ไม่ดู style ของกล่องข้อความเอง (กันวนซ้ำ)
    new MutationObserver(cb).observe(m, { attributes: true, attributeFilter: ["class", "style", "hidden"] });
    var bub = m.querySelector(".qe89-mascot-bubble");
    if (bub) new MutationObserver(cb).observe(bub, { childList: true, subtree: true, characterData: true });
    fitBubble();
    return true;
  }

  function start() {
    try { injectCss(); } catch (e) { diag(e); }
    var rt = 0;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(fitBubble, 120); });
    if (!hookMascot()) { var n = 0, t = setInterval(function () { if (hookMascot() || ++n > 60) clearInterval(t); }, 250); }
    window.QE146FloatUI = Object.freeze({ version: "v146", fitBubble: fitBubble });
  }
  if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", start, { once: true }); else start();
})();
