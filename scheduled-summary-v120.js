/*! QE Elec. Daily Job Tracker V120 — single-source daily summary + Scheduled API bridge */
(function () {
  "use strict";
  if (window.__QE120_SCHEDULED_SUMMARY) return;
  window.__QE120_SCHEDULED_SUMMARY = true;

  var STORAGE_KEY = "qe_v120_schedule";
  var LEGACY_STORAGE_KEY = "qe_v119_schedule";
  var TIME_ZONE = "Asia/Bangkok";
  var VERSION = "120";
  var syncTimer = 0;
  var syncing = false;
  var lastHash = "";

  function byId(id) { return document.getElementById(id); }
  function capture(err, context) {
    try { window.QE86Diagnostics && window.QE86Diagnostics.capture(err, context || "v120 scheduled summary"); }
    catch (_) {}
  }
  function notify(text, color) {
    try { window.toast(text, color); }
    catch (_) { console.log(text); }
  }
  function readConfig() {
    var cfg = { enabled: false, url: "", secret: "", lastSync: "", lastStatus: "" };
    try {
      var current = localStorage.getItem(STORAGE_KEY);
      var legacy = !current && localStorage.getItem(LEGACY_STORAGE_KEY);
      var merged = Object.assign(cfg, JSON.parse(current || legacy || "{}") || {});
      if (!current && legacy) localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    } catch (err) { capture(err, "v120 read config"); return cfg; }
  }
  function saveConfig(cfg) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); }
    catch (err) { capture(err, "v120 save config"); }
  }
  function bangkokParts(date) {
    var parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    }).formatToParts(date || new Date());
    var out = {};
    parts.forEach(function (p) { if (p.type !== "literal") out[p.type] = p.value; });
    return out;
  }
  function slotNow(date) {
    var p = bangkokParts(date || new Date());
    return Number(p.hour || 0) < 12 ? "morning" : "evening";
  }
  function normalizeLineBreaks(value) {
    return String(value == null ? "" : value)
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/\r\n?/g, "\n");
  }
  function decorate(base, slot) {
    slot = slot === "evening" ? "evening" : "morning";
    var lines = normalizeLineBreaks(base).split("\n");
    var originalHeading = lines.shift() || "";
    var dateLine = originalHeading.replace(/^☀️\s*งานวันนี้\s*/, "📅 ");
    var heading = slot === "morning"
      ? "🔔 QE Electronics | Morning Pending Jobs"
      : "🌇 QE Electronics | Evening Job Summary";
    return [heading, dateLine].concat(lines).join("\n").trim();
  }

  var api = window.QEDailySummary;
  if (!api || typeof api.collect !== "function" || typeof api.buildBase !== "function") {
    capture(new Error("Today summary collector is unavailable"), "v120 initialize summary");
    return;
  }
  api.normalizeLineBreaks = normalizeLineBreaks;
  api.build = function (slot) { return normalizeLineBreaks(decorate(api.buildBase(api.collect()), slot || slotNow())); };
  api.slotNow = slotNow;
  api.snapshot = function () {
    var p = bangkokParts(new Date());
    return {
      version: VERSION,
      timeZone: TIME_ZONE,
      sourceDate: p.year + "-" + p.month + "-" + p.day,
      generatedAt: new Date().toISOString(),
      morning: api.build("morning"),
      evening: api.build("evening")
    };
  };
  window.buildDailySummary = function (slot) { return api.build(slot); };

  function validUrl(value) {
    try {
      var u = new URL(String(value || ""));
      return u.protocol === "https:" && /^(script\.google\.com|script\.googleusercontent\.com)$/i.test(u.hostname) && /\/exec(?:$|[?#])/.test(u.href);
    } catch (_) { return false; }
  }
  function hash(text) {
    var h = 2166136261, i;
    text = String(text || "");
    for (i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(16);
  }
  async function post(url, body) {
    var response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
      cache: "no-store"
    });
    var raw = await response.text(), parsed;
    try { parsed = JSON.parse(raw); }
    catch (_) { throw new Error("Scheduled API ตอบกลับไม่ใช่ JSON — ตรวจ Deployment และสิทธิ์ Anyone"); }
    if (!response.ok || !parsed.ok) throw new Error(parsed.error || ("HTTP " + response.status));
    return parsed;
  }
  function status(text, good) {
    var el = byId("qe120ScheduleStatus");
    if (el) {
      el.textContent = text;
      el.dataset.state = good === true ? "ok" : good === false ? "bad" : "busy";
    }
  }
  function formToConfig() {
    var cfg = readConfig();
    var enabled = byId("qe120ScheduleEnabled"), url = byId("qe120ScheduleUrl"), secret = byId("qe120ScheduleSecret");
    if (enabled) cfg.enabled = enabled.checked;
    if (url) cfg.url = url.value.trim();
    if (secret) cfg.secret = secret.value;
    return cfg;
  }
  function configToForm() {
    var cfg = readConfig(), enabled = byId("qe120ScheduleEnabled"), url = byId("qe120ScheduleUrl"), secret = byId("qe120ScheduleSecret");
    if (enabled) enabled.checked = !!cfg.enabled;
    if (url) url.value = cfg.url || "";
    if (secret) secret.value = cfg.secret || "";
    if (cfg.lastSync) status("ซิงก์ล่าสุด: " + new Date(cfg.lastSync).toLocaleString("th-TH") + (cfg.lastStatus ? " · " + cfg.lastStatus : ""), cfg.lastStatus === "ผ่าน");
  }
  async function sync(force, verify) {
    var cfg = formToConfig();
    if (!cfg.enabled && !force) return false;
    if (!validUrl(cfg.url)) {
      if (force) status("❌ URL ต้องเป็น Google Apps Script Web App ที่ลงท้าย /exec", false);
      return false;
    }
    if (!cfg.secret) {
      if (force) status("❌ กรุณาใส่ Scheduled API Secret", false);
      return false;
    }
    if (syncing) return false;
    var snap = api.snapshot();
    var payloadHash = hash(snap.sourceDate + "\n" + snap.morning + "\n" + snap.evening);
    if (!force && payloadHash === lastHash) return true;
    syncing = true;
    status("⏳ กำลังซิงก์ข้อความสรุปไป Scheduled API…");
    try {
      await post(cfg.url, {
        action: "cache",
        secret: cfg.secret,
        version: VERSION,
        timeZone: TIME_ZONE,
        sourceDate: snap.sourceDate,
        generatedAt: snap.generatedAt,
        summaries: { morning: snap.morning, evening: snap.evening },
        checksum: payloadHash
      });
      lastHash = payloadHash;
      cfg.enabled = true;
      cfg.lastSync = new Date().toISOString();
      cfg.lastStatus = "ผ่าน";
      saveConfig(cfg);
      if (verify) {
        var slot = slotNow();
        var result = await post(cfg.url, { action: "get", secret: cfg.secret, slot: slot });
        if (String(result.text || "") !== api.build(slot)) throw new Error("ข้อความที่อ่านกลับไม่ตรงกับข้อความจากปุ่มคัดลอกสรุป");
        status("✅ ซิงก์และตรวจข้อความตรงกันแล้ว (" + slot + ")", true);
        notify("✅ Scheduled API พร้อมใช้ — ข้อความตรงกับ Copy และ LINE");
      } else status("✅ ซิงก์ข้อความสรุปแล้ว " + new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }), true);
      return true;
    } catch (err) {
      cfg.lastStatus = "ไม่ผ่าน";
      saveConfig(cfg);
      status("❌ " + String(err.message || err).slice(0, 220), false);
      if (force) notify("⚠️ Scheduled API ไม่พร้อม: " + String(err.message || err).slice(0, 150), "var(--t-dang)");
      capture(err, "v120 sync scheduled API");
      return false;
    } finally { syncing = false; }
  }
  function queueSync(delay) {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(function () { sync(false, false); }, delay == null ? 1600 : delay);
  }
  function installUi() {
    var grid = document.querySelector("#ov4 .ln-grid");
    if (!grid || byId("qe120SchedulePanel")) return;
    var panel = document.createElement("section");
    panel.id = "qe120SchedulePanel";
    panel.className = "qe120-schedule";
    panel.innerHTML =
      '<div class="ln-t">⏰ Scheduled API สำหรับ Power Automate · V120</div>' +
      '<label class="ln-ck"><input type="checkbox" id="qe120ScheduleEnabled"> ซิงก์สรุปอัตโนมัติเมื่อข้อมูลเปลี่ยน</label>' +
      '<label class="ln-lb" for="qe120ScheduleUrl">Scheduled API URL (Google Apps Script V120)</label>' +
      '<input id="qe120ScheduleUrl" inputmode="url" placeholder="https://script.google.com/macros/s/.../exec">' +
      '<label class="ln-lb" for="qe120ScheduleSecret">Scheduled API Secret</label>' +
      '<input id="qe120ScheduleSecret" type="password" autocomplete="off" placeholder="ต้องตรงกับ QE_V120_SECRET ใน Script Properties">' +
      '<div class="ln-btns"><button type="button" class="btn-p" id="qe120ScheduleSave">บันทึก Scheduled API</button>' +
      '<button type="button" class="btn-g" id="qe120ScheduleTest">ซิงก์ + ตรวจข้อความ</button>' +
      '<button type="button" class="btn-g" id="qe120CopySample">คัดลอก Body สำหรับ Power Automate</button></div>' +
      '<div class="qe120-status" id="qe120ScheduleStatus" role="status" aria-live="polite">ยังไม่ได้ตั้งค่า Scheduled API</div>' +
      '<div class="ln-note">Power Automate เป็นตัวจับเวลา 07:30 / 16:30 (Asia/Bangkok) จึงทำงานได้แม้ปิด Browser; Tracker จะเก็บข้อความ Morning และ Evening จากตัวสร้างสรุปชุดเดียวกันไว้ที่ API</div>';
    grid.appendChild(panel);
    var style = document.createElement("style");
    style.textContent = ".qe120-schedule{grid-column:1/-1;border-top:1px dashed var(--line);margin-top:10px;padding-top:12px}.qe120-schedule .ln-btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:9px}.qe120-status{margin-top:8px;padding:8px 10px;border-radius:9px;background:var(--soft);font-size:12px;line-height:1.5}.qe120-status[data-state=ok]{color:var(--t-ok);background:rgba(34,197,94,.1)}.qe120-status[data-state=bad]{color:var(--t-dang);background:rgba(239,68,68,.1)}";
    document.head.appendChild(style);
    configToForm();
    byId("qe120ScheduleSave").addEventListener("click", function () {
      var cfg = formToConfig();
      if (cfg.enabled && (!validUrl(cfg.url) || !cfg.secret)) return status("❌ ใส่ URL /exec และ Secret ให้ครบก่อนเปิดใช้งาน", false);
      saveConfig(cfg);
      status(cfg.enabled ? "✅ บันทึกแล้ว — กดซิงก์ + ตรวจข้อความ" : "บันทึกแล้ว (ยังไม่เปิด Auto sync)", cfg.enabled ? null : true);
      queueSync(100);
    });
    byId("qe120ScheduleTest").addEventListener("click", function () { sync(true, true); });
    byId("qe120CopySample").addEventListener("click", async function () {
      var cfg = formToConfig(), body = JSON.stringify({ action: "get", secret: cfg.secret || "YOUR_SECRET", slot: slotNow() }, null, 2);
      try { await navigator.clipboard.writeText(body); notify("📋 คัดลอก HTTP Body สำหรับ Power Automate แล้ว"); }
      catch (_) { window.prompt("คัดลอก Body (Ctrl+C)", body); }
    });
  }
  function installAutoSync() {
    ["tb", "viewToday"].forEach(function (id) {
      var el = byId(id);
      if (el && window.MutationObserver) new MutationObserver(function () { queueSync(1800); }).observe(el, { childList: true, subtree: true, characterData: true });
    });
    ["spdb-pull", "spdb-sync", "storage"].forEach(function (name) { window.addEventListener(name, function () { queueSync(1200); }); });
    document.addEventListener("visibilitychange", function () { if (!document.hidden) queueSync(500); });
    setInterval(function () { if (!document.hidden) queueSync(0); }, 300000);
    queueSync(3500);
  }
  function start() { installUi(); installAutoSync(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
