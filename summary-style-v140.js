/*! QE Elec. Daily Job Tracker — summary-style-v140.js  (แทน summary-style-v139.js · โหลดต่อจาก scheduled-summary-v125.js)
    v139: จัดรูปข้อความ Morning / Evening Summary ที่ส่งเข้า LINE และ Teams ใหม่ให้อ่านง่าย
      - ทุกรายการมีป้ายสีนำหน้า: 🔴 Delay · 🟠 ครบวันนี้ · 🟡 ภายใน 3 วัน · 🟢 On-plan
      - Tracker แยกเป็นกลุ่มตามสี และรวมงานชื่อซ้ำของคนเดียวกันเป็น ×N
      - ตัดข้อความยาวให้สั้น · ใช้ "- " นำหน้าทุกรายการ (LINE อ่านง่าย · Teams แสดงเป็น bullet)
    v140: แสดงเฉพาะ 🔴 Delay และ 🟠 ครบวันนี้ (ตัดรายการ ≤3 วัน / On-plan / ไม่ระบุ Due ออก)
      - หมวดที่ไม่มีรายการ Delay/วันนี้ จะไม่แสดง · ถ้าไม่มีเลยทั้งข้อความ แสดง "✅ ไม่มีงาน Delay / ครบวันนี้"
    วิธีทำงาน: ครอบ QEDailySummary.build() เดิม → นำข้อความเดิมมาจัดรูปใหม่เท่านั้น
      ข้อมูลที่ดึง / วิธีส่ง (Scheduled API, HMAC, Google Apps Script, LINE, Teams) ไม่เปลี่ยน
      ถ้าจัดรูปไม่สำเร็จ จะส่งข้อความรูปแบบเดิมแทน (ไม่ทำให้การแจ้งเตือนหยุด) */
