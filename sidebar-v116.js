/*! QE Elec. Daily Job Tracker — sidebar-v116.js (v115 Sidebar + v116 Focus Return)
    Sidebar ซ้ายแบบ "กระจก" ของเมนูเดิม (#nvNav): อ่านชื่อ/ไอคอน/ตัวเลข/สถานะจากเมนูเดิม แล้วสั่งงานผ่านปุ่มเดิม
    → ไม่แก้ฟังก์ชันของระบบ · ถ้าสร้างไม่สำเร็จภายใน ~20 วินาที จะถอดคลาส qe105 แล้วกลับไปใช้เมนูบนเดิม */
(function () {
  "use strict";
  if (window.__QE105) return;
  window.__QE105 = 1;
  window.__QE104_SB = true; /* ปิด Sidebar ที่ฝังใน core-v104 (ใช้ตัวนี้แทน) */

  var D = document, de = D.documentElement, KEY = "ux_sb105_collapsed", UI_VER = "v116", GAP = 28, MAXW = 1600;
  window.QE_UI_VERSION = UI_VER;
  de.classList.add("qe105");

  function ls(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function ss(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function $(id) { return D.getElementById(id); }
  function tx(el) { return el ? String(el.textContent || "").replace(/\s+/g, " ").trim() : ""; }
  function mk(tag, cls, text) { var e = D.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function svg(p) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + "</svg>"; }
  function icoSvg(p) { var s = mk("span", "qe105-ic"); s.innerHTML = svg(p); return s; }

  var P = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    report: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
    dash: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7"/><circle cx="12" cy="17" r=".6" fill="currentColor"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    left: '<path d="m11 17-5-5 5-5M18 17l-5-5 5-5"/>',
    right: '<path d="m13 17 5-5-5-5M6 17l5-5-5-5"/>'
  };

  /* เครื่องมือด้านล่าง: id ของปุ่มเดิม + ชื่อที่อ่านรู้เรื่อง */
  var TOOLS = [
    { id: "nvSearch", label: "ค้นหา", tip: "ค้นหาเมนูและคำสั่ง (Ctrl+K)", ic: "search", kbd: "Ctrl K" },
    { id: "nvXr", label: "รายงาน", tip: "รายงานผู้บริหาร", ic: "report" },
    { id: "nvDash", label: "Dashboard", tip: "ภาพรวมทุกหน้า", ic: "dash" },
    { id: "nvHelp", label: "คู่มือ", tip: "คู่มือการใช้งานและความหมายของเมนู", ic: "help" },
    { id: "", label: "เครื่องมือ", tip: "สำรอง/กู้ข้อมูล · ถังขยะ · ธีมสี · LINE · Cloud · ตรวจสุขภาพระบบ", ic: "gear", gear: true }
  ];

  var nav = null, sb = null, mid = null, burger = null, back = null, colBtn = null, toolMount = null, toolMenuHome = null;
  var tabs = [], toolRows = [], U = {}, raf = 0, obs = null, built = false, gearWasOpen = false, lastClick = null;
  var mq = window.matchMedia ? window.matchMedia("(max-width:900px)") : { matches: false };

  /* ---------- ล้างของ v104 (กรณีโหลดมาก่อน) ---------- */
  function teardown104() {
    try {
      ["qe104Css", "qe104Burger", "qe104Back"].forEach(function (i) { var e = $(i); e && e.parentNode && e.parentNode.removeChild(e); });
      var n = $("nvNav");
      if (n) Array.prototype.slice.call(n.querySelectorAll(".qe104-brand,.qe104-foot")).forEach(function (e) { e.parentNode.removeChild(e); });
      if (D.body) ["qe-sb", "qe-sb-c", "qe-sb-m", "qe-sb-open"].forEach(function (c) { D.body.classList.remove(c); });
    } catch (e) {}
  }

  function isHiddenSrc(s) {
    try {
      if (s.hidden || (s.style && s.style.display === "none")) return true;
      return !!(s.closest && s.closest("[hidden]"));
    } catch (e) { return false; }
  }
  function iconOf(s) { var i = s.querySelector(".nv-ic"); return tx(i) || "•"; }
  function labelOf(s) {
    var f = s.querySelector(".nv-tx .f") || s.querySelector(".f");
    if (f && tx(f)) return tx(f);
    var b = s.querySelector(".nv-tx b");
    if (b && tx(b)) return tx(b);
    var c = s.cloneNode(true);
    Array.prototype.slice.call(c.querySelectorAll(".nv-ic,.nv-bd,small")).forEach(function (x) { x.parentNode.removeChild(x); });
    return tx(c) || (s.getAttribute("aria-label") || "");
  }
  function isOnRaw(s) {
    return s.classList.contains("on") || s.getAttribute("aria-current") === "page" || s.getAttribute("aria-current") === "true" ||
      s.getAttribute("aria-selected") === "true" || s.getAttribute("aria-pressed") === "true";
  }
  function viewOf(s) { var id = s.getAttribute("aria-controls"); return id ? $(id) : null; }
  function viewShown(v) {
    if (!v) return null;
    try { return getComputedStyle(v).display !== "none" && v.getClientRects().length > 0; } catch (e) { return null; }
  }
  /* เมนูไหน "กำลังเปิดอยู่จริง": ต้องมีคลาส on และหน้าของมันต้องแสดงอยู่ (กันเมนู Tracker ค้างไฮไลต์เมื่ออยู่หน้างานของฉัน) */
  function pickActive() {
    var good = [], raw = [], vis = [];
    tabs.forEach(function (o) {
      var on = isOnRaw(o.src), sh = viewShown(viewOf(o.src));
      if (on) { raw.push(o); if (sh !== false) good.push(o); }
      if (sh === true) vis.push(o);
    });
    var pool = good.length ? good : (vis.length ? vis : raw);
    if (pool.length > 1) {
      for (var i = 0; i < pool.length; i++) if (pool[i].src === lastClick) return pool[i];
      return pool[pool.length - 1];
    }
    return pool[0] || null;
  }
  /* ถ้ามีหลายหน้าแสดงพร้อมกัน (บัคเดิมตอนสลับจาก "งานของฉัน" ไป "ประชุม") ให้ซ่อนหน้าอื่น เหลือหน้าที่เพิ่งกด */
  function fixViews(src) {
    try {
      var tv = viewOf(src);
      if (!tv || viewShown(tv) !== true) return;
      var seen = [];
      tabs.forEach(function (o) {
        var v = viewOf(o.src);
        if (v && v !== tv && seen.indexOf(v) < 0 && viewShown(v) === true) { seen.push(v); v.style.setProperty("display", "none"); }
      });
      if (seen.length) { try { window.scrollTo(0, 0); } catch (e) {} }
    } catch (e) {}
  }

  function readGroups() {
    var out = [], gs = nav.querySelectorAll(".nv-grp"), seen = [];
    function push(label, list) {
      var arr = [];
      Array.prototype.slice.call(list).forEach(function (t) { if (seen.indexOf(t) < 0) { seen.push(t); arr.push(t); } });
      if (arr.length) out.push({ label: label, tabs: arr });
    }
    if (gs.length) {
      Array.prototype.slice.call(gs).forEach(function (g) { push(tx(g.querySelector(".nv-gl")), g.querySelectorAll(".nv-tab")); });
    }
    var rest = Array.prototype.slice.call(nav.querySelectorAll(".nv-tab")).filter(function (t) { return seen.indexOf(t) < 0; });
    if (rest.length) push("", rest);
    return out;
  }

  /* ---------- สถานะเมนู ⚙ ---------- */
  function gearSrc() {
    var w = nav && nav.querySelector(".nv-mw");
    return (w && (w.querySelector("button") || w)) || null;
  }
  function menuOpen() {
    var m = $("nvMenu");
    if (m) {
      if (m.hidden) return false;
      try {
        var cs = getComputedStyle(m);
        if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return false;
      } catch (e) {}
      return m.getClientRects().length > 0;
    }
    var g = gearSrc();
    return !!(g && g.getAttribute("aria-expanded") === "true");
  }
  function rescueMenu() {
    /* ถ้าเมนูถูกวางไว้ใน element ที่ทำให้ตำแหน่งเพี้ยน (อยู่นอกจอ) ให้ย้ายออกมาที่ body */
    setTimeout(function () {
      try {
        var m = $("nvMenu"); if (!m || !menuOpen()) return;
        var r = m.getBoundingClientRect();
        if (r.width > 0 && (r.right <= 0 || r.left >= window.innerWidth || r.bottom <= 0 || r.top >= window.innerHeight)) D.body.appendChild(m);
      } catch (e) {}
    }, 60);
  }

  /* v115: บนจอแคบย้ายเมนูเดิมทั้งก้อนไว้ใต้ปุ่มเครื่องมือใน Sidebar
     ตัว element, ID, event และ business handler เดิมยังเป็นชุดเดียวกันทั้งหมด */
  function placeToolsMenu(small) {
    try {
      var m = $("nvMenu"); if (!m) return;
      if (!toolMenuHome || !D.contains(toolMenuHome)) {
        var home = nav && nav.querySelector(".nv-mw");
        if (home && home !== toolMount) toolMenuHome = home;
      }
      var target = small && toolMount ? toolMount : toolMenuHome;
      if (target && m.parentNode !== target) target.appendChild(m);
      if (!m.dataset.qe115Bound) {
        m.dataset.qe115Bound = "1";
        m.addEventListener("click", function (e) {
          if (!mq.matches) return;
          var item = e.target && e.target.closest ? e.target.closest(".nv-mi") : null;
          if (!item) return;
          var a = item.dataset.a || "";
          if (item.dataset.b || a === "guide" || a === "health" || a === "wel") {
            setTimeout(function () { setDrawer(false); }, 50);
          }
        });
      }
    } catch (e) {}
  }
  function syncToolsTrigger() {
    var open = menuOpen();
    toolRows.forEach(function (o) {
      if (!o.d.gear) return;
      o.b.setAttribute("aria-expanded", String(open));
      o.b.classList.toggle("qe115-tool-open", open);
      if (o.caret) o.caret.textContent = open ? "▾" : "▸";
    });
  }
  function closeToolsMenu() {
    if (!menuOpen()) return;
    var g = gearSrc();
    if (g) { try { g.click(); } catch (e) {} }
    syncToolsTrigger();
  }

  /* ---------- สร้าง/ซิงก์ ---------- */
  function closeSmall() { if (mq.matches) setDrawer(false); }

  function rebuildMid() {
    placeToolsMenu(false);
    mid.textContent = "";
    tabs = []; toolRows = []; toolMount = null;
    readGroups().forEach(function (g) {
      var gr = mk("div", "qe105-grp");
      if (g.label) gr.appendChild(mk("div", "qe105-gl", g.label));
      var items = [];
      g.tabs.forEach(function (src) {
        var b = mk("button", "qe105-it"); b.type = "button";
        var ic = mk("span", "qe105-ic", iconOf(src)), t = mk("span", "qe105-tx", labelOf(src)), bd = mk("span", "qe105-bd");
        bd.hidden = true;
        b.appendChild(ic); b.appendChild(t); b.appendChild(bd);
        b.addEventListener("click", function () {
          lastClick = src;
          try { src.click(); } catch (e) {}
          closeSmall();
          setTimeout(function () { fixViews(src); schedule(); }, 140);
        });
        gr.appendChild(b);
        var o = { src: src, b: b, t: t, bd: bd, gr: gr };
        tabs.push(o); items.push(o);
      });
      gr._items = items;
      mid.appendChild(gr);
    });
    mid.appendChild(mk("div", "qe105-sep"));
    TOOLS.forEach(function (d) {
      var b = mk("button", "qe105-it qe105-tl"); b.type = "button";
      b.appendChild(icoSvg(P[d.ic]));
      b.appendChild(mk("span", "qe105-tx", d.label));
      var o = { d: d, b: b };
      if (d.kbd) b.appendChild(mk("span", "qe105-kbd", d.kbd));
      if (d.gear) {
        var dot = mk("span", "qe105-dot"); dot.hidden = true; b.appendChild(dot); o.dot = dot;
        var caret = mk("span", "qe115-caret", "▸"); b.appendChild(caret); o.caret = caret;
      }
      b.title = d.tip; b.setAttribute("aria-label", d.label + " — " + d.tip);
      if (d.gear) {
        b.setAttribute("aria-haspopup", "menu");
        b.setAttribute("aria-controls", "nvMenu");
        b.setAttribute("aria-expanded", "false");
        b.addEventListener("pointerdown", function () { gearWasOpen = menuOpen(); }, true);
        b.addEventListener("click", function (e) {
          e.stopPropagation();
          if (mq.matches) placeToolsMenu(true);
          var want = e.detail === 0 ? !menuOpen() : !gearWasOpen;
          gearWasOpen = false;
          var g = gearSrc();
          if (g && menuOpen() !== want) g.click();
          syncToolsTrigger();
          if (want) {
            rescueMenu();
            setTimeout(function () {
              try { b.scrollIntoView({ block: "nearest" }); } catch (x) {}
            }, 70);
          }
        });
      } else {
        b.addEventListener("click", function () {
          var el = $(d.id); if (el) el.click();
          closeSmall();
        });
      }
      mid.appendChild(b);
      if (d.gear) {
        toolMount = mk("div", "qe115-tools-panel nv-mw");
        toolMount.setAttribute("aria-label", "รายการเครื่องมือ");
        mid.appendChild(toolMount);
      }
      toolRows.push(o);
    });
    placeToolsMenu(mq.matches);
    syncToolsTrigger();
  }

  function dotColor(el) {
    try {
      if (!el) return null;
      var cs = getComputedStyle(el), c = cs.backgroundColor;
      if (!c || c === "transparent" || /rgba\(\s*0,\s*0,\s*0,\s*0\s*\)/.test(c)) c = cs.borderTopColor;
      return c || null;
    } catch (e) { return null; }
  }
  function isGreen(c) {
    var m = /rgba?\(\s*(\d+)[, ]+\s*(\d+)[, ]+\s*(\d+)/.exec(c || "");
    return m ? (+m[2] >= +m[1]) : true;
  }

  function syncUser() {
    if (!U.btn) return;
    var nm = tx($("cbWn"));
    if (!nm) {
      try {
        var em = window.QEAuth && window.QEAuth.user && window.QEAuth.user();
        em = em && em.email || "";
        nm = (window.QEPeople && em) ? window.QEPeople.display(em) : em;
      } catch (e) {}
    }
    nm = nm || "ยังไม่ได้เข้าสู่ระบบ";
    var role = "";
    try { role = { admin: "ผู้ดูแล", editor: "แก้ไขได้", viewer: "ดูอย่างเดียว" }[window.QEAuth.role()] || ""; } catch (e) {}
    var cnt = tx($("cbPresenceCount")), n = parseInt(cnt, 10) || 0;
    var c = dotColor($("cbConnDot")), ok = isGreen(c);
    U.nm.textContent = nm;
    U.av.firstChild.nodeValue = nm.charAt(0).toUpperCase();
    U.st.textContent = (role ? role : "") + (role && n ? " · " : "") + (n ? "ออนไลน์ " + n + " คน" : "") + (!role && !n ? (ok ? "เชื่อมต่อแล้ว" : "ตรวจสอบการเชื่อมต่อ") : "");
    if (c) U.dot.style.background = c;
    U.cnt.textContent = n ? String(n) : ""; U.cnt.hidden = !n;
    var pill = $("cbPill");
    U.btn.title = nm + (role ? " · " + role : "") + "\nสถานะ: " + (ok ? "🟢 เชื่อมต่อ Cloud ปกติ" : "🔴 มีปัญหาการเชื่อมต่อ") + (n ? "\nออนไลน์ตอนนี้ " + n + " คน" : "") + "\n(กดเพื่อดูรายละเอียด/ตั้งค่าการบันทึก)" + (pill && pill.title ? "\n" + pill.title : "");
  }

  /* ---------- v109: ขอบซ้าย/ขวาเท่ากัน — วัดจาก "การ์ด/กล่อง" ที่มองเห็นจริง (ไม่ใช่กรอบห่อหุ้ม) แล้วปรับแบบวนจนเท่ากัน ---------- */
  var balInfo = { L: null, R: null, pl: null, pr: null, n: 0 };
  function isCard(el, cs) {
    var bw = (parseFloat(cs.borderLeftWidth) || 0) + (parseFloat(cs.borderTopWidth) || 0);
    var bg = cs.backgroundColor, hasBg = bg && bg !== "transparent" && !/rgba\(\s*0,\s*0,\s*0,\s*0\s*\)/.test(bg);
    return bw > 0 || hasBg || (cs.boxShadow && cs.boxShadow !== "none") || cs.backgroundImage !== "none";
  }
  function modeEdge(list, smallest) {
    if (!list.length) return null;
    var cnt = {}, k;
    list.forEach(function (v) { k = Math.round(v); cnt[k] = (cnt[k] || 0) + 1; });
    var keys = Object.keys(cnt).map(Number).sort(function (a, b) { return smallest ? a - b : b - a; });
    for (var i = 0; i < keys.length; i++) if (cnt[keys[i]] >= 2) return keys[i];
    return keys[0];
  }
  function contentEdges(m) {
    var kids = m.children, root = null, best = 0, i, k;
    for (i = 0; i < kids.length; i++) {
      k = kids[i];
      if (!k.getClientRects || !k.getClientRects().length) continue;
      if (k.id && /Reserve$/.test(k.id)) continue;
      if (k.classList && (k.classList.contains("tabbar") || k.classList.contains("qe-skip"))) continue;
      var h = k.offsetHeight; if (h > best) { best = h; root = k; }
    }
    if (!root || best < 60) return null;
    var lefts = [], rights = [], vw = de.clientWidth, count = 0, stack = [[root, 0]], it, el, d, cs, r;
    while (stack.length && count < 700) {
      it = stack.shift(); el = it[0]; d = it[1];
      var ch = el.children;
      for (i = 0; i < ch.length; i++) {
        k = ch[i]; count++;
        if (!k.getClientRects || !k.getClientRects().length) continue;
        cs = getComputedStyle(k);
        if (cs.display === "none" || cs.visibility === "hidden" || cs.position === "fixed" || cs.position === "absolute") continue;
        r = k.getBoundingClientRect();
        if (r.width < 260 || r.height < 36 || r.right > vw + 2 || r.left < 0) { if (d < 4) stack.push([k, d + 1]); continue; }
        if (isCard(k, cs)) { lefts.push(r.left); rights.push(r.right); }
        else if (d < 4) stack.push([k, d + 1]);
      }
    }
    if (!lefts.length) return null;
    return { L: modeEdge(lefts, true), R: modeEdge(rights, false) };
  }
  /* ขอบซ้ายสุดของเนื้อหา (วัดจากแถบน้ำเงิน) = ขอบขวาสุดของเนื้อหา (วัดจากปุ่มลอยแชต/AI/↑ ที่ซ้ายสุด) */
  function fabLeft() {
    var vw = de.clientWidth, min = vw, found = false, list = [], i, el, cs, r;
    try {
      var ids = ["qeChatFab", "qeAiFab"];
      ids.forEach(function (id) { var e = $(id); if (e) list.push(e); });
      var kids = D.body.children;
      for (i = 0; i < kids.length; i++) list.push(kids[i]);
      for (i = 0; i < list.length; i++) {
        el = list[i];
        if (!el || el.id === "qe105Sb" || el.id === "qe105Burger" || el.id === "qe105Back") continue;
        if (!el.getClientRects || !el.getClientRects().length) continue;
        cs = getComputedStyle(el);
        if (cs.position !== "fixed" || cs.display === "none" || cs.visibility === "hidden" || +cs.opacity === 0) continue;
        r = el.getBoundingClientRect();
        if (r.width < 24 || r.width > 96 || r.height < 24 || r.height > 96) continue;
        if (r.right < vw - 48 || r.left < vw * 0.5) continue;
        if (r.left < min) { min = r.left; found = true; }
      }
    } catch (e) {}
    return found ? min : vw;
  }
  function balance() {
    try {
      var m = $("qeMain"); if (!m) return;
      if (de.classList.contains("qe105-m")) { de.style.removeProperty("--qe110-pl"); de.style.removeProperty("--qe110-pr"); return; }
      var sbR = (function () { var s = $("qe105Sb"); return s ? s.getBoundingClientRect().right : 0; })();
      for (var pass = 0; pass < 3; pass++) {
        var e = contentEdges(m); if (!e) return;
        var cs = getComputedStyle(m), pl = parseFloat(cs.paddingLeft) || 0, pr = parseFloat(cs.paddingRight) || 0;
        var mr = m.getBoundingClientRect(), fl = fabLeft();
        var iL = (e.L - mr.left) - pl, iR = (mr.right - e.R) - pr;
        if (!isFinite(iL) || !isFinite(iR)) return;
        var span = fl - sbR, g = GAP;
        if (span - 2 * g > MAXW) g = (span - MAXW) / 2;
        var nl = Math.max(0, Math.round(sbR + g - mr.left - iL)), nr = Math.max(0, Math.round(mr.right - (fl - g) - iR));
        balInfo = { L: Math.round(e.L - sbR), R: Math.round(fl - e.R), fab: Math.round(fl), pl: nl, pr: nr, n: pass };
        if (Math.abs(nl - pl) <= 0.6 && Math.abs(nr - pr) <= 0.6) break;
        de.style.setProperty("--qe110-pl", nl + "px"); de.style.setProperty("--qe110-pr", nr + "px");
      }
    } catch (x) {}
  }
  function sync() {
    try {
      if (!sb) return;
      if (!nav || !D.contains(nav)) { nav = $("nvNav"); if (!nav) return; hideNav(); }
      var cur = nav.querySelectorAll(".nv-tab"), stale = cur.length !== tabs.length;
      tabs.forEach(function (o) { if (!D.contains(o.src)) stale = true; });
      if (stale) rebuildMid();
      var chosen = pickActive();
      tabs.forEach(function (o) {
        var s = o.src, on = (o === chosen);
        o.b.classList.toggle("qe105-on", on);
        if (on) o.b.setAttribute("aria-current", "page"); else o.b.removeAttribute("aria-current");
        var lab = labelOf(s); if (lab && lab !== o.t.textContent) o.t.textContent = lab;
        var ic = iconOf(s), icEl = o.b.firstChild; if (icEl && ic !== icEl.textContent) icEl.textContent = ic;
        var n = tx(s.querySelector(".nv-bd")), show = !!n && n !== "0";
        o.bd.textContent = n; o.bd.hidden = !show;
        o.b.title = lab + (show ? " (" + n + ")" : "");
        o.b.setAttribute("aria-label", lab + (show ? " — มี " + n + " รายการ" : ""));
        o.b.hidden = isHiddenSrc(s);
      });
      Array.prototype.slice.call(mid.querySelectorAll(".qe105-grp")).forEach(function (g) {
        var all = true; (g._items || []).forEach(function (o) { if (!o.b.hidden) all = false; });
        g.hidden = all && (g._items || []).length > 0;
      });
      toolRows.forEach(function (o) {
        var src = o.d.gear ? gearSrc() : $(o.d.id);
        o.b.hidden = !src;
        if (o.dot) {
          var dd = nav.querySelector(".nv-mw .nv-dot"), c = dotColor(dd);
          o.dot.hidden = !dd; if (c) o.dot.style.background = c;
        }
      });
      syncUser();
      placeToolsMenu(mq.matches);
      syncToolsTrigger();
      balance();
    } catch (e) { try { console.warn("[QE105] sync", e); } catch (x) {} }
  }
  function schedule() {
    if (raf) return;
    var f = function () { raf = 0; sync(); };
    raf = window.requestAnimationFrame ? window.requestAnimationFrame(f) : setTimeout(f, 30);
  }

  function hideNav() {
    try {
      Array.prototype.slice.call(nav.querySelectorAll(".nv-tab,.nv-tb")).forEach(function (b) { b.setAttribute("tabindex", "-1"); });
      var p = nav.parentNode;
      if (p && p !== D.body && p.id !== "qeMain") {
        var other = false;
        Array.prototype.slice.call(p.children).forEach(function (c) {
          if (c !== nav && c.id !== "nvMenu" && c.getClientRects && c.getClientRects().length && c.offsetHeight > 2) other = true;
        });
        if (!other) p.classList.add("qe105-navwrap");
      }
    } catch (e) {}
  }

  /* ---------- โหมดย่อ / drawer ---------- */
  function setDrawer(o) {
    if (!o && mq.matches) closeToolsMenu();
    de.classList.toggle("qe105-open", !!o);
    if (burger) { burger.setAttribute("aria-expanded", String(!!o)); burger.setAttribute("aria-label", o ? "ปิดเมนู" : "เปิดเมนู"); }
  }
  function applyMode() {
    setTimeout(balance, 220);
    var small = !!mq.matches, pref = ls(KEY), col = pref === null ? window.innerWidth < 1200 : pref === "1";
    de.classList.toggle("qe105-m", small);
    de.classList.toggle("qe105-c", !small && col);
    if (!small) closeToolsMenu();
    placeToolsMenu(small);
    syncToolsTrigger();
    if (!small) setDrawer(false);
    if (colBtn) {
      var open = small || !col;
      colBtn.setAttribute("aria-expanded", String(open));
      colBtn.title = small ? "ปิดเมนู" : (open ? "ย่อเมนูเหลือแต่ไอคอน" : "ขยายเมนู");
      colBtn.firstChild.innerHTML = svg(open ? P.left : P.right);
      colBtn.lastChild.textContent = small ? "ปิดเมนู" : "ย่อเมนู";
    }
  }

  function build() {
    teardown104();
    sb = mk("aside"); sb.id = "qe105Sb"; sb.setAttribute("aria-label", "เมนูหลัก");
    var br = mk("div", "qe105-brand");
    br.appendChild(mk("span", "qe105-logo", "QE"));
    var bt = mk("span", "qe105-bt"); bt.appendChild(mk("b", "", "QE Electronics"));
    var sub = mk("span", "qe105-sub"), vr = mk("span", "qe105-ver", UI_VER);
    sub.appendChild(mk("small", "", "Daily Job Tracker")); sub.appendChild(vr); bt.appendChild(sub);
    var cv = ""; try { cv = window.QE_APP_VERSION_LABEL || ""; } catch (e) {}
    br.title = "QE Electronics · Daily Job Tracker\nหน้าจอ (UI) " + UI_VER + (cv ? " · แกนระบบ (core) " + cv : "");
    br.appendChild(bt); sb.appendChild(br);

    mid = mk("nav", "qe105-mid"); mid.setAttribute("aria-label", "เมนูหลัก"); sb.appendChild(mid);

    var ft = mk("div", "qe105-foot");
    var ub = mk("button", "qe105-user"); ub.type = "button";
    var av = mk("span", "qe105-av", "?"), dot = mk("span", "qe105-avd"), cnt = mk("span", "qe105-avc"); cnt.hidden = true;
    av.appendChild(dot); av.appendChild(cnt);
    var ut = mk("span", "qe105-ut"), nm = mk("span", "qe105-un"), st = mk("span", "qe105-us");
    ut.appendChild(nm); ut.appendChild(st);
    ub.appendChild(av); ub.appendChild(ut);
    ub.setAttribute("aria-haspopup", "dialog");
    ub.addEventListener("click", function () { var w = $("cbWho"); if (w) w.click(); closeSmall(); });
    U = { btn: ub, av: av, dot: dot, cnt: cnt, nm: nm, st: st };
    ft.appendChild(ub);

    colBtn = mk("button", "qe105-col"); colBtn.type = "button";
    var ci = mk("span", "qe105-ic"); ci.innerHTML = svg(P.left);
    colBtn.appendChild(ci); colBtn.appendChild(mk("span", "qe105-colt", "ย่อเมนู"));
    colBtn.addEventListener("click", function () {
      if (mq.matches) { setDrawer(false); return; }
      ss(KEY, de.classList.contains("qe105-c") ? "0" : "1"); applyMode();
    });
    ft.appendChild(colBtn);
    sb.appendChild(ft);

    burger = mk("button", "", "☰"); burger.type = "button"; burger.id = "qe105Burger";
    burger.setAttribute("aria-controls", "qe105Sb"); burger.setAttribute("aria-expanded", "false"); burger.setAttribute("aria-label", "เปิดเมนู");
    burger.addEventListener("click", function () { setDrawer(!de.classList.contains("qe105-open")); });
    back = mk("div"); back.id = "qe105Back"; back.setAttribute("aria-hidden", "true");
    back.addEventListener("click", function () { setDrawer(false); });

    D.body.appendChild(sb); D.body.appendChild(burger); D.body.appendChild(back);
    D.addEventListener("keydown", function (e) { if (e.key === "Escape" && de.classList.contains("qe105-open")) setDrawer(false); }, true);
    if (mq.addEventListener) mq.addEventListener("change", applyMode); else if (mq.addListener) mq.addListener(applyMode);
    window.addEventListener("resize", function () { clearTimeout(build._t); build._t = setTimeout(function () { applyMode(); balance(); }, 150); });

    hideNav(); rebuildMid(); applyMode(); sync();
    try {
      if (window.MutationObserver) {
        obs = new MutationObserver(function (muts) {
          try {
            muts.forEach(function (m) {
              if (m.type === "attributes" && m.attributeName === "class" && m.target.classList && m.target.classList.contains("nv-tab")) {
                var was = (" " + (m.oldValue || "") + " ").indexOf(" on ") >= 0;
                if (!was && m.target.classList.contains("on")) lastClick = m.target;
              }
            });
          } catch (e) {}
          schedule();
        });
        obs.observe(nav, { subtree: true, childList: true, characterData: true, attributes: true, attributeOldValue: true, attributeFilter: ["class", "hidden", "style", "aria-current", "aria-selected", "aria-pressed"] });
      }
    } catch (e) {}
    setInterval(function () { if (!D.hidden) sync(); }, 2000);
    try {
      var qm = $("qeMain"), bt2 = 0;
      if (qm && window.MutationObserver) new MutationObserver(function () { clearTimeout(bt2); bt2 = setTimeout(balance, 160); }).observe(qm, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class", "hidden"] });
    } catch (e) {}
    window.addEventListener("focus", schedule);
    built = true;
  }

  function tryBuild() {
    if (built) return true;
    if (!D.body) return false;
    nav = $("nvNav");
    if (!nav || nav.querySelectorAll(".nv-tab").length < 3) return false;
    build();
    return true;
  }

  /* v116: ทำให้ปุ่มต้นทางในเมนูเครื่องมือมองเห็นได้อีกครั้งก่อนคืน Focus
     ใช้ element/handler เดิม ไม่ clone ปุ่ม และไม่เรียก business action ของปุ่มปลายทาง */
  function revealControl(el) {
    try {
      if (!el || !D.contains(el)) return false;
      var menu = $("nvMenu");
      if (menu && menu.contains(el)) {
        if (mq.matches) setDrawer(true);
        placeToolsMenu(!!mq.matches);
        if (!menuOpen()) {
          /* อย่าเรียกปุ่ม gear ที่จะ render #nvMenu ใหม่ เพราะจะทำลาย DOM ของปุ่มต้นทาง */
          menu.hidden = false;
          var g = gearSrc();
          if (g) g.setAttribute("aria-expanded", "true");
        }
        syncToolsTrigger();
      }
      if (!el.getClientRects || !el.getClientRects().length) return false;
      el.focus({ preventScroll: true });
      try { el.scrollIntoView({ block: "nearest" }); } catch (x) {}
      return D.activeElement === el;
    } catch (e) { return false; }
  }

  window.QE105Sidebar = Object.freeze({
    sync: sync,
    open: function () { setDrawer(true); },
    close: function () { setDrawer(false); },
    revealControl: revealControl,
    balance: function () { balance(); return balInfo; },
    state: function () { return { built: built, tabs: tabs.length, collapsed: de.classList.contains("qe105-c"), small: de.classList.contains("qe105-m") }; }
  });

  var tries = 0, iv = setInterval(function () {
    tries++;
    var ok = false;
    try { ok = tryBuild(); } catch (e) { try { console.warn("[QE105] build", e); } catch (x) {} }
    if (ok) clearInterval(iv);
    else if (tries > 130) {
      clearInterval(iv);
      de.classList.remove("qe105");
      try { console.warn("[QE105] ไม่พบเมนู #nvNav — กลับไปใช้เมนูเดิม"); } catch (x) {}
    }
  }, 150);
})();

/* ====================== v106 · น้องดุ๊กดิ๊ก (ลากได้ทั้งจอ) + Dashboard (ป้ายหมวด · % บนโดนัท) ====================== */
(function () {
  "use strict";
  if (window.__QE106X) return;
  window.__QE106X = 1;
  var D = document, KEYP = "ux_qe106_mascot_pos";
  function $(id) { return D.getElementById(id); }
  function tx(el) { return el ? String(el.textContent || "").replace(/\s+/g, " ").trim() : ""; }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  /* ---------- 1) น้องดุ๊กดิ๊ก: ลากขึ้นบนสุด/ไปทุกมุมของหน้าจอได้ ---------- */
  var mascotReady = false;
  function initMascot() {
    var m = $("qe89Mascot");
    if (!m || m.__qe106) return mascotReady;
    var btn = m.querySelector(".qe89-mascot-btn");
    if (!btn) return false;
    m.__qe106 = 1;
    var saved = null, drag = null, applying = false, movedAt = 0;
    try { saved = JSON.parse(lsGet(KEYP) || "null"); } catch (e) { saved = null; }

    function limits() {
      var r = m.getBoundingClientRect(), b = btn.getBoundingClientRect();
      var bo = b.left - r.left, bt = b.top - r.top, bw = b.width || 52, bh = b.height || 66;
      var W = window.innerWidth, H = window.innerHeight;
      return { x0: 4 - bo, x1: W - 4 - bw - bo, y0: 4 - bt, y1: H - 4 - bh - bt };
    }
    function clamp(x, y) {
      var L = limits();
      return { x: Math.max(L.x0, Math.min(L.x1, x)), y: Math.max(L.y0, Math.min(L.y1, y)) };
    }
    function place(x, y) {
      applying = true;
      m.style.left = Math.round(x) + "px"; m.style.top = Math.round(y) + "px";
      m.style.right = "auto"; m.style.bottom = "auto";
      setTimeout(function () { applying = false; }, 0);
    }
    function applySaved() {
      if (!saved || drag || m.hidden) return;
      var p = clamp(saved.x, saved.y), r = m.getBoundingClientRect();
      if (Math.abs(r.left - p.x) > 1.5 || Math.abs(r.top - p.y) > 1.5) place(p.x, p.y);
    }

    D.addEventListener("pointerdown", function (e) {
      var b = e.target && e.target.closest ? e.target.closest("#qe89Mascot .qe89-mascot-btn") : null;
      if (!b || (e.pointerType === "mouse" && e.button !== 0)) return;
      e.preventDefault(); e.stopImmediatePropagation();
      var r = m.getBoundingClientRect();
      drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, x: r.left, y: r.top, moved: false };
      try { b.setPointerCapture(e.pointerId); } catch (x) {}
      m.classList.add("dragging");
    }, true);
    D.addEventListener("pointermove", function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 4) return;
      drag.moved = true;
      var p = clamp(drag.x + dx, drag.y + dy);
      place(p.x, p.y);
      e.preventDefault();
    }, true);
    function end(e) {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      var d = drag; drag = null;
      m.classList.remove("dragging");
      if (d.moved) {
        var r = m.getBoundingClientRect();
        saved = { x: Math.round(r.left), y: Math.round(r.top) };
        lsSet(KEYP, JSON.stringify(saved));
        movedAt = Date.now();
      }
    }
    D.addEventListener("pointerup", end, true);
    D.addEventListener("pointercancel", end, true);
    D.addEventListener("click", function (e) {
      if (Date.now() - movedAt < 300 && e.target && e.target.closest && e.target.closest("#qe89Mascot .qe89-mascot-btn")) {
        e.preventDefault(); e.stopImmediatePropagation();
      }
    }, true);

    try {
      new MutationObserver(function () { if (!applying) applySaved(); }).observe(m, { attributes: true, attributeFilter: ["style", "class", "hidden"] });
    } catch (e) {}
    window.addEventListener("resize", function () { setTimeout(applySaved, 120); });
    setTimeout(applySaved, 200);
    mascotReady = true;
    return true;
  }

  /* ---------- 2) Dashboard: ป้ายหมวด "payload" + % บนกราฟโดนัท ---------- */
  var NS = "http://www.w3.org/2000/svg", dashObs = null, tuning = false;
  function renameLabels() {
    var scopes = ["qdBar", "qdPareto", "qdTable", "qdTrend"];
    scopes.forEach(function (id) {
      var root = $(id); if (!root) return;
      var w = D.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), n, hit = [];
      while ((n = w.nextNode())) if (n.nodeValue && n.nodeValue.trim().toLowerCase() === "payload") hit.push(n);
      hit.forEach(function (t) {
        t.nodeValue = t.nodeValue.replace(/payload/i, "ไม่ระบุหมวด");
        var p = t.parentNode;
        if (p && p.setAttribute) p.setAttribute("title", "รายการนี้ไม่มีชื่อหมวด (ในข้อมูลเดิมเรียกว่า “payload”) — ระบบนับรวมในยอดทั้งหมด");
      });
    });
    var sel = $("qdCategory");
    if (sel) Array.prototype.slice.call(sel.options).forEach(function (o) { if (o.text.trim().toLowerCase() === "payload") o.text = "ไม่ระบุหมวด"; });
  }
  function donutPct() {
    var box = $("qdDonut"), lg = $("qdLegend");
    if (!box || !lg) return;
    var svg = box.querySelector("svg");
    if (!svg) return;
    var items = Array.prototype.slice.call(lg.children), vals = [];
    items.forEach(function (el) {
      var base = el.__qe106base != null ? el.__qe106base : (el.__qe106base = tx(el));
      var m = /(\d+)\s*$/.exec(base);
      vals.push(m ? +m[1] : 0);
    });
    var total = vals.reduce(function (a, b) { return a + b; }, 0);
    if (!total) return;
    var vbA = svg.getAttribute("viewBox") || "";
    var sig = vals.join(",") + "|" + vbA;
    if (svg.getAttribute("data-qe106") === sig && svg.querySelector(".qe106-pct")) return;
    items.forEach(function (el, i) {
      var old = el.querySelector(".qe106-lp"); if (old) old.parentNode.removeChild(old);
      var s = D.createElement("b"); s.className = "qe106-lp"; s.textContent = " " + Math.round(vals[i] / total * 100) + "%";
      s.style.cssText = "margin-left:4px;font-weight:800";
      el.appendChild(s);
    });
    Array.prototype.slice.call(svg.querySelectorAll(".qe106-pct")).forEach(function (e) { e.parentNode.removeChild(e); });
    var vb = svg.viewBox && svg.viewBox.baseVal, cx, cy, W, rad, c0 = null;
    Array.prototype.slice.call(svg.querySelectorAll("circle")).forEach(function (c) {
      if (!c0 && +c.getAttribute("r") > 0 && (c.getAttribute("stroke-width") || c.getAttribute("stroke-dasharray"))) c0 = c;
    });
    var bb; try { bb = svg.getBBox(); } catch (e) { bb = null; }
    if (vb && vb.width) { cx = vb.x + vb.width / 2; cy = vb.y + vb.height / 2; W = vb.width; }
    else if (bb) { cx = bb.x + bb.width / 2; cy = bb.y + bb.height / 2; W = bb.width; }
    else return;
    if (c0) { rad = +c0.getAttribute("r"); cx = +c0.getAttribute("cx") || cx; cy = +c0.getAttribute("cy") || cy; }
    else rad = (bb ? Math.min(bb.width, bb.height) : W) / 2 * 0.82;
    var ang = -Math.PI / 2, fs = Math.max(9, W * 0.065);
    vals.forEach(function (v) {
      var f = v / total, mid = ang + f * Math.PI;
      ang += f * 2 * Math.PI;
      if (f < 0.04) return;
      var t = D.createElementNS(NS, "text");
      t.setAttribute("class", "qe106-pct");
      t.setAttribute("x", (cx + rad * Math.cos(mid)).toFixed(1));
      t.setAttribute("y", (cy + rad * Math.sin(mid)).toFixed(1));
      t.setAttribute("text-anchor", "middle"); t.setAttribute("dominant-baseline", "central");
      t.setAttribute("fill", "#fff"); t.setAttribute("stroke", "rgba(0,0,0,.4)"); t.setAttribute("stroke-width", "0.8");
      t.setAttribute("paint-order", "stroke"); t.setAttribute("font-weight", "800"); t.setAttribute("pointer-events", "none");
      t.setAttribute("style", "font-size:" + fs.toFixed(1) + "px");
      t.textContent = Math.round(f * 100) + "%";
      svg.appendChild(t);
    });
    svg.setAttribute("data-qe106", sig);
  }
  function tuneDash() {
    if (tuning) return;
    tuning = true;
    try { if (dashObs) dashObs.disconnect(); } catch (e) {}
    try { renameLabels(); donutPct(); } catch (e) { try { console.warn("[QE106] dashboard", e); } catch (x) {} }
    try { var d = $("qeDash"); if (d && dashObs) dashObs.observe(d, { childList: true, subtree: true, characterData: true }); } catch (e) {}
    tuning = false;
  }
  var tuneT = 0;
  function scheduleTune() { clearTimeout(tuneT); tuneT = setTimeout(tuneDash, 80); }
  function initDash() {
    var d = $("qeDash");
    if (!d || d.__qe106) return !!d;
    d.__qe106 = 1;
    try { dashObs = new MutationObserver(scheduleTune); dashObs.observe(d, { childList: true, subtree: true, characterData: true }); } catch (e) {}
    scheduleTune();
    return true;
  }

  var n = 0, iv = setInterval(function () {
    n++;
    var a = false, b = false;
    try { a = initMascot(); } catch (e) {}
    try { b = initDash(); } catch (e) {}
    if ((a && b) || n > 160) clearInterval(iv);
  }, 500);
  setInterval(function () { if (!D.hidden) { try { initMascot(); initDash(); var d = $("qeDash"); if (d && d.getAttribute("aria-hidden") !== "true") scheduleTune(); } catch (e) {} } }, 3000);
})();


