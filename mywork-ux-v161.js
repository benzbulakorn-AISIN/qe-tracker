/*! QE Elec. Daily Job Tracker — mywork-ux-v161.js  (แทน mywork-ux-v158/v159/v160.js · โหลดต่อจาก core-v125.min.js · เฉพาะหน้า "📥 งานของฉัน")
    v158: รายการงาน (ซ้าย) กับตารางเวลา (ขวา) อยู่คู่กัน · ตัดแถบ "⚡ ควรวางแผน" · การ์ดงานกระชับ + ปุ่ม ✓ เสร็จ · ตัวเลขเป็นปุ่มกรอง · แท็บสลับบนจอแคบ
    v159: พักเที่ยง 12:30–13:30 (แก้ที่ LUNCH) — แถบพักในตาราง · 📅 วางแผน เลี่ยงพัก/งานอื่น · ลากวางทับพักถูกดีดออก · คลิกช่องพักไม่เพิ่มงาน (Shift = บังคับ) · "ว่าง" ไม่นับพัก
    v160: หัวตารางไม่ให้บล็อกทะลุ (ตัด padding บนของการ์ด) · ปุ่มในหัวตารางทึบเท่ากัน · ช่อง "เรียง:" อ่านครบ · ลากวางทับพัก → ช่องใกล้สุดที่ไม่ชนงานอื่น
    v161: ปุ่ม 🌙 OT และ ❓ วิธีใช้ — ตอนเลือกอยู่ มีกรอบน้ำเงินเข้มเหมือนกัน (class mwx-on · ไม่เปลี่ยนขนาดปุ่ม)
          - OT: ตรวจจากช่วงเวลาของตาราง (เกิน 16:30 = OT เปิดอยู่) หรือ class/aria ของปุ่มเดิม · กรอบอัปเดตทุกครั้งที่ core วาดตารางใหม่
          - ❓: กรอบเมื่อเปิดวิธีใช้อยู่ · ทั้งสองปุ่มใช้กรอบเดียวกันตอนกด/โฟกัสด้วย
    ย้าย/จัดเรียงองค์ประกอบเดิมเท่านั้น (ปุ่ม/ช่อง/ตัวรับเหตุการณ์ของ core ครบ) — ไม่แตะข้อมูล / key / Cloud / Backup / LINE / Teams
    ไม่มี network และไม่มี dependency ภายนอก */
