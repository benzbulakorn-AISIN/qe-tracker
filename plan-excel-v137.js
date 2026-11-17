/*! QE Elec. Daily Job Tracker — plan-excel-v137.js  (แทน plan-export-v136.js · ใช้คู่กับ core-v125.min.js)
    หน้า Main QE Jobs → New project → QE Follow-up (แถบบนสุด ข้างปุ่ม ⬇ JSON)
    v136: ปุ่ม "📊 Excel" ส่งออกแผนทั้ง Project เป็น .xlsx (แยกชีต Supplier / In-house / Customer, สีเหมือนหน้าเว็บ,
          Status Drop-down + สีตามค่า, วันที่เป็นวันที่จริงของ Excel, ตรึงหัวตาราง + ตัวกรอง)
    v137: + คอลัมน์ M "ID" (ซ่อน) ในไฟล์ Export เพื่อจับคู่แถวได้แม่นยำ
          + ปุ่ม "📥 นำเข้า Excel": อ่านไฟล์ที่แก้ใน Excel แล้ว → แสดงตัวอย่างการเปลี่ยนแปลง → กดยืนยันจึงบันทึก
            - อัปเดตเฉพาะ Owner / Stage / Plan / Actual / Status / หมายเหตุ ของแถวที่ "จับคู่ได้" และ "ค่าเปลี่ยนจริง"
            - ไม่เพิ่ม/ลบหัวข้อ ไม่แก้ชื่อหัวข้อ ไม่แตะ Tracker หน้าแรก (กด 📤 ส่งเข้า Tracker เดิมต่อได้)
            - Plan เดิมมีค่าแล้วถูกเปลี่ยน → Rev.+1 และเก็บ Plan เดิม + เหตุผลใน item.pr (โครงสร้างเดิม {f,t,why})
            - จับคู่ด้วย ID ก่อน · ไฟล์จาก v136 (ไม่มี ID) จับคู่ด้วย ชีต + ชุด (Supplier/ไลน์/ลูกค้า) + No. + ชื่อหัวข้อ
            - เขียนผ่าน key เดิม "qe_mainjobs_data_v2" แล้วเรียก MJ.reload() + SPDB.queue() เดิม → Cloud Sync ตามปกติ
              (ระบบ Safety snapshot เดิม (QE78) สำรองค่าเดิมก่อนเขียนให้อัตโนมัติ)
    ไม่มี network · ไม่มี library ภายนอก (ZIP/XLSX เขียน-อ่านเอง · คลายไฟล์ด้วย DecompressionStream ของเบราว์เซอร์) */
