/*! QE Elec. Daily Job Tracker — sidebar-v105.js
    Sidebar ซ้ายแบบ "กระจก" ของเมนูเดิม (#nvNav): อ่านชื่อ/ไอคอน/ตัวเลข/สถานะจากเมนูเดิม แล้วสั่งงานผ่านปุ่มเดิม
    → ไม่แก้ฟังก์ชันของระบบ · ถ้าสร้างไม่สำเร็จภายใน ~20 วินาที จะถอดคลาส qe105 แล้วกลับไปใช้เมนูบนเดิม */
(function () {
  "use strict";
  if (window.__QE105) return;
  window.__QE105 = 1;
  window.__QE104_SB = true; /* ปิด Sidebar ที่ฝังใน core-v104 (ใช้ตัวนี้แทน) */

  var D = document, de = D.documentElement, KEY = "ux_sb105_collapsed";
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

  var nav = null, sb = null, mid = null, burger = null, back = null, colBtn = null;
  var tabs = [], toolRows = [], U = {}, raf = 0, obs = null, built = false, gearWasOpen = false;
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
  function isOn(s) {
    return s.classList.contains("on") || s.getAttribute("aria-current") === "page" || s.getAttribute("aria-current") === "true" ||
      s.getAttribute("aria-selected") === "true" || s.getAttribute("aria-pressed") === "true";
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

  /* ---------- สร้าง/ซิงก์ ---------- */
  function closeSmall() { if (mq.matches) setDrawer(false); }

  function rebuildMid() {
    mid.textContent = "";
    tabs = []; toolRows = [];
    readGroups().forEach(function (g) {
      var gr = mk("div", "qe105-grp");
      if (g.label) gr.appendChild(mk("div", "qe105-gl", g.label));
      var items = [];
      g.tabs.forEach(function (src) {
        var b = mk("button", "qe105-it"); b.type = "button";
        var ic = mk("span", "qe105-ic", iconOf(src)), t = mk("span", "qe105-tx", labelOf(src)), bd = mk("span", "qe105-bd");
        bd.hidden = true;
        b.appendChild(ic); b.appendChild(t); b.appendChild(bd);
        b.addEventListener("click", function () { try { src.click(); } catch (e) {} closeSmall(); });
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
      if (d.gear) { var dot = mk("span", "qe105-dot"); dot.hidden = true; b.appendChild(dot); o.dot = dot; }
      b.title = d.tip; b.setAttribute("aria-label", d.label + " — " + d.tip);
      if (d.gear) {
        b.setAttribute("aria-haspopup", "menu");
        b.addEventListener("pointerdown", function () { gearWasOpen = menuOpen(); }, true);
        b.addEventListener("click", function (e) {
          e.stopPropagation();
          var want = e.detail === 0 ? !menuOpen() : !gearWasOpen;
          gearWasOpen = false;
          var g = gearSrc();
          if (g && menuOpen() !== want) g.click();
          if (want) rescueMenu();
        });
      } else {
        b.addEventListener("click", function () {
          var el = $(d.id); if (el) el.click();
          closeSmall();
        });
      }
      mid.appendChild(b);
      toolRows.push(o);
    });
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

  function sync() {
    try {
      if (!sb) return;
      if (!nav || !D.contains(nav)) { nav = $("nvNav"); if (!nav) return; hideNav(); }
      var cur = nav.querySelectorAll(".nv-tab"), stale = cur.length !== tabs.length;
      tabs.forEach(function (o) { if (!D.contains(o.src)) stale = true; });
      if (stale) rebuildMid();
      tabs.forEach(function (o) {
        var s = o.src, on = isOn(s);
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
    de.classList.toggle("qe105-open", !!o);
    if (burger) { burger.setAttribute("aria-expanded", String(!!o)); burger.setAttribute("aria-label", o ? "ปิดเมนู" : "เปิดเมนู"); }
  }
  function applyMode() {
    var small = !!mq.matches, pref = ls(KEY), col = pref === null ? window.innerWidth < 1200 : pref === "1";
    de.classList.toggle("qe105-m", small);
    de.classList.toggle("qe105-c", !small && col);
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
    var bt = mk("span", "qe105-bt"); bt.appendChild(mk("b", "", "QE Elec.")); bt.appendChild(mk("small", "", "Daily Job Tracker"));
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
    window.addEventListener("resize", function () { clearTimeout(build._t); build._t = setTimeout(applyMode, 150); });

    hideNav(); rebuildMid(); applyMode(); sync();
    try {
      if (window.MutationObserver) {
        obs = new MutationObserver(schedule);
        obs.observe(nav, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["class", "hidden", "style", "aria-current", "aria-selected", "aria-pressed"] });
      }
    } catch (e) {}
    setInterval(function () { if (!D.hidden) sync(); }, 2000);
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

  window.QE105Sidebar = Object.freeze({
    sync: sync,
    open: function () { setDrawer(true); },
    close: function () { setDrawer(false); },
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
