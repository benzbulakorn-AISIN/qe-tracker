/*! QE Elec. Daily Job Tracker — today-ux-v144.js  (ไฟล์ใหม่ · โหลดต่อจาก core-v125.min.js)
    v144: จัดหน้า "☀️ วันนี้" ใหม่ให้เห็นสิ่งสำคัญในจอแรก
      1) แถบหัวแถวเดียว: ชื่อหน้า · ☐ เฉพาะของฉัน · [+ เพิ่มงานใหม่] · เมนู ⋯ (ปุ่มอื่นทั้งหมดย้ายเข้าไป)
      2) KPI 4 ช่อง กดได้: 🔴 เลยกำหนด · 🟠 ครบวันนี้ · 🟡 ภายใน 3 วัน · 🌴 ไม่อยู่
      3) การ์ด "⚡ ต้องจัดการ" รวม Tracker / Checklist วันนี้ / Q-patrol / Follow-up / Hoshin
         เฉพาะ 🔴 เลยกำหนด + 🟠 ครบวันนี้ เรียงเลยมากสุดก่อน · กรองตามแหล่งได้ · แสดง 6 + ดูทั้งหมด
      4) แถวล่าง: 🗓️ ประชุมวันนี้ | 🌴 คนไม่อยู่ (การ์ดเดิมของระบบ ย้ายมาวางคู่กัน)
      5) ส่วนพับ: 🟡 ภายใน 3 วัน / กำลังจะถึง (รวม Hoshin Milestone ที่ยังไม่ถึง) + 📝 Checklist ค้างจากวันก่อน
      6) ปุ่มเปิด/ปิดภาพเคลื่อนไหวพื้นหลัง (ดาว/จรวด) ในหน้านี้ — จำค่าในเครื่อง (ux_today_motion)
    วิธีทำงาน: core สร้างหน้าใหม่ทั้งหน้าใน #viewToday ทุกครั้ง → MutationObserver จัดหน้าใหม่ก่อนหน้าจอวาด
      อ่านข้อมูลจาก #viewToday._S (ข้อมูลที่ core คำนวณแล้ว) อย่างเดียว · ทุกแถว/ปุ่มยังอยู่ใน #viewToday
      → ปุ่ม data-td เดิม (✓ / 📅 / เปิด… / คัดลอก / รีเฟรช / Backup) ใช้ตัวรับคลิกเดิมของ core ทั้งหมด
    ไม่แตะ: ข้อมูล / localStorage key เดิม / Cloud Sync / Backup / LINE / Teams / Scheduled Summary
    ไม่มี network และไม่มี dependency ภายนอก */