(function () {
  "use strict";
  if (window.__QE137_PLANX) return;
  window.__QE137_PLANX = true;
  window.__QE136_PLANX = true; // กันไม่ให้ไฟล์ v136 เดิม (ถ้ายังค้างใน cache) สร้างปุ่มซ้ำ

  var VER = "v137", D = document, MJ_KEY = "qe_mainjobs_data_v2";
  var CATS = ["Supplier", "In-house", "Customer"];
  var ONE = { "Supplier": "Supplier", "In-house": "ไลน์", "Customer": "ลูกค้า" };
  var ST_FALLBACK = { notstarted: "Not started", progress: "In progress", delay: "Delay", done: "Done", na: "N/A" };
  var ST_ORDER = ["notstarted", "progress", "delay", "done", "na"];
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var FIELD_TH = { owner: "Owner", stage: "Stage", target: "Plan", actual: "Actual", status: "Status", note: "หมายเหตุ" };

  function diag(e, c) { try { window.QE86Diagnostics && window.QE86Diagnostics.capture(e, c || "plan-excel-v137"); } catch (_) {} }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function isYmd(s) { return /^\d{4}-\d{2}-\d{2}$/.test(String(s || "")); }
  function key(s) { return String(s || "").trim().toLowerCase(); }
  function norm(s) { return String(s == null ? "" : s).replace(/\s+/g, " ").trim().toLowerCase(); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fmtD(s) { return isYmd(s) ? +s.slice(8) + "-" + MON[+s.slice(5, 7) - 1] + "-" + s.slice(2, 4) : "–"; }

  /* ---------- toast (ใช้ #nfToast / .nf-toast เดิมของหน้า Follow-up) ---------- */
  var tt = 0;
  function say(msg, err) {
    var n = D.getElementById("nfToast");
    if (!n) { n = D.createElement("div"); n.id = "nfToast"; n.className = "nf-toast"; D.body.appendChild(n); }
    n.textContent = msg; n.classList.toggle("err", !!err); n.classList.add("on");
    clearTimeout(tt); tt = setTimeout(function () { n.classList.remove("on"); }, 4200);
  }

  /* ---------- อ่านข้อมูลเดิม ---------- */
  function readStore() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(MJ_KEY) || "null"); } catch (_) { s = null; }
    if (!s || s.v !== 2) { try { if (window.MJ && typeof window.MJ.snapshot === "function") s = window.MJ.snapshot(); } catch (_) { s = null; } }
    return s && s.v === 2 ? s : null;
  }
  function currentName() {
    var h = D.querySelector("#nfTop .nf-ttl h2");
    return h ? String(h.textContent || "").replace(/^\s*🚀\s*/, "").trim() : "";
  }
  function isDirty() { var top = D.getElementById("nfTop"); return !!(top && top.querySelector(".nf-dirty.on")); }
  function statusLabels() {
    var map = {}, sel = D.querySelector("#nfOv select.nf-sel");
    if (sel) Array.prototype.forEach.call(sel.options, function (o) { if (o.value) map[o.value] = String(o.textContent || o.value).trim(); });
    Object.keys(ST_FALLBACK).forEach(function (k) { if (!map[k]) map[k] = ST_FALLBACK[k]; });
    return map;
  }
  function trackerIds() {
    var s = new Set();
    try { if (Array.isArray(data)) data.forEach(function (t) { s.add(t.id); }); } catch (_) {}
    return s;
  }
  function insNames(P, cat) {
    var ins = Array.isArray(P.ins && P.ins[cat]) ? P.ins[cat] : [], m = {};
    ins.forEach(function (o, i) { m[o.id] = String(o.name || "").trim() || (ONE[cat] + " " + (i + 1)); });
    return m;
  }

  /* =====================================================================
     EXPORT (.xlsx)
     ===================================================================== */
  function x(s) {
    return String(s == null ? "" : s)
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function col(i) { var s = ""; i++; while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
  function serial(s) { var p = s.split("-").map(Number); return Date.UTC(p[0], p[1] - 1, p[2]) / 864e5 + 25569; }

  var S = { TITLE: 1, SUB: 2, HEAD: 3, TXT: 4, CTR: 5, DATE: 6, LATE: 7, TASK: 8, REV: 9, ST: { notstarted: 10, progress: 11, delay: 12, done: 13, na: 14 }, LINK: 15, KPI: 16 };
  var FONT = "Leelawadee UI";
  var STYLES =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<numFmts count="1"><numFmt numFmtId="164" formatCode="d-mmm-yy"/></numFmts>' +
    '<fonts count="13">' +
    '<font><sz val="10"/><color rgb="FF1F2937"/><name val="' + FONT + '"/></font>' +
    '<font><b/><sz val="16"/><color rgb="FF312E81"/><name val="' + FONT + '"/></font>' +
    '<font><sz val="9"/><color rgb="FF6B7280"/><name val="' + FONT + '"/></font>' +
    '<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="' + FONT + '"/></font>' +
    '<font><b/><sz val="10"/><color rgb="FFB91C1C"/><name val="' + FONT + '"/></font>' +
    '<font><b/><sz val="10"/><color rgb="FF4B5563"/><name val="' + FONT + '"/></font>' +
    '<font><b/><sz val="10"/><color rgb="FFB45309"/><name val="' + FONT + '"/></font>' +
    '<font><b/><sz val="10"/><color rgb="FF15803D"/><name val="' + FONT + '"/></font>' +
    '<font><b/><sz val="10"/><color rgb="FF1F2937"/><name val="' + FONT + '"/></font>' +
    '<font><b/><sz val="10"/><color rgb="FF7C3AED"/><name val="' + FONT + '"/></font>' +
    '<font><b/><sz val="10"/><color rgb="FF6B7280"/><name val="' + FONT + '"/></font>' +
    '<font><sz val="10"/><color rgb="FF15803D"/><name val="' + FONT + '"/></font>' +
    '<font><b/><sz val="10"/><color rgb="FF3730A3"/><name val="' + FONT + '"/></font>' +
    '</fonts>' +
    '<fills count="10">' +
    '<fill><patternFill patternType="none"/></fill>' +
    '<fill><patternFill patternType="gray125"/></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FF4F46E5"/><bgColor indexed="64"/></patternFill></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFE5E7EB"/><bgColor indexed="64"/></patternFill></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFFEF3C7"/><bgColor indexed="64"/></patternFill></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFFEE2E2"/><bgColor indexed="64"/></patternFill></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFDCFCE7"/><bgColor indexed="64"/></patternFill></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFF3F4F6"/><bgColor indexed="64"/></patternFill></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFEDE9FE"/><bgColor indexed="64"/></patternFill></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFF5F3FF"/><bgColor indexed="64"/></patternFill></fill>' +
    '</fills>' +
    '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>' +
    '<border><left style="thin"><color rgb="FFD1D5DB"/></left><right style="thin"><color rgb="FFD1D5DB"/></right><top style="thin"><color rgb="FFD1D5DB"/></top><bottom style="thin"><color rgb="FFD1D5DB"/></bottom><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="17">' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>' +
    '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>' +
    '<xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
    '<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
    '<xf numFmtId="164" fontId="4" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
    '<xf numFmtId="0" fontId="8" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>' +
    '<xf numFmtId="0" fontId="9" fillId="8" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
    '<xf numFmtId="0" fontId="5" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
    '<xf numFmtId="0" fontId="6" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
    '<xf numFmtId="0" fontId="4" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
    '<xf numFmtId="0" fontId="7" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
    '<xf numFmtId="0" fontId="10" fillId="7" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
    '<xf numFmtId="0" fontId="11" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
    '<xf numFmtId="0" fontId="12" fillId="9" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf>' +
    '</cellXfs>' +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    '<dxfs count="5">' +
    '<dxf><font><b/><color rgb="FF4B5563"/></font><fill><patternFill patternType="solid"><bgColor rgb="FFE5E7EB"/></patternFill></fill></dxf>' +
    '<dxf><font><b/><color rgb="FFB45309"/></font><fill><patternFill patternType="solid"><bgColor rgb="FFFEF3C7"/></patternFill></fill></dxf>' +
    '<dxf><font><b/><color rgb="FFB91C1C"/></font><fill><patternFill patternType="solid"><bgColor rgb="FFFEE2E2"/></patternFill></fill></dxf>' +
    '<dxf><font><b/><color rgb="FF15803D"/></font><fill><patternFill patternType="solid"><bgColor rgb="FFDCFCE7"/></patternFill></fill></dxf>' +
    '<dxf><font><b/><color rgb="FF6B7280"/></font><fill><patternFill patternType="solid"><bgColor rgb="FFF3F4F6"/></patternFill></fill></dxf>' +
    '</dxfs><tableStyles count="0"/></styleSheet>';

  function cStr(ref, v, s) { return '<c r="' + ref + '" s="' + s + '" t="inlineStr"><is><t xml:space="preserve">' + x(v) + '</t></is></c>'; }
  function cNum(ref, v, s) { return '<c r="' + ref + '" s="' + s + '"><v>' + v + '</v></c>'; }
  function cEmpty(ref, s) { return '<c r="' + ref + '" s="' + s + '"/>'; }

  var HEAD = ["No.", "Follow-up item", "", "Format", "Stage", "Owner", "Plan", "Actual", "Status", "Rev.", "Tracker", "หมายเหตุ (Note)", "ID"];
  var WIDTH = [7, 46, 18, 15, 9, 16, 12, 12, 14, 8, 13, 42, 30];

  function sheetXml(cat, P, labels, tkIds, today, meta) {
    var list = Array.isArray(P.cats && P.cats[cat]) ? P.cats[cat] : [];
    var insName = insNames(P, cat);
    var cnt = { total: list.length, notstarted: 0, progress: 0, delay: 0, done: 0, na: 0, late: 0 };
    list.forEach(function (it) {
      var st = ST_FALLBACK[it.status] ? it.status : "notstarted";
      cnt[st]++;
      if (st !== "done" && st !== "na" && isYmd(it.target) && it.target < today) cnt.late++;
    });
    var last = col(HEAD.length - 1), lastVis = col(HEAD.length - 2), rows = [], r;
    rows.push('<row r="1" ht="28" customHeight="1">' + cStr("A1", meta.title + " — " + cat, S.TITLE) + "</row>");
    rows.push('<row r="2" ht="18" customHeight="1">' + cStr("A2", meta.sub, S.SUB) + "</row>");
    var kpi = "ทั้งหมด " + cnt.total + "   ·   ✓ " + labels.done + " " + cnt.done + "   ·   " + labels.progress + " " + cnt.progress +
      "   ·   " + labels.delay + " " + cnt.delay + "   ·   " + labels.notstarted + " " + cnt.notstarted + (cnt.na ? "   ·   " + labels.na + " " + cnt.na : "") +
      (cnt.late ? "   ·   ⚠ Plan เลยกำหนด " + cnt.late : "");
    var k = '<row r="3" ht="20" customHeight="1">' + cStr("A3", kpi, S.KPI);
    for (var i = 1; i < HEAD.length - 1; i++) k += cEmpty(col(i) + "3", S.KPI);
    rows.push(k + "</row>");
    var h = '<row r="4" ht="24" customHeight="1">';
    HEAD.forEach(function (t, i) { h += cStr(col(i) + "4", i === 2 ? ONE[cat] : t, S.HEAD); });
    rows.push(h + "</row>");
    r = 5;
    list.forEach(function (it) {
      var st = ST_FALLBACK[it.status] ? it.status : "notstarted";
      var late = st !== "done" && st !== "na" && isYmd(it.target) && it.target < today;
      var linked = it.tk && tkIds.has(it.tk);
      var c = '<row r="' + r + '">';
      c += cStr("A" + r, it.no == null ? "" : it.no, S.CTR);
      c += cStr("B" + r, it.task || "", S.TASK);
      c += cStr("C" + r, insName[it.ins] || (ONE[cat] + " 1"), S.CTR);
      c += cStr("D" + r, it.format && it.format !== "-" ? it.format : "-", S.CTR);
      c += cStr("E" + r, it.stage || "—", S.CTR);
      c += cStr("F" + r, it.owner || "", S.CTR);
      c += isYmd(it.target) ? cNum("G" + r, serial(it.target), late ? S.LATE : S.DATE) : cEmpty("G" + r, S.DATE);
      c += isYmd(it.actual) ? cNum("H" + r, serial(it.actual), S.DATE) : cEmpty("H" + r, S.DATE);
      c += cStr("I" + r, labels[st], S.ST[st]);
      c += it.rev ? cStr("J" + r, "Rev." + it.rev, S.REV) : cStr("J" + r, "–", S.CTR);
      c += linked ? cStr("K" + r, "✓ ใน Tracker", S.LINK) : cStr("K" + r, "–", S.CTR);
      c += cStr("L" + r, it.note || "", S.TXT);
      c += cStr("M" + r, it.id || "", S.CTR);
      rows.push(c + "</row>");
      r++;
    });
    var lastRow = Math.max(4, r - 1);
    var cols = "<cols>" + WIDTH.map(function (w, i) {
      return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"' + (i === HEAD.length - 1 ? ' hidden="1"' : "") + "/>";
    }).join("") + "</cols>";
    var lbl = ST_ORDER.map(function (s) { return labels[s]; });
    var dv = "", cf = "";
    if (lastRow >= 5) {
      var safe = lbl.every(function (t) { return t.indexOf(",") < 0 && t.indexOf('"') < 0; }) && lbl.join(",").length < 250;
      if (safe) dv = '<dataValidations count="1"><dataValidation type="list" allowBlank="1" showErrorMessage="1" errorTitle="Status" error="เลือกจากรายการเท่านั้น" sqref="I5:I' + lastRow + '"><formula1>"' + x(lbl.join(",")) + '"</formula1></dataValidation></dataValidations>';
      cf = '<conditionalFormatting sqref="I5:I' + lastRow + '">' + ST_ORDER.map(function (s, i) {
        return '<cfRule type="cellIs" dxfId="' + i + '" priority="' + (i + 1) + '" operator="equal"><formula>"' + x(labels[s].replace(/"/g, "")) + '"</formula></cfRule>';
      }).join("") + "</conditionalFormatting>";
    }
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<sheetPr><tabColor rgb="FF4F46E5"/><pageSetUpPr fitToPage="1"/></sheetPr>' +
      '<dimension ref="A1:' + last + lastRow + '"/>' +
      '<sheetViews><sheetView workbookViewId="0" zoomScale="100"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A5" sqref="A5"/></sheetView></sheetViews>' +
      '<sheetFormatPr defaultRowHeight="20"/>' + cols +
      "<sheetData>" + rows.join("") + "</sheetData>" +
      '<autoFilter ref="A4:' + lastVis + lastRow + '"/>' +
      '<mergeCells count="3"><mergeCell ref="A1:' + lastVis + '1"/><mergeCell ref="A2:' + lastVis + '2"/><mergeCell ref="A3:' + lastVis + '3"/></mergeCells>' +
      cf + dv +
      '<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>' +
      '<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>' +
      "</worksheet>";
  }

  function workbookFiles(P, name) {
    var labels = statusLabels(), tkIds = trackerIds(), now = new Date(), today = ymd(now);
    var who = ""; try { who = String(localStorage.getItem("ux_me") || "").trim(); } catch (_) {}
    var stamp = now.getDate() + "-" + MON[now.getMonth()] + "-" + now.getFullYear() + " " + pad(now.getHours()) + ":" + pad(now.getMinutes());
    var meta = {
      title: "🚀 " + (P.name || name) + " · QE Follow-up",
      sub: "Project Rev." + (P.rev || 0) + "   ·   Export " + stamp + (who ? " โดย " + who : "") + "   ·   QE Elec. Daily Job Tracker " + VER +
        "   ·   แก้ได้: Stage / Owner / Plan / Actual / Status / หมายเหตุ แล้วกด 📥 นำเข้า Excel"
    };
    var cats = CATS.filter(function (c) { return P.cats && Array.isArray(P.cats[c]); });
    Object.keys(P.cats || {}).forEach(function (c) { if (cats.indexOf(c) < 0 && Array.isArray(P.cats[c])) cats.push(c); });
    var used = {};
    var sheetNames = cats.map(function (c) {
      var n = String(c).replace(/[\\\/\?\*\[\]:]/g, " ").slice(0, 31) || "Sheet";
      while (used[key(n)]) n = n.slice(0, 28) + "_" + Object.keys(used).length;
      used[key(n)] = 1; return n;
    });
    var f = {};
    f["[Content_Types].xml"] = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      cats.map(function (c, i) { return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join("") +
      '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
      '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
      "</Types>";
    f["_rels/.rels"] = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
      '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>' +
      "</Relationships>";
    f["docProps/core.xml"] = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
      "<dc:title>" + x(meta.title) + "</dc:title><dc:creator>" + x(who || "QE Tracker") + "</dc:creator>" +
      '<dcterms:created xsi:type="dcterms:W3CDTF">' + now.toISOString().replace(/\.\d+Z$/, "Z") + "</dcterms:created></cp:coreProperties>";
    f["docProps/app.xml"] = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>QE Elec. Daily Job Tracker</Application></Properties>';
    f["xl/workbook.xml"] = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<bookViews><workbookView activeTab="0"/></bookViews><sheets>' +
      sheetNames.map(function (n, i) { return '<sheet name="' + x(n) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join("") +
      "</sheets><definedNames>" +
      sheetNames.map(function (n, i) {
        var cnt = (P.cats[cats[i]] || []).length, lr = Math.max(4, 4 + cnt), q = x(n.replace(/'/g, "''"));
        return '<definedName name="_xlnm._FilterDatabase" localSheetId="' + i + '" hidden="1">\'' + q + "'!$A$4:$L$" + lr + "</definedName>" +
          '<definedName name="_xlnm.Print_Titles" localSheetId="' + i + '">\'' + q + "'!$4:$4</definedName>";
      }).join("") +
      "</definedNames></workbook>";
    f["xl/_rels/workbook.xml.rels"] = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      cats.map(function (c, i) { return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>'; }).join("") +
      '<Relationship Id="rId' + (cats.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      "</Relationships>";
    f["xl/styles.xml"] = STYLES;
    cats.forEach(function (c, i) { f["xl/worksheets/sheet" + (i + 1) + ".xml"] = sheetXml(c, P, labels, tkIds, today, meta); });
    return { files: f, count: cats.reduce(function (a, c) { return a + (P.cats[c] || []).length; }, 0), sheets: cats.length };
  }

  var CRC = (function () { var t = new Uint32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b) { var c = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function zip(files) {
    var enc = new TextEncoder(), parts = [], central = [], off = 0, n = 0;
    var d = new Date(), dt = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(), tm = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    Object.keys(files).forEach(function (name) {
      var nb = enc.encode(name), db = enc.encode(files[name]), crc = crc32(db);
      var lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
      lh.setUint16(10, tm, true); lh.setUint16(12, dt, true); lh.setUint32(14, crc, true);
      lh.setUint32(18, db.length, true); lh.setUint32(22, db.length, true); lh.setUint16(26, nb.length, true); lh.setUint16(28, 0, true);
      parts.push(new Uint8Array(lh.buffer), nb, db);
      var ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
      ch.setUint16(12, tm, true); ch.setUint16(14, dt, true); ch.setUint32(16, crc, true);
      ch.setUint32(20, db.length, true); ch.setUint32(24, db.length, true); ch.setUint16(28, nb.length, true);
      ch.setUint16(30, 0, true); ch.setUint16(32, 0, true); ch.setUint16(34, 0, true); ch.setUint16(36, 0, true); ch.setUint32(38, 0, true); ch.setUint32(42, off, true);
      central.push(new Uint8Array(ch.buffer), nb);
      off += 30 + nb.length + db.length; n++;
    });
    var csz = central.reduce(function (a, b) { return a + b.length; }, 0);
    var e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, n, true); e.setUint16(10, n, true); e.setUint32(12, csz, true); e.setUint32(16, off, true);
    return new Blob(parts.concat(central, [new Uint8Array(e.buffer)]), { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }

  function getProject() {
    var name = currentName(), store = readStore();
    var fu = store && store.newproj && store.newproj.followup;
    var P = fu && fu[key(name)];
    return { name: name, store: store, P: P && P.cats ? P : null };
  }

  function exportNow(btn) {
    if (isDirty()) { say("มีการแก้ไขที่ยังไม่บันทึก — กด 💾 บันทึก ก่อน Export Excel", true); return; }
    var g = getProject();
    if (!g.P) { say("ไม่พบข้อมูลแผนของ “" + (g.name || "Project") + "” ที่บันทึกไว้ — กด 💾 บันทึก แล้วลองใหม่", true); return; }
    try {
      if (btn) btn.disabled = true;
      var built = workbookFiles(g.P, g.name);
      var blob = zip(built.files);
      var fname = ("QE-FollowUp_" + (g.P.name || g.name) + "_Rev" + (g.P.rev || 0) + "_" + ymd(new Date()).replace(/-/g, "") + ".xlsx").replace(/[\\\/:*?"<>|]+/g, "-").replace(/\s+/g, "_");
      var a = D.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = fname; D.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      say("📊 Export Excel แล้ว: " + built.count + " หัวข้อ · " + built.sheets + " ชีต");
    } catch (e) {
      diag(e, "plan-excel-v137 export");
      say("Export Excel ไม่สำเร็จ: " + String(e && e.message || e).slice(0, 160), true);
    } finally { if (btn) btn.disabled = false; }
  }

  /* =====================================================================
     IMPORT (.xlsx → ตัวอย่างการเปลี่ยนแปลง → บันทึก)
     ===================================================================== */
  async function unzip(buf) {
    var u8 = new Uint8Array(buf), dv = new DataView(buf), eocd = -1;
    for (var i = u8.length - 22; i >= Math.max(0, u8.length - 66000); i--) { if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; } }
    if (eocd < 0) throw new Error("ไฟล์นี้ไม่ใช่ .xlsx (หรือไฟล์เสีย)");
    var n = dv.getUint16(eocd + 10, true), p = dv.getUint32(eocd + 16, true), out = {}, dec = new TextDecoder("utf-8");
    for (var k = 0; k < n; k++) {
      if (dv.getUint32(p, true) !== 0x02014b50) throw new Error("โครงสร้าง ZIP ไม่ถูกต้อง");
      var method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
      var nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
      var name = dec.decode(u8.subarray(p + 46, p + 46 + nl));
      p += 46 + nl + xl + cl;
      if (!/^(xl\/workbook\.xml|xl\/_rels\/workbook\.xml\.rels|xl\/sharedStrings\.xml|xl\/worksheets\/[^\/]+\.xml)$/i.test(name)) continue;
      var ds = lo + 30 + dv.getUint16(lo + 26, true) + dv.getUint16(lo + 28, true);
      var raw = u8.subarray(ds, ds + csize), bytes;
      if (method === 0) bytes = raw;
      else if (method === 8) {
        if (typeof DecompressionStream !== "function") throw new Error("เบราว์เซอร์นี้อ่านไฟล์ Excel ไม่ได้ — ใช้ Chrome / Edge เวอร์ชันล่าสุด");
        var st = new Blob([raw]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
        bytes = new Uint8Array(await new Response(st).arrayBuffer());
      } else throw new Error("รูปแบบการบีบอัดไฟล์ไม่รองรับ (" + method + ")");
      out[name.replace(/^\/+/, "")] = dec.decode(bytes);
    }
    return out;
  }
  function parseXml(s) {
    var d = new DOMParser().parseFromString(s, "application/xml");
    if (d.getElementsByTagName("parsererror").length) throw new Error("อ่านข้อมูลในไฟล์ไม่ได้ (XML เสีย)");
    return d;
  }
  function byTag(node, tag) { return Array.prototype.slice.call(node.getElementsByTagNameNS("*", tag)); }
  function textOf(node) { return byTag(node, "t").filter(function (t) { var p = t.parentNode; return !p || p.localName !== "rPh"; }).map(function (t) { return t.textContent; }).join(""); }
  function colIdx(ref) { var m = /^([A-Z]+)/.exec(ref || ""), n = 0; if (!m) return -1; for (var i = 0; i < m[1].length; i++) n = n * 26 + (m[1].charCodeAt(i) - 64); return n - 1; }

  async function readXlsx(file) {
    var files = await unzip(await file.arrayBuffer());
    if (!files["xl/workbook.xml"]) throw new Error("ไฟล์นี้ไม่ใช่ Excel (.xlsx)");
    var shared = [];
    if (files["xl/sharedStrings.xml"]) shared = byTag(parseXml(files["xl/sharedStrings.xml"]), "si").map(textOf);
    var rels = {};
    if (files["xl/_rels/workbook.xml.rels"]) byTag(parseXml(files["xl/_rels/workbook.xml.rels"]), "Relationship").forEach(function (r) { rels[r.getAttribute("Id")] = r.getAttribute("Target"); });
    var wb = parseXml(files["xl/workbook.xml"]), sheets = [];
    byTag(wb, "sheet").forEach(function (sh) {
      var rid = sh.getAttribute("r:id") || sh.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
      var tgt = String(rels[rid] || "").replace(/^\/?(xl\/)?/, "");
      var xml = files["xl/" + tgt];
      if (!xml) return;
      var doc = parseXml(xml), rows = [];
      byTag(doc, "row").forEach(function (row) {
        var rn = +row.getAttribute("r") || rows.length + 1, cells = [];
        byTag(row, "c").forEach(function (c) {
          var ci = colIdx(c.getAttribute("r")); if (ci < 0) return;
          var t = c.getAttribute("t") || "", v = byTag(c, "v")[0], val = "";
          if (t === "s") val = shared[+((v && v.textContent) || 0)] || "";
          else if (t === "inlineStr") val = textOf(c);
          else if (t === "str" || t === "e") val = v ? v.textContent : "";
          else if (t === "b") val = v ? (v.textContent === "1" ? "TRUE" : "FALSE") : "";
          else if (v) { var num = Number(v.textContent); val = isFinite(num) ? num : v.textContent; }
          cells[ci] = val;
        });
        rows[rn - 1] = cells;
      });
      sheets.push({ name: sh.getAttribute("name") || "", rows: rows });
    });
    return sheets;
  }

  function toYmd(v) {
    if (v == null || v === "") return { ok: true, v: "" };
    if (typeof v === "number") {
      if (v > 20000 && v < 80000) { var d = new Date(Math.round((v - 25569) * 864e5)); return { ok: true, v: d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate()) }; }
      return { ok: false };
    }
    var s = String(v).trim().replace(/\s+/g, " ");
    if (!s || s === "–" || s === "-" || s === "—") return { ok: true, v: "" };
    if (/^\d{5}(\.\d+)?$/.test(s)) return toYmd(+s);
    var m, y, mo, dd;
    if ((m = /^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/.exec(s))) { y = +m[1]; mo = +m[2]; dd = +m[3]; }
    else if ((m = /^(\d{1,2})[-\/. ]([A-Za-z]{3,9})\.?[-\/. ](\d{2,4})$/.exec(s))) {
      mo = MON.map(function (t) { return t.toLowerCase(); }).indexOf(m[2].slice(0, 3).toLowerCase()) + 1; dd = +m[1]; y = +m[3];
    } else if ((m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/.exec(s))) { dd = +m[1]; mo = +m[2]; y = +m[3]; }
    else return { ok: false };
    if (y < 100) y += 2000; else if (y >= 2400) y -= 543;
    if (!(mo >= 1 && mo <= 12 && dd >= 1 && dd <= new Date(y, mo, 0).getDate() && y >= 2000 && y <= 2100)) return { ok: false };
    return { ok: true, v: y + "-" + pad(mo) + "-" + pad(dd) };
  }
  function toStatus(v, labels) {
    var s = norm(v); if (!s) return null;
    for (var k in labels) if (norm(labels[k]) === s) return k;
    if (/^(done|เสร็จ|เสร็จแล้ว|complete|completed|closed|ok|✓)$/.test(s)) return "done";
    if (/^(n\/?a|na|ไม่เกี่ยวข้อง|ไม่ต้องทำ)$/.test(s)) return "na";
    if (/^(delay|delayed|late|ล่าช้า)$/.test(s)) return "delay";
    if (/^(in ?progress|on ?going|wip|กำลังทำ|ดำเนินการ)$/.test(s)) return "progress";
    if (/^(not ?started|ยังไม่เริ่ม|open)$/.test(s)) return "notstarted";
    return undefined;
  }

  function findHeader(rows) {
    for (var r = 0; r < Math.min(rows.length, 15); r++) {
      var row = rows[r] || [], map = {};
      row.forEach(function (v, i) {
        var h = norm(v);
        if (h === "no." || h === "no") map.no = i;
        else if (h === "follow-up item" || h === "follow up item") map.task = i;
        else if (h === "stage") map.stage = i;
        else if (h === "owner") map.owner = i;
        else if (h === "plan") map.target = i;
        else if (h === "actual") map.actual = i;
        else if (h === "status") map.status = i;
        else if (h.indexOf("หมายเหตุ") === 0 || h === "note") map.note = i;
        else if (h === "id") map.id = i;
        else if (h === "supplier" || h === "ไลน์" || h === "ลูกค้า" || h === "line" || h === "customer") map.ins = i;
      });
      if (map.no != null && map.task != null && map.status != null) return { row: r, map: map };
    }
    return null;
  }

  function analyze(sheets, P) {
    var labels = statusLabels(), stageCodes = null;
    try { var st = readStore(); stageCodes = st && st.newproj && st.newproj.pv && st.newproj.pv.codes; } catch (_) {}
    var res = { changes: [], unmatched: [], errors: [], sheetsUsed: 0, rowsRead: 0, skippedSheets: [], fileRev: null, curRev: P.rev || 0 };
    var catKeys = Object.keys(P.cats || {});
    sheets.forEach(function (sh) {
      var cat = null;
      catKeys.forEach(function (c) { if (norm(c) === norm(sh.name)) cat = c; });
      if (!cat) { res.skippedSheets.push(sh.name); return; }
      var hdr = findHeader(sh.rows);
      if (!hdr) { res.skippedSheets.push(sh.name); return; }
      res.sheetsUsed++;
      for (var rr = 0; rr < hdr.row; rr++) {
        var mm = /Project Rev\.(\d+)/.exec(String((sh.rows[rr] || [])[0] || ""));
        if (mm) res.fileRev = res.fileRev == null ? +mm[1] : Math.min(res.fileRev, +mm[1]);
      }
      var list = P.cats[cat] || [], names = insNames(P, cat), byId = {}, byKey = {};
      list.forEach(function (it) {
        byId[String(it.id)] = it;
        var k = norm(names[it.ins] || "") + "|" + norm(it.no) + "|" + norm(it.task);
        (byKey[k] = byKey[k] || []).push(it);
      });
      var seen = {}, M = hdr.map;
      for (var r = hdr.row + 1; r < sh.rows.length; r++) {
        var row = sh.rows[r]; if (!row) continue;
        var task = String(row[M.task] == null ? "" : row[M.task]).trim(), no = String(row[M.no] == null ? "" : row[M.no]).trim();
        if (!task && !no) continue;
        res.rowsRead++;
        var it = null, idv = M.id != null ? String(row[M.id] == null ? "" : row[M.id]).trim() : "";
        if (idv && byId[idv]) it = byId[idv];
        if (!it) {
          var k = norm(M.ins != null ? row[M.ins] : (names[(list[0] || {}).ins] || "")) + "|" + norm(no) + "|" + norm(task);
          var cand = (byKey[k] || []).filter(function (c) { return !seen[c.id]; });
          if (cand.length === 1) it = cand[0];
        }
        var where = cat + " แถว " + (r + 1) + " · " + (no ? no + " " : "") + task;
        if (!it) { res.unmatched.push(where); continue; }
        if (seen[it.id]) { res.unmatched.push(where + " (ซ้ำ)"); continue; }
        seen[it.id] = 1;
        var nv = {}, bad = [];
        if (M.owner != null) nv.owner = String(row[M.owner] == null ? "" : row[M.owner]).trim();
        if (M.note != null) nv.note = String(row[M.note] == null ? "" : row[M.note]).replace(/\r\n?/g, "\n").trim();
        if (M.stage != null) {
          var sg = String(row[M.stage] == null ? "" : row[M.stage]).trim();
          if (sg === "—" || sg === "-" || sg === "–") sg = "";
          if (sg && Array.isArray(stageCodes) && stageCodes.length && stageCodes.indexOf(sg) < 0) {
            var hit = stageCodes.filter(function (c) { return norm(c) === norm(sg); })[0];
            if (hit) sg = hit; else bad.push("Stage “" + sg + "” ไม่มีในระบบ (" + stageCodes.join(", ") + ")");
          }
          nv.stage = sg;
        }
        ["target", "actual"].forEach(function (f) {
          if (M[f] == null) return;
          var d = toYmd(row[M[f]]);
          if (d.ok) nv[f] = d.v; else bad.push(FIELD_TH[f] + " “" + row[M[f]] + "” ไม่ใช่วันที่");
        });
        if (M.status != null) {
          var sv = toStatus(row[M.status], labels);
          if (sv === undefined) bad.push("Status “" + row[M.status] + "” ไม่รู้จัก");
          else if (sv) nv.status = sv;
        }
        if (bad.length) { res.errors.push(where + " — " + bad.join(" · ")); continue; }
        var diff = {};
        Object.keys(nv).forEach(function (f) {
          var ov = String(it[f] == null ? "" : it[f]);
          if (nv[f] !== ov) diff[f] = { from: ov, to: nv[f] };
        });
        if (Object.keys(diff).length) res.changes.push({ cat: cat, id: it.id, no: it.no, task: it.task, ins: names[it.ins] || "", diff: diff });
      }
    });
    return res;
  }

  function showVal(f, v, labels) {
    if (f === "target" || f === "actual") return v ? fmtD(v) : "(ว่าง)";
    if (f === "status") return labels[v] || v || "(ว่าง)";
    return v ? String(v).replace(/\s+/g, " ").slice(0, 60) : "(ว่าง)";
  }

  /* ---------- หน้าต่างตัวอย่าง (ใช้ class เดิม .nf-mo/.nf-md/.nf-b ของหน้า Follow-up) ---------- */
  var MO = null, moOpener = null;
  function closeMo() {
    if (!MO) return;
    D.removeEventListener("keydown", moKey, true);
    MO.remove(); MO = null;
    if (moOpener && moOpener.isConnected) try { moOpener.focus(); } catch (_) {}
  }
  function moKey(e) {
    if (!MO) return;
    if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); closeMo(); }
  }
  function openPreview(res, P, fileName) {
    closeMo();
    moOpener = D.activeElement;
    var labels = statusLabels();
    var planRev = res.changes.filter(function (c) { return c.diff.target && c.diff.target.from && c.diff.target.to; }).length;
    var byCat = {};
    res.changes.forEach(function (c) { byCat[c.cat] = (byCat[c.cat] || 0) + 1; });
    var html = '<h3 id="qe137T">📥 นำเข้า Excel — ตรวจก่อนบันทึก</h3>' +
      '<div class="nf-sub">ไฟล์: <b>' + esc(fileName) + '</b> · อ่าน ' + res.rowsRead + ' แถว จาก ' + res.sheetsUsed + ' ชีต<br>' +
      'จะอัปเดต <b>' + res.changes.length + ' หัวข้อ</b>' +
      (res.changes.length ? " (" + Object.keys(byCat).map(function (k) { return esc(k) + " " + byCat[k]; }).join(" · ") + ")" : "") +
      ' · แก้เฉพาะ Stage / Owner / Plan / Actual / Status / หมายเหตุ</div>';
    var stale = res.changes.length && res.fileRev != null && res.fileRev < res.curRev;
    if (stale) html += '<div class="qe137-box err"><b>⚠ ไฟล์นี้ Export จาก Project Rev.' + res.fileRev + ' แต่ในระบบเป็น Rev.' + res.curRev + ' แล้ว</b><br>' +
      'มีคนบันทึกแผนในเว็บหลังจาก Export ไฟล์นี้ — ถ้านำเข้า ค่าในไฟล์จะทับค่าที่แก้ในเว็บ (ดูช่อง “เดิม” ด้านล่าง) · แนะนำ Export ไฟล์ใหม่แล้วแก้อีกครั้ง' +
      '<label style="display:flex;gap:8px;align-items:center;margin-top:6px;cursor:pointer;color:var(--txt)"><input type="checkbox" id="qe137Ack" style="width:20px;height:20px"> ตรวจแล้ว ต้องการนำเข้าทับ</label></div>';
    if (res.errors.length) html += '<div class="qe137-box err"><b>⛔ ข้ามแถวที่ข้อมูลไม่ถูกต้อง ' + res.errors.length + ' แถว</b><ul>' + res.errors.slice(0, 30).map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + (res.errors.length > 30 ? "<li>…และอีก " + (res.errors.length - 30) + "</li>" : "") + "</ul></div>";
    if (res.unmatched.length) html += '<div class="qe137-box warn"><b>⚠ จับคู่ไม่ได้ ' + res.unmatched.length + ' แถว (ไม่นำเข้า)</b> — แถวที่เพิ่ม/แก้ชื่อหัวข้อใน Excel ให้เพิ่มในหน้าเว็บแทน<ul>' + res.unmatched.slice(0, 20).map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + (res.unmatched.length > 20 ? "<li>…และอีก " + (res.unmatched.length - 20) + "</li>" : "") + "</ul></div>";
    if (res.skippedSheets.length) html += '<div class="nf-sub">ไม่ได้อ่านชีต: ' + esc(res.skippedSheets.join(", ")) + "</div>";
    if (res.changes.length) {
      html += '<div class="qe137-tw"><table class="qe137-t"><thead><tr><th>หัวข้อ</th><th>ช่อง</th><th>เดิม</th><th>ใหม่</th></tr></thead><tbody>';
      res.changes.forEach(function (c) {
        var fs = Object.keys(c.diff);
        fs.forEach(function (f, i) {
          html += "<tr>" + (i === 0 ? '<td rowspan="' + fs.length + '"><b>' + esc(c.no) + " " + esc(c.task) + "</b><small>" + esc(c.cat) + (c.ins ? " · " + esc(c.ins) : "") + "</small></td>" : "") +
            "<td>" + esc(FIELD_TH[f]) + '</td><td class="o">' + esc(showVal(f, c.diff[f].from, labels)) + '</td><td class="n">' + esc(showVal(f, c.diff[f].to, labels)) + "</td></tr>";
        });
      });
      html += "</tbody></table></div>";
      if (planRev) html += '<label class="qe137-lbl" for="qe137Why">เหตุผลการเลื่อน Plan (' + planRev + ' หัวข้อ จะขึ้น Rev. ใหม่)</label>' +
        '<input id="qe137Why" type="text" maxlength="300" value="อัปเดตจาก Excel" autocomplete="off">';
    } else html += '<div class="nf-empty">ไม่มีข้อมูลที่เปลี่ยนจากที่บันทึกไว้ในระบบ</div>';
    html += '<div class="nf-mact">' + (res.changes.length ? '<button type="button" class="nf-b nf-p" id="qe137Go" style="animation:none">💾 บันทึก ' + res.changes.length + ' หัวข้อ</button>' : "") +
      '<button type="button" class="nf-b" id="qe137No">' + (res.changes.length ? "ยกเลิก" : "ปิด") + "</button></div>";
    MO = D.createElement("div");
    MO.className = "nf-mo qe137-mo";
    MO.innerHTML = '<div class="nf-md qe137-md" role="dialog" aria-modal="true" aria-labelledby="qe137T">' + html + "</div>";
    D.body.appendChild(MO);
    if (!D.getElementById("qe137Css")) {
      var st = D.createElement("style"); st.id = "qe137Css";
      st.textContent = [
        ".qe137-mo{z-index:400}",
        ".qe137-md{width:min(900px,96vw)!important;max-width:96vw!important;max-height:90vh;overflow:auto;box-sizing:border-box}",
        ".qe137-tw{max-height:46vh;overflow:auto;border:1px solid var(--line);border-radius:10px;margin:8px 0}",
        ".qe137-t{width:100%;border-collapse:collapse;font-size:12.5px;box-shadow:none;background:transparent}",
        ".qe137-t th{position:sticky;top:0;background:var(--th);padding:7px 8px;text-align:left;font-size:12px;text-transform:none;letter-spacing:0}",
        ".qe137-t td{padding:6px 8px;border-top:1px solid var(--line);vertical-align:top;text-align:left}",
        ".qe137-t td small{display:block;color:var(--mut);font-weight:400}",
        ".qe137-t td.o{color:var(--mut);text-decoration:line-through}",
        ".qe137-t td.n{color:var(--t-ok);font-weight:800}",
        ".qe137-box{margin:8px 0;padding:8px 10px;border-radius:10px;font-size:12.5px;line-height:1.55}",
        ".qe137-box ul{margin:4px 0 0;padding-left:20px;max-height:120px;overflow:auto}",
        ".qe137-box.err{border:1px solid var(--dang);background:rgba(220,38,38,.08);color:var(--t-dang)}",
        ".qe137-box.warn{border:1px solid var(--warn);background:rgba(245,158,11,.1);color:var(--t-warn)}",
        ".qe137-lbl{display:block;margin:10px 0 4px;font-size:13px;font-weight:800}",
        "#qe137Why{width:100%;min-height:40px;box-sizing:border-box}",
        ".qe137-md .nf-mact .nf-b{min-height:40px;min-width:100px}",
        "@media(max-width:640px){.qe137-t td,.qe137-t th{font-size:12px;padding:5px}}"
      ].join("\n");
      D.head.appendChild(st);
    }
    MO.addEventListener("mousedown", function (e) { if (e.target === MO) closeMo(); });
    D.getElementById("qe137No").addEventListener("click", closeMo);
    var go = D.getElementById("qe137Go"), ack = D.getElementById("qe137Ack");
    if (go && ack) { go.disabled = true; ack.addEventListener("change", function () { go.disabled = !ack.checked; }); }
    if (go) go.addEventListener("click", function () {
      var why = D.getElementById("qe137Why"); applyChanges(res, why ? why.value.trim() : "");
    });
    D.addEventListener("keydown", moKey, true);
    setTimeout(function () { try { (ack || go || D.getElementById("qe137No")).focus(); } catch (_) {} }, 0);
  }

  function applyChanges(res, why) {
    if (isDirty()) { say("มีการแก้ไขที่ยังไม่บันทึกในหน้าเว็บ — กด 💾 บันทึก หรือ ↩ ยกเลิกการแก้ไข ก่อนนำเข้า", true); return; }
    var name = currentName(), raw = null;
    try { raw = localStorage.getItem(MJ_KEY); } catch (_) {}
    var store = null; try { store = JSON.parse(raw || "null"); } catch (_) {}
    var P = store && store.v === 2 && store.newproj && store.newproj.followup && store.newproj.followup[key(name)];
    if (!P || !P.cats) { say("ไม่พบข้อมูล Project ในเครื่อง — ไม่ได้บันทึกอะไร", true); return; }
    var now = new Date().toISOString(), today = ymd(new Date()), who = "";
    try { who = String(localStorage.getItem("ux_me") || "").trim(); } catch (_) {}
    var labels = statusLabels(), n = 0, revN = 0, miss = 0;
    why = why || "อัปเดตจาก Excel";
    res.changes.forEach(function (c) {
      var list = P.cats[c.cat] || [], it = null;
      for (var i = 0; i < list.length; i++) if (list[i].id === c.id) { it = list[i]; break; }
      if (!it) { miss++; return; }
      var parts = [];
      Object.keys(c.diff).forEach(function (f) {
        var cur = String(it[f] == null ? "" : it[f]);
        if (cur !== c.diff[f].from) return; // ค่าในเครื่องเปลี่ยนไปแล้วหลังตรวจ → ไม่ทับ
        if (f === "target" && cur && c.diff[f].to) {
          it.pr = Array.isArray(it.pr) ? it.pr : [];
          it.pr.push({ f: cur, t: c.diff[f].to, why: why, at: now });
          it.rev = (it.rev || 0) + 1; revN++;
        }
        it[f] = c.diff[f].to;
        parts.push(FIELD_TH[f] + ": " + showVal(f, c.diff[f].from, labels) + " → " + showVal(f, c.diff[f].to, labels));
      });
      if (c.diff.status && it.status === "done" && !it.actual) { it.actual = today; parts.push("Actual: → " + fmtD(today)); }
      if (parts.length) {
        it.hist = Array.isArray(it.hist) ? it.hist : [];
        it.hist.push({ at: now, summary: "📥 นำเข้าจาก Excel" + (who ? " โดย " + who : "") + " · " + parts.join(" · ") });
        n++;
      }
    });
    if (!n) { closeMo(); say("ไม่มีข้อมูลที่ต้องบันทึก (ค่าในระบบตรงกับไฟล์แล้ว)"); return; }
    P.rev = (P.rev || 0) + 1;
    P.updated = now;
    store.updated = now;
    try {
      localStorage.setItem(MJ_KEY, JSON.stringify(store));
    } catch (e) {
      diag(e, "plan-excel-v137 save");
      try { if (raw != null) localStorage.setItem(MJ_KEY, raw); } catch (_) {}
      say("❌ บันทึกไม่สำเร็จ — ข้อมูลเดิมไม่ถูกเปลี่ยน\nสาเหตุ: " + (e && e.name === "QuotaExceededError" ? "พื้นที่เก็บข้อมูลเต็ม" : String(e && e.message || e).slice(0, 160)), true);
      return;
    }
    try { if (window.MJ && typeof window.MJ.reload === "function") window.MJ.reload(); } catch (e) { diag(e, "plan-excel-v137 reload"); }
    try { if (window.SPDB && typeof window.SPDB.queue === "function") window.SPDB.queue(); } catch (e) { diag(e, "plan-excel-v137 sync"); }
    closeMo();
    say("✅ นำเข้า Excel แล้ว: อัปเดต " + n + " หัวข้อ" + (revN ? " · Plan Rev. ใหม่ " + revN : "") + (miss ? " · ข้าม " + miss + " (ถูกลบไปแล้ว)" : "") +
      "\nถ้าหัวข้อเชื่อมกับ Tracker ให้กด 📤 ส่งเข้า Tracker เพื่ออัปเดตต่อ");
  }

  var fileInput = null;
  function pickFile(btn) {
    if (isDirty()) { say("มีการแก้ไขที่ยังไม่บันทึก — กด 💾 บันทึก หรือ ↩ ยกเลิกการแก้ไข ก่อนนำเข้า Excel", true); return; }
    if (window.__QE_RO) { say("บัญชีนี้ดูอย่างเดียว — นำเข้าไม่ได้", true); return; }
    if (!getProject().P) { say("ไม่พบข้อมูลแผนของ Project นี้ — กด 💾 บันทึก ก่อน", true); return; }
    if (!fileInput) {
      fileInput = D.createElement("input");
      fileInput.type = "file"; fileInput.accept = ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      fileInput.hidden = true; fileInput.id = "qe137File"; fileInput.setAttribute("aria-label", "เลือกไฟล์ Excel (.xlsx) เพื่อนำเข้า");
      D.body.appendChild(fileInput);
      fileInput.addEventListener("change", function () {
        var f = fileInput.files && fileInput.files[0]; fileInput.value = "";
        if (f) handleFile(f);
      });
    }
    moOpener = btn || null;
    fileInput.click();
  }
  async function handleFile(f) {
    if (!/\.xlsx$/i.test(f.name)) { say("รองรับเฉพาะไฟล์ .xlsx (บันทึกจาก Excel เป็น Excel Workbook)", true); return; }
    if (f.size > 10 * 1024 * 1024) { say("ไฟล์ใหญ่เกิน 10 MB", true); return; }
    var g = getProject();
    if (!g.P) { say("ไม่พบข้อมูลแผนของ Project นี้", true); return; }
    try {
      say("กำลังอ่านไฟล์ " + f.name + " …");
      var sheets = await readXlsx(f);
      var res = analyze(sheets, g.P);
      if (!res.sheetsUsed) { say("ไม่พบชีต Supplier / In-house / Customer ที่มีหัวตารางแบบไฟล์ Export — ใช้ไฟล์จากปุ่ม 📊 Excel", true); return; }
      openPreview(res, g.P, f.name);
    } catch (e) {
      diag(e, "plan-excel-v137 import");
      say("อ่านไฟล์ไม่สำเร็จ: " + String(e && e.message || e).slice(0, 180), true);
    }
  }

  /* ---------- ปุ่มบนแถบ Project (แถบถูกวาดใหม่บ่อย จึงเฝ้าดูแล้วใส่ปุ่มกลับ) ---------- */
  function mkBtn(id, text, title) {
    var b = D.createElement("button");
    b.type = "button"; b.id = id; b.className = "nf-b"; b.textContent = text; b.title = title; return b;
  }
  function ensureBtn() {
    var top = D.getElementById("nfTop");
    if (!top) return;
    var json = top.querySelector('[data-a="export"]');
    var ref = json && json.parentNode === top ? json : null;
    if (!top.querySelector("#qe136Xls")) {
      var b = mkBtn("qe136Xls", "📊 Excel", "ส่งออกแผนทั้ง Project เป็นไฟล์ Excel (.xlsx) — แยกชีต Supplier / In-house / Customer");
      if (ref) top.insertBefore(b, ref); else top.appendChild(b);
    }
    if (!top.querySelector("#qe137Imp")) {
      var b2 = mkBtn("qe137Imp", "📥 นำเข้า Excel", "นำไฟล์ Excel ที่ Export แล้วแก้ไข กลับมาอัปเดตแผน (แสดงตัวอย่างก่อนบันทึก)");
      var xb = top.querySelector("#qe136Xls");
      top.insertBefore(b2, xb ? xb.nextSibling : ref);
    }
  }
  var pend = false;
  function schedule() { if (pend) return; pend = true; (window.requestAnimationFrame || setTimeout)(function () { pend = false; ensureBtn(); }); }
  function boot() {
    D.addEventListener("click", function (e) {
      var b = e.target && e.target.closest && e.target.closest("#qe136Xls,#qe137Imp");
      if (!b || b.disabled) return;
      e.preventDefault(); e.stopPropagation();
      if (b.id === "qe136Xls") exportNow(b); else pickFile(b);
    }, true);
    ensureBtn();
    if (window.MutationObserver) new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) {
        var t = list[i].target;
        if (t.id === "nfTop" || t === D.body || t.id === "nfOv" || (list[i].addedNodes.length && t.closest && t.closest("#nfOv"))) { schedule(); return; }
      }
    }).observe(D.body, { childList: true, subtree: true });
  }
  if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", boot, { once: true }); else boot();

  window.QE137PlanExcel = Object.freeze({ version: VER, exportNow: function () { exportNow(null); }, importFile: handleFile });
})();
