/*! QE Elec. Daily Job Tracker — mywork-ux-v158.js  (ไฟล์ใหม่ · โหลดต่อจาก core-v125.min.js · เฉพาะหน้า "📥 งานของฉัน")
    v158: จัดหน้า "งานของฉัน" ใหม่ให้ใช้งานง่าย — รายการงานกับตารางเวลาอยู่คู่กันในจอเดียว
      1) วางเคียงกัน: ซ้าย = 📋 งานที่ต้องทำ (ค้นหา/กรอง/รายการ) · ขวา = 🗓 ตารางเวลาวันนี้ (ติดอยู่กับจอตอนเลื่อน)
         → ลากการ์ดงานจากซ้ายไปวางในช่องเวลาด้านขวาได้ทันที ไม่ต้องเลื่อนหน้า
      2) ตัดแถบ "⚡ ควรวางแผน" ออก (ซ้ำกับปุ่ม 📅 วางแผน ในการ์ดงาน)
      3) การ์ดงานเตี้ยลง (~76px จาก ~110px): ชื่อ 1 บรรทัด · เจ้าของ/Due 1 บรรทัด · Next action 1 บรรทัด (ชี้เมาส์ดูเต็ม)
         เพิ่มปุ่ม [✓ เสร็จ] (ใช้หน้าต่างปิดงานเดิมของ Tracker) · [📅 วางแผน] · [↗ เปิด]
      4) ตัวเลข 5 ช่อง → ปุ่มกรองแบบแคปซูล: [📋 ทั้งหมด] [🔴 เลยกำหนด] [🟠 ครบวันนี้] [🟡 ภายใน 3 วัน] [⚪ ไม่มี Due] (ตัวที่เลือก = สีทึบ · ตัวที่เป็น 0 จางลง)
      5) ตารางเวลา: บล็อกประชุมเป็นสีฟ้าอ่อนทึบ + ขอบซ้ายเข้ม (แทนลายเฉียง) · ปุ่ม "+ เพิ่มงาน" ตัวหนังสือชัด
         คำอธิบายวิธีใช้ย้ายไปอยู่ในปุ่ม ❓ วิธีใช้ · ถ้าดูวันอื่นที่ไม่ใช่วันนี้ มีแถบเตือน + ปุ่ม "กลับวันนี้"
      6) ปุ่ม ⬆ มุมขวาล่าง โผล่เฉพาะตอนเลื่อนขึ้น ไม่ทับปุ่มของการ์ดงาน (ทุกหน้า)
      7) จอแคบ (≤900px): สลับแท็บ [📋 งาน | 🗓 ตาราง] แทนการวางเคียงกัน
    ย้าย/จัดเรียงองค์ประกอบเดิมเท่านั้น (ปุ่ม/ช่อง/ตัวรับเหตุการณ์ของ core ครบ) — ไม่แตะข้อมูล / key / Cloud / Backup / LINE / Teams
    ไม่มี network และไม่มี dependency ภายนอก */