(function () {
  "use strict";
  if (window.__QE161_MYWORK) return;
  window.__QE161_MYWORK = true;
  window.__QE160_MYWORK = window.__QE159_MYWORK = window.__QE158_MYWORK = true;

  /* ===== ตั้งค่าเวลาพักเที่ยง (นาทีนับจาก 00:00) · 12:30 = 750 · 13:30 = 810 ===== */
  var LUNCH = { s: 750, e: 810 };
  var NORMAL_END = 990;   // 16:30 — ตารางที่ยาวกว่านี้ = เปิด OT อยู่

  var D = document, PANE = "list", HELP = false, opened = false, pObs = null, lObs = null, vObs = null, tidyRaf = 0, bypass = false;
  var LABEL = { late: "เลยกำหนด", today: "วันนี้", soon: "≤3 วัน", nodue: "ไม่มี Due", all: "ทั้งหมด" };
  function $(id) { return D.getElementById(id); }
  function diag(e) { try { window.QE86Diagnostics && window.QE86Diagnostics.capture(e, "mywork-ux-v161"); } catch (_) {} }
  function el(tag, cls, text) { var n = D.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function say(m, c) { try { toast(m, c); } catch (_) {} }
  function p2(n) { return (n < 10 ? "0" : "") + n; }
  function hhmm(m) { return p2(Math.floor(m / 60)) + ":" + p2(m % 60); }
  function fmtH(x) { x = Math.round(x * 10) / 10; return String(x); }
  function ymd() {
    try { if (typeof today === "string" && /^\d{4}-\d{2}-\d{2}$/.test(today)) return today; } catch (_) {}
    var d = new Date();
    return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate());
  }

  /* ---------- CSS ---------- */
  var V = "#viewMyWork ";
  var ON = "#3730a3";
  var CSS = [
    V + "{padding-bottom:84px!important}",
    V + ".mwx-split{display:grid;grid-template-columns:minmax(400px,1fr) minmax(0,1.15fr);gap:16px;align-items:start;margin-top:4px}",
    V + ".mwx-left{min-width:0}",
    V + ".mwx-right{min-width:0;position:sticky;top:60px}",
    V + "#mwPlan{max-height:calc(100vh - 76px);max-height:calc(100dvh - 76px);overflow:auto;margin:0!important;padding-top:0!important}",
    /* หัวตารางเวลา: ทึบ ติดที่ขอบบนสุด */
    V + "#mwPlan .pl-h{position:sticky;top:0;z-index:40;background:var(--pop,#fff)!important;background-image:none!important;opacity:1!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;margin:0 -14px!important;padding:14px 14px 8px!important;border-bottom:1px solid var(--line,#e2e8f0);box-shadow:0 -24px 0 0 var(--pop,#fff);gap:5px!important}",
    V + "#mwPlan .pl-h #plDate{width:136px!important;min-width:0!important}",
    V + "#mwPlan .pl-h .btn-g," + V + "#mwPlan .pl-h .btn-p{padding:3px 9px!important;min-height:34px}",
    V + "#mwPlan .pl-h .btn-g," + V + "#mwPlan .pl-h .mwx-help-btn," + V + "#mwPlan .pl-h [data-pl-a=ot]," + V + "#mwPlan .pl-h [data-pl-a=today]{background:var(--pop,#fff)!important;background-image:none!important;opacity:1!important;border:1px solid var(--line,#cbd5e1)!important;color:var(--txt,#1e293b)!important;-webkit-text-fill-color:var(--txt,#1e293b)!important;box-shadow:none!important;backdrop-filter:none!important}",
    V + "#mwPlan .pl-h .btn-g:hover," + V + "#mwPlan .pl-h .mwx-help-btn:hover{border-color:" + ON + "!important}",
    /* กรอบน้ำเงินเข้มตอน "เลือกอยู่" — ❓ และ 🌙 OT ใช้เหมือนกัน (ไม่เปลี่ยนขนาดปุ่ม) */
    V + "#mwPlan .pl-h .mwx-on," + V + "#mwPlan .pl-h .btn-g:active," + V + "#mwPlan .pl-h .btn-g:focus-visible," + V + "#mwPlan .pl-h .mwx-help-btn:focus-visible{border-color:" + ON + "!important;box-shadow:inset 0 0 0 1px " + ON + "!important;outline:none!important}",
    V + "#mwPlan .pl-h .mwx-on{font-weight:800!important}",
    V + ".pl-tray{display:none!important}",
    V + ".pl-foot{display:none!important}",
    V + "#mwPlan.mwx-help .pl-foot{display:block!important}",
    V + ".mw-head{margin-bottom:6px!important}",
    /* หัวรายการ */
    V + ".mw-h2{margin:0 0 8px!important;font-size:16px!important;line-height:1.35}",
    V + ".mw-h2 small{display:none!important}",
    /* ตัวเลข → ปุ่มกรองแคปซูล */
    V + ".mw-kpis{display:flex!important;flex-wrap:wrap!important;gap:5px!important;margin:0 0 8px!important;grid-template-columns:none!important}",
    V + ".mw-kpi{display:inline-flex!important;flex-direction:row!important;align-items:center!important;gap:4px!important;width:auto!important;min-width:0!important;min-height:32px!important;padding:2px 8px!important;margin:0!important;border-radius:999px!important;border:1px solid var(--line,#cbd5e1)!important;background:var(--card,#fff)!important;color:var(--txt,#1e293b)!important;box-shadow:none!important;font:inherit;text-align:left;cursor:pointer}",
    V + ".mw-kpi::before{content:'';flex:0 0 8px;width:8px;height:8px;border-radius:50%;background:#94a3b8}",
    V + ".mw-kpi[data-f=late]::before{background:#dc2626}" + V + ".mw-kpi[data-f=today]::before{background:#f97316}" + V + ".mw-kpi[data-f=soon]::before{background:#eab308}" + V + ".mw-kpi[data-f=nodue]::before{background:#cbd5e1}" + V + ".mw-kpi[data-f=all]::before{background:#6366f1}",
    V + ".mw-kpi.on::before{background:#fff!important}",
    V + ".mw-kpi[data-f=all]{order:-1}",
    V + ".mw-kpi span{order:1;font-size:12px!important;font-weight:700!important;line-height:1.2!important;color:inherit!important;white-space:nowrap}",
    V + ".mw-kpi b{order:2;min-width:20px;padding:0 6px;border-radius:999px;background:var(--soft2,#f1f5f9);font-size:12px!important;line-height:1.55!important;text-align:center;color:inherit!important}",
    V + ".mw-kpi:hover{border-color:var(--pri,#6d28d9)!important}",
    V + ".mw-kpi.on{background:var(--pri,#6d28d9)!important;border-color:var(--pri,#6d28d9)!important;color:var(--on-pri,#fff)!important}",
    V + ".mw-kpi.on b{background:rgba(255,255,255,.25)}",
    V + ".mw-kpi.mwx-z:not(.on){opacity:.55}",
    V + ".mw-kpi:focus-visible,.mwx-seg button:focus-visible,.mwx-done:focus-visible{outline:3px solid var(--ring,#93c5fd);outline-offset:2px}",
    /* ค้นหา */
    V + ".mw-tools{display:flex!important;flex-wrap:wrap;align-items:center;gap:6px!important;margin:0 0 8px!important}",
    V + ".mw-tools #mwQ{flex:1 1 120px;min-width:0}",
    V + ".mw-tools select{flex:0 0 auto;width:auto!important;min-width:150px;max-width:190px}",
    V + ".mw-tools .btn-g{min-height:34px;padding:3px 10px;font-size:12.5px;white-space:nowrap}",
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
    V + ".mwx-help-btn{min-width:36px;min-height:34px;padding:3px 8px;font-size:14px;font-weight:700}",
    V + ".mwx-notoday{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 8px;padding:8px 12px;border:1px solid #f59e0b;border-radius:10px;background:rgba(245,158,11,.14);color:var(--txt,#1e293b);font-size:13px;font-weight:700}",
    V + ".mwx-notoday button{min-height:32px;padding:2px 12px;font-size:12.5px;font-weight:800;border-radius:8px;border:1px solid #d97706;background:#f59e0b;color:#1f1300;cursor:pointer}",
    /* แถบพักเที่ยง */
    V + ".mwx-lunch{position:absolute;left:60px;right:6px;display:flex;align-items:center;justify-content:center;gap:6px;box-sizing:border-box;border-radius:8px;border:1px dashed rgba(100,116,139,.55);background:repeating-linear-gradient(135deg,rgba(148,163,184,.20) 0 8px,rgba(148,163,184,.08) 8px 16px);color:var(--mut,#64748b);font-size:12.5px;font-weight:800;pointer-events:none}",
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
    "html body.mwx-top-away #ux33Top{opacity:0!important;pointer-events:none!important;transform:translateY(12px)!important}",
    "#ux33Top{transition:opacity .2s ease,transform .2s ease}",
    "@media print{" + V + ".mwx-seg,.mwx-notoday{display:none!important}}"
  ].join("\n");
  function injectCss() {
    if ($("qe161Css")) return;
    var st = D.createElement("style"); st.id = "qe161Css"; st.textContent = CSS; D.head.appendChild(st);
  }

  /* ---------- ข้อมูลตาราง (อ่านจาก DOM ของ core) ---------- */
  function gridInfo() {
    var plan = $("mwPlan"), grid = plan && plan.querySelector(".pl-grid");
    if (!grid || !grid.getClientRects().length) return null;
    var a = +grid.dataset.a, b = +grid.dataset.b;
    if (!isFinite(a) || !isFinite(b) || b <= a) return null;
    var row = grid.querySelector(".pl-r"), r = grid.getBoundingClientRect(), slot = row ? row.getBoundingClientRect().height : 0;
    if (!slot) slot = r.height / ((b - a) / 30);
    return { grid: grid, a: a, b: b, slot: slot, top: r.top, left: r.left };
  }
  function overlapsLunch(m, d) { return m < LUNCH.e && m + d > LUNCH.s; }
  function blockRange(g, n) {
    var r = n.getBoundingClientRect(); if (!r.height) return null;
    var s = g.a + Math.round((r.top - g.top - 1) / g.slot) * 30;
    return [s, s + Math.max(30, Math.round((r.height + 2) / g.slot) * 30)];
  }
  function busyList(g, skipEl) {
    return Array.prototype.map.call(g.grid.querySelectorAll(".pl-b"), function (n) { return n === skipEl ? null : blockRange(g, n); }).filter(Boolean);
  }
  function slotFree(g, busy, m, d) {
    if (m < g.a || m + d > g.b || overlapsLunch(m, d)) return false;
    for (var i = 0; i < busy.length; i++) if (m < busy[i][1] && m + d > busy[i][0]) return false;
    return true;
  }
  function nearestFree(g, d, m, skipEl) {
    var busy = busyList(g, skipEl);
    for (var k = 0; k <= (g.b - g.a) / 30; k++) {
      var lo = m - 30 * k, hi = m + 30 * k;
      if (slotFree(g, busy, lo, d)) return lo;
      if (k && slotFree(g, busy, hi, d)) return hi;
    }
    return null;
  }
  function firstFree(g, d) {
    var busy = busyList(g, null);
    for (var m = g.a; m + d <= g.b; m += 30) if (slotFree(g, busy, m, d)) return m;
    return null;
  }
  function yFor(g, start, kind, off) {
    return g.top + (kind === "blk" ? off + (start - g.a) / 30 * g.slot : (start - g.a) / 30 * g.slot + g.slot / 2);
  }
  function fire(target, type, x, y) {
    var ev = new DragEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
    ev.__mwx = 1; target.dispatchEvent(ev);
  }

  /* ---------- แถบพักเที่ยง + ตัวเลขว่าง ---------- */
  function ensureLunch(g) {
    if (!g) return;
    var ls = Math.max(LUNCH.s, g.a), le = Math.min(LUNCH.e, g.b), band = g.grid.querySelector(":scope > .mwx-lunch");
    if (le <= ls) { if (band) band.remove(); return; }
    if (!band) {
      band = el("div", "mwx-lunch"); band.setAttribute("aria-hidden", "true");
      band.appendChild(el("span", null, "🍽 พักเที่ยง " + hhmm(LUNCH.s) + "–" + hhmm(LUNCH.e)));
      g.grid.insertBefore(band, g.grid.firstChild);
    }
    var t = Math.round((ls - g.a) / 30 * g.slot) + "px", h = Math.round((le - ls) / 30 * g.slot) + "px";
    if (band.style.top !== t) band.style.top = t;
    if (band.style.height !== h) band.style.height = h;
  }
  function fixSum(plan, g) {
    if (!g) return;
    var tot = (g.b - g.a) - Math.max(0, Math.min(g.b, LUNCH.e) - Math.max(g.a, LUNCH.s)), totH = tot / 60;
    var w = D.createTreeWalker(plan, NodeFilter.SHOW_TEXT, null), n, meet = null, pl = null, free = null, m;
    while ((n = w.nextNode())) {
      var v = n.nodeValue;
      if ((m = /ประชุม\s*([\d.]+)\s*ชม/.exec(v))) meet = parseFloat(m[1]);
      else if ((m = /งานที่วางแผน\s*([\d.]+)\s*ชม/.exec(v))) pl = parseFloat(m[1]);
      else if (/ว่าง\s*[\d.]+\s*ชม/.test(v)) free = n;
    }
    if (free && meet != null && pl != null) {
      var f = Math.max(0, totH - meet - pl);
      var nv = free.nodeValue.replace(/ว่าง\s*[\d.]+\s*ชม\.?\s*\(จาก\s*[\d.]+\s*ชม\.?(?:\s*ไม่รวมพัก)?\)/, "ว่าง " + fmtH(f) + " ชม. (จาก " + fmtH(totH) + " ชม. ไม่รวมพัก)");
      if (nv !== free.nodeValue) free.nodeValue = nv;
    }
  }

  /* ---------- จัดโครงหน้า ---------- */
  function tidyLeft(wrap) {
    var h2 = wrap.querySelector(".mw-h2");
    if (h2 && !h2.__x161) { h2.__x161 = true; if (h2.firstChild && h2.firstChild.nodeType === 3) h2.firstChild.nodeValue = "📋 งานที่ต้องทำ"; }
    Array.prototype.forEach.call(wrap.querySelectorAll(".mw-kpi"), function (k) {
      var f = k.getAttribute("data-f"), sp = k.querySelector("span"), b = k.querySelector("b");
      if (sp && LABEL[f] && sp.textContent !== LABEL[f]) sp.textContent = LABEL[f];
      if (b) k.classList.toggle("mwx-z", String(b.textContent).trim() === "0");
    });
    var sub = wrap.querySelector(".mw-sub");
    if (sub && !sub.__x161) { sub.__x161 = true; sub.textContent = "ลากการ์ดงานจากซ้ายไปวางในตารางเวลาด้านขวา · ประชุมของฉันแสดงให้อัตโนมัติ"; }
    var q = $("mwQ"); if (q && q.placeholder !== "ค้นหางาน…") q.placeholder = "ค้นหางาน…";
    var so = wrap.querySelector(".mw-tools select");
    if (so) Array.prototype.forEach.call(so.options, function (o) {
      var t = String(o.textContent || "");
      var nt = /ความเร่งด่วน/.test(t) ? "เรียง: ความเร่งด่วน" : /Due/i.test(t) ? "เรียง: Due Date" : t;
      if (nt !== t) o.textContent = nt;
    });
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
        if (b.__l161 || b.classList.contains("mwx-done")) return;
        b.__l161 = true;
        var tx = b.textContent.trim(), m = /^(\S+)\s+(.+)$/.exec(tx);
        if (m && /^(📅|↗)$/.test(m[1])) { b.textContent = ""; b.appendChild(el("span", null, m[1])); b.appendChild(el("span", "mwx-l", " " + m[2])); if (!b.title) b.title = m[2]; }
      });
      if (!act.querySelector(".mwx-done")) {
        var id = c.getAttribute("data-pl-task"); if (!id) return;
        var d = el("button", "btn-g mwx-done", "✓ เสร็จ");
        d.type = "button"; d.setAttribute("data-mwx-done", id); d.title = "ทำเสร็จแล้ว — ปิดงานนี้ใน Tracker"; d.setAttribute("aria-label", "ทำเสร็จแล้ว: " + (t ? t.textContent : id));
        act.insertBefore(d, act.firstChild);
      }
    });
  }
  /* สถานะ "เลือกอยู่" ของปุ่ม OT / ❓ → กรอบน้ำเงินเข้มเหมือนกัน */
  function markOn(btn, on) {
    if (!btn) return;
    if (btn.classList.contains("mwx-on") !== !!on) btn.classList.toggle("mwx-on", !!on);
    if (btn.getAttribute("aria-pressed") !== String(!!on)) btn.setAttribute("aria-pressed", String(!!on));
  }
  function otIsOn(btn, g) {
    if (!btn) return false;
    if (g && g.b > NORMAL_END) return true;
    if (btn.getAttribute("aria-pressed") === "true" || btn.getAttribute("aria-checked") === "true") return true;
    return /(^|[\s_-])(on|active|act|sel|selected|is-on|is-active|checked)([\s_-]|$)/.test(btn.className.replace(/\bmwx-on\b/, ""));
  }
  function tidyPlan(plan) {
    if (!plan) return;
    if (pObs) pObs.disconnect();
    try {
      Array.prototype.forEach.call(plan.querySelectorAll(".pl-tray"), function (n) { n.remove(); });
      plan.classList.toggle("mwx-help", HELP);
      var h = plan.querySelector(".pl-h");
      if (h && !h.querySelector(".mwx-help-btn")) {
        var hb = el("button", "btn-g mwx-help-btn", "❓"); hb.type = "button"; hb.title = "วิธีใช้ตารางเวลา"; hb.setAttribute("aria-label", "วิธีใช้ตารางเวลา"); hb.setAttribute("aria-pressed", String(HELP));
        var ot0 = h.querySelector('[data-pl-a="ot"]'); h.insertBefore(hb, ot0 || null);
      }
      var g = gridInfo();
      markOn(plan.querySelector(".mwx-help-btn"), HELP);
      markOn(plan.querySelector('[data-pl-a="ot"]'), otIsOn(plan.querySelector('[data-pl-a="ot"]'), g));
      var dt = $("plDate"), nt = plan.querySelector(".mwx-notoday");
      if (dt && dt.value && dt.value !== ymd()) {
        if (!nt && h) {
          nt = el("div", "mwx-notoday"); nt.setAttribute("role", "status");
          nt.appendChild(el("span", null, "📅 กำลังดูแผนของวันที่ " + dt.value + " (ไม่ใช่วันนี้)"));
          var tb = el("button", null, "↩ กลับวันนี้"); tb.type = "button"; tb.setAttribute("data-pl-a", "today"); nt.appendChild(tb);
          h.parentNode.insertBefore(nt, h.nextSibling);
        }
      } else if (nt) nt.remove();
      ensureLunch(g); fixSum(plan, g);
    } catch (e) { diag(e); }
    finally { if (pObs) pObs.observe(plan, { childList: true, subtree: true }); }
  }
  function scheduleTidy() {
    if (tidyRaf) return;
    tidyRaf = (window.requestAnimationFrame || setTimeout)(function () { tidyRaf = 0; tidyPlan($("mwPlan")); });
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
    var head = wrap.querySelector(".mw-head"); if (!head || head.querySelector(".mwx-seg") || wrap.querySelector(":scope > .mwx-seg")) return;
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
    pObs = plan ? new MutationObserver(scheduleTidy) : null;
    if (pObs) pObs.observe(plan, { childList: true, subtree: true });
    if (lObs) lObs.disconnect();
    lObs = list ? new MutationObserver(function () { tidyCards(list); }) : null;
    if (lObs) lObs.observe(list, { childList: true });
    if (opened) { opened = false; scrollNow(plan); }
  }

  /* ---------- การทำงานของปุ่ม / ลากวาง / พักเที่ยง ---------- */
  var DR = null;
  function bind() {
    D.addEventListener("click", function (e) {
      var t = e.target; if (!t || !t.closest) return;
      var b = t.closest("[data-mwx-done]");
      if (b) {
        e.preventDefault(); e.stopPropagation();
        var id = Number(b.getAttribute("data-mwx-done"));
        if (typeof window.toggle === "function" && isFinite(id)) window.toggle(id);
        else say("⚠️ เปิดหน้าต่างปิดงานไม่ได้ — ลองกด ✓ ที่หน้า Tracker", "var(--t-dang)");
        return;
      }
      var hb = t.closest(".mwx-help-btn");
      if (hb) { e.preventDefault(); e.stopPropagation(); HELP = !HELP; var p = $("mwPlan"); if (p) { p.classList.toggle("mwx-help", HELP); markOn(hb, HELP); } return; }
      if (t.closest('#viewMyWork [data-pl-a="ot"]')) { setTimeout(scheduleTidy, 60); setTimeout(scheduleTidy, 350); }
      if (t.closest("#aNo,#aSave")) setTimeout(function () { try { window.QE161MyWork && window.QE161MyWork.refresh(); } catch (er) { diag(er); } }, 260);
      if (t.closest("#tabW")) opened = true;
    }, true);

    /* ปุ่ม 📅 วางแผน → ช่องว่างแรกที่ไม่ชนอะไร และไม่ชนพักเที่ยง */
    D.addEventListener("click", function (e) {
      if (bypass) return;
      var btn = e.target && e.target.closest && e.target.closest("[data-pl-add],[data-pl-quick]");
      if (!btn || !$("viewMyWork") || !$("viewMyWork").contains(btn)) return;
      if (/\b\d{1,2}:\d{2}\b/.test(btn.textContent || "")) return;
      var card = btn.closest("[data-pl-task]"), g = gridInfo();
      if (!card || !g || typeof DragEvent !== "function") return;
      var m = firstFree(g, 60);
      if (m == null) return;
      e.preventDefault(); e.stopImmediatePropagation();
      var before = g.grid.querySelectorAll(".pl-b").length, txt0 = btn.textContent;
      try {
        var x = g.left + 120, y = yFor(g, m, "task", 0);
        fire(card, "dragstart", x, y);
        fire(g.grid, "drop", x, y);
        fire(card, "dragend", x, y);
      } catch (er) { diag(er); }
      setTimeout(function () {
        var g2 = gridInfo(), n2 = g2 ? g2.grid.querySelectorAll(".pl-b").length : before;
        var changed = n2 !== before || (card.isConnected && /\b\d{1,2}:\d{2}\b/.test(card.textContent || "")) || !card.isConnected;
        if (!changed && btn.isConnected && btn.textContent === txt0) { bypass = true; try { btn.click(); } finally { bypass = false; } }
      }, 320);
    }, true);

    D.addEventListener("dragstart", function (e) {
      var t = e.target; if (e.__mwx || !t || !t.closest) return;
      var blk = t.closest("[data-pl-blk]"), task = !blk && t.closest("[data-pl-task]");
      if (blk) { var r = blk.getBoundingClientRect(); DR = { k: "blk", off: e.clientY - r.top, hpx: r.height, el: blk }; }
      else if (task) DR = { k: "task", off: 0, hpx: 0 };
      else DR = null;
    }, true);
    D.addEventListener("dragend", function (e) { if (!e.__mwx) DR = null; }, true);

    /* ลากวางทับพักเที่ยง → ดีดไปช่องใกล้สุดที่ไม่ชนอะไร */
    D.addEventListener("drop", function (e) {
      if (e.__mwx || !DR) return;
      var t = e.target; if (!t || !t.closest || !t.closest(".pl-grid")) return;
      var g = gridInfo(); if (!g) return;
      var d = DR.k === "blk" ? Math.max(30, Math.round((DR.hpx + 2) / g.slot) * 30) : 60;
      var r = e.clientY - g.top - (DR.k === "blk" ? DR.off : 0);
      var m = g.a + 30 * (DR.k === "blk" ? Math.round(r / g.slot) : Math.floor(r / g.slot));
      m = Math.max(g.a, Math.min(m, Math.max(g.a, g.b - d)));
      if (!overlapsLunch(m, d)) return;
      var best = nearestFree(g, d, m, DR.k === "blk" ? DR.el : null);
      if (best == null) return;
      e.preventDefault(); e.stopImmediatePropagation();
      fire(t, "drop", e.clientX, yFor(g, best, DR.k, DR.off));
      say("🍽 เลี่ยงช่วงพักเที่ยง " + hhmm(LUNCH.s) + "–" + hhmm(LUNCH.e) + " → ย้ายไปเริ่ม " + hhmm(best), "var(--t-warn)");
    }, true);

    /* คลิกช่องว่างในช่วงพัก → ไม่เพิ่มงาน (Shift = บังคับเพิ่ม) */
    D.addEventListener("click", function (e) {
      var t = e.target; if (!t || !t.closest || e.shiftKey) return;
      var row = t.closest(".pl-r[data-s]"); if (!row || t.closest(".pl-b,[data-pl-del],[data-pl-dur],[data-pl-ck]")) return;
      var s = +row.getAttribute("data-s");
      if (s >= LUNCH.s && s < LUNCH.e) {
        e.preventDefault(); e.stopImmediatePropagation();
        say("🍽 ช่วงพักเที่ยง " + hhmm(LUNCH.s) + "–" + hhmm(LUNCH.e) + " — ไม่เพิ่มงาน (กด Shift ค้างตอนคลิก หรือใช้ ➕ เพิ่มงาน ถ้าจำเป็น)", "var(--t-warn)");
      }
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
      for (var i = 0; i < list.length; i++) if (list[i].type === "attributes") { if (shown && !view.__shown161) opened = true; view.__shown161 = shown; }
      restructure();
    });
    vObs.observe(view, { childList: true, attributes: true, attributeFilter: ["style"] });
    view.__shown161 = view.style.display === "block";
    window.addEventListener("resize", function () { scheduleTidy(); });
    restructure();
    window.QE161MyWork = Object.freeze({ version: "v161", refresh: restructure, lunch: function () { return { s: LUNCH.s, e: LUNCH.e }; } });
    return true;
  }
  function start() {
    bind(); topBtn();
    if (!boot()) { var n = 0, t = setInterval(function () { if (boot() || ++n > 80) clearInterval(t); }, 250); }
  }
  if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", start, { once: true }); else start();
})();
