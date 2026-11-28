/*! QE Elec. Daily Job Tracker — tracker-ux-v153.js  (แทน tracker-ux-v152.js · โหลดต่อจาก tracker-toolbar-v131.js / tracker-edit-v142.js)
    v152: จัดหน้า "📊 Tracker" ใหม่ให้ตารางงานขึ้นก่อน (รอบที่ 1)
      1) แท็บมุมมองบนสุด: [📋 รายการ] [📅 ปฏิทิน] [📈 ภาพรวม] + ปุ่มหลัก [+ เพิ่มงาน]
         - เปิดหน้า Tracker ทุกครั้ง = 📋 รายการ (แถบกรองด่วน + ค้นหา/ตัวกรอง + ตาราง ขึ้นทันที)
         - 📅 ปฏิทิน = ปฏิทินเดิม (คลิกวัน = เพิ่มงานวันนั้น · คลิกงาน = ไปที่แถว)
         - 📈 ภาพรวม = การ์ดตัวเลข + กราฟ + ตัวชี้วัด + สรุปตามผู้แจ้ง (ของเดิมทั้งหมด)
      2) ฟอร์มเพิ่ม/แก้ไขงาน (#f เดิม) เปิดเป็นหน้าต่างเมื่อกด [+ เพิ่มงาน] / คลิกวันในปฏิทิน / "เปิดฟอร์มเดิม"
         / "➕ เพิ่มงานใหม่" จากหน้าวันนี้ / "→ Tracker" จาก Checklist · ปิดเองหลังบันทึกสำเร็จ · Esc / ✕ / ยกเลิก = ปิด
      3) ปุ่มในแต่ละแถว: เห็น [✓ เสร็จ] [📅 เลื่อน] [✎ แก้ไข] พร้อมคำกำกับ
         ปุ่มอื่น (⧉ คัดลอก · 📤 ส่ง · 🗑 ลบ) ย้ายเข้าเมนู [⋯] ของแถว (🗑 อยู่ล่างสุด สีแดง)
    v153: 4) แก้หน้าต่างฟอร์มเบลอ/กดไม่ได้ — ฉากหลังอยู่ทับฟอร์ม (กล่องเนื้อหามี stacking context ของตัวเอง)
             → วางฉากหลังไว้ในกล่องเดียวกับฟอร์ม และยกกล่องเนื้อหาขึ้นเหนือ Sidebar/ปุ่มลอยชั่วคราวขณะเปิดฟอร์ม
          5) แบ่งบล็อกตามมุมมองให้แม่นขึ้น (หาจากปุ่ม/หัวข้อจริง แล้วไล่ขึ้นหากล่องของมันเอง)
             📋 รายการ ไม่มีชื่อหน้า/Cloud/ตัวชี้วัด · 📈 ภาพรวม ไม่มีกล่องว่าง "ไปที่ตาราง"
          6) แถบค้นหา/กรองใหม่ในหน้ารายการ (เข้าใจง่าย 2 แถว):
             แถว 1 = สถานะ: [ทั้งหมด] [🔴 เลยกำหนด] [🟠 ครบวันนี้] [🟡 ภายใน 3 วัน] [✅ เสร็จแล้ว] (มีตัวเลข)
             แถว 2 = ค้นหา + ผู้รับผิดชอบ + ☰ ตัวกรอง (ของ v131 เดิม) · ตัวเลือก "สถานะ" ซ้ำถูกซ่อน
             แถวปุ่มเดิม (ประเภทงาน · ของฉัน · ฉันคือ · ซ่อน Done เก่า · ย้อนกลับ · กู้ข้อมูล) พับไว้ใน "🏷 ประเภทงาน / ตัวเลือกเพิ่มเติม"
             ปุ่มสถานะกด = กดปุ่มเดิมของระบบ (เลยกำหนด/ครบวันนี้/ภายใน 3 วัน/ทั้งหมด) · เสร็จแล้ว = ตัวเลือกสถานะเดิม "Done"
    วิธีทำงาน: ย้าย/ซ่อน/แสดงองค์ประกอบเดิมเท่านั้น — ปุ่มทุกปุ่มยังเป็นปุ่มเดิม ใช้ตัวรับคลิกเดิมของ core / v131 / v142
    ไม่แตะ: ข้อมูล / localStorage key เดิม / Cloud Sync / Backup / Rev. / ถังขยะ / LINE / Teams / Scheduled Summary
    ไม่มี network และไม่มี dependency ภายนอก */
