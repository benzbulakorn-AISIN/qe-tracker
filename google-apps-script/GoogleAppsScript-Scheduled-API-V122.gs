/*
 * QE Elec. Daily Job Tracker V122 — Scheduled Summary API
 *
 * Script Properties accepted (first non-empty value wins):
 *   1) QE_V122_SECRET
 *   2) QE_V121_SECRET  (backward-compatible)
 *
 * Deploy as Web app: Execute as Me / Who has access: Anyone.
 * The API only caches and returns summary text. It never sends LINE messages.
 */

var QE_V122 = (function () {
  "use strict";
  var PREFIX = "QE_V122_CACHE_";
  var CONTRACT = "qe-summary-cache/v1";
  var CHUNK_SIZE = 7800;
  var MAX_AGE_MINUTES = 24 * 60;
  var SECRET_KEYS = ["QE_V122_SECRET", "QE_V121_SECRET"];

  function output(value, callback) {
    var json = JSON.stringify(value);
    callback = String(callback || "");
    if (/^[A-Za-z_$][0-9A-Za-z_$\.]{0,120}$/.test(callback)) {
      return ContentService.createTextOutput(callback + "(" + json + ");")
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService.createTextOutput(json)
      .setMimeType(ContentService.MimeType.JSON);
  }
  function clean(value) {
    return String(value == null ? "" : value).replace(/^\uFEFF/, "").trim();
  }
  function secretInfo() {
    var props = PropertiesService.getScriptProperties().getProperties() || {};
    var key, value, i;
    for (i = 0; i < SECRET_KEYS.length; i++) {
      key = SECRET_KEYS[i];
      value = clean(props[key]);
      if (value) return { value: value, key: key, configured: true, length: value.length };
    }
    /* Tolerate accidental spaces/BOM/case in a property name without exposing its value. */
    var keys = Object.keys(props);
    for (i = 0; i < keys.length; i++) {
      var normalized = clean(keys[i]).toUpperCase();
      if (SECRET_KEYS.indexOf(normalized) >= 0) {
        value = clean(props[keys[i]]);
        if (value) return { value: value, key: keys[i], configured: true, length: value.length };
      }
    }
    return { value: "", key: "", configured: false, length: 0 };
  }
  function safeEqual(a, b) {
    a = clean(a); b = clean(b);
    if (!a || a.length !== b.length) return false;
    var diff = 0;
    for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  }
  function authorized(value) {
    var info = secretInfo();
    return info.configured && safeEqual(value, info.value);
  }
  function parsePost(e) {
    try { return JSON.parse((e && e.postData && e.postData.contents) || "{}"); }
    catch (_) { return {}; }
  }
  function clearLarge(key) {
    var props = PropertiesService.getScriptProperties();
    var count = Number(props.getProperty(key + "_COUNT") || 0);
    for (var i = 0; i < count; i++) props.deleteProperty(key + "_" + i);
    props.deleteProperty(key + "_COUNT");
  }
  function setLarge(key, value) {
    var props = PropertiesService.getScriptProperties();
    clearLarge(key);
    var text = JSON.stringify(value);
    var count = Math.max(1, Math.ceil(text.length / CHUNK_SIZE));
    props.setProperty(key + "_COUNT", String(count));
    for (var i = 0; i < count; i++) props.setProperty(key + "_" + i, text.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE));
  }
  function getLarge(key) {
    var props = PropertiesService.getScriptProperties();
    var count = Number(props.getProperty(key + "_COUNT") || 0);
    if (!count) return null;
    var text = "";
    for (var i = 0; i < count; i++) text += props.getProperty(key + "_" + i) || "";
    try { return JSON.parse(text); }
    catch (_) { return null; }
  }
  function normalizeLineBreaks(value) {
    var text = String(value == null ? "" : value).replace(/\r\n?/g, "\n");
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
  function cache(body) {
    if (body.contract !== CONTRACT) return output({ ok: false, error: "Invalid contract. Expected " + CONTRACT });
    if (!body.summaries) return output({ ok: false, error: "summaries are required" });
    var morning = normalizeLineBreaks(body.summaries.morning);
    var evening = normalizeLineBreaks(body.summaries.evening);
    if (!morning.trim()) return output({ ok: false, error: "summaries.morning may not be empty" });
    if (!evening.trim()) return output({ ok: false, error: "summaries.evening may not be empty" });
    var record = {
      version: "122",
      timeZone: String(body.timeZone || "Asia/Bangkok"),
      sourceDate: String(body.sourceDate || ""),
      generatedAt: String(body.generatedAt || new Date().toISOString()),
      cachedAt: new Date().toISOString(),
      checksum: String(body.checksum || ""),
      summaries: { morning: morning, evening: evening }
    };
    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try { setLarge(PREFIX + "CURRENT", record); }
    finally { lock.releaseLock(); }
    return output({ ok: true, action: "cache", version: "122", sourceDate: record.sourceDate, cachedAt: record.cachedAt, checksum: record.checksum, lengths: { morning: morning.length, evening: evening.length } });
  }
  function getSummary(body) {
    var record = getLarge(PREFIX + "CURRENT");
    if (!record) return output({ ok: false, error: "No summary cache. Open V122 and run Sync + Verify first." });
    var slot = String(body.slot || "morning").toLowerCase() === "evening" ? "evening" : "morning";
    var text = normalizeLineBreaks(record.summaries && record.summaries[slot]);
    if (!text.trim()) return output({ ok: false, error: "Summary slot is unavailable: " + slot });
    var ageMinutes = Math.max(0, Math.round((Date.now() - new Date(record.cachedAt).getTime()) / 60000));
    return output({ ok: true, action: "get", slot: slot, text: text, version: "122", timeZone: record.timeZone, sourceDate: record.sourceDate, generatedAt: record.generatedAt, cachedAt: record.cachedAt, ageMinutes: ageMinutes, stale: ageMinutes > MAX_AGE_MINUTES, checksum: record.checksum });
  }
  function health(callback) {
    var record = getLarge(PREFIX + "CURRENT");
    var info = secretInfo();
    return output({
      ok: true,
      service: "QE V122 Scheduled Summary API",
      version: "122",
      contract: CONTRACT,
      configured: info.configured,
      propertyKey: info.key,
      secretLength: info.length,
      acceptedPropertyKeys: SECRET_KEYS,
      cacheReady: !!record,
      cachedAt: record ? record.cachedAt : "",
      sourceDate: record ? record.sourceDate : "",
      checksum: record ? record.checksum : "",
      lengths: record ? { morning: String(record.summaries.morning || "").length, evening: String(record.summaries.evening || "").length } : { morning: 0, evening: 0 },
      accepts: ["summaries.morning", "summaries.evening"],
      sendsLine: false,
      transport: "jsonp-health+no-cors-post"
    }, callback);
  }
  function route(body) {
    body = body || {};
    var action = String(body.action || "health").toLowerCase();
    if (action === "health") return health("");
    if (!authorized(body.secret)) return output({ ok: false, error: "Unauthorized: Scheduled API Secret does not match the configured Script Property" });
    if (action === "cache") return cache(body);
    if (action === "get") return getSummary(body);
    return output({ ok: false, error: "Unknown action: " + action });
  }
  return { route: route, parsePost: parsePost, health: health, secretInfo: secretInfo };
})();

function doPost(e) {
  try { return QE_V122.route(QE_V122.parsePost(e)); }
  catch (err) { return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err && err.message || err) })).setMimeType(ContentService.MimeType.JSON); }
}

function doGet(e) {
  /* Health/status only; callback enables JSONP so GitHub Pages is not blocked by CORS redirects. */
  var callback = e && e.parameter && e.parameter.callback || "";
  return QE_V122.health(callback);
}
