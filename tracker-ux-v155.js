/*! QE Elec. Daily Job Tracker — tracker-ux-v155.js  (แทน tracker-ux-v152/v153/v154.js · โหลดต่อจาก tracker-toolbar-v131.js / tracker-edit-v142.js)
    หน้า "📊 Tracker"
      - แท็บ [📋 รายการ] [📅 ปฏิทิน] [📈 ภาพรวม] + ปุ่มหลัก [+ เพิ่มงาน] · เปิดหน้า = 📋 รายการ เสมอ
      - ฟอร์มเพิ่ม/แก้ไขงาน (#f เดิม) เป็นหน้าต่าง · ปุ่มในแถว [✓ เสร็จ] [📅 เลื่อน] [✎ แก้ไข] + เมนู [⋯]
    v155: 1) ตัวกรองชุดเดียว: "สถานะ" (5 ปุ่ม) + "ประเภท" (เลือกจากรายการ) — ปุ่มกรองเดิมของระบบถูกใช้เป็นตัวทำงานจริง
             ปุ่มสถานะ/ประเภทอ่านสถานะ "เลือกอยู่" จากปุ่มเดิม จึงตรงกับตารางเสมอ (v154 แสดง "ทั้งหมด" ทั้งที่ตารางถูกกรองอยู่)
             แถวปุ่มเดิมซ้ำ (เลยกำหนด/ครบวันนี้/ภายใน 3 วัน/ทั้งหมด/ประเภทงาน) ถูกซ่อนถาวร เหลือเฉพาะ ของฉัน · ฉันคือ · ซ่อน Done เก่า · ↩ ย้อนกลับ · กู้ข้อมูลเดิม
             ใน "⚙ ตัวเลือกเพิ่มเติม" (พับไว้)
          2) ตารางกระชับแบบ Excel: ปัญหา / Countermeasure สูงสุด 2 บรรทัด (ชี้เมาส์ดูข้อความเต็ม) · Due Date บรรทัดเดียว (วันที่เดิมที่ถูกขีดฆ่าย้ายไปไว้ใน tooltip)
             · Status + % ในบรรทัดเดียว (ย้ายข้อความ "แก้ล่าสุด" ไปไว้ใน tooltip) · ปุ่มในแถวเรียงแนวนอนบรรทัดเดียว · เห็นได้ ~10 แถวต่อจอ
          3) ฟอร์มเพิ่มงานเรียบง่าย: เห็นช่องหลัก 5 ช่อง — ปัญหา · Countermeasure · ผู้รับผิดชอบ · ประเภทงาน · Due Date (ปฏิทินช่องเดียว + ปุ่มลัด)
             ซ่อน dropdown วัน/เดือน/ปี · ช่องที่เหลือ (วันที่แจ้ง · สถานะ · ความคืบหน้า · ผู้ช่วย · ติดปัญหา · Customer/Model/Remark) พับไว้ใน "รายละเอียดเพิ่มเติม"
             วันที่แจ้ง = วันนี้ (ค่าเดิมของระบบ) · ปุ่มบันทึกติดขอบล่างของหน้าต่างเสมอ
    ย้าย/ซ่อน/แสดงองค์ประกอบเดิม (ไม่คัดลอก — ID/ปุ่ม/ตัวรับเหตุการณ์เดิมครบ) — ไม่แตะข้อมูล / key / Cloud / Backup / Rev. / LINE / Teams
    ไม่มี network และไม่มี dependency ภายนอก */