(function () {
  "use strict";
  if (window.__QE153_TRACKER_UX) return;
  window.__QE153_TRACKER_UX = true;
  window.__QE152_TRACKER_UX = true;

  var D = document, V = null, MODE = "list", formOpen = false, busy = false;
  var KEEP = { toggle: 1, openRev: 1, edit: 1 };
  var LABEL = { toggle: "เสร็จ", openRev: "เลื่อน", edit: "แก้ไข" };
  function $(id) { return D.getElementById(id); }
  function diag(e, c) { try { window.QE86Diagnostics && window.QE86Diagnostics.capture(e, c || "tracker-ux-v153"); } catch (_) {} }
  function txt(n) { return String((n && n.textContent) || "").replace(/\s+/g, " ").trim(); }
  function anyModal() { return !!D.querySelector(".ov.on,.qe134-ov:not([hidden]),.qe84-dialog"); }

  /* ---------- CSS ---------- */
  var P = "#viewTracker";
  var CSS = [
    ".tk-bar{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:0 0 14px}",
    ".tk-tabs{display:inline-flex;gap:4px;padding:4px;border:1px solid var(--line,#cbd5e1);border-radius:14px;background:var(--card,#fff);box-shadow:0 1px 4px var(--sh,rgba(0,0,0,.06))}",
    ".tk-tab{display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:6px 16px;border:0;border-radius:10px;background:transparent;color:var(--mut,#64748b);font:inherit;font-size:14.5px;font-weight:750;cursor:pointer;white-space:nowrap}",
    ".tk-tab:hover{color:var(--txt,#1e293b);background:var(--soft2,#f1f5f9)}",
    ".tk-tab[aria-selected=true]{background:var(--pri,#6d28d9);color:var(--on-pri,#fff)}",
    ".tk-tab:focus-visible,.tk-add:focus-visible,.tk-more>summary:focus-visible,.tk-x:focus-visible{outline:3px solid var(--ring,#93c5fd);outline-offset:2px}",
    ".tk-grow{flex:1 1 auto}",
    ".tk-add{display:inline-flex;align-items:center;gap:6px;min-height:42px;padding:8px 18px;border:0;border-radius:12px;background:var(--pri,#6d28d9);color:var(--on-pri,#fff);font:inherit;font-size:14.5px;font-weight:800;cursor:pointer;box-shadow:0 6px 16px color-mix(in srgb,var(--pri,#6d28d9) 30%,transparent)}",
    ".tk-add:hover{filter:brightness(1.08)}",
    /* มุมมอง */
    P + ".tk-m-list .top," + P + ".tk-m-list #fStatus," + P + ".tk-m-list #calBox," + P + ".tk-m-list #calTip," + P + ".tk-m-list #ownBox," + P + ".tk-m-list [data-tk=ov]," + P + ".tk-m-list #qe98SummarySlot{display:none!important}",
    P + ".tk-m-cal .top," + P + ".tk-m-cal #ownBox," + P + ".tk-m-cal .tools," + P + ".tk-m-cal #bkBar," + P + ".tk-m-cal .tw," + P + ".tk-m-cal [data-tk=ov]," + P + ".tk-m-cal [data-tk=list]," + P + ".tk-m-cal .tk-fb," + P + ".tk-m-cal #qe98SummarySlot," + P + ".tk-m-cal #qe98ToolsSlot{display:none!important}",
    P + ".tk-m-ov #calBox," + P + ".tk-m-ov #calTip," + P + ".tk-m-ov .tools," + P + ".tk-m-ov #bkBar," + P + ".tk-m-ov .tw," + P + ".tk-m-ov [data-tk=list]," + P + ".tk-m-ov .tk-fb{display:none!important}",
    P + ".tk-on [data-tk=hide]{display:none!important}",
    /* แถบสถานะ + ตัวเลือกเพิ่มเติม */
    ".tk-fb{display:flex;flex-direction:column;gap:8px;margin:0 0 10px;padding:10px 12px;border:1px solid var(--line,#cbd5e1);border-radius:14px;background:var(--card,#fff);box-shadow:0 1px 4px var(--sh,rgba(0,0,0,.06))}",
    ".tk-seg{display:flex;flex-wrap:wrap;align-items:center;gap:6px}",
    ".tk-seg-l{margin-right:4px;color:var(--mut,#64748b);font-size:13px;font-weight:700}",
    ".tk-s{display:inline-flex;align-items:center;gap:6px;min-height:38px;padding:5px 14px;border:1px solid var(--line,#cbd5e1);border-radius:999px;background:var(--card,#fff);color:var(--txt,#1e293b);font:inherit;font-size:14px;font-weight:700;cursor:pointer}",
    ".tk-s b{min-width:20px;padding:0 6px;border-radius:999px;background:var(--soft2,#f1f5f9);font-size:12.5px;text-align:center}",
    ".tk-s:hover{border-color:var(--pri,#6d28d9)}",
    ".tk-s[aria-pressed=true]{background:var(--pri,#6d28d9);border-color:var(--pri,#6d28d9);color:var(--on-pri,#fff)}",
    ".tk-s[aria-pressed=true] b{background:rgba(255,255,255,.25)}",
    ".tk-s.late:not([aria-pressed=true]) b{background:#fee2e2;color:#b91c1c}.tk-s.today:not([aria-pressed=true]) b{background:#ffedd5;color:#c2410c}.tk-s.soon:not([aria-pressed=true]) b{background:#fef9c3;color:#a16207}",
    ".tk-s:focus-visible,.tk-opt>summary:focus-visible{outline:3px solid var(--ring,#93c5fd);outline-offset:2px}",
    ".tk-opt>summary{display:inline-flex;align-items:center;gap:6px;min-height:34px;padding:4px 10px;border-radius:10px;color:var(--mut,#64748b);font-size:13px;font-weight:700;cursor:pointer;list-style:none;user-select:none}",
    ".tk-opt>summary::-webkit-details-marker{display:none}",
    ".tk-opt>summary::before{content:'▸'}.tk-opt[open]>summary::before{content:'▾'}",
    ".tk-opt>summary:hover{background:var(--soft2,#f1f5f9);color:var(--txt,#1e293b)}",
    ".tk-opt>.tk-optbody>*{margin:6px 0 0!important;border:0!important;box-shadow:none!important;padding:0!important;background:transparent!important}",
    ".tk-opt .tk-dup{display:none!important}",
    P + ".tk-m-list .tools{margin-top:0!important}",
    P + ".tk-m-list .top{margin-bottom:6px!important}",
    P + ".tk-m-cal #calBox{display:block!important}",
    P + ".tk-m-cal #calBody{display:block!important}",
    /* ฟอร์มเป็นหน้าต่าง */
    P + ".tk-on:not(.tk-form) #f{display:none!important}",
    ".tk-back{position:fixed!important;inset:0!important;z-index:10045!important;background:rgba(15,23,42,.48)!important;margin:0!important;padding:0!important;border:0!important}",
    ".tk-back[hidden]{display:none!important}",
    P + ".tk-form #f{display:block!important;position:fixed!important;z-index:10046!important;left:50%!important;top:50%!important;transform:translate(-50%,-50%)!important;width:min(920px,calc(100vw - 32px))!important;max-width:none!important;max-height:calc(100vh - 40px)!important;max-height:calc(100dvh - 40px)!important;overflow:auto!important;margin:0!important;padding:0 20px 18px!important;border:1px solid var(--line,#cbd5e1)!important;border-radius:18px!important;background:var(--pop,var(--card,#fff))!important;box-shadow:0 30px 80px rgba(15,23,42,.35)!important;box-sizing:border-box!important}",
    ".tk-fhd{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:10px;margin:0 -20px 12px;padding:14px 16px 12px 20px;border-bottom:1px solid var(--line,#cbd5e1);background:var(--pop,var(--card,#fff))}",
    ".tk-fhd h3{flex:1 1 auto;margin:0;font-size:18px;color:var(--txt,#1e293b)}",
    ".tk-x{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border:0;border-radius:10px;background:transparent;color:var(--mut,#64748b);font-size:20px;cursor:pointer}",
    ".tk-x:hover{background:var(--soft2,#f1f5f9);color:var(--txt,#1e293b)}",
    P + ":not(.tk-form) .tk-fhd{display:none}",
    "body.tk-noscroll{overflow:hidden!important}",
    /* ปุ่มในแถว */
    "#tb td.tk-acts{white-space:nowrap}",
    "#tb .tk-acts .tk-row{display:flex;flex-wrap:wrap;align-items:center;gap:6px;justify-content:flex-start}",
    "#tb .tk-acts .tk-k{display:inline-flex!important;align-items:center!important;gap:4px;width:auto!important;min-width:0!important;min-height:34px!important;height:auto!important;padding:4px 10px!important;margin:0!important;border-radius:9px!important;font-size:13px!important;font-weight:700!important;white-space:nowrap!important;line-height:1.2!important}",
    "#tb .tk-acts .tk-k .tk-l{font-size:12.5px}",
    "#tb .tk-more{position:relative;display:inline-block}",
    "#tb .tk-more>summary{list-style:none;display:inline-flex;align-items:center;justify-content:center;min-width:34px;min-height:34px;padding:0 8px;border:1px solid var(--line,#cbd5e1);border-radius:9px;background:var(--card,#fff);color:var(--txt,#1e293b);font-size:16px;font-weight:900;cursor:pointer;user-select:none}",
    "#tb .tk-more>summary::-webkit-details-marker{display:none}",
    "#tb .tk-more[open]>summary{border-color:var(--pri,#6d28d9)}",
    "#tb .tk-pop{position:absolute;right:0;top:calc(100% + 4px);z-index:40;display:flex;flex-direction:column;gap:2px;min-width:180px;padding:6px;border:1px solid var(--line,#cbd5e1);border-radius:12px;background:var(--pop,var(--card,#fff));box-shadow:0 12px 30px rgba(15,23,42,.22)}",
    "#tb .tk-pop>button{display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:8px;width:100%!important;min-height:38px!important;height:auto!important;margin:0!important;padding:6px 12px!important;border:0!important;border-radius:8px!important;background:transparent!important;color:var(--txt,#1e293b)!important;font-size:13.5px!important;font-weight:600!important;text-align:left!important;box-shadow:none!important;white-space:nowrap!important}",
    "#tb .tk-pop>button:hover{background:var(--soft2,#f1f5f9)!important}",
    "#tb .tk-pop>button.tk-danger{margin-top:4px!important;border-top:1px solid var(--line,#cbd5e1)!important;border-radius:0 0 8px 8px!important;color:var(--t-dang,#b91c1c)!important}",
    "@media(max-width:700px){.tk-bar{gap:8px}.tk-tabs{flex:1 1 100%;overflow-x:auto}.tk-tab{flex:1 1 0;justify-content:center;padding:6px 10px}.tk-add{flex:1 1 100%;justify-content:center;min-height:44px}#tb .tk-acts .tk-k .tk-l{display:none}}",
    "@media print{.tk-bar,.tk-back,#tb .tk-more{display:none!important}}"
  ].join("\n");
  function injectCss() {
    if ($("qe153TrackerCss")) return;
    var st = D.createElement("style"); st.id = "qe153TrackerCss"; st.textContent = CSS; D.head.appendChild(st);
  }

  /* ---------- แถบแท็บ ---------- */
  var TABS = [["list", "📋", "รายการ"], ["cal", "📅", "ปฏิทิน"], ["ov", "📈", "ภาพรวม"]];
  var bar = null, back = null, fhd = null;
  function buildBar() {
    if (bar && bar.isConnected) return;
    bar = D.createElement("div"); bar.className = "tk-bar";
    var tabs = D.createElement("div"); tabs.className = "tk-tabs"; tabs.setAttribute("role", "tablist"); tabs.setAttribute("aria-label", "มุมมองหน้า Tracker");
    TABS.forEach(function (t) {
      var b = D.createElement("button"); b.type = "button"; b.className = "tk-tab"; b.setAttribute("role", "tab");
      b.setAttribute("data-tk-mode", t[0]); b.id = "tkTab_" + t[0];
      b.innerHTML = '<span aria-hidden="true">' + t[1] + "</span>" + t[2];
      b.addEventListener("click", function () { setMode(t[0], true); });
      tabs.appendChild(b);
    });
    tabs.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      var i = TABS.map(function (t) { return t[0]; }).indexOf(MODE);
      i = (i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length;
      setMode(TABS[i][0], true); e.preventDefault();
    });
    bar.appendChild(tabs);
    var g = D.createElement("span"); g.className = "tk-grow"; bar.appendChild(g);
    var add = D.createElement("button"); add.type = "button"; add.className = "tk-add"; add.id = "tkAdd";
    add.innerHTML = '<span aria-hidden="true">＋</span> เพิ่มงาน';
    add.addEventListener("click", function () { newTask(); });
    bar.appendChild(add);
    V.insertBefore(bar, V.firstChild);
  }
  function setMode(m, focus) {
    MODE = m;
    V.classList.remove("tk-m-list", "tk-m-cal", "tk-m-ov");
    V.classList.add("tk-m-" + m);
    if (bar) Array.prototype.forEach.call(bar.querySelectorAll(".tk-tab"), function (b) {
      var on = b.getAttribute("data-tk-mode") === m;
      b.setAttribute("aria-selected", on ? "true" : "false"); b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus({ preventScroll: true });
    });
    if (m === "cal") { var cb = $("calBody"), tg = $("calToggle"); if (cb && cb.style.display === "none" && tg) try { tg.click(); } catch (_) {} }
    if (focus) try { V.scrollIntoView({ block: "start" }); window.scrollTo({ top: 0 }); } catch (_) {}
  }

  /* ---------- จัดกลุ่มบล็อก: หาจากปุ่ม/หัวข้อจริง แล้วไล่ขึ้นหากล่องของมันเอง ---------- */
  var BIG = "#tb,#calBox,#f,#ownBox,.tools,.top,.tk-bar,.tk-fb";
  function mine(n) { return n.closest && n.closest(".tk-bar,.tk-fb .tk-seg"); }
  function boxOf(n, stopText) {
    var cur = n;
    while (cur && cur.parentElement && cur.parentElement !== V) {
      var p = cur.parentElement;
      if (p.querySelector(BIG) && !cur.matches(BIG)) break;
      if (p.classList.contains("tk-optbody") || p.classList.contains("tk-opt") || p.classList.contains("tk-fb")) break;
      if (stopText && stopText.test(p.textContent || "")) break;
      cur = p;
    }
    return cur;
  }
  function findEl(sel, re, scope) {
    var list = (scope || V).querySelectorAll(sel);
    for (var i = 0; i < list.length; i++) {
      var n = list[i];
      if (mine(n) || n.closest("#tb,#f,.tools,#calBox,#ownBox")) continue;
      if (re.test(txt(n))) return n;
    }
    return null;
  }
  var R = null; // แถวปุ่มเดิม (ประเภทงาน / สถานะด่วน)
  function sweep() {
    var b = findEl("button", /ไปที่ตาราง|โหมดกระชับ/);
    if (b) { var h = boxOf(b, /ตัวชี้วัด|ฉันคือ/); if (h && h.getAttribute("data-tk") !== "hide") h.setAttribute("data-tk", "hide"); }
    var hf = findEl("button", /^\W*(ซ่อนฟอร์ม|แสดงฟอร์ม)/);
    if (hf) { var h2 = boxOf(hf, /ตัวชี้วัด|ฉันคือ|เลยกำหนด\s*\d/); if (h2) h2.setAttribute("data-tk", "hide"); }
    var k = findEl("*", /^\W*ตัวชี้วัด/);
    if (k) { var kb = boxOf(k, /ฉันคือ|ครบวันนี้\s*\d/); if (kb) kb.setAttribute("data-tk", "ov"); }
    var late = findEl("button", /^\W*เลยกำหนด\s*\d+/);
    if (!late && R && R.isConnected) late = R.querySelector("button");
    if (late) {
      var rb = late.closest(".tk-optbody") ? late.closest(".tk-optbody").firstElementChild : boxOf(late, /ตัวชี้วัด/);
      if (rb) { R = rb; R.setAttribute("data-tk", "list"); }
    }
    buildFilterBar();
  }

  /* ---------- แถบสถานะ ---------- */
  var FB = null, SEG = [
    ["all", "ทั้งหมด", /^\W*ทั้งหมด/],
    ["late", "🔴 เลยกำหนด", /^\W*เลยกำหนด/],
    ["today", "🟠 ครบวันนี้", /^\W*ครบวันนี้/],
    ["soon", "🟡 ภายใน 3 วัน", /^\W*ภายใน\s*3\s*วัน/],
    ["done", "✅ เสร็จแล้ว", null]
  ];
  var hideDoneRestore = null;
  function coreChip(re) {
    if (!R || !re) return null;
    var bs = R.querySelectorAll("button");
    for (var i = 0; i < bs.length; i++) if (re.test(txt(bs[i]))) return bs[i];
    return null;
  }
  function chipOn(b) { return !!b && (b.getAttribute("aria-pressed") === "true" || /(^|\s)(on|active|sel|selected|is-on)(\s|$)/.test(b.className)); }
  function num(b) { var m = /(\d+)/.exec(txt(b)); return m ? m[1] : ""; }
  function hideDoneBox() {
    if (!R) return null;
    var cs = R.querySelectorAll("input[type=checkbox]");
    for (var i = 0; i < cs.length; i++) { var l = cs[i].closest("label") || cs[i].parentElement; if (/ซ่อน\s*Done/i.test(txt(l))) return cs[i]; }
    return null;
  }
  function setVal(el, v) { if (!el || el.value === v) return; el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); }
  function curSeg() {
    var st = $("fStatus");
    if (st && st.value === "Done") return "done";
    for (var i = 1; i < 4; i++) if (chipOn(coreChip(SEG[i][2]))) return SEG[i][0];
    return "all";
  }
  function pickSeg(key) {
    var st = $("fStatus"), hd = hideDoneBox();
    if (key === "done") {
      var a = coreChip(SEG[0][2]); if (a && !chipOn(a)) a.click();
      for (var i = 1; i < 4; i++) { var c = coreChip(SEG[i][2]); if (chipOn(c)) c.click(); }
      setVal(st, "Done");
      if (hd && hd.checked) { hideDoneRestore = true; hd.click(); }
    } else {
      if (st && st.value === "Done") setVal(st, "");
      if (hideDoneRestore && hd && !hd.checked) hd.click();
      hideDoneRestore = null;
      var seg = SEG.filter(function (x) { return x[0] === key; })[0], chip = coreChip(seg && seg[2]);
      if (key === "all") {
        for (var j = 1; j < 4; j++) { var cc = coreChip(SEG[j][2]); if (chipOn(cc)) cc.click(); }
        if (chip && !chipOn(chip)) chip.click();
      } else if (chip) { if (!chipOn(chip)) chip.click(); }
      else if (key === "late") setVal($("fFlag"), "late");
    }
    setTimeout(syncSeg, 60);
  }
  function syncSeg() {
    if (!FB) return;
    var cur = curSeg();
    Array.prototype.forEach.call(FB.querySelectorAll(".tk-s"), function (b) {
      var k = b.getAttribute("data-k"), seg = SEG.filter(function (x) { return x[0] === k; })[0];
      var on = k === cur; if (b.getAttribute("aria-pressed") !== String(on)) b.setAttribute("aria-pressed", String(on));
      var n = seg && seg[2] ? num(coreChip(seg[2])) : "";
      var bb = b.querySelector("b");
      if (bb) { if (bb.textContent !== n) bb.textContent = n; bb.hidden = !n; }
      if (seg && seg[2] && k !== "all") b.hidden = !coreChip(seg[2]) && k !== "late";
    });
  }
  function buildFilterBar() {
    var tools = V.querySelector(".tools"); if (!tools) return;
    if (!FB || !FB.isConnected) {
      FB = D.createElement("div"); FB.className = "tk-fb"; FB.setAttribute("data-tk", "list");
      var seg = D.createElement("div"); seg.className = "tk-seg"; seg.setAttribute("role", "group"); seg.setAttribute("aria-label", "กรองตามสถานะ");
      var l = D.createElement("span"); l.className = "tk-seg-l"; l.textContent = "สถานะ:"; seg.appendChild(l);
      SEG.forEach(function (x) {
        var b = D.createElement("button"); b.type = "button"; b.className = "tk-s " + x[0]; b.setAttribute("data-k", x[0]); b.setAttribute("aria-pressed", "false");
        b.innerHTML = "<span></span><b hidden></b>"; b.firstChild.textContent = x[1];
        b.addEventListener("click", function () { pickSeg(x[0]); });
        seg.appendChild(b);
      });
      FB.appendChild(seg);
      var opt = D.createElement("details"); opt.className = "tk-opt";
      opt.innerHTML = '<summary>🏷 ประเภทงาน / ตัวเลือกเพิ่มเติม</summary><div class="tk-optbody"></div>';
      FB.appendChild(opt);
      V.insertBefore(FB, tools);
    }
    var body = FB.querySelector(".tk-optbody");
    if (R && R.isConnected && R.parentElement !== body) body.appendChild(R);
    if (R) for (var i = 0; i < 4; i++) { var c = coreChip(SEG[i][2]); if (c && !c.classList.contains("tk-dup")) c.classList.add("tk-dup"); }
    if (R) Array.prototype.forEach.call(R.querySelectorAll("button"), function (b) { if (/^\W*วันนี้\s*\d{1,2}-/.test(txt(b))) b.classList.add("tk-dup"); });
    FB.querySelector(".tk-opt").hidden = !R;
    syncSeg();
  }

  /* ---------- ฟอร์มเป็นหน้าต่าง ---------- */
  function ensureFormHead() {
    var f = $("f"); if (!f) return;
    if (!fhd || !fhd.isConnected) {
      fhd = D.createElement("div"); fhd.className = "tk-fhd";
      fhd.innerHTML = '<h3 id="tkFormTitle">➕ เพิ่มงาน</h3><button type="button" class="tk-x" id="tkFormX" aria-label="ปิดหน้าต่าง" title="ปิด (Esc)">✕</button>';
      f.insertBefore(fhd, f.firstChild);
      $("tkFormX").addEventListener("click", function () { closeForm(true); });
      f.setAttribute("aria-labelledby", "tkFormTitle");
    }
    if (!back) {
      back = D.createElement("div"); back.className = "tk-back"; back.hidden = true;
      back.addEventListener("click", function () { closeForm(true); });
    }
    if (back.parentNode !== f.parentNode || back.nextSibling !== f) f.parentNode.insertBefore(back, f);
  }
  function editing() { var s = $("submitBtn"); return /แก้ไข/.test(txt(s)); }
  var opener = null, raised = [];
  function makesCtx(cs) {
    return (cs.position !== "static" && cs.zIndex !== "auto") || cs.transform !== "none" || cs.filter !== "none" ||
      parseFloat(cs.opacity) < 1 || cs.isolation === "isolate" || /transform|opacity|filter/.test(cs.willChange || "") ||
      (cs.backdropFilter && cs.backdropFilter !== "none") || /paint|layout|strict|content/.test(cs.contain || "") ||
      (cs.mixBlendMode && cs.mixBlendMode !== "normal");
  }
  function raise() {
    lower();
    var el = ($("f") || V).parentElement;
    while (el && el !== D.body && el !== D.documentElement) {
      var cs = getComputedStyle(el);
      if (makesCtx(cs)) {
        raised.push({ el: el, z: el.style.getPropertyValue("z-index"), zp: el.style.getPropertyPriority("z-index"), p: el.style.getPropertyValue("position"), pp: el.style.getPropertyPriority("position") });
        if (cs.position === "static") el.style.setProperty("position", "relative", "important");
        el.style.setProperty("z-index", "10044", "important");
      }
      el = el.parentElement;
    }
  }
  function lower() {
    raised.forEach(function (r) {
      if (r.z) r.el.style.setProperty("z-index", r.z, r.zp); else r.el.style.removeProperty("z-index");
      if (r.p) r.el.style.setProperty("position", r.p, r.pp); else r.el.style.removeProperty("position");
    });
    raised = [];
  }
  function openForm(src) {
    ensureFormHead();
    if (MODE !== "list") setMode("list", false);
    opener = src || D.activeElement;
    formOpen = true;
    V.classList.add("tk-form");
    raise();
    back.hidden = false;
    D.body.classList.add("tk-noscroll");
    var t = $("tkFormTitle"); if (t) t.textContent = editing() ? "✎ แก้ไขงาน" : "➕ เพิ่มงาน";
    var f = $("f"); if (f) f.scrollTop = 0;
    setTimeout(function () {
      var i = $("issue"); if (i && !editing() && !i.value) try { i.focus({ preventScroll: true }); } catch (_) {}
    }, 60);
  }
  function closeForm(byUser) {
    if (!formOpen) return;
    formOpen = false;
    V.classList.remove("tk-form");
    if (back) back.hidden = true;
    lower();
    D.body.classList.remove("tk-noscroll");
    if (byUser && editing()) { var c = $("cancelBtn"); if (c && c.style.display !== "none") try { c.click(); } catch (_) {} }
    if (byUser && opener && opener.isConnected) try { opener.focus({ preventScroll: true }); } catch (_) {}
  }
  function newTask() {
    if (editing()) { var c = $("cancelBtn"); if (c) try { c.click(); } catch (_) {} }
    openForm($("tkAdd"));
  }
  function hookForm() {
    var f = $("f"), sb = $("submitBtn"), cb = $("cancelBtn");
    if (!f || !sb) return false;
    if (f.__tk153) return true;
    f.__tk153 = true;
    f.addEventListener("submit", function () {
      var wasEdit = editing();
      setTimeout(function () {
        var i = $("issue");
        if ((i && !String(i.value || "").trim()) || (wasEdit && !editing())) closeForm(false);
      }, 180);
    }, true);
    if (cb) cb.addEventListener("click", function () { setTimeout(function () { closeForm(false); }, 0); });
    new MutationObserver(function () {
      var t = $("tkFormTitle"); if (t && formOpen) t.textContent = editing() ? "✎ แก้ไขงาน" : "➕ เพิ่มงาน";
      if (editing() && !formOpen && V.style.display !== "none") openForm(null);
    }).observe(sb, { childList: true, characterData: true, subtree: true });
    return true;
  }

  /* ---------- ปุ่มในแถว ---------- */
  function doRow(td) {
    if (!td || td.__tk153) return;
    var btns = Array.prototype.filter.call(td.querySelectorAll("button"), function (b) { return !b.closest(".tk-more"); });
    if (btns.length < 2) return;
    td.__tk153 = true;
    td.classList.add("tk-acts");
    var row = D.createElement("div"); row.className = "tk-row";
    var keep = [], rest = [];
    btns.forEach(function (b) { (KEEP[b.getAttribute("data-qe-fn")] ? keep : rest).push(b); });
    keep.sort(function (a, b) { var o = ["toggle", "openRev", "edit"]; return o.indexOf(a.getAttribute("data-qe-fn")) - o.indexOf(b.getAttribute("data-qe-fn")); });
    keep.forEach(function (b) {
      var fn = b.getAttribute("data-qe-fn"), icon = txt(b) || "•";
      var lbl = fn === "toggle" && !/✓|✔/.test(icon) ? (b.title || "สถานะ") : LABEL[fn];
      b.classList.add("tk-k");
      if (!b.querySelector(".tk-l")) {
        b.textContent = "";
        var i = D.createElement("span"); i.setAttribute("aria-hidden", "true"); i.textContent = icon;
        var l = D.createElement("span"); l.className = "tk-l"; l.textContent = lbl;
        b.appendChild(i); b.appendChild(l);
      }
      if (!b.getAttribute("aria-label")) b.setAttribute("aria-label", lbl);
      row.appendChild(b);
    });
    if (rest.length) {
      var det = D.createElement("details"); det.className = "tk-more";
      var sum = D.createElement("summary"); sum.textContent = "⋯"; sum.title = "เพิ่มเติม"; sum.setAttribute("aria-label", "เมนูเพิ่มเติมของงานนี้");
      var pop = D.createElement("div"); pop.className = "tk-pop"; pop.setAttribute("role", "menu");
      var del = [];
      rest.forEach(function (b) {
        var fn = b.getAttribute("data-qe-fn") || "", icon = txt(b), name = (b.title || b.getAttribute("aria-label") || "").replace(/\s*\(.*$/, "");
        var isDel = fn === "del" || /🗑|ลบ/.test(icon + name);
        b.textContent = (icon || "•") + "  " + (name || (isDel ? "ลบ" : "เพิ่มเติม"));
        b.setAttribute("role", "menuitem");
        if (isDel) { b.classList.add("tk-danger"); del.push(b); } else pop.appendChild(b);
      });
      del.forEach(function (b) { pop.appendChild(b); });
      det.appendChild(sum); det.appendChild(pop);
      row.appendChild(det);
    }
    td.textContent = "";
    td.appendChild(row);
  }
  function doRows() {
    var tb = $("tb"); if (!tb) return;
    Array.prototype.forEach.call(tb.querySelectorAll(":scope > tr"), function (tr) {
      var td = tr.lastElementChild;
      if (td && td.tagName === "TD" && td.querySelector("[data-qe-fn]")) doRow(td);
    });
  }

  /* ---------- รวม ---------- */
  function run() {
    if (busy || !V) return;
    busy = true;
    try { buildBar(); sweep(); doRows(); ensureFormHead(); hookForm(); }
    catch (e) { diag(e); }
    finally { busy = false; }
  }
  var pend = false;
  function schedule() { if (pend) return; pend = true; (window.requestAnimationFrame || setTimeout)(function () { pend = false; run(); }); }

  function boot() {
    V = $("viewTracker");
    if (!V || !$("tb")) return false;
    injectCss();
    V.classList.add("tk-on");
    run();
    setMode("list", false);
    /* ตาราง re-render */
    new MutationObserver(function () { schedule(); }).observe($("tb"), { childList: true });
    /* บล็อกที่ส่วนเสริมอื่นเพิ่มเข้ามา */
    new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) if (list[i].addedNodes.length) { schedule(); return; }
    }).observe(V, { childList: true, subtree: false });
    ["qe98QuickSlot", "qe98SummarySlot", "qe98ToolsSlot", "qe98AddSlot"].forEach(function (id) {
      var s = $(id); if (s) new MutationObserver(schedule).observe(s, { childList: true });
    });
    /* เปิดหน้า Tracker ทุกครั้ง → รายการ */
    var wasHidden = V.style.display === "none";
    new MutationObserver(function () {
      var hidden = V.style.display === "none";
      if (wasHidden && !hidden) { setMode("list", false); schedule(); }
      if (hidden && formOpen) closeForm(false);
      wasHidden = hidden;
    }).observe(V, { attributes: true, attributeFilter: ["style"] });
    /* ปฏิทิน: คลิกวัน = เพิ่มงาน · คลิกงาน = ไปที่แถว */
    D.addEventListener("click", function (e) {
      var g = e.target && e.target.closest && e.target.closest("#calGrid");
      if (!g || MODE !== "cal") return;
      var before = ($("dd2") || {}).value + "/" + ($("mm2") || {}).value + "/" + ($("yy2") || {}).value;
      setMode("list", false);
      setTimeout(function () {
        if (anyModal()) { setMode("cal", false); return; }
        var after = ($("dd2") || {}).value + "/" + ($("mm2") || {}).value + "/" + ($("yy2") || {}).value;
        var a = D.activeElement;
        if (after !== before || (a && $("f") && $("f").contains(a))) openForm(null);
      }, 120);
    }, true);
    /* เปิดฟอร์มจากหน้าอื่น / เมนูเดิม */
    D.addEventListener("click", function (e) {
      var t = e.target && e.target.closest && e.target.closest('[data-td="add"],[data-a="tk"],#dlAdd,#qe134Legacy');
      if (!t) return;
      setTimeout(function () { if (V.style.display !== "none") openForm(null); }, 220);
    }, true);
    /* ปิดเมนู ⋯ ของแถวอื่น */
    D.addEventListener("toggle", function (e) {
      var d = e.target;
      if (!d || !d.classList || !d.classList.contains("tk-more") || !d.open) return;
      Array.prototype.forEach.call(D.querySelectorAll("#tb .tk-more[open]"), function (o) { if (o !== d) o.open = false; });
    }, true);
    D.addEventListener("click", function (e) {
      var inMore = e.target && e.target.closest && e.target.closest("#tb .tk-more");
      var item = e.target && e.target.closest && e.target.closest("#tb .tk-pop>button");
      Array.prototype.forEach.call(D.querySelectorAll("#tb .tk-more[open]"), function (o) { if (!inMore || o !== inMore || item) o.open = false; });
    });
    D.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      var o = D.querySelector("#tb .tk-more[open]");
      if (o) { o.open = false; var s = o.querySelector("summary"); if (s) s.focus(); e.preventDefault(); return; }
      if (formOpen && !D.querySelector(".ov.on,.qe134-ov:not([hidden]),.qe84-dialog")) { e.preventDefault(); e.stopPropagation(); closeForm(true); }
    }, true);
    ["fStatus", "fFlag", "q"].forEach(function (id) { var n = $(id); if (n) n.addEventListener("change", function () { setTimeout(syncSeg, 30); }); });
    V.addEventListener("click", function (e) { if (e.target && e.target.closest && e.target.closest(".tk-optbody,.qe126-chips")) setTimeout(syncSeg, 80); });
    [400, 1500, 4000].forEach(function (ms) { setTimeout(schedule, ms); });
    window.QE153TrackerUX = Object.freeze({ version: "v153", mode: function (m) { setMode(m || "list", false); }, openForm: function () { openForm(null); }, closeForm: function () { closeForm(true); } });
    return true;
  }
  function start() { if (!boot()) { var n = 0, t = setInterval(function () { if (boot() || ++n > 60) clearInterval(t); }, 250); } }
  if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", start, { once: true }); else start();
})();
