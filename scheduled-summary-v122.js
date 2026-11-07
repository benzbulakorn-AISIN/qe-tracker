/*! QE Elec. Daily Job Tracker V122 — single-source daily summary + Scheduled API bridge */
(function () {
  "use strict";
  if (window.__QE122_SCHEDULED_SUMMARY) return;
  window.__QE122_SCHEDULED_SUMMARY = true;

  var STORAGE_KEY = "qe_v122_schedule";
  var LEGACY_STORAGE_KEY = "qe_v121_schedule";
  var TIME_ZONE = "Asia/Bangkok";
  var VERSION = "122";
  var syncTimer = 0;
  var syncing = false;
  var lastHash = "";

  function byId(id) { return document.getElementById(id); }
  function capture(err, context) {
    try { window.QE86Diagnostics && window.QE86Diagnostics.capture(err, context || "v122 scheduled summary"); }
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
    } catch (err) { capture(err, "v122 read config"); return cfg; }
  }
  function saveConfig(cfg) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); }
    catch (err) { capture(err, "v122 save config"); }
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
    var text = String(value == null ? "" : value).replace(/\r\n?/g, "\n");
    /* V122: canonicalize raw BR plus named/numeric and double-escaped BR entities. */
    for (var pass = 0; pass < 4; pass++) {
      var before = text;
      text = text
        .replace(/&amp;(?=(?:lt|gt|#(?:x[0-9a-f]+|[0-9]+));)/gi, "&")
        .replace(/&lt;\s*br\s*\/?\s*&gt;/gi, "\n")
        .replace(/&#(?:0*60|x0*3c);?\s*br\s*\/?\s*&#(?:0*62|x0*3e);?/gi, "\n")
        .replace(/<br\b[^>]*>/gi, "\n");
      if (text === before) break;
    }
    return text;
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
    capture(new Error("Today summary collector is unavailable"), "v122 initialize summary");
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
  function jsonp(url, params, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var callback = "__qe122Jsonp_" + Date.now().toString(36) + Math.random().toString(36).slice(2);
      var script = document.createElement("script"), finished = false;
      var timer = setTimeout(function () { finish(new Error("Scheduled API ไม่ตอบกลับภายในเวลาที่กำหนด")); }, timeoutMs || 12000);
      function finish(err, value) {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        try { delete window[callback]; } catch (_) { window[callback] = void 0; }
        script.remove();
        err ? reject(err) : resolve(value);
      }
      window[callback] = function (value) { finish(null, value); };
      params = Object.assign({}, params || {}, { callback: callback, t: Date.now() });
      var query = Object.keys(params).map(function (key) { return encodeURIComponent(key) + "=" + encodeURIComponent(params[key]); }).join("&");
      script.src = url + (url.indexOf("?") >= 0 ? "&" : "?") + query;
      script.async = true;
      script.onerror = function () { finish(new Error("โหลดสถานะ Scheduled API ไม่สำเร็จ — ตรวจ Deployment และสิทธิ์ Anyone")); };
      document.head.appendChild(script);
    });
  }
  async function probeScheduledApi(url) {
    var parsed = await jsonp(url, { health: 1 });
    if (!parsed || !parsed.ok || parsed.service !== "QE V122 Scheduled Summary API" || String(parsed.version) !== VERSION || parsed.contract !== "qe-summary-cache/v1") {
      throw new Error("URL นี้ไม่ใช่ Scheduled API V122 — กรุณา Deploy GoogleAppsScript-Scheduled-API-V122.gs");
    }
    if (!parsed.configured) {
      throw new Error("ยังไม่พบ Secret ที่มีค่า — รองรับ QE_V122_SECRET หรือ QE_V121_SECRET (V121 เดิม)");
    }
    return parsed;
  }
  async function postOpaque(url, body) {
    /* Apps Script ContentService redirects to script.googleusercontent.com. no-cors lets the POST execute
       without the browser trying to read the cross-origin redirected response. Verification uses JSONP. */
    return fetch(url, {
      method: "POST",
      mode: "no-cors",
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
      cache: "no-store",
      credentials: "omit"
    });
  }
  async function waitForChecksum(url, checksum) {
    var latest = null;
    for (var attempt = 0; attempt < 14; attempt++) {
      if (attempt) await new Promise(function (resolve) { setTimeout(resolve, 400); });
      latest = await jsonp(url, { health: 1 }, 12000);
      if (latest && latest.ok && latest.cacheReady && String(latest.checksum || "") === String(checksum)) return latest;
    }
    throw new Error("ส่ง Cache แล้วแต่ยังไม่พบ checksum ใหม่ — ตรวจว่า Secret ใน Tracker ตรงกับ Script Property");
  }
  function buildValidatedSnapshot() {
    var snap = api.snapshot();
    snap.morning = normalizeLineBreaks(snap.morning);
    snap.evening = normalizeLineBreaks(snap.evening);
    if (!snap.morning.trim()) throw new Error("Morning Summary ว่าง — ยกเลิกก่อนเรียก Scheduled API");
    if (!snap.evening.trim()) throw new Error("Evening Summary ว่าง — ยกเลิกก่อนเรียก Scheduled API");
    var leaked = /<br\b[^>]*>|&(?:amp;)*(?:lt|#(?:x0*3c|0*60));?\s*br/i;
    if (leaked.test(snap.morning) || leaked.test(snap.evening)) throw new Error("Summary ยังมีแท็ก BR หลัง normalization — ยกเลิกก่อนเรียก Scheduled API");
    return snap;
  }
  function status(text, good) {
    var el = byId("qe122ScheduleStatus");
    if (el) {
      el.textContent = text;
      el.dataset.state = good === true ? "ok" : good === false ? "bad" : "busy";
    }
  }
  function formToConfig() {
    var cfg = readConfig();
    var enabled = byId("qe122ScheduleEnabled"), url = byId("qe122ScheduleUrl"), secret = byId("qe122ScheduleSecret");
    if (enabled) cfg.enabled = enabled.checked;
    if (url) cfg.url = url.value.trim();
    if (secret) cfg.secret = secret.value;
    return cfg;
  }
  function configToForm() {
    var cfg = readConfig(), enabled = byId("qe122ScheduleEnabled"), url = byId("qe122ScheduleUrl"), secret = byId("qe122ScheduleSecret");
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
    var snap;
    try { snap = buildValidatedSnapshot(); }
    catch (err) {
      status("❌ " + String(err.message || err), false);
      if (force) notify("⚠️ ยังไม่ส่ง API: " + String(err.message || err), "var(--t-dang)");
      return false;
    }
    var payloadHash = hash(snap.sourceDate + "\n" + snap.morning + "\n" + snap.evening);
    if (!force && payloadHash === lastHash) return true;
    syncing = true;
    status("⏳ ตรวจ Scheduled API ผ่าน JSONP (ไม่ติด CORS)…");
    try {
      var health = await probeScheduledApi(cfg.url);
      status("⏳ พบ " + health.propertyKey + " · กำลังส่ง Cache แบบ no-cors…");
      await postOpaque(cfg.url, {
        action: "cache",
        contract: "qe-summary-cache/v1",
        secret: cfg.secret,
        version: VERSION,
        timeZone: TIME_ZONE,
        sourceDate: snap.sourceDate,
        generatedAt: snap.generatedAt,
        summaries: { morning: snap.morning, evening: snap.evening },
        checksum: payloadHash
      });
      status("⏳ ส่งแล้ว · กำลังตรวจ checksum จาก Scheduled API…");
      var verified = await waitForChecksum(cfg.url, payloadHash);
      lastHash = payloadHash;
      cfg.enabled = true;
      cfg.lastSync = new Date().toISOString();
      cfg.lastStatus = "ผ่าน";
      saveConfig(cfg);
      if (verify) {
        if (!verified.lengths || !verified.lengths.morning || !verified.lengths.evening) throw new Error("Cache สำเร็จแต่ Morning/Evening length ไม่ครบ");
        status("✅ ซิงก์สำเร็จ · Morning " + verified.lengths.morning + " / Evening " + verified.lengths.evening + " ตัวอักษร", true);
        notify("✅ Scheduled API พร้อมใช้ — checksum และ Morning/Evening ตรวจแล้ว");
      } else status("✅ ซิงก์ข้อความสรุปแล้ว " + new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }), true);
      return true;
    } catch (err) {
      cfg.lastStatus = "ไม่ผ่าน";
      saveConfig(cfg);
      status("❌ " + String(err.message || err).slice(0, 220), false);
      if (force) notify("⚠️ Scheduled API ไม่พร้อม: " + String(err.message || err).slice(0, 150), "var(--t-dang)");
      capture(err, "v122 sync scheduled API");
      return false;
    } finally { syncing = false; }
  }
  function queueSync(delay) {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(function () { sync(false, false); }, delay == null ? 1600 : delay);
  }
  function installUi() {
    var grid = document.querySelector("#ov4 .ln-grid");
    if (!grid || byId("qe122SchedulePanel")) return;
    var panel = document.createElement("section");
    panel.id = "qe122SchedulePanel";
    panel.className = "qe122-schedule";
    panel.innerHTML =
      '<div class="ln-t">⏰ Scheduled API สำหรับ Power Automate · V122</div>' +
      '<label class="ln-ck"><input type="checkbox" id="qe122ScheduleEnabled"> ซิงก์สรุปอัตโนมัติเมื่อข้อมูลเปลี่ยน</label>' +
      '<label class="ln-lb" for="qe122ScheduleUrl">Scheduled API URL (Google Apps Script V122)</label>' +
      '<input id="qe122ScheduleUrl" inputmode="url" placeholder="https://script.google.com/macros/s/.../exec">' +
      '<label class="ln-lb" for="qe122ScheduleSecret">Scheduled API Secret</label>' +
      '<input id="qe122ScheduleSecret" type="password" autocomplete="off" placeholder="ตรงกับ QE_V122_SECRET หรือ QE_V121_SECRET เดิม">' +
      '<div class="ln-btns"><button type="button" class="btn-p" id="qe122ScheduleSave">บันทึก Scheduled API</button>' +
      '<button type="button" class="btn-g" id="qe122ScheduleTest">ซิงก์ + ตรวจข้อความ</button>' +
      '<button type="button" class="btn-g" id="qe122CopySample">คัดลอก Body สำหรับ Power Automate</button></div>' +
      '<div class="qe122-status" id="qe122ScheduleStatus" role="status" aria-live="polite">ยังไม่ได้ตั้งค่า Scheduled API</div>' +
      '<div class="ln-note"><b>V122 แก้ CORS:</b> ตรวจสถานะผ่าน JSONP และส่ง Cache แบบ no-cors แล้วตรวจ checksum กลับ จึงรองรับ redirect ของ Google Apps Script ไป script.googleusercontent.com</div>' +
      '<div class="ln-note">Power Automate เป็นตัวจับเวลา 07:30 / 16:30 (Asia/Bangkok) จึงทำงานได้แม้ปิด Browser; Tracker จะเก็บข้อความ Morning และ Evening จากตัวสร้างสรุปชุดเดียวกันไว้ที่ API</div>';
    grid.appendChild(panel);
    var style = document.createElement("style");
    style.textContent = ".qe122-schedule{grid-column:1/-1;border-top:1px dashed var(--line);margin-top:10px;padding-top:12px}.qe122-schedule .ln-btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:9px}.qe122-status{margin-top:8px;padding:8px 10px;border-radius:9px;background:var(--soft);font-size:12px;line-height:1.5}.qe122-status[data-state=ok]{color:var(--t-ok);background:rgba(34,197,94,.1)}.qe122-status[data-state=bad]{color:var(--t-dang);background:rgba(239,68,68,.1)}";
    document.head.appendChild(style);
    configToForm();
    byId("qe122ScheduleSave").addEventListener("click", function () {
      var cfg = formToConfig();
      if (cfg.enabled && (!validUrl(cfg.url) || !cfg.secret)) return status("❌ ใส่ URL /exec และ Secret ให้ครบก่อนเปิดใช้งาน", false);
      saveConfig(cfg);
      status(cfg.enabled ? "✅ บันทึกแล้ว — กดซิงก์ + ตรวจข้อความ" : "บันทึกแล้ว (ยังไม่เปิด Auto sync)", cfg.enabled ? null : true);
      queueSync(100);
    });
    byId("qe122ScheduleTest").addEventListener("click", function () { sync(true, true); });
    byId("qe122CopySample").addEventListener("click", async function () {
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
