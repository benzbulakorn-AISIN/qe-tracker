/* QE Elec. Daily Job Tracker V125 — Cache V123 + LINE-to-Email Scheduler
 * Browser cache transport: signed JSONP chunks + commit. Scheduled delivery: LINE, then Microsoft 365 email for Power Automate Standard.
 * Cache secret properties accepted: QE_V125_SECRET, QE_V124_SECRET, QE_V123_SECRET, QE_V122_SECRET, QE_V121_SECRET.
 * Deploy: Web app / Execute as Me / Who has access: Anyone.
 */
var QE_V125 = (function () {
  "use strict";
  var PREFIX = "QE_V123_CACHE_";
  var STAGE = "QE_V123_STAGE_";
  var CONTRACT = "qe-summary-cache/v1";
  var STORE_CHUNK_SIZE = 7800;
  var MAX_AGE_MINUTES = 24 * 60;
  var MAX_CLOCK_SKEW = 15 * 60 * 1000;
  var MAX_UPLOAD_CHUNKS = 120;
  var MAX_QUERY_CHUNK = 2400;
  var SECRET_KEYS = ["QE_V125_SECRET", "QE_V124_SECRET", "QE_V123_SECRET", "QE_V122_SECRET", "QE_V121_SECRET"];

  function output(value, callback) {
    var json = JSON.stringify(value), cb = String(callback || "");
    if (/^[A-Za-z_$][0-9A-Za-z_$\.]{0,120}$/.test(cb)) {
      return ContentService.createTextOutput(cb + "(" + json + ");").setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
  }
  function clean(value) { return String(value == null ? "" : value).replace(/^\uFEFF/, "").trim(); }
  function secretInfo() {
    var props = PropertiesService.getScriptProperties().getProperties() || {}, i, key, value;
    for (i = 0; i < SECRET_KEYS.length; i++) {
      key = SECRET_KEYS[i]; value = clean(props[key]);
      if (value) return { value: value, key: key, configured: true, length: value.length };
    }
    var keys = Object.keys(props);
    for (i = 0; i < keys.length; i++) {
      key = clean(keys[i]).toUpperCase();
      if (SECRET_KEYS.indexOf(key) >= 0 && clean(props[keys[i]])) {
        value = clean(props[keys[i]]);
        return { value: value, key: keys[i], configured: true, length: value.length };
      }
    }
    return { value: "", key: "", configured: false, length: 0 };
  }
  function safeEqual(a, b) {
    a = clean(a).toLowerCase(); b = clean(b).toLowerCase();
    if (!a || a.length !== b.length) return false;
    var diff = 0;
    for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  }
  function hex(bytes) {
    return bytes.map(function (b) { return ("0" + ((b + 256) % 256).toString(16)).slice(-2); }).join("");
  }
  function canonical(action, p) {
    var fields = action === "begin"
      ? ["action","ts","uploadId","sourceDate","generatedAt","checksum","morningChunks","eveningChunks","morningLength","eveningLength"]
      : action === "chunk"
        ? ["action","ts","uploadId","slot","index","data"]
        : ["action","ts","uploadId"];
    return fields.map(function (key) { return String(p[key] == null ? "" : p[key]); }).join("\n");
  }
  function authorizeGet(action, p) {
    var info = secretInfo(), ts = Number(p.ts || 0);
    if (!info.configured) return { ok: false, error: "Scheduled API Secret is not configured" };
    if (!ts || Math.abs(Date.now() - ts) > MAX_CLOCK_SKEW) return { ok: false, error: "Request timestamp expired" };
    var expected = hex(Utilities.computeHmacSha256Signature(canonical(action, p), info.value, Utilities.Charset.UTF_8));
    if (!safeEqual(p.sig, expected)) return { ok: false, error: "Invalid signature" };
    return { ok: true, info: info };
  }
  function parsePost(e) {
    try { return JSON.parse((e && e.postData && e.postData.contents) || "{}"); }
    catch (_) { return {}; }
  }
  function clearLarge(key) {
    var props = PropertiesService.getScriptProperties(), count = Number(props.getProperty(key + "_COUNT") || 0);
    for (var i = 0; i < count; i++) props.deleteProperty(key + "_" + i);
    props.deleteProperty(key + "_COUNT");
  }
  function setLarge(key, value) {
    var props = PropertiesService.getScriptProperties(), text = JSON.stringify(value);
    clearLarge(key);
    var count = Math.max(1, Math.ceil(text.length / STORE_CHUNK_SIZE));
    props.setProperty(key + "_COUNT", String(count));
    for (var i = 0; i < count; i++) props.setProperty(key + "_" + i, text.slice(i * STORE_CHUNK_SIZE, (i + 1) * STORE_CHUNK_SIZE));
  }
  function getLarge(key) {
    var props = PropertiesService.getScriptProperties(), count = Number(props.getProperty(key + "_COUNT") || 0);
    if (!count) return null;
    var text = "";
    for (var i = 0; i < count; i++) text += props.getProperty(key + "_" + i) || "";
    try { return JSON.parse(text); } catch (_) { return null; }
  }
  function normalizeLineBreaks(value) {
    var text = String(value == null ? "" : value).replace(/\r\n?/g, "\n");
    for (var pass = 0; pass < 4; pass++) {
      var before = text;
      text = text.replace(/&amp;(?=(?:lt|gt|#(?:x[0-9a-f]+|[0-9]+));)/gi, "&")
        .replace(/&lt;\s*br\s*\/?\s*&gt;/gi, "\n")
        .replace(/&#(?:0*60|x0*3c);?\s*br\s*\/?\s*&#(?:0*62|x0*3e);?/gi, "\n")
        .replace(/<br\b[^>]*>/gi, "\n");
      if (text === before) break;
    }
    return text;
  }
  function fnv1a(text) {
    var h = 2166136261;
    text = String(text || "");
    for (var i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(16);
  }
  function validUploadId(id) { return /^[A-Za-z0-9_-]{12,80}$/.test(String(id || "")); }
  function metaKey(id) { return STAGE + id + "_META"; }
  function chunkKey(id, slot, index) { return STAGE + id + "_" + (slot === "morning" ? "M" : "E") + "_" + index; }
  function clearStage(id, meta) {
    var props = PropertiesService.getScriptProperties(), i;
    if (meta) {
      for (i = 0; i < Number(meta.morningChunks || 0); i++) props.deleteProperty(chunkKey(id, "morning", i));
      for (i = 0; i < Number(meta.eveningChunks || 0); i++) props.deleteProperty(chunkKey(id, "evening", i));
    }
    props.deleteProperty(metaKey(id));
  }
  function begin(p) {
    var auth = authorizeGet("begin", p); if (!auth.ok) return auth;
    if (!validUploadId(p.uploadId)) return { ok: false, error: "Invalid uploadId" };
    var mc = Number(p.morningChunks), ec = Number(p.eveningChunks), ml = Number(p.morningLength), el = Number(p.eveningLength);
    if (!(mc > 0 && ec > 0 && mc <= MAX_UPLOAD_CHUNKS && ec <= MAX_UPLOAD_CHUNKS)) return { ok: false, error: "Invalid chunk counts" };
    if (!(ml > 0 && el > 0)) return { ok: false, error: "Morning/Evening must not be empty" };
    var props = PropertiesService.getScriptProperties(), prior;
    try { prior = JSON.parse(props.getProperty(metaKey(p.uploadId)) || "null"); } catch (_) { prior = null; }
    clearStage(p.uploadId, prior);
    var meta = { uploadId: p.uploadId, sourceDate: String(p.sourceDate || ""), generatedAt: String(p.generatedAt || ""), checksum: String(p.checksum || ""), morningChunks: mc, eveningChunks: ec, morningLength: ml, eveningLength: el, begunAt: new Date().toISOString() };
    props.setProperty(metaKey(p.uploadId), JSON.stringify(meta));
    return { ok: true, action: "begin", uploadId: p.uploadId, morningChunks: mc, eveningChunks: ec };
  }
  function putChunk(p) {
    var auth = authorizeGet("chunk", p); if (!auth.ok) return auth;
    if (!validUploadId(p.uploadId)) return { ok: false, error: "Invalid uploadId" };
    var slot = p.slot === "evening" ? "evening" : p.slot === "morning" ? "morning" : "", index = Number(p.index), data = String(p.data || "");
    if (!slot || index < 0 || Math.floor(index) !== index || !data || data.length > MAX_QUERY_CHUNK) return { ok: false, error: "Invalid chunk" };
    var props = PropertiesService.getScriptProperties(), raw = props.getProperty(metaKey(p.uploadId));
    if (!raw) return { ok: false, error: "Upload session not found" };
    var meta = JSON.parse(raw), max = slot === "morning" ? meta.morningChunks : meta.eveningChunks;
    if (index >= max) return { ok: false, error: "Chunk index out of range" };
    props.setProperty(chunkKey(p.uploadId, slot, index), data);
    return { ok: true, action: "chunk", uploadId: p.uploadId, slot: slot, index: index };
  }
  function decodeJoined(parts) {
    var bytes = Utilities.base64DecodeWebSafe(parts.join(""));
    return Utilities.newBlob(bytes).getDataAsString("UTF-8");
  }
  function commit(p) {
    var auth = authorizeGet("commit", p); if (!auth.ok) return auth;
    if (!validUploadId(p.uploadId)) return { ok: false, error: "Invalid uploadId" };
    var props = PropertiesService.getScriptProperties(), raw = props.getProperty(metaKey(p.uploadId));
    if (!raw) return { ok: false, error: "Upload session not found" };
    var meta = JSON.parse(raw), m = [], e = [], i, value;
    for (i = 0; i < meta.morningChunks; i++) { value = props.getProperty(chunkKey(p.uploadId, "morning", i)); if (!value) return { ok: false, error: "Missing morning chunk " + i }; m.push(value); }
    for (i = 0; i < meta.eveningChunks; i++) { value = props.getProperty(chunkKey(p.uploadId, "evening", i)); if (!value) return { ok: false, error: "Missing evening chunk " + i }; e.push(value); }
    var morning = normalizeLineBreaks(decodeJoined(m)), evening = normalizeLineBreaks(decodeJoined(e));
    if (!morning.trim() || !evening.trim()) return { ok: false, error: "Decoded Morning/Evening is empty" };
    if (morning.length !== meta.morningLength || evening.length !== meta.eveningLength) return { ok: false, error: "Decoded length mismatch" };
    var actual = fnv1a(meta.sourceDate + "\n" + morning + "\n" + evening);
    if (actual !== meta.checksum) return { ok: false, error: "Checksum mismatch", expected: meta.checksum, actual: actual };
    var record = { version: "125", timeZone: "Asia/Bangkok", sourceDate: meta.sourceDate, generatedAt: meta.generatedAt || new Date().toISOString(), cachedAt: new Date().toISOString(), checksum: actual, summaries: { morning: morning, evening: evening } };
    var lock = LockService.getScriptLock(); lock.waitLock(10000);
    try { setLarge(PREFIX + "CURRENT", record); clearStage(p.uploadId, meta); } finally { lock.releaseLock(); }
    return { ok: true, action: "commit", cacheReady: true, cachedAt: record.cachedAt, checksum: actual, lengths: { morning: morning.length, evening: evening.length } };
  }
  function health(callback) {
    var record = getLarge(PREFIX + "CURRENT"), info = secretInfo();
    return output({ ok: true, service: "QE V125 LINE Email Scheduler", version: "125", contract: CONTRACT, configured: info.configured, propertyKey: info.key, secretLength: info.length, acceptedPropertyKeys: SECRET_KEYS, cacheReady: !!record, cachedAt: record ? record.cachedAt : "", sourceDate: record ? record.sourceDate : "", checksum: record ? record.checksum : "", lengths: record ? { morning: String(record.summaries.morning || "").length, evening: String(record.summaries.evening || "").length } : { morning: 0, evening: 0 }, sendsLine: true, sendsEmail: true, teamsDelivery: "Power Automate Standard email trigger", scheduler: "Apps Script time-driven triggers", transport: "signed-jsonp-chunks" }, callback);
  }
  function getSummary(body) {
    var info = secretInfo(); if (!info.configured || clean(body.secret) !== info.value) return output({ ok: false, error: "Unauthorized" });
    var record = getLarge(PREFIX + "CURRENT"); if (!record) return output({ ok: false, error: "No summary cache" });
    var slot = String(body.slot || "morning").toLowerCase() === "evening" ? "evening" : "morning", text = normalizeLineBreaks(record.summaries[slot]);
    return output({ ok: true, action: "get", slot: slot, text: text, version: "125", sourceDate: record.sourceDate, cachedAt: record.cachedAt, checksum: record.checksum, stale: Math.max(0, Math.round((Date.now() - new Date(record.cachedAt).getTime()) / 60000)) > MAX_AGE_MINUTES });
  }
  function routePost(body) { return String(body.action || "").toLowerCase() === "get" ? getSummary(body) : output({ ok: false, error: "Browser writes use signed JSONP begin/chunk/commit" }); }
  function routeGet(p) {
    var action = String(p.action || "health").toLowerCase(), result;
    if (action === "begin") result = begin(p);
    else if (action === "chunk") result = putChunk(p);
    else if (action === "commit") result = commit(p);
    else return health(p.callback || "");
    return output(result, p.callback || "");
  }
  return { routeGet: routeGet, routePost: routePost, parsePost: parsePost, health: health, secretInfo: secretInfo, canonical: canonical, getCurrentCache: function () { return getLarge(PREFIX + "CURRENT"); }, normalizeLineBreaks: normalizeLineBreaks };
})();
function doGet(e) { return QE_V125.routeGet(e && e.parameter || {}); }
function doPost(e) { try { return QE_V125.routePost(QE_V125.parsePost(e)); } catch (err) { return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err && err.message || err) })).setMimeType(ContentService.MimeType.JSON); } }
/* ===== V125 scheduled delivery: Cache V123 -> LINE -> Microsoft 365 email =====
 * Microsoft Teams receives the email body through a Power Automate Standard Flow:
 * When a new email arrives (V3) -> Post message in a chat or channel.
 * Credentials and recipient addresses are read only from Apps Script Properties.
 * Public functions:
 *   qeValidateSetup, qeTestMorning, qeTestEvening,
 *   qeTestMorningEmail, qeTestEveningEmail,
 *   qeCreateDailyTriggers, qeDeleteDailyTriggers, qeListDailyTriggers
 */
var QE_V125_DELIVERY = (function () {
  "use strict";

  var TIME_ZONE = "Asia/Bangkok";
  var HANDLER_MORNING = "qeSendMorningScheduled";
  var HANDLER_EVENING = "qeSendEveningScheduled";
  var DELIVERY_PROPERTY_KEYS = {
    lineRelayUrl: "QE_LINE_WEB_APP_URL",
    lineRelaySecret: "QE_LINE_WEB_APP_SECRET",
    lineToken: "QE_LINE_CHANNEL_ACCESS_TOKEN",
    lineTarget: "QE_LINE_TARGET_ID",
    m365Email: "QE_M365_SUMMARY_EMAIL",
    maxCacheAge: "QE_MAX_CACHE_AGE_MINUTES",
    allowStale: "QE_ALLOW_STALE_CACHE",
    requireToday: "QE_REQUIRE_TODAY_CACHE"
  };

  function props_() { return PropertiesService.getScriptProperties(); }
  function clean_(value) { return String(value == null ? "" : value).replace(/^\uFEFF/, "").trim(); }
  function prop_(name) { return clean_(props_().getProperty(name)); }
  function boolProp_(name, defaultValue) {
    var value = prop_(name).toLowerCase();
    if (!value) return !!defaultValue;
    return value === "1" || value === "true" || value === "yes" || value === "on";
  }
  function integerProp_(name, defaultValue, min, max) {
    var value = Number(prop_(name));
    if (!isFinite(value)) value = defaultValue;
    value = Math.floor(value);
    return Math.max(min, Math.min(max, value));
  }
  function isHttps_(value) {
    try { return /^https:\/\//i.test(clean_(value)); } catch (_) { return false; }
  }
  function nowIso_() { return new Date().toISOString(); }
  function todayBangkok_() { return Utilities.formatDate(new Date(), TIME_ZONE, "yyyy-MM-dd"); }
  function normalizeLineBreaks_(value) {
    return String(value == null ? "" : value).replace(/\r\n?/g, "\n")
      .replace(/&lt;\s*br\s*\/?\s*&gt;/gi, "\n")
      .replace(/<br\b[^>]*>/gi, "\n").trim();
  }
  function sanitizeLogValue_(value, depth) {
    depth = Number(depth || 0);
    if (depth > 5) return "[TRUNCATED]";
    if (value == null || typeof value === "number" || typeof value === "boolean") return value;
    if (typeof value === "string") {
      return value
        .replace(/https?:\/\/\S+/gi, "[URL]")
        .replace(/\bBearer\s+\S+/gi, "Bearer [REDACTED]")
        .replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}(?:\.[A-Za-z0-9_-]{8,})?\b/g, "[REDACTED_JWT]")
        .replace(/\b(secret|token|password|webhook)\s*[:=]\s*\S+/gi, "$1=[REDACTED]")
        .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[REDACTED_EMAIL]")
        .slice(0, 500);
    }
    if (Array.isArray(value)) return value.slice(0, 30).map(function (item) { return sanitizeLogValue_(item, depth + 1); });
    if (typeof value === "object") {
      var out = {};
      Object.keys(value).slice(0, 50).forEach(function (key) {
        if (/secret|token|authorization|webhook|url|email|recipient|message|text|payload/i.test(key)) return;
        out[key] = sanitizeLogValue_(value[key], depth + 1);
      });
      return out;
    }
    return String(value).slice(0, 100);
  }
  function safeLogData_(details) {
    var source = details && typeof details === "object" ? details : { detail: details };
    return sanitizeLogValue_(source, 0);
  }
  function log_(level, eventName, details) {
    var row = { at: nowIso_(), level: level, event: eventName, details: safeLogData_(details || {}) };
    var text = JSON.stringify(row);
    try {
      if (typeof console !== "undefined" && console[level]) console[level](text);
      else if (typeof console !== "undefined" && console.log) console.log(text);
    } catch (_) {}
    try { Logger.log(text); } catch (_) {}
  }
  function saveLastRun_(status) {
    var clean = safeLogData_(status || {});
    clean.at = nowIso_();
    try { props_().setProperty("QE_LAST_DELIVERY_STATUS", JSON.stringify(clean)); }
    catch (err) { log_("error", "status-write-failed", { error: String(err) }); }
  }
  function parseJson_(text) {
    try { return JSON.parse(String(text || "")); } catch (_) { return null; }
  }
  function responseError_(channel, response) {
    var code = Number(response.getResponseCode());
    var body = String(response.getContentText() || "");
    var parsed = parseJson_(body);
    var message = parsed && (parsed.error || parsed.message) || body || ("HTTP " + code);
    return new Error(channel + " failed (HTTP " + code + "): " + String(message).slice(0, 300));
  }
  function fetchChecked_(channel, url, options) {
    var response;
    try { response = UrlFetchApp.fetch(url, Object.assign({ muteHttpExceptions: true, followRedirects: true }, options || {})); }
    catch (err) { throw new Error(channel + " request error: " + String(err && err.message || err)); }
    var code = Number(response.getResponseCode());
    if (code < 200 || code >= 300) throw responseError_(channel, response);
    return response;
  }

  function lineMode_() {
    var relayUrl = prop_(DELIVERY_PROPERTY_KEYS.lineRelayUrl);
    var relaySecret = prop_(DELIVERY_PROPERTY_KEYS.lineRelaySecret);
    if (relayUrl && relaySecret) return { mode: "legacy-relay", url: relayUrl, secret: relaySecret };
    var token = prop_(DELIVERY_PROPERTY_KEYS.lineToken);
    var target = prop_(DELIVERY_PROPERTY_KEYS.lineTarget);
    if (token && target) return { mode: "messaging-api", token: token, target: target };
    return { mode: "", missing: "Set QE_LINE_WEB_APP_URL + QE_LINE_WEB_APP_SECRET, or QE_LINE_CHANNEL_ACCESS_TOKEN + QE_LINE_TARGET_ID" };
  }
  function splitText_(text, maxLength) {
    text = String(text || "");
    var out = [];
    while (text.length > maxLength) {
      var cut = text.lastIndexOf("\n", maxLength);
      if (cut < Math.floor(maxLength * 0.6)) cut = maxLength;
      out.push(text.slice(0, cut));
      text = text.slice(cut).replace(/^\n+/, "");
    }
    if (text || !out.length) out.push(text);
    return out;
  }
  function sendLine_(message) {
    var config = lineMode_();
    if (!config.mode) throw new Error("LINE is not configured. " + config.missing);
    if (config.mode === "legacy-relay") {
      if (!isHttps_(config.url)) throw new Error("QE_LINE_WEB_APP_URL must use HTTPS");
      var response = fetchChecked_("LINE relay", config.url, {
        method: "post",
        contentType: "text/plain; charset=utf-8",
        payload: JSON.stringify({ secret: config.secret, text: message })
      });
      var parsed = parseJson_(response.getContentText());
      if (parsed && parsed.ok === false) throw new Error("LINE relay rejected the message: " + String(parsed.error || "unknown error").slice(0, 250));
      return { channel: "line", mode: config.mode, status: response.getResponseCode() };
    }

    var parts = splitText_(message, 4800), sent = 0;
    for (var i = 0; i < parts.length; i += 5) {
      var batch = parts.slice(i, i + 5).map(function (text) { return { type: "text", text: text }; });
      var responseDirect = fetchChecked_("LINE Messaging API", "https://api.line.me/v2/bot/message/push", {
        method: "post",
        contentType: "application/json; charset=utf-8",
        headers: { Authorization: "Bearer " + config.token },
        payload: JSON.stringify({ to: config.target, messages: batch })
      });
      sent += batch.length;
      if (responseDirect.getResponseCode() < 200 || responseDirect.getResponseCode() >= 300) throw responseError_("LINE Messaging API", responseDirect);
    }
    return { channel: "line", mode: config.mode, status: 200, parts: sent };
  }

  function emailRecipients_() {
    var raw = prop_(DELIVERY_PROPERTY_KEYS.m365Email);
    if (!raw) return { value: "", count: 0, error: "Set QE_M365_SUMMARY_EMAIL in Apps Script Properties" };
    var list = raw.split(/[;,]/).map(function (value) { return clean_(value); }).filter(Boolean);
    if (!list.length) return { value: "", count: 0, error: "QE_M365_SUMMARY_EMAIL is empty" };
    var invalid = list.filter(function (value) { return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); });
    if (invalid.length) return { value: "", count: 0, error: "QE_M365_SUMMARY_EMAIL contains an invalid email address" };
    return { value: list.join(","), count: list.length, error: "" };
  }
  function emailSubject_(slot, sourceDate) {
    return (slot === "evening" ? "[QE-SUMMARY-EVENING] " : "[QE-SUMMARY-MORNING] ") + String(sourceDate || todayBangkok_());
  }
  function sendEmail_(message, slot, sourceDate) {
    var recipients = emailRecipients_();
    if (recipients.error) throw new Error(recipients.error);
    var quota = Number(MailApp.getRemainingDailyQuota());
    if (isFinite(quota) && quota < recipients.count) throw new Error("MailApp daily quota is not enough (remaining " + quota + ")");
    var subject = emailSubject_(slot, sourceDate);
    MailApp.sendEmail({
      to: recipients.value,
      subject: subject,
      body: message,
      name: "QE Elec. Daily Job Tracker"
    });
    return { channel: "email", mode: "mailapp", status: 200, subjectTag: slot === "evening" ? "QE-SUMMARY-EVENING" : "QE-SUMMARY-MORNING", recipientCount: recipients.count };
  }

  function currentCache_() {
    var record = QE_V125.getCurrentCache();
    if (!record || !record.summaries) throw new Error("Cache V123 is empty. Open Tracker V125 and run 'ซิงก์ + ตรวจข้อความ' first");
    return record;
  }
  function cacheInfo_(record) {
    var cachedAtMs = Date.parse(record.cachedAt || "");
    var ageMinutes = isFinite(cachedAtMs) ? Math.max(0, Math.round((Date.now() - cachedAtMs) / 60000)) : -1;
    return {
      sourceDate: String(record.sourceDate || ""),
      cachedAt: String(record.cachedAt || ""),
      checksum: String(record.checksum || ""),
      ageMinutes: ageMinutes,
      morningLength: String(record.summaries && record.summaries.morning || "").length,
      eveningLength: String(record.summaries && record.summaries.evening || "").length
    };
  }
  function validateCache_(record, slot) {
    var info = cacheInfo_(record);
    var maxAge = integerProp_(DELIVERY_PROPERTY_KEYS.maxCacheAge, 1440, 15, 10080);
    if (!boolProp_(DELIVERY_PROPERTY_KEYS.allowStale, false) && (info.ageMinutes < 0 || info.ageMinutes > maxAge)) {
      throw new Error("Cache V123 is stale (" + info.ageMinutes + " minutes; limit " + maxAge + "). Sync Tracker first or set QE_ALLOW_STALE_CACHE=true intentionally");
    }
    if (boolProp_(DELIVERY_PROPERTY_KEYS.requireToday, false) && info.sourceDate !== todayBangkok_()) {
      throw new Error("Cache sourceDate is " + info.sourceDate + ", not today " + todayBangkok_());
    }
    var message = normalizeLineBreaks_(record.summaries[slot]);
    if (!message) throw new Error((slot === "evening" ? "Evening" : "Morning") + " Summary in Cache V123 is empty");
    if (/<br\b|&lt;\s*br/i.test(message)) throw new Error("Cached summary still contains a BR tag; sync Tracker V125 again");
    return { info: info, message: message };
  }
  function markerKey_(channel, slot) { return "QE_SENT_" + channel.toUpperCase() + "_" + slot.toUpperCase(); }
  function marker_(channel, slot) { return parseJson_(props_().getProperty(markerKey_(channel, slot))) || {}; }
  function delivered_(channel, slot, info) {
    var value = marker_(channel, slot);
    return value.sourceDate === info.sourceDate && value.checksum === info.checksum;
  }
  function markDelivered_(channel, slot, info, result) {
    props_().setProperty(markerKey_(channel, slot), JSON.stringify({
      sourceDate: info.sourceDate,
      checksum: info.checksum,
      sentAt: nowIso_(),
      status: Number(result && result.status || 0)
    }));
  }
  function validateSetup_() {
    var errors = [], line = lineMode_(), email = emailRecipients_(), cache = null, quota = -1;
    if (!line.mode) errors.push(line.missing);
    else if (line.mode === "legacy-relay" && !isHttps_(line.url)) errors.push("QE_LINE_WEB_APP_URL must use HTTPS");
    if (email.error) errors.push(email.error);
    try { quota = Number(MailApp.getRemainingDailyQuota()); } catch (err) { errors.push("MailApp is unavailable: " + String(err && err.message || err)); }
    if (email.count && isFinite(quota) && quota < email.count) errors.push("MailApp daily quota is not enough");
    try { cache = cacheInfo_(currentCache_()); } catch (err) { errors.push(String(err && err.message || err)); }
    return {
      ok: errors.length === 0,
      version: "125",
      timeZone: TIME_ZONE,
      lineMode: line.mode || "not-configured",
      emailConfigured: !email.error,
      emailRecipientCount: email.count,
      mailQuotaRemaining: quota,
      teamsDelivery: "Power Automate Standard email trigger",
      cache: cache,
      triggers: listTriggers_(),
      errors: errors
    };
  }

  function sendSlot_(slot, force, cause) {
    slot = slot === "evening" ? "evening" : "morning";
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) throw new Error("Another V125 delivery is already running");
    try {
      var setup = validateSetup_();
      if (!setup.ok) throw new Error("Setup is incomplete: " + setup.errors.join(" | "));
      var record = currentCache_();
      var validated = validateCache_(record, slot), info = validated.info, message = validated.message;
      var results = [];
      log_("log", "delivery-start", { slot: slot, cause: cause || "manual", force: !!force, sourceDate: info.sourceDate, checksum: info.checksum, length: message.length, ageMinutes: info.ageMinutes });

      if (!force && delivered_("line", slot, info)) {
        results.push({ channel: "line", skipped: true, reason: "already-delivered" });
      } else {
        try {
          var lineResult = sendLine_(message);
          markDelivered_("line", slot, info, lineResult);
          results.push(lineResult);
        } catch (lineError) {
          log_("error", "line-failed-email-not-sent", { slot: slot, error: String(lineError && lineError.message || lineError) });
          throw new Error("LINE: " + String(lineError && lineError.message || lineError) + " | Email was not sent because LINE must succeed first");
        }
      }

      if (!force && delivered_("email", slot, info)) {
        results.push({ channel: "email", skipped: true, reason: "already-delivered" });
      } else {
        try {
          var emailResult = sendEmail_(message, slot, info.sourceDate);
          markDelivered_("email", slot, info, emailResult);
          results.push(emailResult);
        } catch (emailError) {
          log_("error", "email-failed", { slot: slot, error: String(emailError && emailError.message || emailError) });
          throw new Error("Email: " + String(emailError && emailError.message || emailError));
        }
      }

      var summary = { ok: true, slot: slot, cause: cause || "manual", sourceDate: info.sourceDate, checksum: info.checksum, length: message.length, ageMinutes: info.ageMinutes, results: results, errors: [] };
      saveLastRun_(summary);
      log_("log", "delivery-complete", { slot: slot, sourceDate: info.sourceDate, checksum: info.checksum, resultCount: results.length });
      return summary;
    } finally { lock.releaseLock(); }
  }
  function testEmailOnly_(slot) {
    slot = slot === "evening" ? "evening" : "morning";
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) throw new Error("Another V125 delivery is already running");
    try {
      var record = currentCache_();
      var validated = validateCache_(record, slot), info = validated.info, message = validated.message;
      var result = sendEmail_(message, slot, info.sourceDate);
      markDelivered_("email", slot, info, result);
      var summary = { ok: true, slot: slot, cause: "manual-email-test", sourceDate: info.sourceDate, checksum: info.checksum, length: message.length, results: [result], errors: [] };
      saveLastRun_(summary);
      log_("log", "manual-email-test-complete", { slot: slot, sourceDate: info.sourceDate, checksum: info.checksum, length: message.length });
      return summary;
    } finally { lock.releaseLock(); }
  }
  function execute_(slot, force, cause) {
    try { return sendSlot_(slot, force, cause); }
    catch (err) {
      saveLastRun_({ ok: false, slot: slot, cause: cause || "manual", error: String(err && err.message || err) });
      log_("error", "delivery-failed", { slot: slot, cause: cause || "manual", error: String(err && err.message || err) });
      throw err;
    }
  }
  function executeEmailTest_(slot) {
    try { return testEmailOnly_(slot); }
    catch (err) {
      saveLastRun_({ ok: false, slot: slot, cause: "manual-email-test", error: String(err && err.message || err) });
      log_("error", "manual-email-test-failed", { slot: slot, error: String(err && err.message || err) });
      throw err;
    }
  }

  function triggerHandlers_() { return [HANDLER_MORNING, HANDLER_EVENING]; }
  function deleteTriggers_() {
    var handlers = triggerHandlers_(), removed = 0;
    ScriptApp.getProjectTriggers().forEach(function (trigger) {
      if (handlers.indexOf(trigger.getHandlerFunction()) >= 0) { ScriptApp.deleteTrigger(trigger); removed++; }
    });
    log_("log", "triggers-deleted", { removed: removed });
    return removed;
  }
  function createTriggers_() {
    deleteTriggers_();
    var morning = ScriptApp.newTrigger(HANDLER_MORNING).timeBased().everyDays(1).atHour(7).nearMinute(0).inTimezone(TIME_ZONE).create();
    var evening = ScriptApp.newTrigger(HANDLER_EVENING).timeBased().everyDays(1).atHour(16).nearMinute(0).inTimezone(TIME_ZONE).create();
    var result = { ok: true, timeZone: TIME_ZONE, created: [morning.getHandlerFunction(), evening.getHandlerFunction()], triggers: listTriggers_() };
    log_("log", "triggers-created", { count: result.triggers.length, timeZone: TIME_ZONE });
    return result;
  }
  function listTriggers_() {
    var handlers = triggerHandlers_();
    return ScriptApp.getProjectTriggers().filter(function (trigger) { return handlers.indexOf(trigger.getHandlerFunction()) >= 0; }).map(function (trigger) {
      return { handler: trigger.getHandlerFunction(), eventType: String(trigger.getEventType && trigger.getEventType() || "CLOCK") };
    });
  }

  return {
    execute: execute_,
    executeEmailTest: executeEmailTest_,
    validateSetup: validateSetup_,
    createTriggers: createTriggers_,
    deleteTriggers: deleteTriggers_,
    listTriggers: listTriggers_
  };
})();

function qeSendMorningScheduled() { return QE_V125_DELIVERY.execute("morning", false, "time-trigger"); }
function qeSendEveningScheduled() { return QE_V125_DELIVERY.execute("evening", false, "time-trigger"); }
function qeTestMorning() { return QE_V125_DELIVERY.execute("morning", true, "manual-test"); }
function qeTestEvening() { return QE_V125_DELIVERY.execute("evening", true, "manual-test"); }
function qeTestMorningEmail() { return QE_V125_DELIVERY.executeEmailTest("morning"); }
function qeTestEveningEmail() { return QE_V125_DELIVERY.executeEmailTest("evening"); }
function qeCreateDailyTriggers() { return QE_V125_DELIVERY.createTriggers(); }
function qeDeleteDailyTriggers() { return QE_V125_DELIVERY.deleteTriggers(); }
function qeListDailyTriggers() { return QE_V125_DELIVERY.listTriggers(); }
function qeValidateSetup() {
  var status = QE_V125_DELIVERY.validateSetup();
  Logger.log(JSON.stringify(status));
  if (!status.ok) throw new Error(status.errors.join(" | "));
  return status;
}
