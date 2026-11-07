/* QE Elec. Daily Job Tracker V123 — Scheduled Summary API
 * Browser write transport: signed JSONP chunks + commit (no fetch POST, no CORS dependency).
 * Script Properties accepted: QE_V123_SECRET, QE_V122_SECRET, QE_V121_SECRET.
 * Deploy: Web app / Execute as Me / Who has access: Anyone.
 */
var QE_V123 = (function () {
  "use strict";
  var PREFIX = "QE_V123_CACHE_";
  var STAGE = "QE_V123_STAGE_";
  var CONTRACT = "qe-summary-cache/v1";
  var STORE_CHUNK_SIZE = 7800;
  var MAX_AGE_MINUTES = 24 * 60;
  var MAX_CLOCK_SKEW = 15 * 60 * 1000;
  var MAX_UPLOAD_CHUNKS = 120;
  var MAX_QUERY_CHUNK = 2400;
  var SECRET_KEYS = ["QE_V123_SECRET", "QE_V122_SECRET", "QE_V121_SECRET"];

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
    var record = { version: "123", timeZone: "Asia/Bangkok", sourceDate: meta.sourceDate, generatedAt: meta.generatedAt || new Date().toISOString(), cachedAt: new Date().toISOString(), checksum: actual, summaries: { morning: morning, evening: evening } };
    var lock = LockService.getScriptLock(); lock.waitLock(10000);
    try { setLarge(PREFIX + "CURRENT", record); clearStage(p.uploadId, meta); } finally { lock.releaseLock(); }
    return { ok: true, action: "commit", cacheReady: true, cachedAt: record.cachedAt, checksum: actual, lengths: { morning: morning.length, evening: evening.length } };
  }
  function health(callback) {
    var record = getLarge(PREFIX + "CURRENT"), info = secretInfo();
    return output({ ok: true, service: "QE V123 Scheduled Summary API", version: "123", contract: CONTRACT, configured: info.configured, propertyKey: info.key, secretLength: info.length, acceptedPropertyKeys: SECRET_KEYS, cacheReady: !!record, cachedAt: record ? record.cachedAt : "", sourceDate: record ? record.sourceDate : "", checksum: record ? record.checksum : "", lengths: record ? { morning: String(record.summaries.morning || "").length, evening: String(record.summaries.evening || "").length } : { morning: 0, evening: 0 }, sendsLine: false, transport: "signed-jsonp-chunks" }, callback);
  }
  function getSummary(body) {
    var info = secretInfo(); if (!info.configured || clean(body.secret) !== info.value) return output({ ok: false, error: "Unauthorized" });
    var record = getLarge(PREFIX + "CURRENT"); if (!record) return output({ ok: false, error: "No summary cache" });
    var slot = String(body.slot || "morning").toLowerCase() === "evening" ? "evening" : "morning", text = normalizeLineBreaks(record.summaries[slot]);
    return output({ ok: true, action: "get", slot: slot, text: text, version: "123", sourceDate: record.sourceDate, cachedAt: record.cachedAt, checksum: record.checksum, stale: Math.max(0, Math.round((Date.now() - new Date(record.cachedAt).getTime()) / 60000)) > MAX_AGE_MINUTES });
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
  return { routeGet: routeGet, routePost: routePost, parsePost: parsePost, health: health, secretInfo: secretInfo, canonical: canonical };
})();
function doGet(e) { return QE_V123.routeGet(e && e.parameter || {}); }
function doPost(e) { try { return QE_V123.routePost(QE_V123.parsePost(e)); } catch (err) { return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err && err.message || err) })).setMimeType(ContentService.MimeType.JSON); } }
