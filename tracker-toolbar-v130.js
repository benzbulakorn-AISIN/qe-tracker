/*! QE Elec. Daily Job Tracker — tracker-toolbar-v130.js  (แทน v126–v129)
    v130: • Auto-backup "เลือก…": แสดงผลทุกกรณี (รวมกดยกเลิก / Chrome ไม่ยอมเปิดโฟลเดอร์) + ชื่อ error จริง เพื่อวินิจฉัย
    UX/UI refactor: Toolbar หน้า Tracker แบบ Progressive Disclosure ("น้อยแต่มาก")
    v127: • ตัดรายการใน "••• เพิ่มเติม" ที่ซ้ำกับเมนู "เครื่องมือ" — ปุ่มเดิมยังอยู่ใน DOM (ซ่อน) ฟีเจอร์ไม่หาย
          • Auto-backup "เลือก…": แจ้งสาเหตุภาษาไทยเมื่อเลือกโฟลเดอร์ไม่ได้ + ไม่ดึง focus ออกจาก modal
    v128: • ป้ายเวอร์ชันใน Sidebar แสดงเวอร์ชันของไฟล์นี้
    v129: • แก้ regression จาก v126: แถบ #bkBar ถูกซ่อน ทำให้มองไม่เห็นปุ่ม "อนุญาต" (#grantBtn) ของ Auto-backup
            หลังเปิดเบราว์เซอร์ใหม่ → Auto-backup เขียนไฟล์ไม่ได้
            ตอนนี้: ถ้ามี #grantBtn จะแสดง #bkBar ตามเดิม + ปุ่มสถานะเป็น "🔐 Auto-backup รออนุญาต" + มีปุ่มอนุญาตในเมนูสำรองข้อมูล
    ไม่แตะ: business logic, localStorage, Cloud Sync, Backup schema, Auth/Role/RLS, LINE/Teams, Scheduled Summary, Trash
    ไม่มี network และไม่มี dependency ภายนอก */
