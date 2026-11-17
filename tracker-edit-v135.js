/*! QE Elec. Daily Job Tracker — tracker-edit-v135.js  (แทน tracker-edit-v134.js · ใช้คู่กับ core-v125.min.js)
    v134: ปุ่ม ✎ ในคอลัมน์ "จัดการ" เปิดหน้าต่างแก้ไขรายการ (Modal) ได้ทันที ไม่ต้องลบแล้วสร้างใหม่
      - แก้ได้: วันที่แจ้ง (date), ผู้แจ้ง (owner), ประเภทงาน (pri), ปัญหา (issue), Countermeasure (cm),
                Due Date, Status, ความคืบหน้า (progress), หมายเหตุ (remark)
      - เปลี่ยน Due Date → ต่อท้าย item.revs เดิม {date, reason, at} = Rev. ถัดไป (โครงสร้างเดียวกับปุ่ม 📅)
      - บันทึกผ่าน save() / render() เดิม → localStorage "issue_tracker_v2" + Cloud Sync + updAt/updBy + Ctrl+Z
        + แจ้งเตือน LINE (onItemRev / onItemDone) ทำงานตามเดิม · อ้างอิงรายการด้วย id เสมอ
    v135: - แก้ป้ายเวอร์ชันใน Sidebar กระพริบสลับ v131/v134 (สคริปต์เก่าหลายตัวเขียนป้ายแข่งกัน)
            → ใช้ MutationObserver คืนค่าก่อนหน้าจอวาด จึงไม่เห็นการสลับ
          - แก้ป้าย "เลยกำหนด · เกิน N วัน" ในคอลัมน์ Due Date ล้นทับคอลัมน์ Status → ให้ตัดบรรทัดในช่องของตัวเอง
    ไม่แตะ: localStorage key/field เดิม, Backup schema, Restore/Trash, LINE/Teams/Scheduled Summary, Auth/Role/RLS
    ไม่มี network และไม่มี dependency ภายนอก */
