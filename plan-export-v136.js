/*! QE Elec. Daily Job Tracker — plan-export-v136.js  (ไฟล์ใหม่ · ใช้คู่กับ core-v125.min.js)
    v136: ปุ่ม "📊 Excel" ในหน้า New project → QE Follow-up (แถบบนสุด ข้างปุ่ม ⬇ JSON)
      - ส่งออกแผนทั้ง Project เป็นไฟล์ .xlsx จริง (ไม่ใช่ CSV) แยกชีต Supplier / In-house / Customer
      - หน้าตาเหมือนตารางใน HTML: หัวตารางสีม่วง, Status เป็นแถบสี (Done เขียว / In progress ส้ม / Delay แดง / Not started เทา),
        Plan ที่เลยกำหนดเป็นตัวแดง, ป้าย Rev. สีม่วง, ตรึงหัวตาราง + ตัวกรอง (AutoFilter)
      - แก้ต่อใน Excel ได้: วันที่เป็นวันที่จริงของ Excel, Status มี Drop-down และสีเปลี่ยนตามค่าที่เลือก (Conditional Formatting)
      - อ่านข้อมูลที่ "บันทึกแล้ว" จาก localStorage "qe_mainjobs_data_v2" → newproj.followup[ชื่อ Project] (โครงสร้างเดิมของ core)
        ถ้ามีการแก้ไขที่ยังไม่บันทึก จะเตือนให้กด 💾 บันทึก ก่อน (เหมือนปุ่ม 📤 ส่งเข้า Tracker เดิม)
    อ่านอย่างเดียว: ไม่เขียน localStorage / Cloud / Tracker ใด ๆ · ไม่มี network · ไม่มี library ภายนอก (สร้างไฟล์ ZIP/XLSX เอง) */