(function () {
  "use strict";
  if (window.__QE155_TRACKER_UX) return;
  window.__QE155_TRACKER_UX = true;
  window.__QE154_TRACKER_UX = window.__QE153_TRACKER_UX = window.__QE152_TRACKER_UX = true;

  var D = document, V = null, MODE = "list", formOpen = false, busy = false, SEGK = "all";
  var KEEP = { toggle: 1, openRev: 1, edit: 1 };
  var LABEL = { toggle: "เสร็จ", openRev: "เลื่อน", edit: "แก้ไข" };
  function $(id) { return D.getElementById(id); }
  function diag(e, c) { try { window.QE86Diagnostics && window.QE86Diagnostics.capture(e, c || "tracker-ux-v155"); } catch (_) {} }
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
    ".tk-tab:focus-visible,.tk-add:focus-visible,.tk-more>summary:focus-visible,.tk-x:focus-visible,.tk-s:focus-visible,.tk-opt>summary:focus-visible,.tk-fmore>summary:focus-visible,.tk-type select:focus-visible{outline:3px solid var(--ring,#93c5fd);outline-offset:2px}",
    ".tk-grow{flex:1 1 auto}",
    ".tk-add{display:inline-flex;align-items:center;gap:6px;min-height:42px;padding:8px 18px;border:0;border-radius:12px;background:var(--pri,#6d28d9);color:var(--on-pri,#fff);font:inherit;font-size:14.5px;font-weight:800;cursor:pointer;box-shadow:0 6px 16px rgba(109,40,217,.28)}",
    ".tk-add:hover{filter:brightness(1.08)}",
    /* มุมมอง */
    P + ".tk-m-list .top," + P + ".tk-m-list #fStatus," + P + ".tk-m-list #calBox," + P + ".tk-m-list #calTip," + P + ".tk-m-list #ownBox," + P + ".tk-m-list [data-tk=ov]," + P + ".tk-m-list #qe98SummarySlot{display:none!important}",
    P + ".tk-m-cal .top," + P + ".tk-m-cal #ownBox," + P + ".tk-m-cal .tools," + P + ".tk-m-cal #bkBar," + P + ".tk-m-cal .tw," + P + ".tk-m-cal [data-tk=ov]," + P + ".tk-m-cal [data-tk=list]," + P + ".tk-m-cal .tk-fb," + P + ".tk-m-cal .tk-none," + P + ".tk-m-cal #qe98SummarySlot," + P + ".tk-m-cal #qe98ToolsSlot{display:none!important}",
    P + ".tk-m-ov #calBox," + P + ".tk-m-ov #calTip," + P + ".tk-m-ov .tools," + P + ".tk-m-ov #bkBar," + P + ".tk-m-ov .tw," + P + ".tk-m-ov [data-tk=list]," + P + ".tk-m-ov .tk-fb," + P + ".tk-m-ov .tk-none{display:none!important}",
    P + ".tk-on [data-tk=hide]{display:none!important}",
    P + ".tk-m-cal #calBox," + P + ".tk-m-cal #calBody{display:block!important}",
    P + ".tk-m-list .tools{margin-top:0!important}",
    P + "[data-tkseg=today] #tb>tr:not(.tk-r-today)," + P + "[data-tkseg=soon] #tb>tr:not(.tk-r-soon){display:none!important}",
    ".tk-none{margin:0 0 12px;padding:22px 12px;border:1px dashed var(--line,#cbd5e1);border-radius:14px;background:var(--card,#fff);color:var(--mut,#64748b);font-weight:700;text-align:center}",
    ".tk-none[hidden]{display:none!important}",
    /* ตัวกรอง */
    ".tk-fb{display:flex;flex-direction:column;gap:6px;margin:0 0 10px;padding:10px 12px;border:1px solid var(--line,#cbd5e1);border-radius:14px;background:var(--card,#fff);box-shadow:0 1px 4px var(--sh,rgba(0,0,0,.06))}",
    ".tk-seg{display:flex;flex-wrap:wrap;align-items:center;gap:6px}",
    ".tk-seg-l{margin-right:2px;color:var(--mut,#64748b);font-size:13px;font-weight:700}",
    ".tk-s{display:inline-flex;align-items:center;gap:6px;min-height:36px;padding:4px 13px;border:1px solid var(--line,#cbd5e1);border-radius:999px;background:var(--card,#fff);color:var(--txt,#1e293b);font:inherit;font-size:13.5px;font-weight:700;cursor:pointer}",
    ".tk-s b{min-width:20px;padding:0 6px;border-radius:999px;background:var(--soft2,#f1f5f9);font-size:12px;text-align:center}",
    ".tk-s:hover{border-color:var(--pri,#6d28d9)}",
    ".tk-s[aria-pressed=true]{background:var(--pri,#6d28d9);border-color:var(--pri,#6d28d9);color:var(--on-pri,#fff)}",
    ".tk-s[aria-pressed=true] b{background:rgba(255,255,255,.25);color:inherit}",
    ".tk-s.late:not([aria-pressed=true]) b{background:#fee2e2;color:#b91c1c}.tk-s.today:not([aria-pressed=true]) b{background:#ffedd5;color:#c2410c}.tk-s.soon:not([aria-pressed=true]) b{background:#fef9c3;color:#a16207}.tk-s.done:not([aria-pressed=true]) b{background:#dcfce7;color:#15803d}",
    ".tk-sp{flex:0 0 1px;align-self:stretch;margin:2px 6px;background:var(--line,#cbd5e1)}",
    ".tk-type{display:inline-flex;align-items:center;gap:6px;margin:0;font-size:13px;font-weight:700;color:var(--mut,#64748b)}",
    ".tk-type select{min-height:36px;max-width:220px;padding:3px 28px 3px 12px;border:1px solid var(--line,#cbd5e1);border-radius:999px;background-color:var(--card,#fff);color:var(--txt,#1e293b);font:inherit;font-size:13.5px;font-weight:700}",
    ".tk-type select.on{background-color:var(--pri,#6d28d9);border-color:var(--pri,#6d28d9);color:var(--on-pri,#fff)}",
    ".tk-opt>summary{display:inline-flex;align-items:center;gap:6px;min-height:32px;padding:3px 10px;border-radius:10px;color:var(--mut,#64748b);font-size:12.5px;font-weight:700;cursor:pointer;list-style:none;user-select:none}",
    ".tk-opt>summary::-webkit-details-marker{display:none}",
    ".tk-opt>summary::before{content:'▸'}.tk-opt[open]>summary::before{content:'▾'}",
    ".tk-opt>summary:hover{background:var(--soft2,#f1f5f9);color:var(--txt,#1e293b)}",
    ".tk-opt>.tk-optbody>*{margin:4px 0 0!important;border:0!important;box-shadow:none!important;padding:0!important;background:transparent!important}",
    ".tk-opt .tk-dup{display:none!important}",
    ".tk-opt[hidden]{display:none!important}",
    /* ฟอร์มเป็นหน้าต่าง */
    P + ".tk-on:not(.tk-form) #f{display:none!important}",
    ".tk-back{position:fixed!important;inset:0!important;z-index:10045!important;background:rgba(15,23,42,.48)!important;margin:0!important;padding:0!important;border:0!important}",
    ".tk-back[hidden]{display:none!important}",
    P + ".tk-form #f{display:block!important;position:fixed!important;z-index:10046!important;left:50%!important;top:50%!important;transform:translate(-50%,-50%)!important;width:min(760px,calc(100vw - 32px))!important;max-width:none!important;max-height:calc(100vh - 40px)!important;max-height:calc(100dvh - 40px)!important;overflow:auto!important;margin:0!important;padding:0 20px 0!important;border:1px solid var(--line,#cbd5e1)!important;border-radius:18px!important;background:var(--pop,var(--card,#fff))!important;box-shadow:0 30px 80px rgba(15,23,42,.35)!important;box-sizing:border-box!important}",
    ".tk-fhd{position:sticky;top:0;z-index:3;display:flex;align-items:center;gap:10px;margin:0 -20px 12px;padding:14px 16px 12px 20px;border-bottom:1px solid var(--line,#cbd5e1);background:var(--pop,var(--card,#fff))}",
    ".tk-fhd h3{flex:1 1 auto;margin:0;font-size:18px;color:var(--txt,#1e293b)}",
    ".tk-x{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border:0;border-radius:10px;background:transparent;color:var(--mut,#64748b);font-size:20px;cursor:pointer}",
    ".tk-x:hover{background:var(--soft2,#f1f5f9);color:var(--txt,#1e293b)}",
    P + ":not(.tk-form) .tk-fhd{display:none}",
    "body.tk-noscroll{overflow:hidden!important}",
    /* เลย์เอาต์ฟอร์มใหม่ */
    ".tk-fl{display:grid;grid-template-columns:1fr 1fr;gap:12px 16px;margin:0 0 12px}",
    ".tk-fl>*{min-width:0;margin:0!important}",
    ".tk-fl>.tk-full{grid-column:1/-1}",
    ".tk-fl label{display:block;margin:0 0 4px;font-weight:700}",
    ".tk-fl textarea{min-height:84px;width:100%;box-sizing:border-box}",
    ".tk-fl #owner,.tk-fl select{width:100%;box-sizing:border-box}",
    P + ".tk-form #f .dsel.tk-hid{display:none!important}",
    ".tk-fl .tk-duebox input[type=date]{min-height:42px;font-size:15px}",
    ".tk-fmore{margin:0 0 12px;border:1px dashed var(--line,#cbd5e1);border-radius:12px;padding:0 12px;background:transparent}",
    ".tk-fmore>summary{display:flex;align-items:center;gap:6px;min-height:42px;font-size:13.5px;font-weight:700;color:var(--mut,#64748b);cursor:pointer;list-style:none}",
    ".tk-fmore>summary::-webkit-details-marker{display:none}",
    ".tk-fmore>summary::before{content:'▸'}.tk-fmore[open]>summary::before{content:'▾'}",
    ".tk-fmore[open]{padding-bottom:12px}",
    ".tk-fmore .tk-fmg{display:grid;grid-template-columns:1fr 1fr;gap:12px 16px}",
    ".tk-fmore .tk-fmg>*{min-width:0;margin:0!important}",
    ".tk-ffoot{position:sticky;bottom:0;z-index:3;display:flex!important;align-items:center;gap:10px;margin:0 -20px!important;padding:12px 20px!important;border-top:1px solid var(--line,#cbd5e1);background:var(--pop,var(--card,#fff))}",
    ".tk-ffoot #submitBtn{min-height:44px;padding:8px 22px;font-size:15px;font-weight:800}",
    ".tk-ffoot button{min-height:44px}",
    "@media(max-width:640px){.tk-fl,.tk-fmore .tk-fmg{grid-template-columns:1fr}}",
    /* ตารางกระชับแบบ Excel */
    P + " .tw table thead th:nth-child(1){width:96px!important}",
    P + " .tw table thead th:nth-child(2){width:84px!important}",
    P + " .tw table thead th:nth-child(5){width:128px!important}",
    P + " .tw table thead th:nth-child(6){width:162px!important}",
    P + " .tw table thead th:nth-child(7){width:252px!important}",
    P + " .tw table thead th{padding:7px 8px!important;font-size:12.5px!important}",
    "#tb td{padding:5px 8px!important;vertical-align:middle!important;font-size:13px!important;line-height:1.4!important}",
    "#tb td br{display:none}",
    "#tb .tk-clamp{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}",
    "#tb .tk-clamp .tag,#tb .tk-clamp [class*=chip],#tb .tk-clamp [class*=pill]{font-size:11.5px!important;padding:0 7px!important;line-height:1.5!important}",
    "#tb .tk-due{display:flex;flex-wrap:wrap;align-items:center;gap:2px 6px}",
    "#tb .tk-due .tag,#tb .tk-due [class*=tag],#tb .tk-due [class*=badge]{display:inline-block!important;margin:0!important;padding:0 8px!important;font-size:11.5px!important;line-height:1.55!important;white-space:nowrap!important}",
    "#tb .tk-old{display:none!important}",
    "#tb .tk-hide{display:none!important}",
    "#tb .tk-st{display:flex;align-items:center;gap:6px;flex-wrap:nowrap}",
    "#tb .tk-st select{width:68px!important;min-width:0!important;height:28px!important;min-height:28px!important;padding:0 4px!important;margin:0!important;font-size:12.5px!important}",
    "#tb .tk-st-bar{margin-top:3px}",
    "#tb .tk-st>:first-child{flex:0 0 auto;white-space:nowrap}",
    "#tb td.tk-acts{white-space:nowrap}",
    "#tb .tk-acts .tk-row{display:flex;flex-wrap:nowrap;align-items:center;gap:5px;justify-content:flex-start}",
    "#tb .tk-acts .tk-k{display:inline-flex!important;align-items:center!important;gap:4px;width:auto!important;min-width:0!important;min-height:30px!important;height:30px!important;padding:2px 9px!important;margin:0!important;border-radius:8px!important;font-size:12.5px!important;font-weight:700!important;white-space:nowrap!important;line-height:1!important}",
    "#tb .tk-acts .tk-k .tk-l{font-size:12.5px}",
    "#tb .tk-more{position:relative;display:inline-block}",
    "#tb .tk-more>summary{list-style:none;display:inline-flex;align-items:center;justify-content:center;min-width:30px;min-height:30px;padding:0 7px;border:1px solid var(--line,#cbd5e1);border-radius:8px;background:var(--card,#fff);color:var(--txt,#1e293b);font-size:15px;font-weight:900;cursor:pointer;user-select:none}",
    "#tb .tk-more>summary::-webkit-details-marker{display:none}",
    "#tb .tk-more[open]>summary{border-color:var(--pri,#6d28d9)}",
    "#tb .tk-pop{position:fixed;z-index:10030;display:flex;flex-direction:column;gap:2px;min-width:190px;padding:6px;border:1px solid var(--line,#cbd5e1);border-radius:12px;background:var(--pop,var(--card,#fff));box-shadow:0 12px 30px rgba(15,23,42,.22);visibility:hidden}",
    "#tb .tk-more[open] .tk-pop.tk-placed{visibility:visible}",
    "#tb .tk-pop>button{display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:8px;width:100%!important;min-height:38px!important;height:auto!important;margin:0!important;padding:6px 12px!important;border:0!important;border-radius:8px!important;background:transparent!important;color:var(--txt,#1e293b)!important;font-size:13.5px!important;font-weight:600!important;text-align:left!important;box-shadow:none!important;white-space:nowrap!important}",
    "#tb .tk-pop>button:hover{background:var(--soft2,#f1f5f9)!important}",
    "#tb .tk-pop>button.tk-danger{margin-top:4px!important;border-top:1px solid var(--line,#cbd5e1)!important;border-radius:0 0 8px 8px!important;color:var(--t-dang,#b91c1c)!important}",
    "@media(max-width:1250px){P_X}".replace("P_X", P + " .tw table thead th:nth-child(7){width:150px!important}#tb .tk-acts .tk-k .tk-l{display:none}#tb .tk-acts .tk-k{padding:2px 8px!important}"),
    "@media(max-width:700px){.tk-bar{gap:8px}.tk-tabs{flex:1 1 100%;overflow-x:auto}.tk-tab{flex:1 1 0;justify-content:center;padding:6px 10px}.tk-add{flex:1 1 100%;justify-content:center;min-height:44px}.tk-sp{display:none}}",
    "@media print{.tk-bar,.tk-back,#tb .tk-more,.tk-fb{display:none!important}}"
  ].join("\n");
  function injectCss() {
    if ($("qe155TrackerCss")) return;
    var st = D.createElement("style"); st.id = "qe155TrackerCss"; st.textContent = CSS; D.head.appendChild(st);
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
    if (focus) try { window.scrollTo({ top: 0 }); } catch (_) {}
  }

  /* ---------- จัดกลุ่มบล็อก ---------- */
  var EXCL = "#tb,#f,#calBox,#ownBox,.tk-bar,.tk-fb";
  function deepest(test) {
    var all = V.querySelectorAll("div,section,form,nav,aside"), hit = null;
    for (var i = 0; i < all.length; i++) {
      var n = all[i];
      if (n.closest(EXCL) || n.matches(".top,.tools,.tw,.tk-optbody,.tk-opt")) continue;
      if (test(txt(n))) hit = n;
    }
    return hit;
  }
  function climb(n, okText) {
    while (n && n.parentElement && n.parentElement !== V) {
      var p = n.parentElement;
      if (p.matches(".tk-optbody,.tk-opt,.tk-fb") || p.querySelector(".top,.tools,.tw,#calBox,#f,#ownBox")) break;
      if (!okText(txt(p))) break;
      n = p;
    }
    return n;
  }
  var R = null, KB = null;
  function sweep() {
    Array.prototype.forEach.call(V.querySelectorAll("button"), function (b) {
      if (b.closest(EXCL + ",.tools,.tw")) return;
      if (/ไปที่ตาราง|โหมดกระชับ|^\W*(ซ่อนฟอร์ม|แสดงฟอร์ม)/.test(txt(b))) {
        var h = climb(b, function (x) { return x.length < 160 && !/ตัวชี้วัด|ฉันคือ|เลยกำหนด\s*\d/.test(x); });
        if (h && h.getAttribute("data-tk") !== "hide") h.setAttribute("data-tk", "hide");
      }
    });
    if (!KB || !KB.isConnected) {
      KB = deepest(function (t) { return /^\W*ตัวชี้วัด/.test(t) && /ปิดตรงเวลา|อายุเฉลี่ย/.test(t) && !/ฉันคือ/.test(t); });
      if (KB) KB = climb(KB, function (t) { return !/ฉันคือ|ทั้งหมด\s*(PCR|Urgent)/.test(t) && !/ครบวันนี้\s*\d/.test(t); });
    }
    if (KB && KB.getAttribute("data-tk") !== "ov") KB.setAttribute("data-tk", "ov");
    if (!R || !R.isConnected) {
      R = deepest(function (t) { return /เลยกำหนด/.test(t) && /ทั้งหมด/.test(t) && /ฉันคือ|ซ่อน\s*Done/i.test(t) && !/ตัวชี้วัด/.test(t); });
      if (R) watchR();
    }
    buildFilterBar();
  }

  /* ---------- ข้อมูล (อ่านอย่างเดียว) ---------- */
  function items() { try { return Array.isArray(data) ? data : []; } catch (_) { return []; } }
  function todayYmd() {
    try { if (typeof today === "string" && /^\d{4}-\d{2}-\d{2}$/.test(today)) return today; } catch (_) {}
    var d = new Date(), p = function (n) { return (n < 10 ? "0" : "") + n; };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }
  function curDue(it) {
    try { if (window.QEData && window.QEData.currentDue) return window.QEData.currentDue(it) || ""; } catch (_) {}
    var r = Array.isArray(it.revs) ? it.revs : [];
    return (r.length && r[r.length - 1] && r[r.length - 1].date) || it.due || "";
  }
  function dnum(s) { return Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 864e5; }
  function bucket(it, t0) {
    if (it.status === "Done") return "done";
    var d = curDue(it); if (!/^\d{4}-\d{2}-\d{2}/.test(d)) return "";
    var n = dnum(d) - t0;
    return n < 0 ? "late" : n === 0 ? "today" : n <= 3 ? "soon" : "";
  }
  function ownerOk(it) { var o = $("fOwner"), v = o && o.value; return !v || String(it.owner || "").trim() === v; }

  /* ---------- อ่านสถานะ "เลือกอยู่" ของปุ่มเดิม ---------- */
  function lum(c) {
    var m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)/.exec(c || "");
    if (!m) return null;
    if (m[4] !== undefined && parseFloat(m[4]) === 0) return null;
    return (0.2126 * m[1] + 0.7152 * m[2] + 0.0722 * m[3]) / 255;
  }
  function chipOn(b) {
    if (!b) return false;
    if (b.getAttribute("aria-pressed") === "true" || b.getAttribute("aria-checked") === "true" || b.getAttribute("aria-current")) return true;
    if (/(^|[\s_-])(on|active|act|sel|selected|is-on|is-active|checked)([\s_-]|$)/.test(b.className)) return true;
    var cs = getComputedStyle(b), tl = lum(cs.color);
    if (tl === null || tl < 0.82) return false;
    var bl = lum(cs.backgroundColor);
    return bl === null ? cs.backgroundImage !== "none" : bl < 0.5;
  }
  var STATUS_RE = { all: /^\W*ทั้งหมด/, late: /เลยกำหนด/, today: /ครบวันนี้/, soon: /ภายใน\s*3/ };
  var NOT_TYPE = /เลยกำหนด|ครบวันนี้|ภายใน|ทั้งหมด|ของฉัน|ย้อนกลับ|กู้ข้อมูล|ฉันคือ|ซ่อน|วันนี้|แสดง/;
  function rbuttons() { return R ? Array.prototype.slice.call(R.querySelectorAll("button")) : []; }
  function coreChip(key) { var re = STATUS_RE[key], bs = re ? rbuttons() : []; for (var i = 0; i < bs.length; i++) if (re.test(txt(bs[i])) && !/^\W*(ของฉัน)/.test(txt(bs[i]))) return bs[i]; return null; }
  function num(b) { var m = /(\d+)\s*$/.exec(txt(b)); return m ? m[1] : ""; }
  function typeChips() {
    return rbuttons().filter(function (b) { var t = txt(b); return !NOT_TYPE.test(t) && /^.*\S\s+\d+\s*$/.test(t); })
      .map(function (b) { var m = /^(.*\S)\s+(\d+)\s*$/.exec(txt(b)); return { b: b, name: m[1].replace(/^[^\wก-๙]+/, "").trim(), n: m[2] }; });
  }
  function hideDoneBox() {
    var cs = V.querySelectorAll("input[type=checkbox]");
    for (var i = 0; i < cs.length; i++) { var l = cs[i].closest("label") || cs[i].parentElement; if (/ซ่อน\s*Done/i.test(txt(l))) return cs[i]; }
    return null;
  }
  function setVal(el, v) { if (!el || el.value === v) return; el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); }

  /* ---------- แถบสถานะ + ประเภท ---------- */
  var FB = null, NONE = null, TYPE = null, SEG = [
    ["all", "ทั้งหมด"], ["late", "🔴 เลยกำหนด"], ["today", "🟠 ครบวันนี้"], ["soon", "🟡 ภายใน 3 วัน"], ["done", "✅ เสร็จแล้ว"]
  ];
  var hdRestore = false;
  function curSeg() {
    var st = $("fStatus");
    if (st && st.value === "Done") return "done";
    var keys = ["late", "today", "soon"];
    for (var i = 0; i < keys.length; i++) { var c = coreChip(keys[i]); if (c && chipOn(c)) return keys[i]; }
    var fl = $("fFlag"); if (fl && fl.value === "late") return "late";
    return SEGK === "today" || SEGK === "soon" ? (coreChip(SEGK) ? "all" : SEGK) : "all";
  }
  function pickSeg(key) {
    var st = $("fStatus"), fl = $("fFlag"), hd = hideDoneBox();
    SEGK = key;
    if (key === "done") {
      ["late", "today", "soon"].forEach(function (k) { var c = coreChip(k); if (c && chipOn(c)) c.click(); });
      if (fl && fl.value === "late") setVal(fl, "");
      setVal(st, "Done");
      if (hd && hd.checked) { hdRestore = true; hd.click(); }
    } else {
      if (st && st.value === "Done") setVal(st, "");
      if (hdRestore && hd && !hd.checked) hd.click();
      hdRestore = false;
      var c = coreChip(key);
      if (key === "all") {
        var a = coreChip("all");
        if (a && !chipOn(a)) a.click();
        else ["late", "today", "soon"].forEach(function (k) { var x = coreChip(k); if (x && chipOn(x)) x.click(); });
        if (fl && fl.value === "late") setVal(fl, "");
      } else if (c) { if (!chipOn(c)) c.click(); }
      else if (key === "late") setVal(fl, "late");
    }
    V.setAttribute("data-tkseg", coreChip(key) || key === "all" || key === "done" || key === "late" ? "" : key);
    setTimeout(function () { syncSeg(); markRows(); }, 90);
  }
  function syncSeg() {
    if (!FB) return;
    SEGK = curSeg();
    var own = !coreChip("today") && (SEGK === "today" || SEGK === "soon") ? SEGK : "";
    if ((V.getAttribute("data-tkseg") || "") !== own) V.setAttribute("data-tkseg", own);
    var t0 = dnum(todayYmd()), c = { all: 0, late: 0, today: 0, soon: 0, done: 0 };
    items().forEach(function (it) {
      if (!ownerOk(it)) return;
      var k = bucket(it, t0);
      if (it.status !== "Done") c.all++;
      if (k) c[k]++;
    });
    Array.prototype.forEach.call(FB.querySelectorAll(".tk-s"), function (b) {
      var k = b.getAttribute("data-k"), on = k === SEGK;
      if (b.getAttribute("aria-pressed") !== String(on)) b.setAttribute("aria-pressed", String(on));
      var cc = k !== "done" ? coreChip(k) : null, n = cc && num(cc) !== "" ? num(cc) : String(c[k]);
      var bb = b.querySelector("b"); if (bb && bb.textContent !== n) bb.textContent = n;
    });
    syncType();
  }
  function activeType() { var l = typeChips(); for (var i = 0; i < l.length; i++) if (chipOn(l[i].b)) return l[i]; return null; }
  function syncType() {
    if (!TYPE) return;
    var sel = TYPE.querySelector("select"), list = typeChips(), sig = list.map(function (x) { return x.name + ":" + x.n; }).join("|");
    TYPE.hidden = !list.length;
    if (TYPE.__sig !== sig) {
      TYPE.__sig = sig; sel.textContent = "";
      var o0 = D.createElement("option"); o0.value = ""; o0.textContent = "ทุกประเภท"; sel.appendChild(o0);
      list.forEach(function (x) { var o = D.createElement("option"); o.value = x.name; o.textContent = x.name + " (" + x.n + ")"; sel.appendChild(o); });
    }
    var a = activeType(), v = a ? a.name : "";
    if (sel.value !== v) sel.value = v;
    sel.classList.toggle("on", !!v);
  }
  function pickType(name) {
    var list = typeChips(), want = list.filter(function (x) { return x.name === name; })[0], cur = activeType();
    if (!name) { if (cur) cur.b.click(); }
    else if (want && !chipOn(want.b)) want.b.click();
    setTimeout(function () {
      var act = typeChips().filter(function (x) { return chipOn(x.b) && x.name !== name; });
      act.forEach(function (x) { x.b.click(); });          // ระบบเดิมเลือกได้หลายอัน → ปิดอันอื่นให้เหลืออันเดียว
      setTimeout(function () { syncSeg(); markRows(); }, 90);
    }, 120);
  }
  function hideDups() {
    if (!R) return;
    rbuttons().forEach(function (b) {
      var t = txt(b), dup = (STATUS_RE.all.test(t) || STATUS_RE.late.test(t) || STATUS_RE.today.test(t) || STATUS_RE.soon.test(t)) && !/ของฉัน/.test(t) || (!NOT_TYPE.test(t) && /^.*\S\s+\d+\s*$/.test(t));
      if (dup && !b.classList.contains("tk-dup")) b.classList.add("tk-dup");
    });
    Array.prototype.forEach.call(R.querySelectorAll("span,div,small,b"), function (s) {
      if (!s.children.length && /^\W*วันนี้\s*\d{1,2}-\w{3}/.test(txt(s)) && !s.classList.contains("tk-dup")) s.classList.add("tk-dup");
    });
  }
  var rObs = null;
  function watchR() {
    if (rObs) rObs.disconnect();
    if (!R) return;
    rObs = new MutationObserver(function () { hideDups(); syncSeg(); markRows(); });
    rObs.observe(R, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "aria-pressed"] });
  }
  function markRows() {
    var tb = $("tb"); if (!tb) return;
    var t0 = dnum(todayYmd()), map = {};
    items().forEach(function (it) { map[String(it.id)] = it; });
    var shown = 0;
    Array.prototype.forEach.call(tb.querySelectorAll(":scope > tr"), function (tr) {
      var a = tr.querySelector("[data-qe-a]"), it = a && map[String(a.getAttribute("data-qe-a"))];
      var k = it ? bucket(it, t0) : "";
      tr.classList.toggle("tk-r-today", k === "today");
      tr.classList.toggle("tk-r-soon", k === "soon");
      if (a && (!V.getAttribute("data-tkseg") || k === V.getAttribute("data-tkseg"))) shown++;
    });
    var own = V.getAttribute("data-tkseg");
    if (NONE) {
      var empty = !!own && shown === 0;
      NONE.hidden = !empty;
      if (empty) NONE.textContent = own === "today" ? "🎉 ไม่มีงานที่ครบกำหนดวันนี้ (ตามตัวกรองที่เลือก)" : "🎉 ไม่มีงานที่ครบกำหนดภายใน 3 วัน (ตามตัวกรองที่เลือก)";
    }
  }
  function buildFilterBar() {
    var tools = V.querySelector(".tools"); if (!tools) return;
    if (!FB || !FB.isConnected) {
      FB = D.createElement("div"); FB.className = "tk-fb";
      var seg = D.createElement("div"); seg.className = "tk-seg"; seg.setAttribute("role", "group"); seg.setAttribute("aria-label", "กรองตามสถานะและประเภท");
      var l = D.createElement("span"); l.className = "tk-seg-l"; l.textContent = "สถานะ:"; seg.appendChild(l);
      SEG.forEach(function (x) {
        var b = D.createElement("button"); b.type = "button"; b.className = "tk-s " + x[0]; b.setAttribute("data-k", x[0]); b.setAttribute("aria-pressed", "false");
        var s = D.createElement("span"); s.textContent = x[1]; b.appendChild(s); b.appendChild(D.createElement("b"));
        b.addEventListener("click", function () { pickSeg(x[0]); });
        seg.appendChild(b);
      });
      var sp = D.createElement("span"); sp.className = "tk-sp"; seg.appendChild(sp);
      TYPE = D.createElement("label"); TYPE.className = "tk-type"; TYPE.hidden = true;
      TYPE.innerHTML = '<span>ประเภท:</span><select aria-label="กรองตามประเภทงาน"></select>';
      TYPE.querySelector("select").addEventListener("change", function () { pickType(this.value); });
      seg.appendChild(TYPE);
      FB.appendChild(seg);
      var opt = D.createElement("details"); opt.className = "tk-opt";
      opt.innerHTML = '<summary>⚙ ตัวเลือกเพิ่มเติม <span style="font-weight:500">(ของฉัน · ฉันคือ · ซ่อน Done เก่า · ย้อนกลับ · กู้ข้อมูล)</span></summary><div class="tk-optbody"></div>';
      FB.appendChild(opt);
      V.insertBefore(FB, tools);
    }
    var tw = V.querySelector(".tw");
    if (tw && (!NONE || !NONE.isConnected)) { NONE = D.createElement("div"); NONE.className = "tk-none"; NONE.hidden = true; tw.parentNode.insertBefore(NONE, tw.nextSibling); }
    var body = FB.querySelector(".tk-optbody");
    if (R && R.isConnected && R.parentElement !== body && !R.contains(FB)) body.appendChild(R);
    hideDups();
    FB.querySelector(".tk-opt").hidden = !R;
    syncSeg();
  }

  /* ---------- ฟอร์มเป็นหน้าต่าง + เลย์เอาต์ใหม่ ---------- */
  function wrapOf(n, f) {
    if (!n) return null; var p = n;
    while (p.parentElement && p.parentElement !== f && !p.parentElement.matches(".grid,.qe-grid")) p = p.parentElement;
    return p === f ? null : p;
  }
  function layoutForm() {
    var f = $("f"); if (!f || f.__tkLay) return;
    var issue = wrapOf($("issue"), f), cm = wrapOf($("cm"), f), owner = wrapOf($("owner"), f), due = wrapOf($("dd2"), f);
    if (!issue || !cm || !owner || !due) return;
    f.__tkLay = true;
    var pri = wrapOf($("uxPri"), f), status = wrapOf($("status"), f), date = wrapOf($("dd"), f);
    var lay = D.createElement("div"); lay.className = "tk-fl";
    [[issue, 0], [cm, 0], [owner, 0], [pri, 0], [due, 1]].forEach(function (x) {
      if (!x[0] || x[0].contains($("submitBtn"))) return;
      if (x[1] || !x[0]) x[0].classList.add("tk-full");
      lay.appendChild(x[0]);
    });
    if (!pri) owner.classList.add("tk-full");
    due.classList.add("tk-duebox");
    Array.prototype.forEach.call(due.querySelectorAll(".dsel"), function (d) { d.classList.add("tk-hid"); });
    var more = D.createElement("details"); more.className = "tk-fmore";
    more.innerHTML = '<summary>รายละเอียดเพิ่มเติม <span style="font-weight:500">(วันที่แจ้ง · สถานะ · ความคืบหน้า · ผู้ช่วย · ติดปัญหา · Customer / Model / Remark)</span></summary><div class="tk-fmg"></div>';
    var mg = more.querySelector(".tk-fmg");
    [date, status, $("qeBlkGrid") && $("qeBlkGrid").contains($("qeProg")) ? $("qeBlkGrid") : null].forEach(function (n) { if (n) { if (n.id === "qeBlkGrid") n.style.gridColumn = "1/-1"; mg.appendChild(n); } });
    var qi = $("qiMore"); if (qi) { qi.style.gridColumn = "1/-1"; mg.appendChild(qi); }
    var anchor = fhd && fhd.parentNode === f ? fhd.nextSibling : f.firstChild;
    f.insertBefore(lay, anchor); f.insertBefore(more, anchor);
    Array.prototype.forEach.call(f.querySelectorAll(":scope > .grid,:scope > .qe-grid"), function (g) {
      var has = Array.prototype.some.call(g.children, function (c) { return c.getClientRects().length || c.querySelector("input,select,textarea"); });
      if (!has) g.style.display = "none";
    });
    var foot = $("submitBtn") && $("submitBtn").parentElement;
    if (foot && foot !== f) foot.classList.add("tk-ffoot");
    var qs = f.querySelector(".tk-duebox input[type=date]"); if (qs && !qs.getAttribute("aria-label")) qs.setAttribute("aria-label", "เลือกวันที่กำหนดเสร็จ (Due Date)");
  }
  var opener = null, raised = [];
  function makesCtx(cs) {
    return (cs.position !== "static" && cs.zIndex !== "auto") || cs.transform !== "none" || cs.filter !== "none" ||
      parseFloat(cs.opacity) < 1 || cs.isolation === "isolate" || /transform|opacity|filter/.test(cs.willChange || "") ||
      (cs.backdropFilter && cs.backdropFilter !== "none") || /paint|layout|strict|content/.test(cs.contain || "");
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
    layoutForm();
  }
  function editing() { return /แก้ไข/.test(txt($("submitBtn"))); }
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
    var f = $("f"); if (f) { f.scrollTop = 0; var m = f.querySelector(".tk-fmore"); if (m) m.open = editing() || !!($("qeBlocked") && $("qeBlocked").checked); }
    setTimeout(function () { var i = $("issue"); if (i && !editing() && !i.value) try { i.focus({ preventScroll: true }); } catch (_) {} }, 60);
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
    if (f.__tk155) return true;
    f.__tk155 = true;
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

  /* ---------- แถวตาราง ---------- */
  function firstWord(s) { var m = /^\s*(\S+)/.exec(s || ""); return m ? m[1] : ""; }
  function wrapKids(td, cls) {
    if (td.querySelector(":scope > ." + cls)) return td.querySelector(":scope > ." + cls);
    var w = D.createElement("div"); w.className = cls;
    while (td.firstChild) w.appendChild(td.firstChild);
    td.appendChild(w); return w;
  }
  function compactRow(tr) {
    if (tr.__tk155c) return;
    var tds = tr.children; if (tds.length < 7) return;
    tr.__tk155c = true;
    var tip = function (td, s) { if (s) td.title = s.length > 500 ? s.slice(0, 497) + "…" : s; };
    [2, 3].forEach(function (i) { var td = tds[i]; if (td) { tip(td, txt(td)); wrapKids(td, "tk-clamp"); } });
    var due = tds[4];
    if (due) {
      var olds = [];
      Array.prototype.forEach.call(due.querySelectorAll("*"), function (e) { if (/line-through/.test(getComputedStyle(e).textDecorationLine || "")) olds.push(e); });
      var oldTxt = olds.map(txt).join(" → ");
      olds.forEach(function (e) { e.classList.add("tk-old"); });
      Array.prototype.forEach.call(due.querySelectorAll(".tag,[class*=tag]"), function (e) {
        var t = txt(e), m;
        if ((m = /เลยกำหนด\s*[·•]?\s*เกิน\s*(\d+)\s*วัน/.exec(t))) e.textContent = "เลย " + m[1] + " วัน";
        else if ((m = /อีก\s*(\d+)\s*วัน\s*ครบกำหนด/.exec(t))) e.textContent = "อีก " + m[1] + " วัน";
      });
      tip(due, (oldTxt ? "วันที่เดิม: " + oldTxt + "\n" : "") + txt(due));
      wrapKids(due, "tk-due");
    }
    var st = tds[5];
    if (st) {
      var stat = Array.prototype.filter.call(st.children, function (c) { return /^(In Progress|Done|Delay|Blocked|ติดปัญหา)/i.test(txt(c)); })[0];
      var sel = st.querySelector("select");
      var upd = Array.prototype.filter.call(st.querySelectorAll("*"), function (c) { return !c.children.length && /^แก้ล่าสุด/.test(txt(c)); })[0];
      if (upd) { tip(st, txt(upd)); upd.classList.add("tk-hide"); }
      if (stat && sel && !stat.contains(sel) && !sel.contains(stat)) {
        var w = D.createElement("div"); w.className = "tk-st";
        st.insertBefore(w, stat); w.appendChild(stat); w.appendChild(sel);
        Array.prototype.forEach.call(st.children, function (c) { if (c !== w && !c.classList.contains("tk-hide")) c.classList.add("tk-st-bar"); });
      }
    }
  }

  /* ---------- ปุ่มในแถว ---------- */
  function doRow(td) {
    if (!td || td.__tk155) return;
    var btns = Array.prototype.filter.call(td.querySelectorAll("button"), function (b) { return !b.closest(".tk-more"); });
    if (btns.length < 2) return;
    td.__tk155 = true;
    td.classList.add("tk-acts");
    var row = D.createElement("div"); row.className = "tk-row";
    var keep = [], rest = [];
    btns.forEach(function (b) { (KEEP[b.getAttribute("data-qe-fn")] ? keep : rest).push(b); });
    keep.sort(function (a, b) { var o = ["toggle", "openRev", "edit"]; return o.indexOf(a.getAttribute("data-qe-fn")) - o.indexOf(b.getAttribute("data-qe-fn")); });
    keep.forEach(function (b) {
      var fn = b.getAttribute("data-qe-fn"), full = txt(b), icon = firstWord(full) || "•";
      var lbl = fn === "toggle" ? (/✓|✔/.test(icon) ? "เสร็จ" : "เปิดใหม่") : LABEL[fn];
      if (!b.title && full.length > 2) b.title = full;
      b.classList.add("tk-k");
      if (!b.querySelector(".tk-l")) {
        b.textContent = "";
        var i = D.createElement("span"); i.setAttribute("aria-hidden", "true"); i.textContent = icon;
        var l = D.createElement("span"); l.className = "tk-l"; l.textContent = lbl;
        b.appendChild(i); b.appendChild(l);
      }
      if (!b.getAttribute("aria-label")) b.setAttribute("aria-label", b.title || lbl);
      row.appendChild(b);
    });
    if (rest.length) {
      var det = D.createElement("details"); det.className = "tk-more";
      var sum = D.createElement("summary"); sum.textContent = "⋯"; sum.title = "เพิ่มเติม"; sum.setAttribute("aria-label", "เมนูเพิ่มเติมของงานนี้");
      var pop = D.createElement("div"); pop.className = "tk-pop"; pop.setAttribute("role", "menu");
      var del = [];
      rest.forEach(function (b) {
        var fn = b.getAttribute("data-qe-fn") || "", full = txt(b), icon = firstWord(full), name = (b.title || b.getAttribute("aria-label") || "").replace(/\s*\(.*$/, "");
        var isDel = fn === "del" || /🗑|ลบ/.test(full + name);
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
      if (td && td.tagName === "TD" && td.querySelector("[data-qe-fn]")) { try { compactRow(tr); } catch (e) { diag(e); } doRow(td); }
    });
    markRows();
  }
  function placePop(det) {
    var pop = det.querySelector(".tk-pop"), sum = det.querySelector("summary");
    if (!pop || !sum) return;
    pop.classList.remove("tk-placed");
    var r = sum.getBoundingClientRect(), vw = D.documentElement.clientWidth, vh = window.innerHeight;
    var w = pop.offsetWidth, h = pop.offsetHeight;
    var left = Math.max(8, Math.min(vw - 8 - w, r.right - w));
    var top = r.bottom + 4;
    if (top + h > vh - 8) top = Math.max(8, r.top - 4 - h);
    pop.style.left = Math.round(left) + "px"; pop.style.top = Math.round(top) + "px";
    pop.classList.add("tk-placed");
  }
  function closePops(except) { Array.prototype.forEach.call(D.querySelectorAll("#tb .tk-more[open]"), function (o) { if (o !== except) o.open = false; }); }

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
  function dueSig() { return [$("dd2"), $("mm2"), $("yy2")].map(function (n) { return n ? n.value : ""; }).join("/"); }
  function toastSig() { var t = $("toast"); return t ? txt(t) + "|" + t.className + "|" + t.getAttribute("style") : ""; }

  function boot() {
    V = $("viewTracker");
    if (!V || !$("tb")) return false;
    injectCss();
    V.classList.add("tk-on");
    run();
    setMode("list", false);
    new MutationObserver(function () { schedule(); }).observe($("tb"), { childList: true });
    new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) if (list[i].addedNodes.length) { schedule(); return; }
    }).observe(V, { childList: true });
    ["qe98QuickSlot", "qe98SummarySlot", "qe98ToolsSlot", "qe98AddSlot"].forEach(function (id) {
      var s = $(id); if (s) new MutationObserver(schedule).observe(s, { childList: true });
    });
    var wasHidden = V.style.display === "none";
    new MutationObserver(function () {
      var hidden = V.style.display === "none";
      if (wasHidden && !hidden) { setMode("list", false); schedule(); }
      if (hidden && formOpen) closeForm(false);
      wasHidden = hidden;
    }).observe(V, { attributes: true, attributeFilter: ["style"] });
    ["fStatus", "fFlag", "fOwner", "q", "fMonth", "fYear"].forEach(function (id) {
      var n = $(id); if (n) n.addEventListener("change", function () { setTimeout(function () { syncSeg(); markRows(); }, 60); });
    });
    V.addEventListener("click", function (e) {
      if (e.target && e.target.closest && e.target.closest(".tk-optbody,#qe126Chips,.qe126-chips,#clearBtn")) setTimeout(function () { syncSeg(); markRows(); }, 140);
    });
    D.addEventListener("click", function (e) {
      var g = e.target && e.target.closest && e.target.closest("#calGrid");
      if (!g || MODE !== "cal" || formOpen) return;
      var dd = $("dd2"), saved = [$("dd2"), $("mm2"), $("yy2")].map(function (n) { return n ? n.value : null; });
      if (dd && dd.querySelector('option[value=""]') && !editing()) dd.value = "";
      var before = dueSig(), tBefore = toastSig();
      setTimeout(function () {
        var changed = dueSig() !== before;
        if (!changed) [$("dd2"), $("mm2"), $("yy2")].forEach(function (n, i) { if (n && saved[i] != null && n.value !== saved[i]) n.value = saved[i]; });
        if (anyModal()) return;
        var a = D.activeElement, f = $("f");
        var added = changed || (a && f && f.contains(a)) || (/เพิ่มรายการ|Due Date/.test(txt($("toast"))) && toastSig() !== tBefore);
        if (added) { openForm(null); return; }
        setMode("list", false);
        setTimeout(function () {
          var hl = D.querySelector("#tb tr.flash,#tb tr.hl,#tb tr.qe-flash,#tb tr[style*='outline']");
          if (hl) try { hl.scrollIntoView({ block: "center" }); } catch (_) {}
        }, 80);
      }, 160);
    }, true);
    D.addEventListener("click", function (e) {
      var t = e.target && e.target.closest && e.target.closest('[data-td="add"],[data-a="tk"],#dlAdd,#qe134Legacy');
      if (!t) return;
      setTimeout(function () { if (V.style.display !== "none") openForm(null); }, 220);
    }, true);
    D.addEventListener("click", function (e) {
      var it = e.target && e.target.closest && e.target.closest("#dayList [data-id],#dayList .dl-it,#dayList li,#dayList button:not(#dlAdd)");
      if (it) setTimeout(function () { setMode("list", false); }, 60);
    }, true);
    D.addEventListener("toggle", function (e) {
      var d = e.target;
      if (!d || !d.classList || !d.classList.contains("tk-more")) return;
      if (d.open) { closePops(d); placePop(d); }
    }, true);
    D.addEventListener("click", function (e) {
      var inMore = e.target && e.target.closest && e.target.closest("#tb .tk-more");
      var item = e.target && e.target.closest && e.target.closest("#tb .tk-pop>button");
      if (item) { setTimeout(function () { closePops(null); }, 0); return; }
      if (!inMore) closePops(null);
    });
    window.addEventListener("scroll", function () { closePops(null); }, { passive: true, capture: true });
    window.addEventListener("resize", function () { closePops(null); });
    D.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      var o = D.querySelector("#tb .tk-more[open]");
      if (o) { o.open = false; var s = o.querySelector("summary"); if (s) s.focus(); e.preventDefault(); return; }
      if (formOpen && !anyModal()) { e.preventDefault(); e.stopPropagation(); closeForm(true); }
    }, true);
    [400, 1500, 4000].forEach(function (ms) { setTimeout(schedule, ms); });
    window.QE155TrackerUX = Object.freeze({ version: "v155", mode: function (m) { setMode(m || "list", false); }, openForm: function () { openForm(null); }, closeForm: function () { closeForm(true); }, status: pickSeg, type: pickType });
    return true;
  }
  function start() { if (!boot()) { var n = 0, t = setInterval(function () { if (boot() || ++n > 60) clearInterval(t); }, 250); } }
  if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", start, { once: true }); else start();
})();