(function () {
  "use strict";
  if (window.__QE158_MYWORK) return;
  window.__QE158_MYWORK = true;

  var D = document, PANE = "list", HELP = false, opened = false, vObs = null, pObs = null, lObs = null;
  var LABEL = { late: "เลยกำหนด", today: "ครบวันนี้", soon: "ภายใน 3 วัน", nodue: "ไม่มี Due", all: "ทั้งหมด" };
  function $(id) { return D.getElementById(id); }
  function diag(e) { try { window.QE86Diagnostics && window.QE86Diagnostics.capture(e, "mywork-ux-v158"); } catch (_) {} }
  function el(tag, cls, text) { var n = D.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function ymd() {
    try { if (typeof today === "string" && /^\d{4}-\d{2}-\d{2}$/.test(today)) return today; } catch (_) {}
    var d = new Date(), p = function (n) { return (n < 10 ? "0" : "") + n; };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }

  /* ---------- CSS ---------- */
  var V = "#viewMyWork ";
  var CSS = [
    /* เคียงกัน */
    V + ".mwx-split{display:grid;grid-template-columns:minmax(380px,5fr) minmax(0,6fr);gap:16px;align-items:start;margin-top:4px}",
    V + ".mwx-left{min-width:0}",
    V + ".mwx-right{min-width:0;position:sticky;top:60px}",
    V + "#mwPlan{max-height:calc(100vh - 76px);max-height:calc(100dvh - 76px);overflow:auto;margin:0!important}",
    V + "#mwPlan .pl-h{position:sticky;top:-1px;z-index:7;background:var(--card,#fff);padding-bottom:8px}",
    V + ".pl-tray{display:none!important}",
    V + ".pl-foot{display:none!important}",
    V + "#mwPlan.mwx-help .pl-foot{display:block!important}",
    V + ".mw-head{margin-bottom:6px!important}",
    /* หัวรายการ */
    V + ".mw-h2{margin:0 0 8px!important;font-size:16px!important;line-height:1.35}",
    V + ".mw-h2 small{display:block;margin-top:2px;font-size:12px!important;font-weight:600;color:var(--mut,#64748b)}",
    /* ตัวเลข → ปุ่มกรองแคปซูล */
    V + ".mw-kpis{display:flex!important;flex-wrap:wrap!important;gap:6px!important;margin:0 0 8px!important;grid-template-columns:none!important}",
    V + ".mw-kpi{display:inline-flex!important;flex-direction:row!important;align-items:center!important;gap:6px!important;width:auto!important;min-width:0!important;min-height:34px!important;padding:3px 11px!important;margin:0!important;border-radius:999px!important;border:1px solid var(--line,#cbd5e1)!important;background:var(--card,#fff)!important;color:var(--txt,#1e293b)!important;box-shadow:none!important;font:inherit;text-align:left;cursor:pointer}",
    V + ".mw-kpi::before{font-size:13px;line-height:1}",
    V + ".mw-kpi[data-f=late]::before{content:'🔴'}" + V + ".mw-kpi[data-f=today]::before{content:'🟠'}" + V + ".mw-kpi[data-f=soon]::before{content:'🟡'}" + V + ".mw-kpi[data-f=nodue]::before{content:'⚪'}" + V + ".mw-kpi[data-f=all]::before{content:'📋'}",
    V + ".mw-kpi[data-f=all]{order:-1}",
    V + ".mw-kpi span{order:1;font-size:13px!important;font-weight:700!important;line-height:1.2!important;color:inherit!important}",
    V + ".mw-kpi b{order:2;min-width:20px;padding:0 6px;border-radius:999px;background:var(--soft2,#f1f5f9);font-size:12.5px!important;line-height:1.55!important;text-align:center;color:inherit!important}",
    V + ".mw-kpi:hover{border-color:var(--pri,#6d28d9)!important}",
    V + ".mw-kpi.on{background:var(--pri,#6d28d9)!important;border-color:var(--pri,#6d28d9)!important;color:var(--on-pri,#fff)!important}",
    V + ".mw-kpi.on b{background:rgba(255,255,255,.25)}",
    V + ".mw-kpi.mwx-z:not(.on){opacity:.55}",
    V + ".mw-kpi:focus-visible,.mwx-seg button:focus-visible,.mwx-done:focus-visible{outline:3px solid var(--ring,#93c5fd);outline-offset:2px}",
    /* ค้นหา */
    V + ".mw-tools{display:flex!important;flex-wrap:wrap;align-items:center;gap:6px!important;margin:0 0 8px!important}",
    V + ".mw-tools #mwQ{flex:1 1 150px;min-width:0}",
    V + ".mw-tools select{flex:0 1 150px;min-width:0}",
    V + ".mw-tools .btn-g{min-height:34px;padding:3px 10px;font-size:12.5px}",
    V + ".mw-count{font-size:12px;color:var(--mut,#64748b);white-space:nowrap}",
    /* การ์ดงานกระชับ */
    V + ".mw-list{display:flex!important;flex-direction:column!important;gap:6px!important}",
    V + ".mw-card{display:grid!important;grid-template-columns:4px minmax(0,1fr) auto;column-gap:10px;row-gap:1px;align-items:center;min-height:0!important;margin:0!important;padding:7px 10px 7px 0!important;border-radius:10px!important;overflow:hidden}",
    V + ".mw-card .mw-ac{grid-column:1;grid-row:1/4;align-self:stretch;width:4px!important;border-radius:4px;background:var(--ac,#64748b)!important}",
    V + ".mw-card .mw-body{display:contents!important}",
    V + ".mw-card .mw-topline{grid-column:2/4;grid-row:1;display:flex!important;align-items:center;gap:6px;min-width:0;margin:0!important}",
    V + ".mw-card .mw-badge{flex:0 0 auto;padding:0 8px!important;font-size:11.5px!important;line-height:1.6!important;white-space:nowrap}",
    V + ".mw-card .mw-title{flex:1 1 auto;min-width:0;font-size:13.5px!important;font-weight:750!important;line-height:1.35!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    V + ".mw-card .mw-src{display:none!important}",
    V + ".mw-card .mw-meta{grid-column:2;grid-row:2;display:flex!important;flex-wrap:nowrap;gap:10px;min-width:0;margin:0!important;font-size:12px!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--mut,#64748b)}",
    V + ".mw-card .mw-meta>span:nth-child(3){display:none}",
    V + ".mw-card .mw-next{grid-column:2/4;grid-row:3;margin:0!important;padding:0!important;border:0!important;background:transparent!important;font-size:12px!important;line-height:1.4!important;color:var(--mut,#64748b);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    V + ".mw-card .mw-act{grid-column:3;grid-row:2;display:flex!important;flex-wrap:nowrap!important;flex-direction:row!important;align-items:center;gap:5px!important;margin:0!important}",
    V + ".mw-card .mw-act .btn-g{display:inline-flex!important;align-items:center;min-height:30px!important;height:30px;padding:2px 9px!important;margin:0!important;font-size:12.5px!important;font-weight:700;white-space:nowrap;border-radius:8px!important}",
    V + ".mw-card .mwx-done{border-color:var(--ok,#16a34a)!important;color:var(--t-ok,#15803d)!important}",
    V + ".mw-card .mwx-done:hover{background:var(--ok,#16a34a)!important;color:#fff!important}",
    V + ".mw-empty{padding:18px 8px}",
    V + ".mw-note{margin-top:8px!important;font-size:11.5px!important}",
    /* ตารางเวลา */
    V + "#mwPlan .pl-h .btn-p{color:#fff!important;-webkit-text-fill-color:#fff!important;text-shadow:none!important;font-weight:800!important}",
    V + "#mwPlan .pl-b.mt{background:color-mix(in srgb,#3b82f6 14%,var(--card,#fff))!important;background-image:none!important;border:1px solid rgba(59,130,246,.35)!important;border-left:4px solid #2563eb!important;border-radius:8px!important;color:var(--txt,#1e293b)!important}",
    V + "#mwPlan .pl-b.mt.inv{background:color-mix(in srgb,#3b82f6 6%,var(--card,#fff))!important;border-style:dashed!important;border-left-style:solid!important}",
    V + ".mwx-help-btn{min-height:34px;padding:3px 10px;font-size:12.5px;font-weight:700}",
    V + "#mwPlan.mwx-help .mwx-help-btn{background:var(--soft2,#ede9fe)!important}",
    V + ".mwx-notoday{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 8px;padding:8px 12px;border:1px solid #f59e0b;border-radius:10px;background:rgba(245,158,11,.14);color:var(--txt,#1e293b);font-size:13px;font-weight:700}",
    V + ".mwx-notoday button{min-height:32px;padding:2px 12px;font-size:12.5px;font-weight:800;border-radius:8px;border:1px solid #d97706;background:#f59e0b;color:#1f1300;cursor:pointer}",
    /* แท็บสลับ (จอแคบ) */
    V + ".mwx-seg{display:none;gap:4px;padding:4px;border:1px solid var(--line,#cbd5e1);border-radius:12px;background:var(--card,#fff);margin:8px 0 0}",
    V + ".mwx-seg button{flex:1 1 0;min-height:40px;padding:4px 12px;border:0;border-radius:9px;background:transparent;color:var(--mut,#64748b);font:inherit;font-size:14px;font-weight:750;cursor:pointer}",
    V + ".mwx-seg button[aria-selected=true]{background:var(--pri,#6d28d9);color:var(--on-pri,#fff)}",
    "@media(max-width:900px){",
    V + ".mwx-split{display:block}",
    V + ".mwx-right{position:static}",
    V + "#mwPlan{max-height:none;overflow:visible}",
    V + ".mwx-split.mwx-p-list>.mwx-right{display:none}",
    V + ".mwx-split.mwx-p-plan>.mwx-left{display:none}",
    V + ".mwx-seg{display:flex}",
    V + ".mw-card .mw-act .btn-g .mwx-l{display:none}",
    "}",
    /* ปุ่ม ⬆ โผล่เฉพาะตอนเลื่อนขึ้น (ทุกหน้า) */
    "html body.mwx-top-away #ux33Top{opacity:0!important;pointer-events:none!important;transform:translateY(12px)!important}",
    "#ux33Top{transition:opacity .2s ease,transform .2s ease}",
    "@media print{" + V + ".mwx-seg,.mwx-notoday{display:none!important}}"
  ].join("\n");
  function injectCss() {
    if ($("qe158Css")) return;
    var st = D.createElement("style"); st.id = "qe158Css"; st.textContent = CSS; D.head.appendChild(st);
  }

  /* ---------- จัดโครงหน้า ---------- */
  function tidyLeft(wrap) {
    var h2 = wrap.querySelector(".mw-h2");
    if (h2 && !h2.__x158) {
      h2.__x158 = true;
      if (h2.firstChild && h2.firstChild.nodeType === 3) h2.firstChild.nodeValue = "📋 งานที่ต้องทำ";
      var sm = h2.querySelector("small"); if (sm) sm.textContent = "ลากการ์ดไปวางในตารางเวลาด้านขวา หรือกด 📅 วางแผน";
    }
    Array.prototype.forEach.call(wrap.querySelectorAll(".mw-kpi"), function (k) {
      var f = k.getAttribute("data-f"), sp = k.querySelector("span"), b = k.querySelector("b");
      if (sp && LABEL[f] && sp.textContent !== LABEL[f]) sp.textContent = LABEL[f];
      if (b) k.classList.toggle("mwx-z", String(b.textContent).trim() === "0");
      if (!k.__a158) { k.__a158 = true; k.setAttribute("aria-pressed", k.classList.contains("on") ? "true" : "false"); }
    });
    var sub = wrap.querySelector(".mw-sub");
    if (sub && !sub.__x158) { sub.__x158 = true; sub.textContent = "ลากงานจากซ้ายไปวางในตารางเวลาด้านขวา · ประชุมของฉันแสดงให้อัตโนมัติ"; }
    var us = wrap.querySelector(".mw-user"); if (us && !us.title) us.title = "แสดงงานของบัญชีที่เข้าสู่ระบบอยู่";
  }
  function tidyCards(list) {
    if (!list) return;
    Array.prototype.forEach.call(list.querySelectorAll(".mw-card"), function (c) {
      var act = c.querySelector(".mw-act");
      var t = c.querySelector(".mw-title"); if (t && t.title !== t.textContent) t.title = t.textContent;
      var nx = c.querySelector(".mw-next"); if (nx && nx.title !== nx.textContent) nx.title = nx.textContent;
      if (!act) return;
      Array.prototype.forEach.call(act.querySelectorAll("button"), function (b) {
        if (b.__l158 || b.classList.contains("mwx-done")) return;
        b.__l158 = true;
        var tx = b.textContent.trim(), m = /^(\S+)\s+(.+)$/.exec(tx);
        if (m && /^(📅|↗)$/.test(m[1])) { b.textContent = ""; var i = el("span", null, m[1]), l = el("span", "mwx-l", " " + m[2]); b.appendChild(i); b.appendChild(l); if (!b.title) b.title = m[2]; }
      });
      if (!act.querySelector(".mwx-done")) {
        var id = c.getAttribute("data-pl-task"); if (!id) return;
        var d = el("button", "btn-g mwx-done", "✓ เสร็จ");
        d.type = "button"; d.setAttribute("data-mwx-done", id); d.title = "ทำเสร็จแล้ว — ปิดงานนี้ใน Tracker"; d.setAttribute("aria-label", "ทำเสร็จแล้ว: " + (t ? t.textContent : id));
        act.insertBefore(d, act.firstChild);
      }
    });
  }
  function tidyPlan(plan) {
    if (!plan) return;
    if (pObs) pObs.disconnect();
    try {
      Array.prototype.forEach.call(plan.querySelectorAll(".pl-tray"), function (n) { n.remove(); });
      plan.classList.toggle("mwx-help", HELP);
      var h = plan.querySelector(".pl-h");
      if (h && !h.querySelector(".mwx-help-btn")) {
        var hb = el("button", "btn-g mwx-help-btn", "❓ วิธีใช้"); hb.type = "button"; hb.title = "วิธีใช้ตารางเวลา"; hb.setAttribute("aria-pressed", String(HELP));
        var ot = h.querySelector('[data-pl-a="ot"]'); h.insertBefore(hb, ot || null);
      }
      var hb2 = plan.querySelector(".mwx-help-btn"); if (hb2) hb2.setAttribute("aria-pressed", String(HELP));
      var dt = $("plDate"), nt = plan.querySelector(".mwx-notoday");
      if (dt && dt.value && dt.value !== ymd()) {
        if (!nt && h) {
          nt = el("div", "mwx-notoday"); nt.setAttribute("role", "status");
          nt.appendChild(el("span", null, "📅 กำลังดูแผนของวันที่ " + dt.value + " (ไม่ใช่วันนี้)"));
          var tb = el("button", null, "↩ กลับวันนี้"); tb.type = "button"; tb.setAttribute("data-pl-a", "today"); nt.appendChild(tb);
          h.parentNode.insertBefore(nt, h.nextSibling);
        }
      } else if (nt) nt.remove();
    } catch (e) { diag(e); }
    finally { if (pObs) pObs.observe(plan, { childList: true }); }
  }
  function scrollNow(plan) {
    try {
      window.scrollTo(0, 0);
      var now = plan && plan.querySelector(".pl-now");
      if (now) plan.scrollTop = Math.max(0, now.getBoundingClientRect().top - plan.getBoundingClientRect().top + plan.scrollTop - 120);
    } catch (e) { diag(e); }
  }
  function applyPane(split, wrap) {
    split.classList.toggle("mwx-p-list", PANE === "list");
    split.classList.toggle("mwx-p-plan", PANE === "plan");
    Array.prototype.forEach.call(wrap.querySelectorAll(".mwx-seg button"), function (b) { b.setAttribute("aria-selected", String(b.getAttribute("data-mwx-pane") === PANE)); });
  }
  function ensureSeg(wrap, split) {
    var head = wrap.querySelector(".mw-head"); if (!head || head.querySelector(".mwx-seg")) return;
    var seg = el("div", "mwx-seg"); seg.setAttribute("role", "tablist"); seg.setAttribute("aria-label", "สลับมุมมอง");
    [["list", "📋 งานที่ต้องทำ"], ["plan", "🗓 ตารางเวลา"]].forEach(function (x) {
      var b = el("button", null, x[1]); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("data-mwx-pane", x[0]);
      b.addEventListener("click", function () { PANE = x[0]; applyPane(split, wrap); if (PANE === "plan") scrollNow($("mwPlan")); });
      seg.appendChild(b);
    });
    head.parentNode.insertBefore(seg, head.nextSibling);
  }
  function restructure() {
    var view = $("viewMyWork"); if (!view) return;
    var wrap = view.querySelector(".mw-wrap"); if (!wrap) return;
    var plan = $("mwPlan"), list = $("mwList");
    if (!wrap.querySelector(":scope > .mwx-split") && plan) {
      var split = el("div", "mwx-split"), left = el("div", "mwx-left"), right = el("div", "mwx-right");
      Array.prototype.slice.call(wrap.querySelectorAll(":scope > .mw-h2, :scope > .mw-kpis, :scope > .mw-tools, :scope > .mw-list, :scope > .mw-empty, :scope > .mw-note")).forEach(function (n) { left.appendChild(n); });
      right.appendChild(plan);
      split.appendChild(left); split.appendChild(right);
      var head = wrap.querySelector(".mw-head");
      wrap.insertBefore(split, head ? head.nextSibling : wrap.firstChild);
      ensureSeg(wrap, split);
      applyPane(split, wrap);
    }
    tidyLeft(wrap);
    tidyCards(list);
    tidyPlan(plan);
    if (pObs) pObs.disconnect();
    pObs = plan ? new MutationObserver(function () { tidyPlan(plan); }) : null;
    if (pObs) pObs.observe(plan, { childList: true });
    if (lObs) lObs.disconnect();
    lObs = list ? new MutationObserver(function () { tidyCards(list); }) : null;
    if (lObs) lObs.observe(list, { childList: true });
    if (opened) { opened = false; scrollNow(plan); }
  }

  /* ---------- ปุ่ม ✓ เสร็จ / ✎ / ❓ ---------- */
  function bind() {
    D.addEventListener("click", function (e) {
      var t = e.target; if (!t || !t.closest) return;
      var b = t.closest("[data-mwx-done]");
      if (b) {
        e.preventDefault(); e.stopPropagation();
        var id = Number(b.getAttribute("data-mwx-done"));
        if (typeof window.toggle === "function" && isFinite(id)) window.toggle(id);
        else { try { toast("⚠️ เปิดหน้าต่างปิดงานไม่ได้ — ลองกด ✓ ที่หน้า Tracker", "var(--t-dang)"); } catch (_) {} }
        return;
      }
      var hb = t.closest(".mwx-help-btn");
      if (hb) { e.preventDefault(); e.stopPropagation(); HELP = !HELP; var p = $("mwPlan"); if (p) { p.classList.toggle("mwx-help", HELP); hb.setAttribute("aria-pressed", String(HELP)); } return; }
      if (t.closest("#aNo,#aSave")) setTimeout(function () { try { window.__MY_WORK && window.__MY_WORK.refresh && window.__MY_WORK.refresh(); } catch (er) { diag(er); } }, 260);
      if (t.closest("#tabW")) opened = true;
    }, true);
  }

  /* ---------- ปุ่ม ⬆ โผล่เฉพาะตอนเลื่อนขึ้น ---------- */
  function topBtn() {
    var last = window.scrollY || 0, away = false, raf = 0;
    function set(v) { if (away === v) return; away = v; D.body.classList.toggle("mwx-top-away", v); }
    D.addEventListener("scroll", function (e) {
      var tg = e.target; if (tg && tg !== D && tg !== D.documentElement && tg !== D.body) return;
      if (raf) return;
      raf = (window.requestAnimationFrame || setTimeout)(function () {
        raf = 0;
        var y = window.scrollY || D.documentElement.scrollTop || 0, dy = y - last;
        if (y < 200) set(false); else if (dy > 10) set(true); else if (dy < -10) set(false);
        if (Math.abs(dy) > 10 || y < 200) last = y;
      });
    }, { passive: true, capture: true });
  }

  function boot() {
    var view = $("viewMyWork");
    if (!view) return false;
    injectCss();
    vObs = new MutationObserver(function (list) {
      var shown = view.style.display === "block";
      for (var i = 0; i < list.length; i++) if (list[i].type === "attributes") { if (shown && !view.__shown158) opened = true; view.__shown158 = shown; }
      restructure();
    });
    vObs.observe(view, { childList: true, attributes: true, attributeFilter: ["style"] });
    view.__shown158 = view.style.display === "block";
    restructure();
    window.QE158MyWork = Object.freeze({ version: "v158", refresh: restructure });
    return true;
  }
  function start() {
    bind(); topBtn();
    if (!boot()) { var n = 0, t = setInterval(function () { if (boot() || ++n > 80) clearInterval(t); }, 250); }
  }
  if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", start, { once: true }); else start();
})();