(function () {
  "use strict";
  if (window.__QE136_PLANX) return;
  window.__QE136_PLANX = true;

  var VER = "v136", D = document, MJ_KEY = "qe_mainjobs_data_v2";
  var CATS = ["Supplier", "In-house", "Customer"];
  var ONE = { "Supplier": "Supplier", "In-house": "ไลน์", "Customer": "ลูกค้า" };
  var ST_FALLBACK = { notstarted: "Not started", progress: "In progress", delay: "Delay", done: "Done", na: "N/A" };
  var ST_ORDER = ["notstarted", "progress", "delay", "done", "na"];
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function diag(e, c) { try { window.QE86Diagnostics && window.QE86Diagnostics.capture(e, c || "plan-export-v136"); } catch (_) {} }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function isYmd(s) { return /^\d{4}-\d{2}-\d{2}$/.test(String(s || "")); }
  function key(s) { return String(s || "").trim().toLowerCase(); }

  /* ---------- toast (ใช้ #nfToast / .nf-toast เดิมของหน้า Follow-up) ---------- */
  var tt = 0;
  function say(msg, err) {
    var n = D.getElementById("nfToast");
    if (!n) { n = D.createElement("div"); n.id = "nfToast"; n.className = "nf-toast"; D.body.appendChild(n); }
    n.textContent = msg; n.classList.toggle("err", !!err); n.classList.add("on");
    clearTimeout(tt); tt = setTimeout(function () { n.classList.remove("on"); }, 3600);
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

  /* ---------- XML / XLSX ---------- */
  function x(s) {
    return String(s == null ? "" : s)
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function col(i) { var s = ""; i++; while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
  function serial(s) { var p = s.split("-").map(Number); return Date.UTC(p[0], p[1] - 1, p[2]) / 864e5 + 25569; }

  // ลำดับ style (cellXfs) — ต้องตรงกับ STYLES ด้านล่าง
  var S = { TITLE: 1, SUB: 2, HEAD: 3, TXT: 4, CTR: 5, DATE: 6, LATE: 7, TASK: 8, REV: 9, ST: { notstarted: 10, progress: 11, delay: 12, done: 13, na: 14 }, LINK: 15, KPI: 16 };
  var FONT = "Leelawadee UI";
  var STYLES =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<numFmts count="1"><numFmt numFmtId="164" formatCode="d-mmm-yy"/></numFmts>' +
    '<fonts count="13">' +
    '<font><sz val="10"/><color rgb="FF1F2937"/><name val="' + FONT + '"/></font>' +            // 0
    '<font><b/><sz val="16"/><color rgb="FF312E81"/><name val="' + FONT + '"/></font>' +        // 1 title
    '<font><sz val="9"/><color rgb="FF6B7280"/><name val="' + FONT + '"/></font>' +             // 2 sub
    '<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="' + FONT + '"/></font>' +        // 3 head
    '<font><b/><sz val="10"/><color rgb="FFB91C1C"/><name val="' + FONT + '"/></font>' +        // 4 late / delay
    '<font><b/><sz val="10"/><color rgb="FF4B5563"/><name val="' + FONT + '"/></font>' +        // 5 notstarted
    '<font><b/><sz val="10"/><color rgb="FFB45309"/><name val="' + FONT + '"/></font>' +        // 6 progress
    '<font><b/><sz val="10"/><color rgb="FF15803D"/><name val="' + FONT + '"/></font>' +        // 7 done
    '<font><b/><sz val="10"/><color rgb="FF1F2937"/><name val="' + FONT + '"/></font>' +        // 8 task
    '<font><b/><sz val="10"/><color rgb="FF7C3AED"/><name val="' + FONT + '"/></font>' +        // 9 rev
    '<font><b/><sz val="10"/><color rgb="FF6B7280"/><name val="' + FONT + '"/></font>' +        // 10 na
    '<font><sz val="10"/><color rgb="FF15803D"/><name val="' + FONT + '"/></font>' +            // 11 link
    '<font><b/><sz val="10"/><color rgb="FF3730A3"/><name val="' + FONT + '"/></font>' +        // 12 kpi
    '</fonts>' +
    '<fills count="10">' +
    '<fill><patternFill patternType="none"/></fill>' +
    '<fill><patternFill patternType="gray125"/></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FF4F46E5"/><bgColor indexed="64"/></patternFill></fill>' + // 2 head
    '<fill><patternFill patternType="solid"><fgColor rgb="FFE5E7EB"/><bgColor indexed="64"/></patternFill></fill>' + // 3 notstarted
    '<fill><patternFill patternType="solid"><fgColor rgb="FFFEF3C7"/><bgColor indexed="64"/></patternFill></fill>' + // 4 progress
    '<fill><patternFill patternType="solid"><fgColor rgb="FFFEE2E2"/><bgColor indexed="64"/></patternFill></fill>' + // 5 delay
    '<fill><patternFill patternType="solid"><fgColor rgb="FFDCFCE7"/><bgColor indexed="64"/></patternFill></fill>' + // 6 done
    '<fill><patternFill patternType="solid"><fgColor rgb="FFF3F4F6"/><bgColor indexed="64"/></patternFill></fill>' + // 7 na
    '<fill><patternFill patternType="solid"><fgColor rgb="FFEDE9FE"/><bgColor indexed="64"/></patternFill></fill>' + // 8 rev / kpi
    '<fill><patternFill patternType="solid"><fgColor rgb="FFF5F3FF"/><bgColor indexed="64"/></patternFill></fill>' + // 9 title band
    '</fills>' +
    '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>' +
    '<border><left style="thin"><color rgb="FFD1D5DB"/></left><right style="thin"><color rgb="FFD1D5DB"/></right><top style="thin"><color rgb="FFD1D5DB"/></top><bottom style="thin"><color rgb="FFD1D5DB"/></bottom><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="17">' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +                                                                                         // 0
    '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>' +                      // 1 title
    '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>' +                      // 2 sub
    '<xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' + // 3 head
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>' +         // 4 txt
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' + // 5 ctr
    '<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' + // 6 date
    '<xf numFmtId="164" fontId="4" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' + // 7 late
    '<xf numFmtId="0" fontId="8" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>' + // 8 task
    '<xf numFmtId="0" fontId="9" fillId="8" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' + // 9 rev
    '<xf numFmtId="0" fontId="5" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' + // 10 notstarted
    '<xf numFmtId="0" fontId="6" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' + // 11 progress
    '<xf numFmtId="0" fontId="4" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' + // 12 delay
    '<xf numFmtId="0" fontId="7" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' + // 13 done
    '<xf numFmtId="0" fontId="10" fillId="7" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' + // 14 na
    '<xf numFmtId="0" fontId="11" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' + // 15 link
    '<xf numFmtId="0" fontId="12" fillId="9" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf>' + // 16 kpi band
    '</cellXfs>' +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    // dxf สำหรับ Conditional Formatting ของ Status (สีเปลี่ยนตามค่าที่เลือกใน Excel)
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

  var HEAD = ["No.", "Follow-up item", "", "Format", "Stage", "Owner", "Plan", "Actual", "Status", "Rev.", "Tracker", "หมายเหตุ (Note)"];
  var WIDTH = [7, 46, 18, 15, 9, 16, 12, 12, 14, 8, 13, 42];

  function sheetXml(cat, P, labels, tkIds, today, meta) {
    var list = Array.isArray(P.cats && P.cats[cat]) ? P.cats[cat] : [];
    var ins = Array.isArray(P.ins && P.ins[cat]) ? P.ins[cat] : [];
    var insName = {};
    ins.forEach(function (o, i) { insName[o.id] = String(o.name || "").trim() || (ONE[cat] + " " + (i + 1)); });
    var cnt = { total: list.length, notstarted: 0, progress: 0, delay: 0, done: 0, na: 0, late: 0 };
    list.forEach(function (it) {
      var st = ST_FALLBACK[it.status] ? it.status : "notstarted";
      cnt[st]++;
      if (st !== "done" && st !== "na" && isYmd(it.target) && it.target < today) cnt.late++;
    });
    var last = col(HEAD.length - 1), rows = [], r;
    rows.push('<row r="1" ht="28" customHeight="1">' + cStr("A1", meta.title + " — " + cat, S.TITLE) + "</row>");
    rows.push('<row r="2" ht="18" customHeight="1">' + cStr("A2", meta.sub, S.SUB) + "</row>");
    var kpi = "ทั้งหมด " + cnt.total + "   ·   ✓ " + labels.done + " " + cnt.done + "   ·   " + labels.progress + " " + cnt.progress +
      "   ·   " + labels.delay + " " + cnt.delay + "   ·   " + labels.notstarted + " " + cnt.notstarted + (cnt.na ? "   ·   " + labels.na + " " + cnt.na : "") +
      (cnt.late ? "   ·   ⚠ Plan เลยกำหนด " + cnt.late : "");
    var k = '<row r="3" ht="20" customHeight="1">' + cStr("A3", kpi, S.KPI);
    for (var i = 1; i < HEAD.length; i++) k += cEmpty(col(i) + "3", S.KPI);
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
      rows.push(c + "</row>");
      r++;
    });
    var lastRow = Math.max(4, r - 1);
    var cols = "<cols>" + WIDTH.map(function (w, i) { return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>'; }).join("") + "</cols>";
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
      '<autoFilter ref="A4:' + last + lastRow + '"/>' +
      '<mergeCells count="3"><mergeCell ref="A1:' + last + '1"/><mergeCell ref="A2:' + last + '2"/><mergeCell ref="A3:' + last + '3"/></mergeCells>' +
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
      sub: "Project Rev." + (P.rev || 0) + "   ·   Export " + stamp + (who ? " โดย " + who : "") + "   ·   QE Elec. Daily Job Tracker " + VER
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
        var cnt = (P.cats[cats[i]] || []).length, lr = Math.max(4, 4 + cnt);
        return '<definedName name="_xlnm._FilterDatabase" localSheetId="' + i + '" hidden="1">\'' + x(n.replace(/'/g, "''")) + "'!$A$4:$L$" + lr + "</definedName>" +
          '<definedName name="_xlnm.Print_Titles" localSheetId="' + i + '">\'' + x(n.replace(/'/g, "''")) + "'!$4:$4</definedName>";
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

  /* ---------- ZIP (store, ไม่บีบอัด) ---------- */
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

  /* ---------- export ---------- */
  function exportNow(btn) {
    var top = D.getElementById("nfTop");
    if (top && top.querySelector(".nf-dirty.on")) { say("มีการแก้ไขที่ยังไม่บันทึก — กด 💾 บันทึก ก่อน Export Excel", true); return; }
    var name = currentName(), store = readStore();
    var fu = store && store.newproj && store.newproj.followup;
    var P = fu && fu[key(name)];
    if (!P || !P.cats) { say("ไม่พบข้อมูลแผนของ “" + (name || "Project") + "” ที่บันทึกไว้ — กด 💾 บันทึก แล้วลองใหม่", true); return; }
    try {
      if (btn) btn.disabled = true;
      var built = workbookFiles(P, name);
      var blob = zip(built.files);
      var fname = ("QE-FollowUp_" + (P.name || name) + "_Rev" + (P.rev || 0) + "_" + ymd(new Date()).replace(/-/g, "") + ".xlsx").replace(/[\\\/:*?"<>|]+/g, "-").replace(/\s+/g, "_");
      var a = D.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = fname; D.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      say("📊 Export Excel แล้ว: " + built.count + " หัวข้อ · " + built.sheets + " ชีต");
    } catch (e) {
      diag(e, "plan-export-v136 export");
      say("Export Excel ไม่สำเร็จ: " + String(e && e.message || e).slice(0, 160), true);
    } finally { if (btn) btn.disabled = false; }
  }

  /* ---------- ปุ่มบนแถบ Project (แถบนี้ถูกวาดใหม่ทุกครั้งที่แก้ไข จึงเฝ้าดูแล้วใส่ปุ่มกลับ) ---------- */
  function ensureBtn() {
    var top = D.getElementById("nfTop");
    if (!top || top.querySelector("#qe136Xls")) return;
    var b = D.createElement("button");
    b.type = "button"; b.id = "qe136Xls"; b.className = "nf-b";
    b.textContent = "📊 Excel";
    b.title = "ส่งออกแผนทั้ง Project เป็นไฟล์ Excel (.xlsx) — แยกชีต Supplier / In-house / Customer";
    var json = top.querySelector('[data-a="export"]');
    if (json && json.parentNode === top) top.insertBefore(b, json); else top.appendChild(b);
  }
  var pend = false;
  function schedule() { if (pend) return; pend = true; (window.requestAnimationFrame || setTimeout)(function () { pend = false; ensureBtn(); }); }
  function boot() {
    // ใช้ event delegation เพราะแถบ #nfTop ถูกวาดใหม่ (innerHTML) บ่อย
    D.addEventListener("click", function (e) {
      var b = e.target && e.target.closest && e.target.closest("#qe136Xls");
      if (!b || b.disabled) return;
      e.preventDefault(); e.stopPropagation();
      exportNow(b);
    }, true);
    ensureBtn();
    if (window.MutationObserver) new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) {
        var t = list[i].target;
        if (t.id === "nfTop" || t === D.body || (t.id === "nfOv") || (list[i].addedNodes.length && t.closest && t.closest("#nfOv"))) { schedule(); return; }
      }
    }).observe(D.body, { childList: true, subtree: true });
  }
  if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", boot, { once: true }); else boot();

  window.QE136PlanExport = Object.freeze({ version: VER, run: function () { exportNow(null); } });
})();