(function () {
  "use strict";
  if (window.__QE134_EDIT) return;
  window.__QE134_EDIT = true;

  var VER = "v135", D = document, KEY = "issue_tracker_v2";
  var S = { ov: null, id: null, opener: null, init: null, open: false, busy: false, after: null, bodyOverflow: "" };
  var FIELDS = ["date", "owner", "pri", "status", "issue", "cm", "due", "prog", "reason", "remark"];
  var PRI_FALLBACK = [["", "— ไม่ระบุ —"], ["urgent", "Urgent"], ["newjob", "New"], ["pcr", "PCR"], ["claim", "Claim"], ["inhouse", "In-house"], ["activity", "Activity"]];

  /* ---------- helpers ---------- */
  function $(id) { return D.getElementById(id); }
  function diag(e, c) { try { window.QE86Diagnostics && window.QE86Diagnostics.capture(e, c || "tracker-edit-v135"); } catch (_) {} }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function clip(t, n) { t = String(t || "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1) + "…" : t; }
  function liveData() { try { return Array.isArray(data) ? data : null; } catch (_) { return null; } }
  function findItem(id) { var d = liveData(); if (!d) return null; for (var i = 0; i < d.length; i++) if (Number(d[i].id) === id) return d[i]; return null; }
  function todayYmd() {
    try { if (typeof today === "string" && /^\d{4}-\d{2}-\d{2}$/.test(today)) return today; } catch (_) {}
    var d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function curDueOf(it) {
    try { if (window.QEData && window.QEData.currentDue) return window.QEData.currentDue(it) || ""; } catch (_) {}
    var r = it && Array.isArray(it.revs) ? it.revs : [];
    return (r.length && r[r.length - 1] && r[r.length - 1].date) || (it && it.due) || "";
  }
  function fmtD(s) { try { return fmt(s); } catch (_) { return s || "—"; } }
  function say(m, c) { try { toast(m, c); } catch (_) {} }
  function me() { try { return String(localStorage.getItem("ux_me") || "").trim(); } catch (_) { return ""; } }
  function isRO() {
    if (window.__QE_RO) return true;
    try { if (window.QEAuth && QEAuth.enabled && QEAuth.enabled() && QEAuth.can && !QEAuth.can("write")) return true; } catch (_) {}
    return false;
  }
  function yRange() {
    var a = 2023, b = 2032;
    try { if (typeof Y_MIN === "number") a = Y_MIN; } catch (_) {}
    try { if (typeof Y_MAX === "number") b = Y_MAX; } catch (_) {}
    return [a, b];
  }
  function validYmd(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ""));
    if (!m) return false;
    var y = +m[1], mo = +m[2], d = +m[3], r = yRange();
    if (y < r[0] || y > r[1] || mo < 1 || mo > 12 || d < 1) return false;
    return d <= new Date(y, mo, 0).getDate();
  }

  /* ---------- v135: CSS ตาราง (โหลดทันที) — ป้ายเลยกำหนดไม่ล้นคอลัมน์ ---------- */
  var TABLE_CSS = [
    "#tb\x3etr\x3etd:nth-child(5){min-width:7.5em}",
    "#tb\x3etr\x3etd:nth-child(5) .tag{display:inline-block!important;max-width:100%!important;box-sizing:border-box;white-space:normal!important;overflow-wrap:anywhere;word-break:normal;line-height:1.35!important;text-align:left;vertical-align:top}"
  ].join("\n");
  function injectTableCss() {
    if ($("qe135TableCss") || !D.head) return;
    var st = D.createElement("style"); st.id = "qe135TableCss"; st.textContent = TABLE_CSS; D.head.appendChild(st);
  }

  /* ---------- CSS หน้าต่างแก้ไข ---------- */
  var CSS = [
    "body.qe134-open{overflow:hidden!important}",
    ".qe134-ov{position:fixed;inset:0;z-index:10060;display:flex;align-items:center;justify-content:center;padding:12px;background:rgba(8,15,35,.62)}",
    ".qe134-ov[hidden]{display:none!important}",
    ".qe134-md{box-sizing:border-box;display:flex;flex-direction:column;width:min(780px,100%);max-height:calc(100vh - 24px);max-height:calc(100dvh - 24px);border:1px solid var(--line,#cbd5e1);border-radius:16px;background:var(--pop,#fff);color:var(--txt,#1e293b);box-shadow:0 24px 70px rgba(0,0,0,.45);overflow:hidden;font-size:15px;line-height:1.5}",
    ".qe134-md form{display:flex!important;flex-direction:column!important;flex:1 1 auto;min-height:0;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important}",
    ".qe134-hd{padding:16px 20px 10px;border-bottom:1px solid var(--line,#cbd5e1)}",
    ".qe134-hd h3{margin:0;font-size:19px;line-height:1.3;color:var(--txt,#1e293b)}",
    ".qe134-sub{margin-top:2px;font-size:13px;color:var(--mut,#64748b);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
    ".qe134-body{flex:1 1 auto;min-height:0;overflow:auto;padding:14px 20px 8px}",
    ".qe134-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px 16px}",
    ".qe134-f{min-width:0}",
    ".qe134-f.full{grid-column:1/-1}",
    ".qe134-f\x3elabel{display:block;margin:0 0 4px;font-size:14px;font-weight:700;color:var(--txt,#1e293b)}",
    ".qe134-f\x3elabel b{color:var(--t-dang,#b91c1c)}",
    ".qe134-md input,.qe134-md select,.qe134-md textarea{width:100%!important;min-height:44px;margin:0!important;box-sizing:border-box;font-size:16px!important;font-family:inherit}",
    ".qe134-md textarea{min-height:92px;resize:vertical;line-height:1.5}",
    ".qe134-md [aria-invalid=\"true\"]{border-color:var(--dang,#dc2626)!important;box-shadow:0 0 0 2px rgba(220,38,38,.25)!important}",
    ".qe134-e{margin-top:4px;font-size:13.5px;font-weight:700;color:var(--t-dang,#b91c1c)}",
    ".qe134-e:empty{display:none}",
    ".qe134-hint{margin:2px 0 4px;font-size:12.5px;color:var(--mut,#64748b)}",
    ".qe134-hint:empty{display:none}",
    ".qe134-f[hidden],.qe134-conf[hidden],.qe134-all[hidden]{display:none!important}",
    ".qe134-all{margin:0 0 12px;padding:10px 12px;border:1px solid var(--dang,#dc2626);border-radius:10px;background:rgba(220,38,38,.1);color:var(--t-dang,#b91c1c);font-weight:700;white-space:pre-line}",
    ".qe134-hist{margin:14px 0 0;border-top:1px dashed var(--line,#cbd5e1)}",
    ".qe134-hist summary{display:flex;align-items:center;min-height:44px;cursor:pointer;font-weight:700;font-size:14px}",
    ".qe134-hist ol{margin:0 0 8px;padding-left:22px;font-size:14px}",
    ".qe134-hist li{margin:2px 0}",
    ".qe134-meta{margin:6px 0 0;font-size:12.5px;color:var(--mut,#64748b)}",
    ".qe134-meta:empty{display:none}",
    ".qe134-link{display:inline-flex;align-items:center;min-height:44px;margin:4px 0 0;padding:0 2px;border:0;background:transparent!important;box-shadow:none!important;color:var(--pri,#2563eb);font:inherit;font-size:13.5px;text-decoration:underline;text-underline-offset:3px;cursor:pointer}",
    ".qe134-conf{padding:12px 20px;border-top:2px solid var(--warn,#f59e0b);background:rgba(245,158,11,.14);font-weight:700}",
    ".qe134-act{display:flex;flex-wrap:wrap;gap:10px;margin-top:8px}",
    ".qe134-ft{display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:12px 20px;border-top:1px solid var(--line,#cbd5e1);background:var(--pop,#fff)}",
    ".qe134-ver{margin-right:auto;font-size:11.5px;color:var(--mut,#64748b)}",
    ".qe134-md .qe134-ft button,.qe134-md .qe134-act button{min-height:44px;min-width:112px;padding:8px 18px;font-size:15px;font-weight:800;animation:none!important}",
    ".qe134-md :focus-visible{outline:3px solid var(--ring,#93c5fd)!important;outline-offset:2px!important}",
    "@media (max-width:640px){",
    ".qe134-ov{align-items:flex-end;padding:0}",
    ".qe134-md{width:100%;max-height:100vh;max-height:100dvh;border-radius:16px 16px 0 0}",
    ".qe134-grid{grid-template-columns:1fr}",
    ".qe134-hd,.qe134-body,.qe134-ft,.qe134-conf{padding-left:14px;padding-right:14px}",
    ".qe134-ver{display:none}",
    ".qe134-md .qe134-ft button,.qe134-md .qe134-act button{flex:1 1 0;min-width:0}",
    "}",
    "@media print{.qe134-ov{display:none!important}}"
  ].join("\n");

  var TPL =
    '<div class="qe134-md" role="dialog" aria-modal="true" aria-labelledby="qe134Title" aria-describedby="qe134Sub">' +
    '<form id="qe134Form" novalidate>' +
    '<div class="qe134-hd"><h3 id="qe134Title">✎ แก้ไขรายการ</h3><div class="qe134-sub" id="qe134Sub"></div></div>' +
    '<div class="qe134-body">' +
    '<div class="qe134-all" id="qe134All" role="alert" hidden></div>' +
    '<div class="qe134-grid">' +
    '<div class="qe134-f"><label for="qe134Date">วันที่แจ้ง <b aria-hidden="true">*</b></label><input type="date" id="qe134Date" aria-describedby="qe134DateE"><div class="qe134-e" id="qe134DateE"></div></div>' +
    '<div class="qe134-f"><label for="qe134Owner">ผู้แจ้ง / ผู้รับผิดชอบ <b aria-hidden="true">*</b></label><input type="text" id="qe134Owner" maxlength="200" list="ownerList" autocomplete="off" aria-describedby="qe134OwnerE"><div class="qe134-e" id="qe134OwnerE"></div></div>' +
    '<div class="qe134-f"><label for="qe134Pri">ประเภทงาน</label><select id="qe134Pri"></select></div>' +
    '<div class="qe134-f"><label for="qe134Status">สถานะ (Status)</label><select id="qe134Status"></select></div>' +
    '<div class="qe134-f full"><label for="qe134Issue">ปัญหา (Issue) <b aria-hidden="true">*</b></label><div class="qe134-hint" id="qe134IssueH">หัวข้อและรายละเอียดอยู่ในช่องเดียวกันตามระบบเดิม — บรรทัดแรกจะแสดงเป็นหัวข้อ</div><textarea id="qe134Issue" rows="3" maxlength="5000" aria-describedby="qe134IssueH qe134IssueE"></textarea><div class="qe134-e" id="qe134IssueE"></div></div>' +
    '<div class="qe134-f full"><label for="qe134Cm">มาตรการแก้ไข (Countermeasure / Action Plan) <b aria-hidden="true">*</b></label><textarea id="qe134Cm" rows="3" maxlength="5000" aria-describedby="qe134CmE"></textarea><div class="qe134-e" id="qe134CmE"></div></div>' +
    '<div class="qe134-f"><label for="qe134Due">Due Date (กำหนดเสร็จ) <b aria-hidden="true">*</b></label><input type="date" id="qe134Due" aria-describedby="qe134DueH qe134DueE"><div class="qe134-hint" id="qe134DueH"></div><div class="qe134-e" id="qe134DueE"></div></div>' +
    '<div class="qe134-f"><label for="qe134Prog">ความคืบหน้า (%)</label><input type="number" id="qe134Prog" min="0" max="100" step="1" inputmode="numeric" placeholder="ว่าง = ไม่ระบุ" aria-describedby="qe134ProgE"><div class="qe134-e" id="qe134ProgE"></div></div>' +
    '<div class="qe134-f full" id="qe134ReasonBox" hidden><label for="qe134Reason">เหตุผลการเลื่อน Due Date <span id="qe134RevNo"></span></label><input type="text" id="qe134Reason" maxlength="1000" placeholder="เช่น รออะไหล่ / รอผลทดสอบ (ไม่บังคับ)"></div>' +
    '<div class="qe134-f full"><label for="qe134Remark">หมายเหตุ (Remark)</label><textarea id="qe134Remark" rows="2" maxlength="1000"></textarea></div>' +
    '</div>' +
    '<details class="qe134-hist" id="qe134HistBox"><summary>📅 ประวัติ Due Date (Rev.)</summary><ol id="qe134Hist"></ol></details>' +
    '<div class="qe134-meta" id="qe134Meta"></div>' +
    '<button type="button" class="qe134-link" id="qe134Legacy">เปิดฟอร์มเดิม (Customer / Model / ติดปัญหา / ผู้ช่วย)</button>' +
    '</div>' +
    '<div class="qe134-conf" id="qe134Conf" hidden><div id="qe134ConfT" role="alert">มีการแก้ไขที่ยังไม่บันทึก — ต้องการทิ้งการแก้ไขหรือไม่?</div>' +
    '<div class="qe134-act"><button type="button" class="btn-g" id="qe134Keep">กลับไปแก้ต่อ</button><button type="button" class="btn-d" id="qe134Discard">ทิ้งการแก้ไข</button></div></div>' +
    '<div class="qe134-ft" id="qe134Ft"><span class="qe134-ver">' + VER + '</span>' +
    '<button type="button" class="btn-g" id="qe134Cancel">ยกเลิก</button>' +
    '<button type="submit" class="btn-p" id="qe134Save">💾 บันทึก</button></div>' +
    '</form></div>';

  /* ---------- build (lazy, ครั้งเดียว) ---------- */
  function build() {
    if (S.ov) return S.ov;
    if (!$("qe134Css")) { var st = D.createElement("style"); st.id = "qe134Css"; st.textContent = CSS; D.head.appendChild(st); }
    var ov = D.createElement("div");
    ov.className = "qe134-ov"; ov.id = "qe134Ov"; ov.hidden = true;
    ov.innerHTML = TPL;
    D.body.appendChild(ov);
    S.ov = ov;
    $("qe134Form").addEventListener("submit", onSubmit);
    $("qe134Cancel").addEventListener("click", function () { requestClose(null); });
    $("qe134Keep").addEventListener("click", hideConfirm);
    $("qe134Discard").addEventListener("click", function () { var fn = S.after; hideConfirm(); closeNow(); if (fn) fn(); });
    $("qe134Legacy").addEventListener("click", function () {
      var id = S.id;
      requestClose(function () { try { if (typeof window.edit === "function") window.edit(id); } catch (e) { diag(e, "tracker-edit-v135 legacy"); } });
    });
    $("qe134Due").addEventListener("input", syncReason);
    $("qe134Due").addEventListener("change", syncReason);
    ov.addEventListener("input", function (e) { if (e.target && e.target.getAttribute("aria-invalid") === "true") clearErr(e.target); });
    ov.addEventListener("change", function (e) { if (e.target && e.target.getAttribute("aria-invalid") === "true") clearErr(e.target); });
    ov.addEventListener("mousedown", function (e) { if (e.target === ov) requestClose(null); });
    $("qe134Issue").addEventListener("keydown", ctrlEnter);
    $("qe134Cm").addEventListener("keydown", ctrlEnter);
    $("qe134Remark").addEventListener("keydown", ctrlEnter);
    return ov;
  }
  function ctrlEnter(e) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !e.isComposing) {
      e.preventDefault();
      var f = $("qe134Form"); if (f.requestSubmit) f.requestSubmit($("qe134Save")); else $("qe134Save").click();
    }
  }
  function fillSelect(sel, pairs, value) {
    sel.textContent = "";
    var has = false;
    pairs.forEach(function (p) { var o = D.createElement("option"); o.value = p[0]; o.textContent = p[1]; if (p[0] === value) has = true; sel.appendChild(o); });
    if (!has && value) { var o = D.createElement("option"); o.value = value; o.textContent = value; sel.appendChild(o); }
    sel.value = value || "";
  }
  function optionsFrom(id, fallback) {
    var s = $(id), out = [];
    if (s && s.options && s.options.length) Array.prototype.forEach.call(s.options, function (o) { out.push([o.value, String(o.textContent || o.value).trim()]); });
    return out.length ? out : fallback;
  }

  /* ---------- open ---------- */
  function open(id, opener) {
    id = Number(id);
    var it = findItem(id);
    if (!it) { say("⚠️ ไม่พบรายการนี้ (อาจถูกลบหรือซิงก์จากเครื่องอื่น)", "var(--t-dang)"); return; }
    if (isRO()) { say("👁 บัญชีนี้ดูอย่างเดียว — แก้ไขข้อมูลไม่ได้", "var(--t-warn)"); return; }
    build();
    S.id = id; S.opener = opener || null; S.after = null; S.busy = false;
    hideConfirm(); clearAllErr();

    var statusPairs = optionsFrom("status", ((window.__qeSan && window.__qeSan.STATUS) || ["In Progress", "Done"]).map(function (s) { return [s, s]; }));
    fillSelect($("qe134Status"), statusPairs, it.status || "In Progress");
    var priPairs = optionsFrom("uxPri", PRI_FALLBACK);
    fillSelect($("qe134Pri"), priPairs, it.pri || "");

    var due = curDueOf(it);
    $("qe134Date").value = it.date || "";
    $("qe134Owner").value = it.owner || "";
    $("qe134Issue").value = it.issue || "";
    $("qe134Cm").value = it.cm || "";
    $("qe134Due").value = due || "";
    $("qe134Prog").value = (it.progress === "" || it.progress == null) ? "" : String(it.progress);
    $("qe134Reason").value = "";
    $("qe134Remark").value = it.remark || "";

    $("qe134Sub").textContent = clip(String(it.issue || "").split("\n")[0], 90) + "  · ID " + id;
    var revs = Array.isArray(it.revs) ? it.revs : [];
    $("qe134DueH").textContent = due ? ("ปัจจุบัน " + fmtD(due) + (revs.length ? " (Rev." + revs.length + ") · Due เดิม " + fmtD(it.due) : "")) : "ยังไม่มี Due Date";
    var ol = $("qe134Hist"); ol.textContent = "";
    if (it.due) { var li0 = D.createElement("li"); li0.textContent = "Original: " + fmtD(it.due); ol.appendChild(li0); }
    revs.forEach(function (r, i) {
      var li = D.createElement("li");
      li.textContent = "Rev." + (i + 1) + ": " + fmtD(r && r.date) + (r && r.reason ? " — " + r.reason : "") + (r && r.at ? " (บันทึก " + fmtD(r.at) + ")" : "");
      ol.appendChild(li);
    });
    $("qe134HistBox").hidden = !ol.children.length;
    $("qe134HistBox").open = false;
    var meta = "";
    if (it.updAt) { try { meta = "แก้ไขล่าสุด: " + (it.updBy ? it.updBy + " · " : "") + new Date(it.updAt).toLocaleString("th-TH", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" }); } catch (_) {} }
    $("qe134Meta").textContent = meta;

    syncReason();
    S.init = readForm();
    S.open = true;
    S.bodyOverflow = D.body.style.overflow;
    D.body.classList.add("qe134-open");
    S.ov.hidden = false;
    setTimeout(function () { try { $("qe134Date").focus({ preventScroll: true }); } catch (_) { $("qe134Date").focus(); } }, 30);
  }

  function readForm() {
    return {
      date: String($("qe134Date").value || "").trim(),
      owner: String($("qe134Owner").value || "").trim(),
      pri: String($("qe134Pri").value || ""),
      status: String($("qe134Status").value || ""),
      issue: String($("qe134Issue").value || "").replace(/\r\n?/g, "\n").trim(),
      cm: String($("qe134Cm").value || "").replace(/\r\n?/g, "\n").trim(),
      due: String($("qe134Due").value || "").trim(),
      prog: String($("qe134Prog").value || "").trim(),
      reason: String($("qe134Reason").value || "").trim(),
      remark: String($("qe134Remark").value || "").replace(/\r\n?/g, "\n").trim()
    };
  }
  function isDirty() {
    if (!S.init) return false;
    var v = readForm();
    return FIELDS.some(function (k) { return v[k] !== S.init[k]; });
  }
  function syncReason() {
    var it = findItem(S.id), box = $("qe134ReasonBox");
    if (!it || !box) return;
    var v = String($("qe134Due").value || ""), cur = curDueOf(it);
    var willRev = !!(it.due && v && v !== cur);
    box.hidden = !willRev;
    $("qe134RevNo").textContent = willRev ? "(จะบันทึกเป็น Rev." + ((Array.isArray(it.revs) ? it.revs.length : 0) + 1) + ")" : "";
  }

  /* ---------- validation ---------- */
  function setErr(inputId, msg) {
    var inp = $(inputId), box = $(inputId + "E");
    if (box) box.textContent = msg;
    if (inp) inp.setAttribute("aria-invalid", "true");
  }
  function clearErr(inp) { inp.removeAttribute("aria-invalid"); var b = $(inp.id + "E"); if (b) b.textContent = ""; }
  function clearAllErr() {
    if (!S.ov) return;
    Array.prototype.forEach.call(S.ov.querySelectorAll("[aria-invalid]"), function (n) { n.removeAttribute("aria-invalid"); });
    Array.prototype.forEach.call(S.ov.querySelectorAll(".qe134-e"), function (n) { n.textContent = ""; });
    var a = $("qe134All"); a.textContent = ""; a.hidden = true;
  }
  function showAll(msg) { var a = $("qe134All"); a.textContent = msg; a.hidden = !msg; if (msg) try { a.scrollIntoView({ block: "nearest" }); } catch (_) {} }
  function validate(v) {
    var bad = [], r = yRange(), rangeTxt = " (ช่วงที่รองรับ พ.ศ. " + (r[0] + 543) + "–" + (r[1] + 543) + ")";
    if (!v.date) { setErr("qe134Date", "กรุณาเลือกวันที่แจ้ง"); bad.push("qe134Date"); }
    else if (!validYmd(v.date)) { setErr("qe134Date", "วันที่แจ้งไม่ถูกต้อง" + rangeTxt); bad.push("qe134Date"); }
    if (!v.owner) { setErr("qe134Owner", "กรุณาระบุผู้แจ้ง / ผู้รับผิดชอบ"); bad.push("qe134Owner"); }
    if (!v.issue) { setErr("qe134Issue", "หัวข้อปัญหาห้ามว่าง"); bad.push("qe134Issue"); }
    if (!v.cm) { setErr("qe134Cm", "Countermeasure ห้ามว่าง"); bad.push("qe134Cm"); }
    if (!v.due) { setErr("qe134Due", "Due Date ห้ามว่าง"); bad.push("qe134Due"); }
    else if (!validYmd(v.due)) { setErr("qe134Due", "Due Date ไม่ถูกต้อง" + rangeTxt); bad.push("qe134Due"); }
    else if (validYmd(v.date) && v.due < v.date) { setErr("qe134Due", "Due Date เร็วกว่าวันที่แจ้ง (" + fmtD(v.date) + ") — กรุณาแก้ไข"); bad.push("qe134Due"); }
    if (v.prog !== "") {
      var n = Number(v.prog);
      if (!/^\d{1,3}$/.test(v.prog) || !isFinite(n) || n < 0 || n > 100) { setErr("qe134Prog", "ใส่ตัวเลขจำนวนเต็ม 0–100 (หรือเว้นว่าง)"); bad.push("qe134Prog"); }
    }
    return bad;
  }

  /* ---------- save ---------- */
  function onSubmit(e) {
    e.preventDefault();
    if (S.busy || !S.open) return;
    clearAllErr();
    var v = readForm(), bad = validate(v);
    if (bad.length) { var f = $(bad[0]); if (f) try { f.focus(); } catch (_) {} return; }
    if (isRO()) { showAll("บัญชีนี้ดูอย่างเดียว — บันทึกไม่ได้"); return; }
    var id = S.id, it = findItem(id);
    if (!it) { showAll("ไม่พบรายการนี้แล้ว (อาจถูกลบหรือซิงก์จากเครื่องอื่น) — ปิดหน้าต่างแล้วลองใหม่"); return; }
    var init = S.init, ch = {};
    FIELDS.forEach(function (k) { if (v[k] !== init[k]) ch[k] = true; });
    if (!Object.keys(ch).length || (Object.keys(ch).length === 1 && ch.reason)) { closeNow(); say("ไม่มีข้อมูลที่เปลี่ยนแปลง"); return; }

    S.busy = true; $("qe134Save").disabled = true;
    var snap = JSON.parse(JSON.stringify(it)), revFrom = null, doneNow = false, t = todayYmd();
    try {
      if (ch.date) it.date = v.date;
      if (ch.owner) it.owner = v.owner;
      if (ch.issue) it.issue = v.issue;
      if (ch.cm) it.cm = v.cm;
      if (ch.pri) { if (v.pri) it.pri = v.pri; else delete it.pri; }
      if (ch.remark) { if (v.remark || "remark" in it) it.remark = v.remark; }
      if (ch.prog) { if (v.prog === "") { if ("progress" in it) it.progress = ""; } else it.progress = Math.max(0, Math.min(100, Math.round(Number(v.prog)))); }
      if (ch.due) {
        var cur = curDueOf(it);
        if (v.due !== cur) {
          if (!it.due) it.due = v.due;
          else {
            if (!Array.isArray(it.revs)) it.revs = [];
            it.revs.push({ date: v.due, reason: v.reason || "แก้ไข Due Date จากหน้าต่างแก้ไข", at: t });
            revFrom = cur;
          }
        }
      }
      if (ch.status) {
        var prev = snap.status;
        it.status = v.status;
        if (prev !== "Done" && v.status === "Done") { if (!it.doneDate) it.doneDate = t; doneNow = true; }
        if (prev === "Done" && v.status !== "Done") delete it.doneDate;
      }
      it.updAt = new Date().toISOString();
      var who = me(); if (who) it.updBy = who;
      save();
      render();
    } catch (err) {
      diag(err, "tracker-edit-v135 save");
      var live = findItem(id);
      if (live) { Object.keys(live).forEach(function (k) { delete live[k]; }); Object.keys(snap).forEach(function (k) { live[k] = snap[k]; }); }
      try { var d = liveData(); if (d) localStorage.setItem(KEY, JSON.stringify(d)); } catch (e2) { diag(e2, "tracker-edit-v135 restore"); }
      try { render(); } catch (e3) { diag(e3, "tracker-edit-v135 render restore"); }
      S.busy = false; $("qe134Save").disabled = false;
      showAll("❌ บันทึกไม่สำเร็จ — คืนค่าข้อมูลเดิมแล้ว\nสาเหตุ: " + friendly(err));
      return;
    }
    S.busy = false; $("qe134Save").disabled = false;
    closeNow(true);
    say("✅ บันทึกข้อมูลเรียบร้อย");
    setTimeout(function () {
      try { if (revFrom && typeof window.onItemRev === "function") window.onItemRev(it, revFrom); } catch (e4) { diag(e4, "tracker-edit-v135 onItemRev"); }
      try { if (doneNow && typeof window.onItemDone === "function") window.onItemDone(it); } catch (e5) { diag(e5, "tracker-edit-v135 onItemDone"); }
    }, 0);
    setTimeout(function () { focusRow(id); }, 60);
  }
  function friendly(err) {
    var n = err && err.name, m = String(err && err.message || err || "ไม่ทราบสาเหตุ");
    if (n === "QuotaExceededError" || /quota/i.test(m)) return "พื้นที่จัดเก็บของเบราว์เซอร์เต็ม — กด 💾 Backup แล้วล้างถังขยะ จากนั้นลองใหม่";
    return m.slice(0, 200);
  }
  function focusRow(id) {
    var b = D.querySelector('#tb [data-qe-fn="edit"][data-qe-a="' + id + '"]');
    var row = b && b.closest("tr");
    if (b && row && row.style.display !== "none" && b.offsetParent !== null) {
      try { b.focus({ preventScroll: true }); row.scrollIntoView({ block: "nearest" }); } catch (_) { b.focus(); }
      return;
    }
    var q = $("q"); if (q) try { q.focus({ preventScroll: true }); } catch (_) {}
  }

  /* ---------- close ---------- */
  function showConfirm(after) {
    S.after = after || null;
    $("qe134Conf").hidden = false; $("qe134Ft").hidden = true;
    setTimeout(function () { try { $("qe134Keep").focus(); } catch (_) {} }, 0);
  }
  function hideConfirm() {
    if (!S.ov) return;
    var wasOpen = !$("qe134Conf").hidden;
    $("qe134Conf").hidden = true; $("qe134Ft").hidden = false; S.after = null;
    if (wasOpen && S.open) setTimeout(function () { try { $("qe134Cancel").focus(); } catch (_) {} }, 0);
  }
  function requestClose(after) {
    if (!S.open) return;
    if (isDirty()) { showConfirm(after); return; }
    closeNow(); if (after) after();
  }
  function closeNow(saved) {
    if (!S.ov) return;
    S.open = false; S.init = null;
    S.ov.hidden = true;
    $("qe134Conf").hidden = true; $("qe134Ft").hidden = false;
    D.body.classList.remove("qe134-open");
    D.body.style.overflow = S.bodyOverflow || "";
    if (!saved && S.opener && S.opener.isConnected) try { S.opener.focus({ preventScroll: true }); } catch (_) {}
  }

  /* ---------- wiring ---------- */
  // window-capture = ทำงานก่อน delegator เดิม (document-capture ของ data-qe-fn) จึงไม่ต้องแก้ core
  window.addEventListener("click", function (e) {
    var b = e.target && e.target.closest && e.target.closest('#tb [data-qe-fn="edit"]');
    if (!b || b.disabled) return;
    if (isRO()) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    try { open(b.getAttribute("data-qe-a"), b); }
    catch (err) {
      diag(err, "tracker-edit-v135 open");
      try { if (typeof window.edit === "function") window.edit(Number(b.getAttribute("data-qe-a"))); } catch (_) {}
    }
  }, true);
  window.addEventListener("keydown", function (e) {
    if (!S.open || e.key !== "Escape") return;
    if (D.querySelector(".qe84-dialog,.ux-al")) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (!$("qe134Conf").hidden) hideConfirm(); else requestClose(null);
  }, true);
  window.addEventListener("beforeunload", function (e) {
    if (S.open && isDirty()) { e.preventDefault(); e.returnValue = ""; }
  });

  /* ---------- v135: ป้ายเวอร์ชันใน Sidebar — ไม่กระพริบ ----------
     version-v125.js และ tracker-toolbar-v131.js ยังเขียนป้ายเป็นเลขของตัวเองซ้ำ ๆ ช่วงแรกหลังโหลด
     MutationObserver ทำงานก่อนเบราว์เซอร์วาดหน้าจอ จึงคืนค่า VER ได้ทันทีโดยไม่เห็นการสลับ */
  var verBusy = false;
  function setVer() {
    if (verBusy) return;
    verBusy = true;
    try {
      try { window.QE_UI_VERSION = VER; } catch (_) {}
      Array.prototype.forEach.call(D.querySelectorAll(".qe105-ver"), function (n) { if (n.textContent !== VER) n.textContent = VER; });
      var br = D.querySelector(".qe105-brand");
      if (br && br.title) { var t2 = br.title.replace(/หน้าจอ \(UI\) v\d+/, "หน้าจอ (UI) " + VER); if (t2 !== br.title) br.title = t2; }
    } catch (e) { diag(e, "tracker-edit-v135 version"); }
    verBusy = false;
  }
  function watchVer() {
    setVer();
    if (window.MutationObserver && D.body) {
      new MutationObserver(function (list) {
        for (var i = 0; i < list.length; i++) {
          var t = list[i].target, el = t.nodeType === 1 ? t : t.parentNode;
          if (el && el.closest && (el.closest(".qe105-ver") || (el.classList && el.classList.contains("qe105-brand")))) { setVer(); return; }
          var ad = list[i].addedNodes || [];
          for (var j = 0; j < ad.length; j++) {
            var a = ad[j];
            if (a.nodeType === 1 && (a.matches(".qe105-ver") || a.querySelector(".qe105-ver"))) { setVer(); return; }
          }
        }
      }).observe(D.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["title"] });
    }
  }

  function boot() { injectTableCss(); watchVer(); }
  if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", boot, { once: true }); else boot();
  injectTableCss();

  window.QE134Edit = Object.freeze({ version: VER, open: function (id) { open(id, null); }, close: function () { requestClose(null); } });
})();