(function () {
  "use strict";
  if (window.__QE126_TOOLBAR) return;
  window.__QE126_TOOLBAR = true;

  var D = document, VER = "v130";
  var FOCUSABLE = 'button:not([disabled]):not([hidden]),select:not([disabled]),input:not([type="hidden"]):not([type="file"]):not([disabled]),a[href],[tabindex]:not([tabindex="-1"])';
  var WATCH = { q: 1, fStatus: 1, fOwner: 1, fDate: 1, fFlag: 1, fMonth: 1, fYear: 1, fMBasis: 1 };
  var MY_IDS = ["qe126FltBtn", "qe126FltPop", "qe126MonBtn", "qe126MonPop", "qe126SafeBtn", "qe126SafePop",
    "qe126MoreBtn", "qe126MorePop", "qe126Chips", "qe126Sum", "qe126ImpBar", "qe126Park"];
  var PARK_IDS = ["bkBtn", "rsBtn", "abBtn", "lnBtn", "trBtn", "thBtn"];
  var DUP_EXTRA = /^\s*(···|\.\.\.|…)?\s*อื่น\s*ๆ/;
  var HOME = {};
  var S = { tools: null, view: null, open: null, raf: 0, chipSig: null, bkTime: "", bkClickAt: 0,
    lastWarn: null, zone: null, impbar: null, pending: false, moves: 0, movesAt: 0, pickCalled: false };

  function $(id) { return D.getElementById(id); }
  function diag(e, c) { try { window.QE86Diagnostics && window.QE86Diagnostics.capture(e, c || "toolbar-v130"); } catch (_) {} }
  function el(tag, cls, text) { var n = D.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function btn(cls, text, id) { var b = el("button", cls, text); b.type = "button"; if (id) b.id = id; return b; }
  function selText(s) { var o = s && s.options && s.options[s.selectedIndex]; return o ? String(o.text || "").trim() : ""; }
  function clip(t, n) { t = String(t || ""); return t.length > n ? t.slice(0, n - 1) + "…" : t; }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function visible(n) {
    if (!n || n.hidden) return false;
    try { return getComputedStyle(n).display !== "none"; } catch (_) { return true; }
  }
  function each(list, fn) { Array.prototype.forEach.call(list || [], fn); }
  function modalOpen() {
    return Array.prototype.some.call(D.querySelectorAll(".ov,[role=dialog],dialog[open]"), function (m) {
      if (m.closest && m.closest(".qe126-tb")) return false;
      try { var cs = getComputedStyle(m); return cs.display !== "none" && cs.visibility !== "hidden" && m.getClientRects().length > 0; }
      catch (_) { return false; }
    });
  }

  /* ---------- CSS ---------- */
  var CSS = [
    "#viewTracker .tools.qe126-tb{display:flex!important;flex-direction:column!important;align-items:stretch!important;flex-wrap:nowrap!important;gap:8px!important;min-width:0;max-width:100%}",
    ".qe126-tb>.qe126-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px;min-width:0;max-width:100%;margin:0}",
    ".qe126-park{display:none!important}",
    ".qe126-row1>#q{flex:1 1 260px!important;min-width:0!important;width:auto!important;max-width:none!important;margin:0!important}",
    ".qe126-row1>select{flex:0 1 190px!important;min-width:130px!important;width:auto!important;margin:0!important}",
    ".qe126-row2{gap:6px 10px!important}",
    ".qe126-grow{flex:1 1 auto}",
    ".qe126-wrap{position:relative;display:inline-flex;max-width:100%}",
    ".qe126-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:40px;padding:6px 14px;border-radius:10px;border:1px solid var(--line,#cbd5e1);background:var(--card,#fff);color:var(--txt,#1e293b);font:inherit;font-size:14px;font-weight:700;line-height:1.2;cursor:pointer;white-space:nowrap;box-shadow:none;max-width:100%}",
    ".qe126-btn:hover{border-color:var(--pri,#7c3aed)}",
    ".qe126-btn[aria-expanded=\"true\"]{border-color:var(--pri,#7c3aed);background:color-mix(in srgb,var(--pri,#7c3aed) 12%,var(--card,#fff))}",
    ".qe126-badge{display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 6px;border-radius:99px;background:var(--pri,#7c3aed);color:var(--on-pri,#fff);font-size:12px;font-weight:800}",
    ".qe126-pop{position:absolute;top:calc(100% + 6px);left:0;z-index:70;width:max-content;min-width:250px;max-width:min(360px,calc(100vw - 24px));padding:10px;border:1px solid var(--line,#cbd5e1);border-radius:14px;background:var(--pop,var(--card,#fff));color:var(--txt,#1e293b);box-shadow:0 14px 36px rgba(15,23,42,.24);text-align:left}",
    ".qe126-pop.r,.qe126-pop.qe126-flip{left:auto;right:0}",
    ".qe126-pop[hidden],.qe126-grp[hidden],.qe126-impbar[hidden],.qe126-chips[hidden],.qe126-badge[hidden],.qe126-sum[hidden],.qe126-pop [hidden]{display:none!important}",
    ".qe126-grp{display:flex;flex-direction:column;gap:2px}",
    ".qe126-grp+.qe126-grp{margin-top:10px}",
    ".qe126-gt{padding:2px 12px 4px;font-size:12px;font-weight:800;color:var(--mut,#64748b);letter-spacing:.2px}",
    ".qe126-xtra{display:contents}",
    ".qe126-pop .qe126-grp>button,.qe126-pop .qe126-grp>a,.qe126-pop .qe126-xtra>button{display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:8px;width:100%!important;min-height:40px!important;margin:0!important;padding:8px 12px!important;border:0!important;border-radius:9px!important;background:transparent!important;color:var(--txt,#1e293b)!important;font:inherit!important;font-size:14px!important;font-weight:600!important;text-align:left!important;box-shadow:none!important;cursor:pointer;white-space:nowrap;animation:none!important}",
    ".qe126-pop .qe126-grp>button:hover,.qe126-pop .qe126-xtra>button:hover{background:color-mix(in srgb,var(--pri,#7c3aed) 10%,transparent)!important}",
    ".qe126-pop .qe126-grp>button:disabled{opacity:.45;cursor:not-allowed}",
    ".qe126-pop .qe126-grp>.qe126-danger{color:var(--t-dang,#b91c1c)!important}",
    ".qe126-pop .qe126-grp>.qe126-primary{background:var(--pri,#7c3aed)!important;color:var(--on-pri,#fff)!important;font-weight:800!important}",
    ".qe126-note{padding:2px 12px 8px;font-size:12.5px;line-height:1.5;color:var(--mut,#64748b);white-space:normal;max-width:300px}",
    ".qe126-field{display:flex;flex-direction:column;gap:4px;margin:0 0 10px}",
    ".qe126-field label{margin:0;font-size:12.5px;font-weight:800;color:var(--mut,#64748b)}",
    ".qe126-field select{width:100%!important;min-height:40px;margin:0!important}",
    ".qe126-done{display:flex;align-items:center;justify-content:center;width:100%;min-height:40px;border:0;border-radius:10px;background:var(--pri,#7c3aed);color:var(--on-pri,#fff);font:inherit;font-size:14px;font-weight:800;cursor:pointer}",
    "#mfBox.qe126-nav{display:inline-flex!important;flex-wrap:wrap;align-items:center;gap:4px!important;padding:0!important;margin:0!important;border:0!important;background:transparent!important;box-shadow:none!important;max-width:100%}",
    "#mfBox.qe126-nav>#mfPrev,#mfBox.qe126-nav>#mfNext{display:inline-flex;align-items:center;justify-content:center;min-width:40px;min-height:40px;padding:0!important;border-radius:50%!important}",
    "#mfBox.qe126-nav>#mfNow{min-height:40px;padding:6px 14px!important;border-radius:99px!important}",
    ".qe126-mlab{border-color:transparent!important;background:transparent!important;font-size:16px!important;font-weight:800!important;padding:6px 8px!important}",
    ".qe126-mlab .t{max-width:46vw;overflow:hidden;text-overflow:ellipsis}",
    ".qe126-chev{font-size:11px;opacity:.6}",
    ".qe126-sum{font-size:13px;font-weight:600;color:var(--mut,#64748b);white-space:nowrap}",
    ".qe126-sr{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;clip-path:inset(50%)!important;white-space:nowrap!important;border:0!important}",
    ".qe126-bk{border-radius:99px!important;min-height:36px!important;padding:5px 12px!important;font-size:13px!important;background:transparent!important}",
    ".qe126-bk.ok{color:var(--t-ok,#15803d)!important;border-color:transparent!important}",
    ".qe126-bk.warn{color:var(--t-warn,#b45309)!important;border-color:color-mix(in srgb,var(--warn,#f59e0b) 60%,transparent)!important;background:color-mix(in srgb,var(--warn,#f59e0b) 12%,transparent)!important}",
    ".qe126-chips{display:flex;flex-wrap:wrap;align-items:center;gap:6px;min-width:0}",
    ".qe126-ct{font-size:12.5px;font-weight:700;color:var(--mut,#64748b)}",
    ".qe126-chiplist{display:contents}",
    ".qe126-chip{display:inline-flex;align-items:center;gap:6px;min-height:32px;max-width:100%;padding:3px 5px 3px 12px;border:1px solid color-mix(in srgb,var(--pri,#7c3aed) 45%,transparent);border-radius:99px;background:color-mix(in srgb,var(--pri,#7c3aed) 10%,transparent);color:var(--txt,#1e293b);font:inherit;font-size:13px;font-weight:700;cursor:pointer}",
    ".qe126-chip>span:first-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
    ".qe126-chip .x{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;width:22px;height:22px;border-radius:50%;font-size:11px;background:color-mix(in srgb,var(--pri,#7c3aed) 18%,transparent)}",
    ".qe126-chip:hover .x{background:var(--pri,#7c3aed);color:var(--on-pri,#fff)}",
    ".qe126-chips #clearBtn{min-height:32px;padding:3px 10px!important;border:0!important;background:transparent!important;box-shadow:none!important;color:var(--pri,#7c3aed)!important;font-size:13px!important;font-weight:700!important;text-decoration:underline;text-underline-offset:3px}",
    "#thDate .qe126-off,#thDue .qe126-off{opacity:0;transition:opacity .15s}",
    "#thDate:hover .qe126-off,#thDue:hover .qe126-off,#thDate:focus-visible .qe126-off,#thDue:focus-visible .qe126-off{opacity:.5}",
    ".qe126-tb :focus-visible,.qe126-impbar :focus-visible,#thDate:focus-visible,#thDue:focus-visible{outline:3px solid var(--ring,#93c5fd)!important;outline-offset:2px!important}",
    ".qe126-zone-off{display:none!important}",
    ".qe126-impbar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:6px 0 4px;font-size:14px;font-weight:700;color:var(--txt,#1e293b)}",
    ".qe126-sm{min-height:36px!important;font-size:13px!important;padding:4px 12px!important}",
    ".qe127-abmsg{margin:8px 0 0;padding:10px 12px;border-radius:10px;font-size:13px;line-height:1.55;white-space:pre-line;border:1px solid color-mix(in srgb,var(--warn,#f59e0b) 60%,transparent);background:color-mix(in srgb,var(--warn,#f59e0b) 12%,transparent);color:var(--txt,#1e293b)}",
    ".qe127-abmsg.ok{border-color:color-mix(in srgb,#16a34a 50%,transparent);background:color-mix(in srgb,#16a34a 10%,transparent)}",
    ".qe127-abmsg[hidden]{display:none!important}",
    "@media (max-width:700px){",
    ".qe126-row1>#q{flex:1 1 100%!important}",
    ".qe126-row1>select{flex:1 1 calc(50% - 4px)!important;min-width:0!important}",
    ".qe126-row1>.qe126-wrap{flex:1 1 100%}.qe126-row1>.qe126-wrap>.qe126-btn{width:100%}",
    ".qe126-btn,.qe126-chip,.qe126-done,.qe126-chips #clearBtn,.qe126-row1>select,.qe126-row1>#q,#mfBox.qe126-nav>#mfNow{min-height:44px!important}",
    "#mfBox.qe126-nav>#mfPrev,#mfBox.qe126-nav>#mfNext{min-width:44px;min-height:44px}",
    ".qe126-pop,.qe126-pop.r,.qe126-pop.qe126-flip{position:fixed;left:12px;right:12px;top:auto;bottom:12px;width:auto;min-width:0;max-width:none;max-height:72vh;overflow:auto;z-index:10045}",
    ".qe126-pop .qe126-grp>button,.qe126-pop .qe126-xtra>button,.qe126-field select{min-height:44px!important}",
    ".qe126-row2 .qe126-grow{display:none}",
    "}",
    "@media print{.qe126-pop,.qe126-row1>.qe126-wrap,.qe126-row2 .qe126-wrap,.qe126-impbar,.qe126-chips button{display:none!important}}",
    "@media (prefers-reduced-motion:reduce){#thDate .qe126-off,#thDue .qe126-off{transition:none}}"
  ].join("\n");

  function injectCss() {
    if ($("qe126Css")) return;
    var st = el("style"); st.id = "qe126Css"; st.textContent = CSS; D.head.appendChild(st);
  }

  /* ---------- building blocks ---------- */
  function disclosure(key, text, label, extraCls) {
    var wrap = el("div", "qe126-wrap");
    var b = btn("qe126-btn " + (extraCls || ""), null, "qe126" + key + "Btn");
    var t = el("span", "t", text); b.appendChild(t);
    var pop = el("div", "qe126-pop"); pop.id = "qe126" + key + "Pop"; pop.hidden = true;
    pop.setAttribute("role", "group"); pop.setAttribute("aria-label", label);
    b.setAttribute("aria-expanded", "false"); b.setAttribute("aria-controls", pop.id);
    b.addEventListener("click", function () {
      if (S.open && S.open.pop === pop) closeAll(true); else openPop(b, pop);
    });
    wrap.appendChild(b); wrap.appendChild(pop);
    return { wrap: wrap, btn: b, pop: pop, t: t };
  }
  function group(title) {
    var g = el("div", "qe126-grp"); g.setAttribute("role", "group"); g.setAttribute("aria-label", title);
    var h = el("div", "qe126-gt", title); h.setAttribute("aria-hidden", "true"); g.appendChild(h);
    return g;
  }
  function field(text, ctrl) {
    var f = el("div", "qe126-field"); var l = el("label", null, text); l.htmlFor = ctrl.id;
    f.appendChild(l); f.appendChild(ctrl); return f;
  }
  function doneBtn() {
    var b = btn("qe126-done", "✓ ตกลง"); b.addEventListener("click", function () { closeAll(true); }); return b;
  }
  function put(id, box, ref) {
    var n = $(id); if (!n) return null;
    HOME[id] = { box: box, ref: ref || null };
    box.insertBefore(n, ref || null);
    n.classList.add("qe126-moved");
    return n;
  }
  function proxy(text, targetId, cls, opener) {
    var b = btn("qe126-item " + (cls || ""), text);
    b.setAttribute("data-qe126-for", targetId);
    b.addEventListener("click", function () {
      var t = $(targetId);
      closeAll(false);
      if (t && !t.disabled) t.click();
      refocus(opener);
    });
    return b;
  }

  /* ---------- popover open / close ---------- */
  function openPop(b, pop) {
    closeAll(false);
    pop.hidden = false; b.setAttribute("aria-expanded", "true");
    S.open = { btn: b, pop: pop };
    syncPop(pop); place(pop);
    var f = pop.querySelector(FOCUSABLE);
    if (f) try { f.focus({ preventScroll: true }); } catch (_) { f.focus(); }
  }
  function closeAll(returnFocus) {
    if (!S.open) return;
    var o = S.open; S.open = null;
    o.pop.hidden = true; o.btn.setAttribute("aria-expanded", "false");
    if (returnFocus) try { o.btn.focus({ preventScroll: true }); } catch (_) { o.btn.focus(); }
  }
  function refocus(opener) {
    if (!opener) return;
    setTimeout(function () {
      if (modalOpen()) return;
      var a = D.activeElement;
      if (!a || a === D.body || (a.closest && a.closest(".qe126-pop[hidden]"))) {
        try { opener.focus({ preventScroll: true }); } catch (_) {}
      }
    }, 120);
  }
  function place(pop) {
    if (window.matchMedia && window.matchMedia("(max-width:700px)").matches) return;
    pop.classList.remove("qe126-flip");
    if (pop.classList.contains("r")) return;
    var r = pop.getBoundingClientRect();
    if (r.right > (window.innerWidth || D.documentElement.clientWidth) - 8) pop.classList.add("qe126-flip");
  }
  function syncPop(pop) {
    each(pop.querySelectorAll("[data-qe126-for]"), function (p) {
      var t = $(p.getAttribute("data-qe126-for"));
      p.disabled = !t || !!t.disabled;
      p.hidden = !t || !visible(t);
    });
    if (S.zoneItem) S.zoneItem.hidden = !S.zone;
    each(pop.querySelectorAll(".qe126-grp"), function (g) {
      g.hidden = false;
      var any = Array.prototype.some.call(g.querySelectorAll("button,a,select"), function (n) { return visible(n); });
      g.hidden = !any;
    });
  }

  /* ---------- build ---------- */
  function build() {
    var view = $("viewTracker"), tools = view && view.querySelector(".tools");
    if (!tools || !$("q") || !$("mfBox") || !$("fMonth") || !$("fYear")) return false;
    if (tools.classList.contains("qe126-tb")) return true;
    for (var i = 0; i < MY_IDS.length; i++) {
      if ($(MY_IDS[i])) { diag(new Error("toolbar130: duplicate id " + MY_IDS[i])); return true; }
    }
    injectCss();
    S.view = view; S.tools = tools;
    tools.classList.add("qe126-tb");

    var r1 = el("div", "qe126-row qe126-row1");
    r1.setAttribute("role", "search"); r1.setAttribute("aria-label", "ค้นหาและกรองงาน");
    var r2 = el("div", "qe126-row qe126-row2");
    var chips = el("div", "qe126-chips"); chips.id = "qe126Chips"; chips.hidden = true;
    var park = el("div", "qe126-park"); park.id = "qe126Park"; park.setAttribute("aria-hidden", "true");
    tools.insertBefore(park, tools.firstChild);
    tools.insertBefore(chips, park);
    tools.insertBefore(r2, chips);
    tools.insertBefore(r1, r2);
    S.park = park;

    /* แถว 1 */
    var flt = disclosure("Flt", "☰ ตัวกรอง", "ตัวกรองเพิ่มเติม");
    S.flt = flt;
    S.fltBadge = el("span", "qe126-badge"); S.fltBadge.hidden = true; S.fltBadge.setAttribute("aria-hidden", "true");
    flt.btn.appendChild(S.fltBadge);
    r1.appendChild(flt.wrap);
    put("q", r1, flt.wrap); put("fStatus", r1, flt.wrap); put("fOwner", r1, flt.wrap);
    if (!$("q").getAttribute("aria-label")) $("q").setAttribute("aria-label", "ค้นหางาน");
    if ($("fDate")) { var fd = field("วันที่", $("fDate")); flt.pop.appendChild(fd); HOME.fDate = { box: fd, ref: null }; }
    if ($("fFlag")) { var ff = field("แสดงเฉพาะ", $("fFlag")); flt.pop.appendChild(ff); HOME.fFlag = { box: ff, ref: null }; }
    flt.pop.appendChild(doneBtn());

    /* แถว 2 */
    var mf = $("mfBox"); mf.classList.add("qe126-nav");
    var mon = disclosure("Mon", "", "เลือกเดือนและปี", "qe126-mlab");
    S.mon = mon;
    var chev = el("span", "qe126-chev", "▾"); chev.setAttribute("aria-hidden", "true"); mon.btn.appendChild(chev);
    mf.insertBefore(mon.wrap, $("fMonth"));
    var fmF = field("เดือน", $("fMonth")), fyF = field("ปี (พ.ศ.)", $("fYear"));
    mon.pop.appendChild(fmF); mon.pop.appendChild(fyF);
    HOME.fMonth = { box: fmF, ref: null }; HOME.fYear = { box: fyF, ref: null };
    if ($("fMBasis")) { var fbF = field("นับเดือนตาม", $("fMBasis")); mon.pop.appendChild(fbF); HOME.fMBasis = { box: fbF, ref: null }; }
    mon.pop.appendChild(doneBtn());
    if ($("mfInfo")) $("mfInfo").classList.add("qe126-sr");
    r2.appendChild(mf); HOME.mfBox = { box: r2, ref: null };
    S.sum = el("span", "qe126-sum"); S.sum.id = "qe126Sum"; S.sum.setAttribute("aria-hidden", "true");
    r2.appendChild(S.sum);
    r2.appendChild(el("span", "qe126-grow"));

    var more = disclosure("More", "••• เพิ่มเติม", "เครื่องมือเพิ่มเติม");
    more.pop.classList.add("r");
    S.more = more;

    var safe = disclosure("Safe", "", "สำรองข้อมูล", "qe126-bk");
    safe.pop.classList.add("r");
    S.safe = safe;
    S.safeNote = el("div", "qe126-note");
    var sg = group("สำรองข้อมูล");
    sg.appendChild(S.safeNote);
    /* v129: ปุ่มเดิม #grantBtn ถูกสร้างใน #bkBar โดย checkBackup() เมื่อ Auto-backup รอสิทธิ์ */
    sg.appendChild(proxy("🔐 อนุญาตให้ Auto-backup เขียนโฟลเดอร์", "grantBtn", "qe126-primary", safe.btn));
    sg.appendChild(proxy("💾 สำรองตอนนี้", "bkBtn", "", safe.btn));
    sg.appendChild(proxy("📂 กู้คืนข้อมูล", "rsBtn", "qe126-danger", safe.btn));
    sg.appendChild(proxy("⚙️ ตั้ง Auto-backup", "abBtn", "", safe.btn));
    safe.pop.appendChild(sg);
    r2.appendChild(safe.wrap);
    r2.appendChild(more.wrap);

    var gData = group("ข้อมูล"), gShare = group("แชร์");
    put("csvBtn", gData); put("qiBtn", gData);
    S.zoneItem = btn("qe126-item", "🗂 เปิดช่องลากวางไฟล์ Excel / CSV");
    S.zoneItem.hidden = true;
    S.zoneItem.addEventListener("click", function () { closeAll(false); expandZone(true); });
    gData.appendChild(S.zoneItem);
    put("tmBtn", gShare);
    var gOther = group("อื่น ๆ");
    S.sysExtra = el("div", "qe126-xtra"); gOther.appendChild(S.sysExtra);
    more.pop.appendChild(gData); more.pop.appendChild(gShare); more.pop.appendChild(gOther);
    more.pop.addEventListener("click", function (e) {
      var b = e.target && e.target.closest && e.target.closest("button,a");
      if (!b || b.hasAttribute("data-qe126-for") || b === S.zoneItem) return;
      setTimeout(function () { if (S.open && S.open.pop === more.pop) closeAll(false); refocus(more.btn); }, 0);
    }, true);

    PARK_IDS.forEach(function (id) { put(id, park); });

    chips.setAttribute("role", "group"); chips.setAttribute("aria-label", "ตัวกรองที่ใช้อยู่");
    chips.appendChild(el("span", "qe126-ct", "กำลังกรอง:"));
    S.chipList = el("span", "qe126-chiplist"); chips.appendChild(S.chipList);
    put("clearBtn", chips);
    if ($("clearBtn")) { $("clearBtn").textContent = "ล้างทั้งหมด"; $("clearBtn").setAttribute("aria-label", "ล้างตัวกรองทั้งหมด"); }
    S.chips = chips;

    var bk = $("bkBtn");
    if (bk) bk.addEventListener("click", function () { S.bkClickAt = Date.now(); });

    setupSort();
    sweep();
    zoneCheck();
    return true;
  }

  /* ---------- runtime-injected elements ---------- */
  function isZone(n) {
    return !!n && n.nodeType === 1 && !n.matches("button,a") && !n.classList.contains("qe126-row") &&
      n.id !== "qe126Chips" && n.id !== "qe126ImpBar" && n.id !== "qe126Park" && /Smart Import/i.test(n.textContent || "");
  }
  function sweep() {
    if (!S.tools || !S.sysExtra) return;
    each(Array.prototype.slice.call(S.tools.children), function (n) {
      if (n.classList.contains("qe126-row") || n.id === "qe126Chips" || n.id === "qe126Park") return;
      if (/^(INPUT|SCRIPT|STYLE|DATALIST|TEMPLATE)$/.test(n.tagName)) return;
      if (isZone(n) || !visible(n)) return;
      (DUP_EXTRA.test(n.textContent || "") ? S.park : S.sysExtra).appendChild(n);
      n.classList.add("qe126-moved");
    });
  }
  function findZone() {
    var t = S.tools, n = t && t.nextElementSibling;
    while (n && !n.classList.contains("tw")) {
      if (n.id !== "bkBar" && n.id !== "qe126ImpBar" && isZone(n)) return n;
      n = n.nextElementSibling;
    }
    var inner = null;
    if (t) each(t.children, function (c) { if (!inner && isZone(c)) inner = c; });
    return inner;
  }
  function zoneCheck() {
    var z = findZone();
    if (z && z !== S.zone) setupZone(z);
  }
  function setupZone(z) {
    S.zone = z; z.classList.add("qe126-zone-off");
    if (!S.impbar) {
      var bar = el("div", "qe126-impbar"); bar.id = "qe126ImpBar"; bar.hidden = true;
      bar.appendChild(el("span", null, "📥 นำเข้าจาก Excel / CSV"));
      var x = btn("qe126-btn qe126-sm", "✕ ซ่อนช่องนำเข้า");
      x.addEventListener("click", function () { collapseZone(true); });
      bar.appendChild(x); S.impbar = bar;
    }
    z.parentNode.insertBefore(S.impbar, z);
    ["drop", "paste", "change"].forEach(function (ev) { z.addEventListener(ev, function () { S.pending = true; }, true); });
  }
  function zoneOpen() { return !!(S.zone && !S.zone.classList.contains("qe126-zone-off")); }
  function expandZone(focus) {
    if (!S.zone) { var q = $("qiBtn"); if (q && !q.disabled) q.click(); return; }
    S.zone.classList.remove("qe126-zone-off"); S.impbar.hidden = false;
    try { S.impbar.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch (_) {}
    if (focus) {
      var f = S.zone.matches(FOCUSABLE) ? S.zone : S.zone.querySelector(FOCUSABLE);
      f = f || S.impbar.querySelector("button");
      try { f.focus({ preventScroll: true }); } catch (_) {}
    }
  }
  function collapseZone(returnFocus) {
    if (!S.zone) return;
    S.zone.classList.add("qe126-zone-off"); if (S.impbar) S.impbar.hidden = true; S.pending = false;
    if (returnFocus && S.more) try { S.more.btn.focus({ preventScroll: true }); } catch (_) {}
  }

  /* ---------- Sorting: reuse thDate / thDue ---------- */
  function setupSort() {
    ["thDate", "thDue"].forEach(function (id) {
      var th = $(id); if (!th || th.__qe126) return;
      th.__qe126 = 1;
      if (!th.hasAttribute("tabindex")) th.tabIndex = 0;
      th.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") { e.preventDefault(); th.click(); }
      });
    });
  }
  function updSort() {
    [["thDate", "sortArrow"], ["thDue", "sortArrow2"]].forEach(function (p) {
      var th = $(p[0]), a = $(p[1]); if (!th || !a) return;
      var t = String(a.textContent || "").trim(), on = t === "↑" || t === "↓";
      a.classList.toggle("qe126-off", !on);
      a.setAttribute("aria-hidden", "true");
      th.setAttribute("aria-sort", t === "↑" ? "ascending" : t === "↓" ? "descending" : "none");
    });
  }

  /* ---------- state → UI ---------- */
  function monthLabel() {
    var fm = $("fMonth"), fy = $("fYear");
    var m = fm && fm.value ? selText(fm) : "", y = fy && fy.value ? selText(fy) : "";
    if (m && y) return m + " " + y;
    if (m) return m + " (ทุกปี)";
    if (y) return "ทั้งปี " + y;
    return "ทุกเดือน";
  }
  function updNav() {
    if (!S.mon) return;
    var lab = monthLabel(), fm = $("fMonth"), fy = $("fYear"), fb = $("fMBasis"), info = $("mfInfo");
    S.mon.t.textContent = lab;
    S.mon.btn.setAttribute("aria-label", "เลือกเดือนและปี — ตอนนี้: " + lab);
    var parts = [], m = String(info && info.textContent || "").match(/([\d,]+)\s*งาน/);
    if (m) parts.push(m[1] + " งาน");
    if (((fm && fm.value) || (fy && fy.value)) && fb) parts.push(selText(fb));
    S.sum.textContent = parts.join(" · ");
    S.sum.hidden = !parts.length;
  }
  function updFltBadge() {
    if (!S.flt) return;
    var n = 0;
    ["fDate", "fFlag"].forEach(function (id) { var s = $(id); if (s && s.value) n++; });
    S.fltBadge.textContent = String(n); S.fltBadge.hidden = !n;
    S.flt.btn.setAttribute("aria-label", "ตัวกรองเพิ่มเติม" + (n ? " (ใช้อยู่ " + n + ")" : ""));
  }
  function chipDefs() {
    var a = [], q = $("q");
    if (q && String(q.value || "").trim()) a.push({ k: "q", t: "ค้นหา: “" + clip(q.value.trim(), 20) + "”" });
    var st = $("fStatus"); if (st && st.value) a.push({ k: "fStatus", t: selText(st) });
    var fm = $("fMonth"), fy = $("fYear");
    if ((fm && fm.value) || (fy && fy.value)) a.push({ k: "month", t: monthLabel() });
    var ow = $("fOwner"); if (ow && ow.value) a.push({ k: "fOwner", t: "ผู้แจ้ง: " + selText(ow) });
    var fd = $("fDate"); if (fd && fd.value) a.push({ k: "fDate", t: "วันที่: " + selText(fd) });
    var fl = $("fFlag"); if (fl && fl.value) a.push({ k: "fFlag", t: selText(fl) });
    return a;
  }
  function updChips() {
    if (!S.chips) return;
    var defs = chipDefs(), sig = JSON.stringify(defs);
    if (sig === S.chipSig) return;
    S.chipSig = sig;
    var L = S.chipList, hadFocus = L.contains(D.activeElement);
    L.textContent = "";
    defs.forEach(function (d) {
      var b = btn("qe126-chip"); b.setAttribute("aria-label", "เอาตัวกรองออก: " + d.t); b.title = "คลิกเพื่อเอาตัวกรองนี้ออก";
      b.appendChild(el("span", null, d.t));
      var x = el("span", "x", "✕"); x.setAttribute("aria-hidden", "true"); b.appendChild(x);
      b.addEventListener("click", function () { removeChip(d.k); });
      L.appendChild(b);
    });
    S.chips.hidden = !defs.length;
    if (hadFocus) { var f = L.querySelector("button") || $("q"); if (f) f.focus(); }
  }
  function setVal(c, v) {
    if (!c || c.value === v) return;
    c.value = v;
    c.dispatchEvent(new Event("input", { bubbles: true }));
    c.dispatchEvent(new Event("change", { bubbles: true }));
  }
  function removeChip(k) {
    if (k === "month") { setVal($("fMonth"), ""); setVal($("fYear"), ""); }
    else setVal($(k), "");
    S.chipSig = null; schedule();
    setTimeout(function () { var f = S.chipList.querySelector("button") || $("q"); if (f) f.focus(); }, 80);
  }
  function bkWarn() { var b = $("bkBar"); return !!(b && visible(b) && String(b.textContent || "").trim()); }
  function grantNeeded() { var b = $("bkBar"), g = $("grantBtn"); return !!(b && g && b.contains(g) && visible(b)); }
  function updBk() {
    if (!S.safe) return;
    var b = $("bkBar"), w = bkWarn(), g = grantNeeded(),
      txt = b ? String(b.textContent || "").replace(/\s+/g, " ").replace(/อนุญาต\s*$/, "").trim() : "";
    /* v129: ถ้าระบบเดิมขอสิทธิ์ (มีปุ่ม #grantBtn) ต้องแสดงแถบ bkBar ตามเดิม — ไม่ซ่อน */
    if (b) b.classList.toggle("qe126-sr", !g);
    if (S.lastWarn === true && !w && S.bkClickAt && Date.now() - S.bkClickAt < 20000) {
      var d = new Date(); S.bkTime = pad(d.getHours()) + ":" + pad(d.getMinutes());
    }
    S.lastWarn = w;
    var p = S.safe.btn;
    p.classList.toggle("warn", w); p.classList.toggle("ok", !w);
    S.safe.t.textContent = g ? "🔐 Auto-backup รออนุญาต"
      : w ? (/ยังไม่เคย/.test(txt) ? "⚠ ยังไม่ได้สำรองข้อมูล" : "⚠ ควรสำรองข้อมูล")
      : "● สำรองแล้ว" + (S.bkTime ? " " + S.bkTime : "");
    p.title = w ? txt : "คลิกเพื่อ สำรองตอนนี้ / กู้คืน / ตั้ง Auto-backup";
    p.setAttribute("aria-label", S.safe.t.textContent + " — เปิดเมนูสำรองข้อมูล");
    S.safeNote.textContent = g ? "เบราว์เซอร์ขอสิทธิ์เขียนโฟลเดอร์ใหม่หลังเปิดเบราว์เซอร์ — กดปุ่มด้านล่าง แล้วกด “อนุญาต / Allow”"
      : w ? txt.replace(/^⚠️?\s*/, "") : "ไฟล์สำรองจะบันทึกไว้ในเครื่องนี้";
  }

  function reconcile() {
    var moved = 0;
    Object.keys(HOME).forEach(function (id) {
      var n = $(id), h = HOME[id];
      if (!n || h.box.contains(n)) return;
      if (h.ref && h.ref.parentNode === h.box) h.box.insertBefore(n, h.ref); else h.box.appendChild(n);
      moved++;
    });
    if (moved) {
      var now = Date.now();
      if (now - S.movesAt > 10000) { S.movesAt = now; S.moves = 0; }
      S.moves += moved;
      if (S.moves > 40) { HOME = {}; diag(new Error("toolbar130: element ping-pong detected — reconcile disabled")); }
    }
  }
  function updAll() {
    try {
      reconcile(); sweep(); zoneCheck();
      updNav(); updFltBadge(); updChips(); updBk(); updSort();
    } catch (e) { diag(e, "toolbar130 update"); }
  }
  function schedule() {
    if (S.raf) return;
    S.raf = (window.requestAnimationFrame || setTimeout)(function () { S.raf = 0; updAll(); });
  }

  /* ---------- Auto-backup folder picker: แจ้งสาเหตุเมื่อเลือกโฟลเดอร์ไม่ได้ ----------
     ห่อ showDirectoryPicker แบบโปร่งใส — ส่งผลลัพธ์/ข้อผิดพลาดเดิมกลับให้ core ทุกกรณี */
  function abMsg(text, ok) {
    var dir = $("abDir"); if (!dir) return;
    var row = dir.parentNode, box = row && row.nextElementSibling;
    if (!box || !box.classList.contains("qe127-abmsg")) {
      box = el("div", "qe127-abmsg"); box.setAttribute("role", "status"); box.setAttribute("aria-live", "polite");
      row.parentNode.insertBefore(box, row.nextSibling);
    }
    box.classList.toggle("ok", !!ok);
    box.textContent = text || ""; box.hidden = !text;
  }
  function pickerReason(e) {
    var n = e && e.name, m = String(e && e.message || "");
    if (n === "AbortError" && !/system|blocked|sensitive|ระบบ/i.test(m))
      return "ℹ ไม่ได้เลือกโฟลเดอร์ (กดยกเลิก หรือ Chrome แจ้งว่า “เปิดโฟลเดอร์นี้ไม่ได้ เพราะมีไฟล์ระบบ”)\n• ให้เลือกโฟลเดอร์ย่อยที่สร้างใหม่ เช่น Documents\\QE-Backup แล้วกด “เลือกโฟลเดอร์ / Select Folder”\n• ห้ามเลือก C:\\ , Desktop , Documents , Downloads ตรง ๆ";
    if (n === "SecurityError" && /gesture|activation/i.test(m))
      return "⚠ เบราว์เซอร์ไม่ยอมเปิดหน้าต่างเลือกโฟลเดอร์ (ต้องกดจากปุ่มโดยตรง)\nลองกดปุ่ม “เลือก…” ใหม่อีกครั้ง 1 ครั้ง";
    if (n === "SecurityError" || n === "NotAllowedError")
      return "⚠ เลือกโฟลเดอร์นี้ไม่ได้\n• ห้ามเลือก C:\\ , Desktop , Documents , Downloads หรือโฟลเดอร์ OneDrive ตรง ๆ\n• ให้สร้างโฟลเดอร์ใหม่ข้างในก่อน เช่น Documents\\QE-Backup แล้วเลือกโฟลเดอร์นั้น\n• ถ้ายังไม่ได้ อาจถูกนโยบาย IT ของบริษัทปิดไว้ — ใช้ปุ่ม 💾 สำรองตอนนี้ แทนได้";
    if (n === "AbortError")
      return "⚠ โฟลเดอร์นี้มีไฟล์ระบบ เบราว์เซอร์ไม่อนุญาต\nให้สร้างโฟลเดอร์ใหม่ เช่น Documents\\QE-Backup แล้วเลือกโฟลเดอร์นั้น";
    return "⚠ เลือกโฟลเดอร์ไม่สำเร็จ (" + (n || "Error") + ")\nลองใหม่อีกครั้ง หรือใช้ปุ่ม 💾 สำรองตอนนี้ แทน";
  }
  function wirePicker() {
    var orig = window.showDirectoryPicker;
    if (typeof orig === "function" && !orig.__qe127) {
      var wrapped = function () {
        S.pickCalled = true;
        abMsg("");
        var p;
        try { p = orig.apply(window, arguments); }
        catch (e) { var r0 = pickerReason(e); if (r0) abMsg(r0); diag(e, "toolbar130 picker"); throw e; }
        return Promise.resolve(p).then(function (h) {
          window.QE_AB_LAST = "ok:" + (h && h.name);
          if (h && h.name) abMsg("✓ เลือกโฟลเดอร์ “" + h.name + "” แล้ว — ติ๊ก “เปิดใช้งาน Auto-backup” แล้วกด บันทึกการตั้งค่า", true);
          return h;
        }, function (e) {
          window.QE_AB_LAST = (e && e.name) + ": " + (e && e.message);
          var r = pickerReason(e); if (r) abMsg(r + "\n(รหัส: " + window.QE_AB_LAST + ")");
          if (e && e.name !== "AbortError") diag(e, "toolbar130 picker");
          throw e;
        });
      };
      wrapped.__qe127 = true;
      try { window.showDirectoryPicker = wrapped; } catch (_) {}
    }
    D.addEventListener("click", function (e) {
      var b = e.target && e.target.closest && e.target.closest("#abPick");
      if (!b) return;
      S.pickCalled = false;
      var inFrame = false; try { inFrame = window.self !== window.top; } catch (_) { inFrame = true; }
      if (typeof window.showDirectoryPicker !== "function")
        abMsg("⚠ เบราว์เซอร์นี้เลือกโฟลเดอร์ไม่ได้\nให้เปิดหน้านี้ด้วย Google Chrome หรือ Microsoft Edge บนคอมพิวเตอร์ (ไม่รองรับมือถือ / Firefox / Safari)");
      else if (inFrame)
        abMsg("⚠ หน้านี้ถูกเปิดอยู่ในกรอบของโปรแกรมอื่น (เช่น Teams) จึงเลือกโฟลเดอร์ไม่ได้\nให้เปิดลิงก์ในแท็บ Chrome / Edge โดยตรง");
      else if (!window.isSecureContext)
        abMsg("⚠ ต้องเปิดผ่านลิงก์ https:// เท่านั้นจึงเลือกโฟลเดอร์ได้");
      else setTimeout(function () {
        if (S.pickCalled) return;
        abMsg("⚠ กด “เลือก…” แล้วระบบไม่ได้เปิดหน้าต่างเลือกโฟลเดอร์\nกด F12 → แท็บ Console แล้วส่งภาพหน้าจอข้อความสีแดงมาให้ผู้ดูแล\nระหว่างนี้ใช้ 💾 สำรองตอนนี้ แทนได้");
      }, 1500);
    }, true);
  }

  /* ---------- ป้ายเวอร์ชัน (โหลดหลัง version-v125.js จึงทับค่าได้) ---------- */
  function setVer() {
    try {
      window.QE_UI_VERSION = VER;
      each(D.querySelectorAll(".qe105-ver"), function (n) { if (n.textContent !== VER) n.textContent = VER; });
      var br = D.querySelector(".qe105-brand");
      if (br && br.title) br.title = br.title.replace(/หน้าจอ \(UI\) v\d+/, "หน้าจอ (UI) " + VER);
    } catch (e) { diag(e, "toolbar130 version"); }
  }

  /* ---------- listeners & observers ---------- */
  function wire() {
    D.addEventListener("change", function (e) { if (e.target && WATCH[e.target.id]) schedule(); }, true);
    D.addEventListener("input", function (e) { if (e.target && WATCH[e.target.id]) schedule(); }, true);
    D.addEventListener("click", function (e) {
      var t = e.target && e.target.closest && e.target.closest("#mfPrev,#mfNext,#mfNow,#clearBtn,#cBlkCard,#bkBtn,#grantBtn,#abSave");
      if (t) { schedule(); setTimeout(schedule, 300); setTimeout(schedule, 1500); }
    }, true);
    D.addEventListener("pointerdown", function (e) {
      if (!S.open) return;
      var t = e.target;
      if (S.open.pop.contains(t) || S.open.btn.contains(t)) return;
      closeAll(false);
    }, true);
    D.addEventListener("focusin", function (e) {
      if (!S.open) return;
      var t = e.target;
      if (t === D.body || S.open.pop.contains(t) || S.open.btn.contains(t)) return;
      closeAll(false);
    }, true);
    D.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (S.open) { e.preventDefault(); e.stopPropagation(); closeAll(true); return; }
      var a = D.activeElement;
      if (zoneOpen() && a && (S.zone.contains(a) || (S.impbar && S.impbar.contains(a)))) { e.preventDefault(); collapseZone(true); }
    }, true);
    window.addEventListener("resize", function () { if (S.open) place(S.open.pop); }, { passive: true });
    S.view.addEventListener("dragenter", function (e) {
      try {
        var dt = e.dataTransfer;
        if (S.zone && !zoneOpen() && dt && Array.prototype.indexOf.call(dt.types || [], "Files") >= 0) expandZone(false);
      } catch (x) { diag(x, "toolbar130 dragenter"); }
    });

    if (!window.MutationObserver) return;
    new MutationObserver(schedule).observe(S.tools, { childList: true });
    new MutationObserver(schedule).observe(S.view, { childList: true });
    var tb = $("tb");
    if (tb) new MutationObserver(function () {
      if (S.pending && zoneOpen()) { S.pending = false; setTimeout(function () { collapseZone(false); }, 900); }
      schedule();
    }).observe(tb, { childList: true });
    ["mfInfo", "sortArrow", "sortArrow2"].forEach(function (id) {
      var n = $(id); if (n) new MutationObserver(schedule).observe(n, { childList: true, characterData: true, subtree: true });
    });
    var bb = $("bkBar");
    if (bb) new MutationObserver(schedule).observe(bb, { attributes: true, attributeFilter: ["style", "hidden"], childList: true, characterData: true, subtree: true });
  }

  try { wirePicker(); } catch (e) { diag(e, "toolbar130 picker wire"); }
  setVer();
  var vn = 0, vt = setInterval(function () { setVer(); if (++vn > 30) clearInterval(vt); }, 500);

  var tries = 0;
  function boot() {
    try {
      if (build()) {
        if (S.tools && !S.wired) { S.wired = true; wire(); }
        updAll();
        [400, 1500, 4000].forEach(function (ms) { setTimeout(schedule, ms); });
        return;
      }
    } catch (e) { diag(e, "toolbar130 build"); return; }
    if (++tries < 40) setTimeout(boot, 250);
  }
  if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();

  window.QE126Toolbar = Object.freeze({ version: VER, refresh: schedule, openImport: function () { expandZone(true); }, closeMenus: function () { closeAll(false); } });
})();