/* ====================== v107 · Tracker › Status: ย่ออีเมลผู้แก้ไขเป็นชื่อเล่น (ชื่อเต็มอยู่ใน tooltip) ====================== */
(function () {
  "use strict";
  if (window.__QE107X) return;
  window.__QE107X = 1;
  var D = document, RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, busy = false, obs = null, t = 0;
  function nick(email) {
    try { if (window.QEPeople && window.QEPeople.display) { var n = window.QEPeople.display(email); if (n && n !== email) return n; } } catch (e) {}
    return null;
  }
  function run() {
    if (busy) return; busy = true;
    try { if (obs) obs.disconnect(); } catch (e) {}
    try {
      var tb = D.getElementById("tb");
      if (tb) {
        var cells = tb.querySelectorAll("tr > td:nth-child(6)");
        Array.prototype.forEach.call(cells, function (td) {
          var w = D.createTreeWalker(td, NodeFilter.SHOW_TEXT, null), n, list = [];
          while ((n = w.nextNode())) if (n.nodeValue && n.nodeValue.indexOf("@") > -1) list.push(n);
          list.forEach(function (node) {
            var full = null;
            var out = node.nodeValue.replace(RE, function (m) { var k = nick(m); if (k) { full = m; return k; } return m; });
            if (out !== node.nodeValue) {
              node.nodeValue = out;
              var p = node.parentNode; if (p && p.setAttribute && full) p.setAttribute("title", "แก้ไขโดย " + full);
            }
          });
        });
      }
    } catch (e) { try { console.warn("[QE107] status", e); } catch (x) {} }
    try { var tb2 = D.getElementById("tb"); if (tb2 && obs) obs.observe(tb2, { childList: true, subtree: true, characterData: true }); } catch (e) {}
    busy = false;
  }
  function sched() { clearTimeout(t); t = setTimeout(run, 120); }
  var n = 0, iv = setInterval(function () {
    n++;
    var tb = D.getElementById("tb");
    if (tb) {
      clearInterval(iv);
      try { obs = new MutationObserver(sched); obs.observe(tb, { childList: true, subtree: true, characterData: true }); } catch (e) {}
      run();
    } else if (n > 120) clearInterval(iv);
  }, 500);
})();