(function () {
  "use strict";
  if (window.__QE140_SUMMARY_STYLE) return;
  window.__QE140_SUMMARY_STYLE = true;
  window.__QE139_SUMMARY_STYLE = true; // กันไฟล์ v139 เดิมที่อาจค้างใน cache ครอบซ้ำ

  var VER = "v140", LINK = "benzbulakorn-aisin.github.io/qe-tracker/";
  var MON = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
  var DOT = { late: "🔴", today: "🟠", soon: "🟡", plan: "🟢", none: "⚪" };
  var SEC = [
    [/^tracker/i, "📊 TRACKER"],
    [/^checklist/i, "📝 CHECKLIST ค้าง"],
    [/^q-?patrol/i, "🔎 Q-PATROL"],
    [/follow-?up/i, "🚀 QE FOLLOW-UP"],
    [/^hoshin/i, "🎯 HOSHIN"]
  ];
  var MAXLEN = 48, RULE = "━━━━━━━━━━━━━━";

  function diag(e) { try { window.QE86Diagnostics && window.QE86Diagnostics.capture(e, "summary-style-v140"); } catch (_) {} }
  function clip(s, n) { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1).trim() + "…" : s; }
  function utc(y, m, d) { return Date.UTC(y, m, d) / 864e5; }

  /* วันอ้างอิง = วันที่บนบรรทัด 📅 ของข้อความ (ตรงกับข้อมูลที่ส่งจริง) */
  function parseHeadDate(line) {
    var m = /(\d{1,2})-([A-Za-z]{3})-(\d{2,4})/.exec(line || "");
    if (!m) return null;
    var y = +m[3]; if (y < 100) y += 2000;
    var mo = MON.indexOf(m[2].toLowerCase()); if (mo < 0) return null;
    return { y: y, n: utc(y, mo, +m[1]) };
  }
  function bangkokToday() {
    var p = {}; new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    return { y: +p.year, n: utc(+p.year, +p.month - 1, +p.day) };
  }
  function daysTo(dm, ref) { // "14-Nov" → จำนวนวันจากวันอ้างอิง
    var m = /(\d{1,2})-([A-Za-z]{3})(?:-(\d{2,4}))?/.exec(dm || "");
    if (!m) return null;
    var mo = MON.indexOf(m[2].toLowerCase()); if (mo < 0) return null;
    var y = m[3] ? (+m[3] < 100 ? +m[3] + 2000 : +m[3]) : ref.y;
    var d = utc(y, mo, +m[1]) - ref.n;
    if (!m[3] && d < -180) d = utc(y + 1, mo, +m[1]) - ref.n;
    if (!m[3] && d > 180) d = utc(y - 1, mo, +m[1]) - ref.n;
    return d;
  }
  function kindOf(d) { return d == null ? "none" : d < 0 ? "late" : d === 0 ? "today" : d <= 3 ? "soon" : "plan"; }
  function whenTxt(kind, d) {
    if (kind === "late") return "เลย " + (-d) + "d";
    if (kind === "today") return "วันนี้";
    if (kind === "soon" || kind === "plan") return "อีก " + d + "d";
    return "";
  }

  /* อ่านคำท้าย “— เลย 4 วัน / — วันนี้ / — อีก 3 วัน” */
  function splitWhen(t) {
    var m = /\s*[—–-]\s*(เลย\s*(\d+)\s*วัน|วันนี้|อีก\s*(\d+)\s*วัน)\s*$/.exec(t);
    if (!m) return { text: t, d: null };
    var d = m[2] ? -(+m[2]) : m[3] ? +m[3] : 0;
    return { text: t.slice(0, m.index).trim(), d: d };
  }
  function splitOwner(t) { // "[Earn] xxx"
    var m = /^\[([^\]]{1,30})\]\s*/.exec(t);
    return m ? { owner: m[1].trim(), text: t.slice(m[0].length) } : { owner: "", text: t };
  }

  function restyle(src) {
    var lines = String(src || "").replace(/\r\n?/g, "\n").split("\n");
    var head = (lines.shift() || "").trim();
    var dateLine = "", countLine = "", i = 0;
    while (i < lines.length && !/^■/.test(lines[i].trim())) {
      var L = lines[i].trim();
      if (!dateLine && /^📅/.test(L)) dateLine = L;
      else if (!countLine && /เลยกำหนด|ครบวันนี้|ภายใน/.test(L)) countLine = L;
      i++;
    }
    var ref = parseHeadDate(dateLine) || bangkokToday();

    // แยกหมวด
    var secs = [], cur = null;
    for (; i < lines.length; i++) {
      var s = lines[i].trim();
      if (!s) continue;
      if (/^■/.test(s)) { cur = { name: s.replace(/^■\s*/, ""), items: [], other: [] }; secs.push(cur); continue; }
      if (!cur) continue;
      if (/^[-•]\s*/.test(s)) cur.items.push(s.replace(/^[-•]\s*/, ""));
      else if (cur.items.length) cur.items[cur.items.length - 1] += " " + s; // บรรทัดที่ถูกตัดต่อจากรายการก่อนหน้า
      else cur.other.push(s);
    }
    if (!secs.length) return null; // ไม่รู้จักรูปแบบ → ใช้ของเดิม

    // หัวข้อ
    var isEve = /evening/i.test(head);
    var out = [(isEve ? "🌇" : "🔔") + " QE Electronics · " + (isEve ? "Evening Summary" : "Morning Pending Jobs")];
    if (dateLine) out.push(dateLine);
    if (countLine) {
      var n = function (re) { var m = re.exec(countLine); return m ? m[1] : "0"; };
      out.push("🔴 Delay " + n(/เลยกำหนด\s*(\d+)/) + " │ 🟠 วันนี้ " + n(/ครบวันนี้\s*(\d+)/));
    }
    out.push(RULE);

    var shown = 0, mainOut = out;
    secs.forEach(function (sec) {
      var title = null;
      SEC.forEach(function (p) { if (!title && p[0].test(sec.name)) title = p[1]; });
      title = title || "▪️ " + sec.name.toUpperCase();
      out = [];
      emitSection(sec);
      if (out.length) { shown++; mainOut.push("", title); sec.other.forEach(function (o) { mainOut.push(o); }); Array.prototype.push.apply(mainOut, out); }
    });
    out = mainOut;
    if (!shown) out.push("", "✅ ไม่มีงาน Delay / ครบวันนี้");
    out.push("", RULE, "🔴 Delay · 🟠 ครบวันนี้", "🔗 " + LINK);
    return out.join("\n");

    function emitSection(sec) {

      if (/^tracker/i.test(sec.name)) {
        var groups = { late: [], today: [], soon: [], plan: [], none: [] }, map = {};
        sec.items.forEach(function (raw) {
          var w = splitWhen(raw), o = splitOwner(w.text), k = kindOf(w.d);
          var text = o.text.replace(/^[-–]\s*/, "");
          var key = k + "|" + o.owner.toLowerCase() + "|" + text.toLowerCase();
          if (map[key]) { map[key].n++; if (map[key].ds.indexOf(w.d) < 0) map[key].ds.push(w.d); return; }
          map[key] = { k: k, owner: o.owner, text: text, n: 1, ds: [w.d] };
          groups[k].push(map[key]);
        });
        var label = { late: "🔴 Delay", today: "🟠 ครบวันนี้", soon: "🟡 ภายใน 3 วัน", plan: "🟢 On-plan", none: "⚪ ไม่ระบุ Due" };
        ["late", "today"].forEach(function (k) {
          var g = groups[k]; if (!g.length) return;
          if (k === "late") g.sort(function (a, b) { return Math.min.apply(null, a.ds) - Math.min.apply(null, b.ds); });
          out.push(label[k] + " (" + g.reduce(function (a, x) { return a + x.n; }, 0) + ")");
          g.forEach(function (x) {
            var when = k === "today" || k === "none" ? "" : " (" + x.ds.map(function (d) { return whenTxt(k, d); }).join(", ") + ")";
            out.push("- " + DOT[k] + " " + (x.owner ? x.owner + " · " : "") + clip(x.text, MAXLEN) + (x.n > 1 ? " ×" + x.n : "") + when);
          });
        });
        return;
      }

      sec.items.forEach(function (raw) {
        var w = splitWhen(raw), text = w.text, d = w.d, extra = "";
        if (/^checklist/i.test(sec.name)) {
          var o = splitOwner(text), m = /^\((\d{1,2}-[A-Za-z]{3})\)\s*[-–]?\s*/.exec(o.text);
          text = (o.owner ? o.owner + " · " : "") + (m ? o.text.slice(m[0].length) : o.text);
          if (m) { d = daysTo(m[1], ref); extra = " (ค้างจาก " + m[1] + ")"; }
          var k0 = d == null ? "late" : (d < 0 ? "late" : kindOf(d));
          if (k0 !== "late" && k0 !== "today") return;
          out.push("- " + DOT[k0] + " " + clip(text, MAXLEN) + extra);
          return;
        }
        if (d == null) { // Hoshin ฯลฯ — ใช้วันที่ท้ายบรรทัด แล้วย้ายไปไว้หน้าข้อความ
          var dm = /(\d{1,2}-[A-Za-z]{3}(?:-\d{2,4})?)\s*$/.exec(text);
          if (dm) {
            d = daysTo(dm[1], ref);
            var rest = text.slice(0, dm.index).trim();
            var tp = /^(.*?)\s*\(([^()]+)\)\s*$/.exec(rest); // "AS-151, AS-252 (Clamp half lock)" → "Clamp half lock · AS-151, AS-252"
            if (tp && tp[1] && !/^◇/.test(tp[1])) rest = tp[2] + " · " + tp[1];
            text = dm[1] + " · " + rest;
          }
        }
        var k = kindOf(d);
        if (k !== "late" && k !== "today") return;
        var mo = /\s*\[([^\]]{1,30})\]\s*$/.exec(text); // [Owner] ท้ายบรรทัด (Follow-up)
        if (mo) text = mo[1].trim() + " · " + text.slice(0, mo.index);
        var tail = w.d != null ? " (" + whenTxt(k, d) + ")" : "";
        if (k === "today" && tail) tail = " (วันนี้)";
        out.push("- " + DOT[k] + " " + clip(text, MAXLEN + 12) + tail);
      });
    }
  }

  function install() {
    var api = window.QEDailySummary;
    if (!api || typeof api.build !== "function" || api.__qe140 || api.__qe139) return !!(api && (api.__qe140 || api.__qe139));
    var orig = api.build;
    api.build = function (slot) {
      var base = orig.apply(this, arguments);
      try {
        var t = restyle(base);
        if (!t || !t.trim() || /<br\b/i.test(t)) return base;
        return api.normalizeLineBreaks ? api.normalizeLineBreaks(t) : t;
      } catch (e) { diag(e); return base; }
    };
    api.__qe140 = VER;
    api.restyle = restyle;
    return true;
  }
  if (!install()) {
    var n = 0, tm = setInterval(function () { if (install() || ++n > 40) clearInterval(tm); }, 250);
  }
})();