(function () {
  "use strict";
  if (window.__QE144_TODAY_UX) return;
  window.__QE144_TODAY_UX = true;

  var D = document, MOTION_KEY = "ux_today_motion", SHOW = 6;
  var ST = { filter: "", src: "", all: false, fold: false };
  var C = null, busy = false, mo = null;

  function diag(e) { try { window.QE86Diagnostics && window.QE86Diagnostics.capture(e, "today-ux-v144"); } catch (_) {} }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function clip(s, n) { s = String(s == null ? "" : s).replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; }
  function first(s) { return String(s || "").split("\n")[0]; }
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function fd(s) { return /^\d{4}-\d{2}-\d{2}$/.test(String(s || "")) ? +s.slice(8) + "-" + MON[+s.slice(5, 7) - 1] : "–"; }
  function todayStr() { try { return typeof today === "string" ? today : ""; } catch (_) { return ""; } }
  function daysAgo(ds) { try { return dayNum(todayStr()) - dayNum(ds); } catch (_) { return 0; } }
  function when(n) {
    if (n < 0) return { t: "เลย " + -n + " วัน", c: "late" };
    if (n === 0) return { t: "วันนี้", c: "today" };
    return { t: "อีก " + n + " วัน", c: n <= 3 ? "soon" : "ok" };
  }
  function motionOn() { try { return localStorage.getItem(MOTION_KEY) !== "0"; } catch (_) { return true; } }
  function attr(o) { return Object.keys(o).map(function (k) { return k + '="' + esc(o[k]) + '"'; }).join(" "); }

  /* ---------- CSS ---------- */
  var CSS = [
    "#viewToday.tx-on .td-head,#viewToday.tx-on .td-tools,#viewToday.tx-on .td-kpis,#viewToday.tx-on .td-ok,#viewToday.tx-on .tx-hide{display:none!important}",
    "#viewToday.tx-on .td-grid{display:none!important}",
    "@media(min-width:901px){#viewToday.tx-on{padding-right:64px}}",
    "body.tx-still #qe89Galaxy{display:none!important}",
    "#viewToday .td-sys{padding:5px 10px;margin:0 0 8px;font-size:12.5px}",
    "#viewToday .td-sys button{min-height:32px}",
    /* bar */
    ".tx-bar{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;margin:0 0 12px}",
    ".tx-bar h1{margin:0;font-size:24px;line-height:1.2;flex:1 1 auto;min-width:0}",
    ".tx-bar label{display:inline-flex;align-items:center;gap:6px;margin:0;font-size:14px;color:var(--txt);cursor:pointer;min-height:40px}",
    ".tx-bar label input{width:18px;height:18px;margin:0}",
    ".tx-bar .tx-add{min-height:40px;padding:8px 16px!important;font-size:14px!important;font-weight:800;animation:none!important}",
    ".tx-menu{position:relative}",
    ".tx-menu>summary{list-style:none;display:inline-flex;align-items:center;justify-content:center;min-width:40px;min-height:40px;border:1px solid var(--line);border-radius:10px;background:var(--card);color:var(--txt);font-size:20px;font-weight:900;cursor:pointer;user-select:none}",
    ".tx-menu>summary::-webkit-details-marker{display:none}",
    ".tx-menu>summary:focus-visible{outline:3px solid var(--ring,#93c5fd);outline-offset:2px}",
    ".tx-pop{position:absolute;right:0;top:calc(100% + 6px);z-index:60;display:flex;flex-direction:column;gap:4px;min-width:240px;padding:8px;border:1px solid var(--line);border-radius:12px;background:var(--pop,#fff);box-shadow:0 12px 32px var(--shp,rgba(0,0,0,.25))}",
    ".tx-pop>button,.tx-pop>label{display:flex!important;align-items:center;gap:8px;width:100%;min-height:40px;margin:0!important;padding:8px 12px!important;border:0!important;border-radius:8px!important;background:transparent!important;box-shadow:none!important;color:var(--txt)!important;font-size:14px!important;font-weight:600;text-align:left;cursor:pointer;animation:none!important}",
    ".tx-pop>button:hover,.tx-pop>label:hover{background:var(--soft2)!important}",
    ".tx-pop hr{border:0;border-top:1px solid var(--line);margin:4px 0}",
    /* kpi */
    ".tx-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:0 0 12px}",
    ".tx-k{display:flex;align-items:center;gap:12px;min-height:64px;padding:10px 14px;border:1px solid var(--line);border-left:6px solid var(--kc);border-radius:14px;background:var(--card);color:var(--txt);box-shadow:0 1px 4px var(--sh);text-align:left;cursor:pointer;font:inherit}",
    ".tx-k:hover{border-color:var(--kc)}",
    ".tx-k:focus-visible{outline:3px solid var(--ring,#93c5fd);outline-offset:2px}",
    ".tx-k.on{background:color-mix(in srgb,var(--kc) 14%,var(--card));box-shadow:0 0 0 2px var(--kc)}",
    ".tx-k b{font-size:28px;line-height:1;min-width:38px;color:var(--kt)}",
    ".tx-k span{display:flex;flex-direction:column;font-size:14px;font-weight:700;line-height:1.3}",
    ".tx-k small{font-size:12px;font-weight:600;color:var(--mut)}",
    ".tx-k.late{--kc:#dc2626;--kt:var(--t-dang,#b91c1c)}.tx-k.today{--kc:#ea580c;--kt:#c2410c}.tx-k.soon{--kc:#eab308;--kt:var(--t-warn,#a16207)}.tx-k.leave{--kc:#0d9488;--kt:#0f766e}",
    /* main card */
    ".tx-card{border:1px solid var(--line);border-radius:14px;background:var(--card);box-shadow:0 1px 4px var(--sh);padding:12px 14px;margin:0 0 12px;min-width:0}",
    ".tx-main{border-top:4px solid #dc2626}",
    ".tx-hd{display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;margin:0 0 6px}",
    ".tx-hd h3{margin:0;font-size:17px;flex:1 1 auto}",
    ".tx-hd h3 .tx-n{display:inline-block;margin-left:6px;padding:1px 10px;border-radius:99px;background:rgba(239,68,68,.18);color:var(--t-dang,#b91c1c);font-size:13px}",
    ".tx-chips{display:flex;flex-wrap:wrap;gap:6px}",
    ".tx-chip{min-height:34px;padding:4px 12px;border:1px solid var(--line);border-radius:99px;background:transparent;color:var(--txt);font-size:13px;font-weight:700;cursor:pointer}",
    ".tx-chip.on{background:var(--pri);border-color:var(--pri);color:var(--on-pri,#fff)}",
    ".tx-chip:focus-visible{outline:3px solid var(--ring,#93c5fd);outline-offset:2px}",
    ".tx-list .td-it{grid-template-columns:96px minmax(0,1fr) auto;min-height:44px;padding:4px}",
    ".tx-list .td-dt{font-size:13px;padding:5px 4px}",
    ".tx-list .td-tx b{font-size:14.5px;-webkit-line-clamp:1}",
    ".tx-list .td-tx small{font-size:13px}",
    ".tx-src{display:inline-block;margin-right:6px;padding:0 7px;border-radius:6px;border:1px solid var(--line);background:var(--soft2);color:var(--mut);font-size:11.5px;font-weight:800;vertical-align:1px}",
    ".tx-list .td-ac button{min-height:36px;min-width:40px;padding:4px 10px;font-size:13px}",
    ".tx-go{display:inline-flex;align-items:center;min-height:36px;padding:0 6px;color:var(--mut);font-size:13px;font-weight:700;white-space:nowrap}",
    ".tx-empty{padding:18px 6px;color:var(--t-ok,#15803d);font-weight:700;text-align:center}",
    ".tx-more{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:8px}",
    ".tx-more button{min-height:36px;padding:5px 12px;font-size:13px}",
    ".tx-more .tx-all{margin-right:auto;font-weight:800}",
    /* bottom row */
    ".tx-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:0 0 12px;align-items:stretch}",
    ".tx-row>.td-card{display:flex;flex-direction:column;margin:0;height:100%;box-sizing:border-box}",
    ".tx-row>.td-card .td-more{margin-top:auto;padding-top:8px}",
    ".tx-row .td-card .td-ds{display:none}",
    /* fold */
    ".tx-fold{margin:0 0 12px}",
    ".tx-fold>summary{list-style:none;display:flex;align-items:center;gap:10px;min-height:48px;padding:8px 14px;border:1px solid var(--line);border-radius:14px;background:var(--card);box-shadow:0 1px 4px var(--sh);font-size:15px;font-weight:800;cursor:pointer}",
    ".tx-fold>summary::-webkit-details-marker{display:none}",
    ".tx-fold>summary::before{content:'▸';color:var(--mut)}",
    ".tx-fold[open]>summary::before{content:'▾'}",
    ".tx-fold>summary small{font-weight:600;color:var(--mut)}",
    ".tx-fold>summary:focus-visible{outline:3px solid var(--ring,#93c5fd);outline-offset:2px}",
    ".tx-fgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:10px}",
    ".tx-fgrid .tx-card{margin:0}",
    ".tx-fgrid h4{margin:0 0 6px;font-size:15px}",
    /* mobile */
    "@media(max-width:900px){.tx-row,.tx-fgrid{grid-template-columns:1fr}}",
    "@media(max-width:640px){.tx-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.tx-bar h1{font-size:20px;flex-basis:100%}.tx-list .td-it{grid-template-columns:82px minmax(0,1fr)}.tx-list .td-ac{grid-column:1/-1;justify-content:flex-end}.tx-list .td-ac:has(.tx-go){display:none}.tx-pop{right:-4px;min-width:220px}}",
    "@media(prefers-reduced-motion:reduce){body.tx-today-view #qe89Galaxy .qe89-star,body.tx-today-view #qe89Galaxy .qe89-rocket{animation:none!important}}"
  ].join("\n");
  function injectCss() {
    if (D.getElementById("qe144TodayCss")) return;
    var st = D.createElement("style"); st.id = "qe144TodayCss"; st.textContent = CSS; D.head.appendChild(st);
  }

  /* ---------- หาการ์ดเดิมจากหัวข้อ ---------- */
  function cards() {
    var out = {};
    Array.prototype.forEach.call(C.querySelectorAll(".td-card"), function (c) {
      var h = c.querySelector("h3"); if (!h) return;
      var t = h.textContent || "";
      if (/ประชุม/.test(t)) out.meet = c;
      else if (/Tracker/.test(t)) out.tr = c;
      else if (/Checklist/.test(t)) out.ck = c;
      else if (/Q-patrol/i.test(t)) out.qp = c;
      else if (/Follow-up/i.test(t)) out.fu = c;
      else if (/Hoshin/i.test(t)) out.hs = c;
      else if (/ไม่อยู่|แผนลา/.test(t)) out.lv = c;
    });
    return out;
  }

  /* ---------- รวบรวมรายการจากข้อมูลที่ core คำนวณแล้ว ---------- */
  function rowHtml(r) {
    return '<div class="td-it tx-it" ' + r.attrs + ' data-tx-src="' + r.src + '">' +
      '<div class="td-dt ' + r.w.c + '">' + esc(r.w.t) + "</div>" +
      '<div class="td-tx"><b title="' + esc(r.full || "") + '"><span class="tx-src">' + esc(r.label) + "</span>" + r.title + "</b><small>" + r.sub + "</small></div>" +
      '<div class="td-ac">' + (r.btns || '<span class="tx-go" aria-hidden="true">เปิด ›</span>') + "</div></div>";
  }
  function collect(S) {
    var all = [], i = 0, td = todayStr();
    (S.tr || []).forEach(function (x) {
      var d = x.d || {}, n = +x.n; if (!isFinite(n)) return;
      all.push({ n: n, o: i++, src: "tr", label: "Tracker", w: when(n), full: first(d.issue),
        attrs: attr({ "data-td": "go", "data-id": d.id }),
        title: esc(clip(first(d.issue), 90)),
        sub: esc((d.owner || "-") + " · " + (first(d.cm) ? clip(first(d.cm), 70) : "ยังไม่มี Countermeasure") + (d.revs && d.revs.length ? " · Rev." + d.revs.length : "")),
        btns: '<button type="button" data-td="done" data-id="' + esc(d.id) + '" title="ทำเสร็จแล้ว" aria-label="ทำเสร็จแล้ว">✓ เสร็จ</button>' +
              '<button type="button" data-td="rev" data-id="' + esc(d.id) + '" title="เลื่อนกำหนด (Rev.)" aria-label="เลื่อนกำหนด">📅 เลื่อน</button>' });
    });
    var ck = S.ck || {}, own = function (r) { try { return window.__checklist && window.__checklist.ownerName ? window.__checklist.ownerName(r) : (r && r.owner) || "QE All"; } catch (_) { return "QE All"; } };
    (ck.pend || []).forEach(function (r) {
      all.push({ n: 0, o: i++, src: "ck", label: "Checklist", w: when(0), full: r.t,
        attrs: attr({ "data-td": "ck", "data-ds": td }), title: esc(clip(r.t, 90)),
        sub: esc("👤 " + own(r) + (r.n ? " · " + clip(r.n, 60) : "")) });
    });
    (S.qp || []).forEach(function (x) {
      var n = +x.n, it = x.it || {}, e = x.e || {}; if (!isFinite(n)) return;
      var lbl = "Q-Patrol";
      try { var org = C.querySelector('[data-td="qp"][data-it="' + it.id + '"][data-ev="' + e.id + '"] .td-tx b'); if (org) lbl = (org.textContent || "").replace(/^\s*[^·]*·\s*/, "").split(" · ")[0] || lbl; } catch (_) {}
      all.push({ n: n, o: i++, src: "qp", label: "Q-patrol", w: when(n), full: it.topic,
        attrs: attr({ "data-td": "qp", "data-it": it.id, "data-ev": e.id }),
        title: esc((it.line || "") + " · " + lbl),
        sub: esc(fd(e.pd) + " · " + clip(it.topic, 50) + " · " + (it.inc || "-")) });
    });
    (S.fu || []).forEach(function (x) {
      var n = +x.n, it = x.it || {}; if (!isFinite(n)) return;
      all.push({ n: n, o: i++, src: "fu", label: "Follow-up", w: when(n), full: it.task,
        attrs: attr({ "data-td": "fu", "data-pk": x.pk, "data-cat": x.cat, "data-ins": x.ins || "", "data-name": x.name }),
        title: esc((x.name || "") + " · " + (it.no || "") + " " + clip(it.task, 60)),
        sub: esc("Owner: " + (it.owner || "-") + " · Plan " + fd(it.target) + (it.rev ? " · Rev." + it.rev : "")) });
    });
    (S.hs || []).forEach(function (x) {
      var n = +x.n, t = x.t || {}; if (!isFinite(n)) return;
      var w = x.ms ? (n === 0 ? { t: "วันนี้", c: "today" } : { t: "อีก " + n + " วัน", c: "ok" }) : when(n);
      all.push({ n: n, o: i++, src: "hs", label: "Hoshin", w: w, ms: !!x.ms,
        full: x.ms ? x.label : (x.lines || []).join(", "),
        attrs: attr({ "data-td": "hs", "data-t": t.id }),
        title: esc(x.ms ? "◇ " + (x.label || "") : clip((x.lines || []).join(", "), 80)),
        sub: esc((t.short || t.name || "") + " · " + fd(x.date)) });
    });
    all.sort(function (a, b) { return a.n - b.n || a.o - b.o; });
    return {
      now: all.filter(function (r) { return r.w.c === "late" || r.w.c === "today"; }),
      next: all.filter(function (r) { return r.w.c === "soon" || r.w.c === "ok"; }),
      carry: (ck.carry || []).map(function (c) {
        var r = c.r || {};
        return { html: rowHtml({ src: "ck", label: "Checklist", w: { t: daysAgo(c.ds) + " วันก่อน", c: "soon" }, full: r.t,
          attrs: attr({ "data-td": "ck", "data-ds": c.ds }), title: esc(clip(r.t, 90)),
          sub: esc("👤 " + own(r) + " · " + fd(c.ds) + (r.n ? " · " + clip(r.n, 50) : "")) }) };
      })
    };
  }

  /* ---------- สร้างหน้า ---------- */
  function kpiNums() {
    var ks = C.querySelectorAll(".td-kpis .td-k b"), v = function (i) { return ks[i] ? (ks[i].textContent || "0").trim() : "0"; };
    return { late: v(0), today: v(1), soon: v(2), leave: v(4) };
  }
  function buildBar() {
    var head = C.querySelector(".td-head"), tools = C.querySelector(".td-tools");
    var bar = D.createElement("div"); bar.className = "tx-bar";
    var h1 = head && head.querySelector("h1");
    var h = D.createElement("h1"); h.textContent = h1 ? (h1.textContent || "").replace(/วัน(จันทร์|อังคาร|พุธ|พฤหัสบดี|ศุกร์|เสาร์|อาทิตย์)/, function (m, d) { return { "จันทร์": "จ.", "อังคาร": "อ.", "พุธ": "พ.", "พฤหัสบดี": "พฤ.", "ศุกร์": "ศ.", "เสาร์": "ส.", "อาทิตย์": "อา." }[d]; }) : "☀️ วันนี้";
    bar.appendChild(h);
    var menu = D.createElement("details"); menu.className = "tx-menu";
    menu.innerHTML = '<summary aria-label="เมนูเพิ่มเติม" title="เมนูเพิ่มเติม">⋯</summary><div class="tx-pop" role="menu"></div>';
    var pop = menu.querySelector(".tx-pop");
    if (tools) {
      var mine = tools.querySelector("#tdMine"), mineLbl = mine && mine.closest("label");
      var add = tools.querySelector('[data-td="add"]');
      if (mineLbl) bar.appendChild(mineLbl);
      if (add) { add.classList.add("tx-add"); bar.appendChild(add); }
      Array.prototype.slice.call(tools.querySelectorAll("button,label")).forEach(function (el) {
        if (el === add || el === mineLbl || (mineLbl && mineLbl.contains(el))) return;
        el.setAttribute("role", "menuitem"); pop.appendChild(el);
      });
    }
    var hr = D.createElement("hr"); pop.appendChild(hr);
    var mb = D.createElement("button"); mb.type = "button"; mb.setAttribute("data-tx", "motion"); mb.setAttribute("role", "menuitem");
    mb.textContent = motionOn() ? "✨ ภาพเคลื่อนไหวพื้นหลัง: เปิด" : "✨ ภาพเคลื่อนไหวพื้นหลัง: ปิด";
    pop.appendChild(mb);
    bar.appendChild(menu);
    return bar;
  }
  function buildKpis(k) {
    var w = D.createElement("div"); w.className = "tx-kpis"; w.setAttribute("role", "group"); w.setAttribute("aria-label", "สรุปจำนวนงาน");
    var item = function (key, num, t, s) {
      return '<button type="button" class="tx-k ' + key + (ST.filter === key ? " on" : "") + '" data-tx="kpi" data-k="' + key + '" aria-pressed="' + (ST.filter === key) + '">' +
        "<b>" + esc(num) + "</b><span>" + t + "<small>" + s + "</small></span></button>";
    };
    w.innerHTML = item("late", k.late, "🔴 เลยกำหนด", "ทุกแท็บ") + item("today", k.today, "🟠 ครบวันนี้", "ทุกแท็บ") +
      item("soon", k.soon, "🟡 ภายใน 3 วัน", "ทุกแท็บ · กดเพื่อกาง") + item("leave", k.leave, "🌴 ไม่อยู่วันนี้", "ลา / อบรม / H");
    return w;
  }
  function buildMain(list) {
    var rows = list.now.filter(function (r) {
      return (!ST.filter || ST.filter === "soon" || ST.filter === "leave" || r.w.c === ST.filter) && (!ST.src || r.src === ST.src);
    });
    var cnt = {}; list.now.forEach(function (r) { cnt[r.src] = (cnt[r.src] || 0) + 1; });
    var srcs = [["", "ทั้งหมด", list.now.length], ["tr", "Tracker"], ["ck", "Checklist"], ["qp", "Q-patrol"], ["fu", "Follow-up"], ["hs", "Hoshin"]];
    var chips = srcs.filter(function (s) { return s[0] === "" || cnt[s[0]]; }).map(function (s) {
      var n = s[0] === "" ? s[2] : cnt[s[0]];
      return '<button type="button" class="tx-chip' + (ST.src === s[0] ? " on" : "") + '" data-tx="src" data-s="' + s[0] + '" aria-pressed="' + (ST.src === s[0]) + '">' + s[1] + " " + n + "</button>";
    }).join("");
    var shown = ST.all ? rows : rows.slice(0, SHOW);
    var sec = D.createElement("section"); sec.className = "tx-card tx-main"; sec.setAttribute("aria-labelledby", "txMainH");
    sec.innerHTML = '<div class="tx-hd"><h3 id="txMainH">⚡ ต้องจัดการ<span class="tx-n">' + rows.length + "</span></h3>" +
      (list.now.length ? '<div class="tx-chips" role="group" aria-label="กรองตามแหล่งที่มา">' + chips + "</div>" : "") + "</div>" +
      '<div class="tx-list">' + (shown.length ? shown.map(rowHtml).join("") : '<div class="tx-empty">🎉 ไม่มีงานเลยกำหนดหรือครบกำหนดวันนี้' + (ST.filter || ST.src ? " ในตัวกรองนี้" : "") + "</div>") + "</div>" +
      '<div class="tx-more">' + (rows.length > SHOW ? '<button type="button" class="btn-g tx-all" data-tx="all" aria-expanded="' + ST.all + '">' + (ST.all ? "ย่อรายการ ▴" : "ดูทั้งหมด (" + rows.length + ") ▾") + "</button>" : '<span class="tx-all"></span>') +
      '<button type="button" class="btn-g" data-td="trview" data-v="">📊 เปิด Tracker</button>' +
      '<button type="button" class="btn-g" data-td="qpall">🔎 แผน Q-patrol</button>' +
      '<button type="button" class="btn-g" data-td="hs" data-t="dash">🧭 เปิด Hoshin</button></div>';
    return sec;
  }
  function buildFold(list) {
    var d = D.createElement("details"); d.className = "tx-fold"; if (ST.fold) d.open = true;
    var ckToday = (C._S && C._S.ck) || {}, total = (ckToday.today || []).length;
    d.innerHTML = '<summary data-tx="fold">🟡 ภายใน 3 วัน / กำลังจะถึง (' + list.next.length + ')<small>· 📝 Checklist ค้างจากวันก่อน ' + list.carry.length +
      (total ? " · Checklist วันนี้เสร็จ " + (ckToday.done || 0) + "/" + total : "") + "</small></summary>" +
      '<div class="tx-fgrid">' +
      '<section class="tx-card"><h4>🟡 ภายใน 3 วัน / กำลังจะถึง</h4><div class="tx-list">' +
      (list.next.length ? list.next.map(rowHtml).join("") : '<div class="td-empty">ไม่มีงานที่กำลังจะถึง</div>') + "</div></section>" +
      '<section class="tx-card"><h4>📝 Checklist ค้างจากวันก่อน</h4><div class="tx-list">' +
      (list.carry.length ? list.carry.map(function (c) { return c.html; }).join("") : '<div class="td-empty">ไม่มีงานค้างจากวันก่อน</div>') + "</div>" +
      '<div class="tx-more"><button type="button" class="btn-g" data-td="ck" data-ds="' + esc(todayStr()) + '">📝 เปิด Checklist วันนี้</button></div></section>' +
      "</div>";
    return d;
  }

  function restructure() {
    if (!C || !C.querySelector(".td-head")) return;
    if (C.querySelector(":scope > .tx-bar")) { placeLate(); return; }
    var S = C._S;
    if (!S) return;
    var list = collect(S), k = kpiNums(), cs = cards();
    var frag = D.createDocumentFragment();
    frag.appendChild(buildBar());
    frag.appendChild(buildKpis(k));
    frag.appendChild(buildMain(list));
    var row = D.createElement("div"); row.className = "tx-row";
    if (cs.meet) row.appendChild(cs.meet);
    if (cs.lv) row.appendChild(cs.lv);
    frag.appendChild(row);
    frag.appendChild(buildFold(list));
    ["tr", "ck", "qp", "fu", "hs"].forEach(function (key) { if (cs[key]) cs[key].classList.add("tx-hide"); });
    var sys = C.querySelector(":scope > .td-sys");
    var anchor = sys ? sys.nextSibling : C.firstChild;
    C.insertBefore(frag, anchor);
    C.classList.add("tx-on");
  }
  /* การ์ดประชุมอาจถูกเพิ่มทีหลังโดยส่วนเสริมประชุม → ย้ายเข้าแถวล่าง */
  function placeLate() {
    var row = C.querySelector(":scope > .tx-row"); if (!row) return;
    var cs = cards();
    if (cs.meet && cs.meet.parentNode !== row) row.insertBefore(cs.meet, row.firstChild);
    if (cs.lv && cs.lv.parentNode !== row) row.appendChild(cs.lv);
  }

  function run() {
    if (busy || !C) return;
    busy = true;
    try { if (mo) mo.disconnect(); restructure(); }
    catch (e) { diag(e); C.classList.remove("tx-on"); }
    finally { if (mo) { mo.takeRecords(); mo.observe(C, { childList: true, subtree: true }); } busy = false; }
  }
  function applyMotion() {
    var onToday = C && C.style.display === "block";
    D.body.classList.toggle("tx-today-view", !!onToday);
    D.body.classList.toggle("tx-still", !!onToday && !motionOn());
  }

  /* ---------- คลิก (เฉพาะปุ่มของไฟล์นี้ — ปุ่ม data-td ปล่อยให้ core จัดการ) ---------- */
  function onClick(e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var popBtn = t.closest(".tx-pop button");
    if (popBtn) { var om = popBtn.closest(".tx-menu"); setTimeout(function () { if (om) om.open = false; }, 0); }
    var b = t.closest("[data-tx]");
    if (!b) return;
    var a = b.getAttribute("data-tx");
    if (a === "kpi") {
      var k = b.getAttribute("data-k");
      if (k === "soon") { ST.fold = true; var f = C.querySelector(".tx-fold"); if (f) { f.open = true; f.scrollIntoView({ behavior: "smooth", block: "start" }); } return; }
      if (k === "leave") { var lv = cards().lv; if (lv) lv.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
      ST.filter = ST.filter === k ? "" : k; ST.all = false; rebuildMain(); return;
    }
    if (a === "src") { ST.src = b.getAttribute("data-s") || ""; ST.all = false; rebuildMain(); return; }
    if (a === "all") { ST.all = !ST.all; rebuildMain(); return; }
    if (a === "motion") {
      try { localStorage.setItem(MOTION_KEY, motionOn() ? "0" : "1"); } catch (_) {}
      b.textContent = motionOn() ? "✨ ภาพเคลื่อนไหวพื้นหลัง: เปิด" : "✨ ภาพเคลื่อนไหวพื้นหลัง: ปิด";
      applyMotion();
      var m = b.closest(".tx-menu"); if (m) m.open = false;
    }
  }
  function rebuildMain() {
    if (!C._S) return;
    busy = true;
    try {
      if (mo) mo.disconnect();
      var list = collect(C._S);
      var oldMain = C.querySelector(":scope > .tx-main"), oldK = C.querySelector(":scope > .tx-kpis");
      if (oldK) oldK.replaceWith(buildKpis(kpiNums()));
      if (oldMain) {
        var focusSel = D.activeElement && D.activeElement.getAttribute && D.activeElement.getAttribute("data-tx") ? '[data-tx="' + D.activeElement.getAttribute("data-tx") + '"]' + (D.activeElement.getAttribute("data-s") != null ? '[data-s="' + D.activeElement.getAttribute("data-s") + '"]' : D.activeElement.getAttribute("data-k") ? '[data-k="' + D.activeElement.getAttribute("data-k") + '"]' : "") : "";
        var nm = buildMain(list); oldMain.replaceWith(nm);
        if (focusSel) { var f = C.querySelector(focusSel); if (f) f.focus({ preventScroll: true }); }
      }
    } catch (e) { diag(e); }
    finally { if (mo) { mo.takeRecords(); mo.observe(C, { childList: true, subtree: true }); } busy = false; }
  }

  function boot() {
    C = D.getElementById("viewToday");
    if (!C) return false;
    injectCss();
    mo = new MutationObserver(function () { run(); });
    mo.observe(C, { childList: true, subtree: true });
    new MutationObserver(applyMotion).observe(C, { attributes: true, attributeFilter: ["style"] });
    C.addEventListener("click", onClick);
    C.addEventListener("toggle", function (e) { if (e.target && e.target.classList && e.target.classList.contains("tx-fold")) ST.fold = e.target.open; }, true);
    D.addEventListener("click", function (e) {
      var m = C.querySelector(".tx-menu[open]");
      if (m && !m.contains(e.target)) m.open = false;
    });
    D.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      var m = C.querySelector(".tx-menu[open]");
      if (m) { m.open = false; var s = m.querySelector("summary"); if (s) s.focus(); }
    });
    run(); applyMotion();
    window.QE144TodayUX = Object.freeze({ version: "v144", refresh: run });
    return true;
  }
  if (!boot()) {
    var n = 0, t = setInterval(function () { if (boot() || ++n > 60) clearInterval(t); }, 250);
  }
})();
