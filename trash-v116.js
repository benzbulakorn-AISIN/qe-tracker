/*! QE Elec. Daily Job Tracker — trash-v116.js
    ถังขยะกลาง (Central Recycle Bin) สำหรับ Tracker · ประชุม · Checklist · 7 Mission · Hoshin · Main QE Jobs
    - ไม่แก้ฟังก์ชันลบเดิม: ตรวจจับ "รายการที่หายไป" จากข้อมูลก่อน/หลังบันทึก (เฉพาะช่วงที่ผู้ใช้กดปุ่ม/คีย์ลัด)
    - เก็บเป็น localStorage key  qe_trash111_<hash>  (1 key / 1 เหตุการณ์ลบ) → ซิงก์ขึ้น Cloud DB เองผ่านกลไก qe_* เดิม
    - กู้คืนผ่าน API ของแต่ละโมดูล (MS.restore / HS.restore / MJ.setData / __checklist) — ไม่เขียนทับข้อมูลที่มีอยู่แล้ว
    - ลบถาวร = Admin เท่านั้น (ตามนโยบายเดิม) */
(function () {
  "use strict";
  if (window.__QE111_TRASH) return;
  window.__QE111_TRASH = 1;

  var D = document, LS = window.localStorage, PFX = "qe_trash111_", KEEP_DAYS = 90;
  var WATCH = { "daily_checklist_v1": "ck", "qe_missions_v1": "ms", "qe_hoshin_v1": "hs", "qe_mainjobs_data_v2": "mj" };
  var MODN = { ck: "Checklist", ms: "7 Mission", hs: "Hoshin", mj: "Main QE Jobs" };
  var MODI = { ck: "📝", ms: "🎯", hs: "🧭", mj: "🧰" };
  var KIND = {
    row: "แถว Checklist", year: "ทั้งปี", mission: "Mission", item: "หัวข้อควบคุม (KPI)", otmember: "สมาชิก OT",
    otmonth: "ข้อมูล OT ทั้งเดือน", lvperson: "พนักงานในแผนลา", lvmonth: "แผนลาทั้งเดือน",
    act: "กิจกรรม", topic: "หัวข้อ", line: "ไลน์", ovblock: "ตาราง Overall status", ovproc: "Process (Overall)", ovjig: "Jig (Overall)",
    pcrperson: "ผู้รับผิดชอบ PCR", claim: "หัวข้อ Claim & Complaint", claimpath: "โฟลเดอร์ / Path", cpitem: "รายการ Q-patrol",
    cpev: "กิจกรรม Q-patrol", sched: "รุ่นใน Schedule", pvmodel: "รุ่นใน PV table", fuitem: "รายการ QE Follow-up",
    orgmem: "สมาชิก QE (Organization)", orgline: "ไลน์ใน Organization"
  };
  var busy = 0, winUntil = 0, notifiedFull = 0;

  /* ---------- helpers ---------- */
  function diag(e, c) { try { window.QE86Diagnostics && window.QE86Diagnostics.capture(e, c || "trash111"); } catch (x) { } }
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function hasOwn(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }
  function clip(s, n) { s = String(s == null ? "" : s).replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; }
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function fmtD(d) { return /^\d{4}-\d{2}-\d{2}$/.test(d || "") ? (+d.slice(8)) + "-" + MON[+d.slice(5, 7) - 1] + "-" + d.slice(2, 4) : String(d || ""); }
  function say(msg, bad) { try { if (typeof toast === "function") toast(msg, bad ? "var(--t-dang)" : undefined); } catch (e) { diag(e); } }
  function me() {
    var x = ""; try { x = (LS.getItem("ux_me") || "").trim(); } catch (e) { }
    try { if (window.QEPeople && x) x = window.QEPeople.display(x); } catch (e) { }
    return x || "?";
  }
  function isRO() { return !!window.__QE_RO; }
  function isAdmin() {
    try { if (window.QE84RoleUI && window.QE84RoleUI.role) return window.QE84RoleUI.role() === "admin"; } catch (e) { }
    try { if (window.QEAuth && window.QEAuth.enabled && window.QEAuth.enabled()) return !!window.QEAuth.can("delete"); } catch (e) { }
    return window.__QE_AUTH_ROLE === "admin" || !!window.__QE_CAN_DELETE;
  }
  function hash(s) {
    var a = 2166136261, b = 5381, i, c;
    for (i = 0; i < s.length; i++) { c = s.charCodeAt(i); a ^= c; a = Math.imul(a, 16777619); b = Math.imul(b, 33) ^ c; }
    return (a >>> 0).toString(36) + (b >>> 0).toString(36);
  }

  /* ---------- diff ---------- */
  function idmap(arr) { var m = {}; (arr || []).forEach(function (x) { if (x && x.id != null) m[x.id] = x; }); return m; }
  function removed(oa, na) {
    var nm = idmap(na), r = [];
    (oa || []).forEach(function (x, i) { if (x && x.id != null && !nm[x.id]) r.push({ i: i, x: x }); });
    return r;
  }
  function find(arr, id) { var r = null; (arr || []).forEach(function (x) { if (x && x.id === id) r = x; }); return r; }
  function G(out, mod, kind, scope, sub, list, lab, extra) {
    if (!list.length) return;
    out.push({
      mod: mod, kind: kind, scope: scope, sub: sub,
      items: list.map(function (r) { return { i: r.i, id: String(r.x.id), x: r.x, label: lab(r.x), extra: extra ? extra(r.x) : undefined }; })
    });
  }
  function objLen(o) { return o ? Object.keys(o).length : 0; }

  var DIFF = {};

  DIFF.ck = function (o, n) {
    var g = [];
    Object.keys(o || {}).forEach(function (d) {
      if (!Array.isArray(o[d])) return;
      var rm = removed(o[d], n && n[d]).filter(function (r) { return r.x && (String(r.x.t || "").trim() || String(r.x.n || "").trim()); });
      G(g, "ck", "row", { date: d }, "Checklist · " + fmtD(d), rm, function (x) { return clip(x.t || x.n, 90) + (x.owner ? "  [" + x.owner + "]" : ""); });
    });
    return g;
  };

  DIFF.ms = function (o, n) {
    var g = [], oy = (o && o.years) || {}, ny = (n && n.years) || {};
    Object.keys(oy).forEach(function (y) {
      var a = oy[y], b = ny[y], base = "7 Mission · ปี " + y;
      if (!a) return;
      if (!b) { g.push({ mod: "ms", kind: "year", scope: {}, sub: "7 Mission", items: [{ i: 0, id: y, x: a, label: "ปีงบประมาณ " + y + " (" + (a.missions || []).length + " Mission)" }] }); return; }
      G(g, "ms", "mission", { y: y }, base, removed(a.missions, b.missions), function (x) { return (x.icon || "") + " " + x.name + " (" + (x.items || []).length + " หัวข้อ)"; });
      (a.missions || []).forEach(function (m) {
        var nm = find(b.missions, m.id); if (!nm) return;
        G(g, "ms", "item", { y: y, m: m.id }, base + " · " + m.name, removed(m.items, nm.items), function (x) { return clip(x.name || "(ไม่มีชื่อ)", 100); });
      });
      if (a.ot && b.ot) {
        var rmm = removed(a.ot.members, b.ot.members);
        G(g, "ms", "otmember", { y: y }, base + " · OT Control", rmm, function (x) { return x.name; }, function (x) {
          var months = {};
          Object.keys(a.ot.months || {}).forEach(function (mi) {
            var d = (a.ot.months[mi] || {}).d || {};
            Object.keys(d).forEach(function (day) { if (d[day] && hasOwn(d[day], x.id)) { ((months[mi] = months[mi] || {})[day] = {})[x.id] = d[day][x.id]; } });
          });
          return { months: months };
        });
        if (!rmm.length) Object.keys(a.ot.months || {}).forEach(function (mi) {
          var od = (a.ot.months[mi] || {}).d, nd = ((b.ot.months || {})[mi] || {}).d;
          if (objLen(od) && !objLen(nd)) g.push({ mod: "ms", kind: "otmonth", scope: { y: y, m: mi }, sub: base + " · OT Control", items: [{ i: 0, id: "otm" + mi, x: od, label: "ข้อมูล OT รายวันของเดือนที่ " + mi + " (ปีงบ " + y + ")" }] });
        });
      }
      if (a.lv && b.lv) {
        var rmp = removed(a.lv.people, b.lv.people);
        G(g, "ms", "lvperson", { y: y }, base + " · แผนลา", rmp, function (x) { return x.name; }, function (x) {
          var cells = {};
          Object.keys(a.lv.months || {}).forEach(function (mi) {
            var c = (a.lv.months[mi] || {}).c || {};
            Object.keys(c).forEach(function (k) { if (k.indexOf(x.id + ":") === 0) (cells[mi] = cells[mi] || {})[k] = c[k]; });
          });
          return { bal: (a.lv.bal || {})[x.id], cells: cells };
        });
        if (!rmp.length) Object.keys(a.lv.months || {}).forEach(function (mi) {
          var oc = (a.lv.months[mi] || {}).c, nc = ((b.lv.months || {})[mi] || {}).c;
          if (objLen(oc) && !objLen(nc)) g.push({ mod: "ms", kind: "lvmonth", scope: { y: y, m: mi }, sub: base + " · แผนลา", items: [{ i: 0, id: "lvm" + mi, x: oc, label: "แผนลา/อบรมของเดือนที่ " + mi + " (ปี " + y + ")" }] });
        });
      }
    });
    return g;
  };

  DIFF.hs = function (o, n) {
    var g = [], oy = (o && o.years) || {}, ny = (n && n.years) || {};
    Object.keys(oy).forEach(function (y) {
      var a = oy[y], b = ny[y], base = "Hoshin · ปี " + y;
      if (!a) return;
      if (!b) { g.push({ mod: "hs", kind: "year", scope: {}, sub: "Hoshin", items: [{ i: 0, id: y, x: a, label: "Hoshin ปี " + y + " (" + (a.topics || []).length + " หัวข้อ)" }] }); return; }
      var ra = removed(a.acts, b.acts), nt = idmap(b.topics), bundled = {};
      G(g, "hs", "act", { y: y }, base, ra, function (x) { return (x.icon || "") + " " + clip(x.name, 90); }, function (x) {
        var ts = [];
        (a.topics || []).forEach(function (t, i) { if (t.act === x.id && !nt[t.id]) { ts.push({ i: i, x: t }); bundled[t.id] = 1; } });
        return { topics: ts };
      });
      var rt = removed(a.topics, b.topics).filter(function (r) { return !bundled[r.x.id]; });
      G(g, "hs", "topic", { y: y }, base, rt, function (x) { return (x.icon || "") + " " + clip(x.name, 90) + " (" + (x.lines || []).length + " ไลน์)"; });
      (a.topics || []).forEach(function (t) {
        var nt2 = find(b.topics, t.id); if (!nt2) return;
        var sub = base + " · " + (t.short || t.name);
        G(g, "hs", "line", { y: y, t: t.id }, sub, removed(t.lines, nt2.lines), function (x) { return "ไลน์ " + x.line; });
        if (t.ov && nt2.ov) {
          G(g, "hs", "ovblock", { y: y, t: t.id }, sub + " · Overall status", removed(t.ov.blocks, nt2.ov.blocks), function (x) { return x.line + (x.ref ? " · ID " + x.ref : ""); });
          (t.ov.blocks || []).forEach(function (bl) {
            var nb = find(nt2.ov.blocks, bl.id); if (!nb) return;
            var sub2 = sub + " · " + bl.line;
            G(g, "hs", "ovproc", { y: y, t: t.id, b: bl.id }, sub2, removed(bl.procs, nb.procs), function (x) { return x.n || "Process"; });
            (bl.procs || []).forEach(function (pr) {
              var np = find(nb.procs, pr.id); if (!np) return;
              G(g, "hs", "ovjig", { y: y, t: t.id, b: bl.id, p: pr.id }, sub2 + " · " + pr.n, removed(pr.jigs, np.jigs), function (x) { return "Jig " + (x.j || "–") + (x.c ? " (" + x.c + ")" : ""); });
            });
          });
        }
      });
    });
    return g;
  };

  DIFF.mj = function (o, n) {
    var g = [], B = "Main QE Jobs";
    if (!o || !n) return g;
    if (o.pcr && n.pcr) G(g, "mj", "pcrperson", {}, B + " · PCR Status", removed(o.pcr.people, n.pcr.people), function (x) { return x.name; });
    G(g, "mj", "claim", {}, B + " · Claim & Complaint", removed(o.claim, n.claim), function (x) { return x.title; });
    (o.claim || []).forEach(function (c) {
      var nc = find(n.claim, c.id); if (!nc) return;
      G(g, "mj", "claimpath", { c: c.id }, B + " · Claim · " + c.title, removed(c.paths, nc.paths), function (x) { return x.label + " — " + clip(x.unc, 60); });
    });
    if (o.claimPlan && n.claimPlan) {
      G(g, "mj", "cpitem", {}, B + " · Q-patrol audit", removed(o.claimPlan.items, n.claimPlan.items), function (x) { return x.line + " · " + clip(x.topic, 70) + " (" + (x.evs || []).length + " กิจกรรม)"; });
      (o.claimPlan.items || []).forEach(function (it) {
        var ni = find(n.claimPlan.items, it.id); if (!ni) return;
        G(g, "mj", "cpev", { it: it.id }, B + " · Q-patrol · " + it.line, removed(it.evs, ni.evs), function (x) { return (x.label || x.type) + " · แผน " + fmtD(x.pd); });
      });
    }
    if (o.newproj && n.newproj) {
      var op = o.newproj, np = n.newproj;
      if (op.schedule && np.schedule) G(g, "mj", "sched", {}, B + " · New project · Schedule", removed(op.schedule.models, np.schedule.models), function (x) { return x.name; });
      if (op.pv && np.pv) G(g, "mj", "pvmodel", {}, B + " · New project · PV table", removed(op.pv.models, np.pv.models), function (x) { return x.name; });
      Object.keys(op.followup || {}).forEach(function (pk) {
        var a = op.followup[pk], b = (np.followup || {})[pk]; if (!a || !b) return;
        ["Supplier", "In-house", "Customer"].forEach(function (cat) {
          G(g, "mj", "fuitem", { pk: pk, cat: cat }, B + " · QE Follow-up · " + (a.name || pk) + " · " + cat, removed((a.cats || {})[cat], (b.cats || {})[cat]), function (x) { return clip((x.no ? x.no + " " : "") + (x.task || ""), 100); });
        });
      });
    }
    if (o.org && n.org) {
      G(g, "mj", "orgmem", {}, B + " · Organization", removed(o.org.members, n.org.members), function (x) { return (x.nick || x.name) + (x.unit ? " — " + clip(x.unit, 40) : ""); });
      G(g, "mj", "orgline", {}, B + " · Organization", removed(o.org.lines, n.org.lines), function (x) { return x.line + (x.name ? " · " + x.name : ""); });
    }
    return g;
  };

  /* ---------- store ---------- */
  function saveGroup(grp) {
    var ids = grp.items.map(function (i) { return i.id; }).sort().join(",");
    var key = PFX + hash(grp.mod + "|" + grp.kind + "|" + JSON.stringify(grp.scope) + "|" + ids);
    var rec = { v: 1, mod: grp.mod, kind: grp.kind, scope: grp.scope, sub: grp.sub, at: new Date().toISOString(), by: me(), items: grp.items };
    var s = JSON.stringify(rec), prior = null;
    if (s.length > 900000) { say("⚠ รายการที่ลบใหญ่เกินกว่าจะเก็บในถังขยะ — ระบบยกเลิกการลบแล้ว", true); return false; }
    try { prior = LS.getItem(key); LS.setItem(key, s); return { key: key, prior: prior, count: grp.items.length }; }
    catch (e) {
      diag(e);
      if (!notifiedFull) { notifiedFull = 1; say("⚠ เก็บเข้าถังขยะไม่ได้ (พื้นที่เบราว์เซอร์เต็ม) — ระบบยกเลิกการลบแล้ว", true); }
      return false;
    }
  }
  function undoSaved(saved) {
    (saved || []).forEach(function (x) { try { if (x.prior == null) LS.removeItem(x.key); else origSet.call(LS, x.key, x.prior); } catch (e) { diag(e, "trash111-rollback"); } });
  }
  function list() {
    var r = [];
    try {
      for (var i = 0; i < LS.length; i++) {
        var k = LS.key(i);
        if (!k || k.indexOf(PFX) !== 0) continue;
        try { var o = JSON.parse(LS.getItem(k)); if (o && o.v === 1 && Array.isArray(o.items) && MODN[o.mod]) { o._k = k; r.push(o); } } catch (e) { }
      }
    } catch (e) { diag(e); }
    r.sort(function (a, b) { return a.at < b.at ? 1 : a.at > b.at ? -1 : 0; });
    return r;
  }
  function counts() {
    var c = { all: 0, items: 0, ck: 0, ms: 0, hs: 0, mj: 0 };
    list().forEach(function (r) { var n = Array.isArray(r.items) ? r.items.length : 0; c.all++; c.items += n; c[r.mod] += n; });
    return c;
  }
  function legacyList(key) { try { var a = JSON.parse(LS.getItem(key) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function trackerItems() {
    return legacyList("issue_tracker_trash").slice().sort(function (a, b) {
      return String(b && b.deletedAt || "").localeCompare(String(a && a.deletedAt || ""));
    });
  }
  function trackerDue(x) {
    try { if (window.QEData && window.QEData.currentDue) return window.QEData.currentDue(x) || ""; } catch (e) { }
    return x && x.due || "";
  }
  function trackerWhen(x) {
    try { return new Date(x.deletedAt).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }
    catch (e) { return x && x.deletedAt || ""; }
  }
  function allCounts() { var c = counts(); c.tr = legacyList("issue_tracker_trash").length; c.mtg = legacyList("qe_mtg_trash").length; c.totalItems = c.items + c.tr + c.mtg; return c; }

  /* ---------- capture (only user-initiated writes) ---------- */
  function touch() { winUntil = Date.now() + 2500; }
  ["click", "keydown", "change", "paste", "drop", "pointerup"].forEach(function (ev) { D.addEventListener(ev, touch, true); });

  function prepareCapture(mod, old, now) {
    if (old == null || now == null || now === old || old.length - now.length < 20) return { ok: true, saved: [], count: 0 };
    var groups;
    try { groups = DIFF[mod](JSON.parse(old), JSON.parse(now)); }
    catch (e) { diag(e, "trash111-diff"); say("⚠ ตรวจสอบข้อมูลก่อนลบไม่ได้ — ระบบยกเลิกการลบแล้ว", true); return { ok: false, saved: [], count: 0 }; }
    var saved = [], count = 0;
    for (var i = 0; i < groups.length; i++) {
      var x = saveGroup(groups[i]);
      if (!x) { undoSaved(saved); return { ok: false, saved: [], count: 0 }; }
      saved.push(x); count += x.count;
    }
    return { ok: true, saved: saved, count: count };
  }
  function announceCapture(ticket) {
    if (!ticket || !ticket.count) return;
    say("🗑 ย้าย " + ticket.count + " รายการไปถังขยะแล้ว — กู้คืนได้ที่ ⚙ เครื่องมือ › ถังขยะกลาง");
    refreshBadges();
  }
  function after(mod, key, old) {
    var ticket = prepareCapture(mod, old, LS.getItem(key));
    if (ticket.ok) announceCapture(ticket);
    return ticket.ok;
  }
  var origSet = Storage.prototype.setItem;
  Storage.prototype.setItem = function (k, v) {
    var mod = this === LS ? WATCH[k] : null;
    if (!mod || busy || Date.now() > winUntil) return origSet.apply(this, arguments);
    var old = null; try { old = this.getItem(k); } catch (e) { }
    var ticket = prepareCapture(mod, old, String(v));
    if (!ticket.ok) return;
    try { var r = origSet.apply(this, arguments); announceCapture(ticket); return r; }
    catch (e) { undoSaved(ticket.saved); throw e; }
  };

  /* ---------- restore ---------- */
  function fail(msg) { return { ok: false, msg: msg }; }
  function ok(msg) { return { ok: true, msg: msg }; }
  function byIdx(items) { return items.slice().sort(function (a, b) { return a.i - b.i; }); }
  function put(arr, it) {
    if (!Array.isArray(arr)) return 0;
    for (var i = 0; i < arr.length; i++) if (arr[i] && String(arr[i].id) === it.id) return 0;
    arr.splice(Math.min(it.i, arr.length), 0, clone(it.x)); return 1;
  }
  function putAll(arr, items) { var n = 0; byIdx(items).forEach(function (it) { n += put(arr, it); }); return n; }
  function doneMsg(n, tot) { return n ? ok("กู้คืน " + n + " รายการแล้ว" + (n < tot ? " (อีก " + (tot - n) + " รายการมีอยู่แล้ว)" : "")) : fail("รายการเหล่านี้มีอยู่ในระบบแล้ว — ไม่ต้องกู้คืน"); }

  var REST = {};
  REST.ck = function (rec) {
    var cl = window.__checklist; if (!cl || !cl.get) return fail("ระบบ Checklist ยังไม่พร้อม");
    var days = cl.get().days, d = rec.scope.date;
    var arr = days[d] || (days[d] = []);
    var n = putAll(arr, rec.items);
    if (!n) { if (!arr.length) delete days[d]; return doneMsg(0, rec.items.length); }
    LS.setItem("daily_checklist_v1", JSON.stringify(days));
    try { dirty++; checkBackup(); } catch (e) { }
    try { window.SPDB && window.SPDB.queue(); } catch (e) { }
    try { cl.open(d); } catch (e) { diag(e); }
    return doneMsg(n, rec.items.length);
  };

  function yearOp(rec, api, mutate, merge) {
    var cur = api.get(); if (!cur || !cur.years) return fail("ข้อมูลยังไม่พร้อม");
    if (rec.kind === "year") {
      var it = rec.items[0]; if (cur.years[it.id]) return fail("มีข้อมูลปี " + it.id + " อยู่แล้ว");
      var o = {}; o[it.id] = clone(it.x); api.restore({ years: o }, true); return ok("กู้คืนปี " + it.id + " แล้ว");
    }
    var y = rec.scope.y, yr = cur.years[y];
    if (!yr) return fail("ไม่พบปี " + y + " — กู้คืน “ทั้งปี” จากถังขยะก่อน");
    yr = clone(yr);
    var res = mutate(yr);
    if (res && res.ok === false) return res;
    var o2 = {}; o2[y] = yr; api.restore({ years: o2 }, false);
    return res;
  }

  REST.ms = function (rec) {
    var api = window.MS; if (!api || !api.get || !api.restore) return fail("โมดูล 7 Mission ยังไม่พร้อม");
    return yearOp(rec, api, function (yr) {
      var k = rec.kind, n = 0;
      if (k === "mission") n = putAll(yr.missions, rec.items);
      else if (k === "item") { var m = find(yr.missions, rec.scope.m); if (!m) return fail("ไม่พบ Mission ต้นทาง — กู้คืน Mission ก่อน"); n = putAll(m.items, rec.items); }
      else if (k === "otmember") {
        if (!yr.ot) return fail("ไม่พบ OT Control ของปีนี้");
        n = putAll(yr.ot.members, rec.items);
        rec.items.forEach(function (it) {
          var ms = (it.extra && it.extra.months) || {};
          Object.keys(ms).forEach(function (mi) {
            var mo = yr.ot.months[mi] = yr.ot.months[mi] || { wd: null, mp: null, hr: null, d: {} }; mo.d = mo.d || {};
            Object.keys(ms[mi]).forEach(function (day) { mo.d[day] = mo.d[day] || {}; Object.keys(ms[mi][day]).forEach(function (pid) { if (!hasOwn(mo.d[day], pid)) mo.d[day][pid] = ms[mi][day][pid]; }); });
          });
        });
      } else if (k === "otmonth") {
        if (!yr.ot) return fail("ไม่พบ OT Control ของปีนี้");
        var mi = rec.scope.m, mo = yr.ot.months[mi] = yr.ot.months[mi] || { wd: null, mp: null, hr: null, d: {} }, od = rec.items[0].x; mo.d = mo.d || {};
        Object.keys(od).forEach(function (day) { mo.d[day] = mo.d[day] || {}; Object.keys(od[day]).forEach(function (pid) { if (!hasOwn(mo.d[day], pid)) { mo.d[day][pid] = od[day][pid]; n++; } }); });
        if (!n) return fail("เดือนนี้มีข้อมูลครบอยู่แล้ว");
        return ok("กู้คืนข้อมูล OT ของเดือนแล้ว");
      } else if (k === "lvperson") {
        if (!yr.lv) return fail("ไม่พบแผนลาของปีนี้");
        n = putAll(yr.lv.people, rec.items);
        rec.items.forEach(function (it) {
          yr.lv.bal = yr.lv.bal || {}; if (it.extra && hasOwn(it.extra, "bal") && !hasOwn(yr.lv.bal, it.id)) yr.lv.bal[it.id] = it.extra.bal;
          var cs = (it.extra && it.extra.cells) || {};
          Object.keys(cs).forEach(function (mi) { var mo = yr.lv.months[mi] = yr.lv.months[mi] || { hol: [], c: {} }; Object.keys(cs[mi]).forEach(function (key) { if (!hasOwn(mo.c, key)) mo.c[key] = cs[mi][key]; }); });
        });
      } else if (k === "lvmonth") {
        if (!yr.lv) return fail("ไม่พบแผนลาของปีนี้");
        var mi2 = rec.scope.m, mo2 = yr.lv.months[mi2] = yr.lv.months[mi2] || { hol: [], c: {} }, oc = rec.items[0].x;
        Object.keys(oc).forEach(function (key) { if (!hasOwn(mo2.c, key)) { mo2.c[key] = oc[key]; n++; } });
        if (!n) return fail("เดือนนี้มีข้อมูลครบอยู่แล้ว");
        return ok("กู้คืนแผนลาของเดือนแล้ว");
      } else return fail("ไม่รู้จักประเภทรายการ");
      return doneMsg(n, rec.items.length);
    });
  };

  REST.hs = function (rec) {
    var api = window.HS; if (!api || !api.get || !api.restore) return fail("โมดูล Hoshin ยังไม่พร้อม");
    return yearOp(rec, api, function (yr) {
      var k = rec.kind, n = 0, s = rec.scope;
      if (k === "act") {
        n = putAll(yr.acts, rec.items);
        rec.items.forEach(function (it) { putAll(yr.topics, (it.extra && it.extra.topics || []).map(function (t) { return { i: t.i, id: String(t.x.id), x: t.x }; })); });
      } else if (k === "topic") n = putAll(yr.topics, rec.items);
      else {
        var t = find(yr.topics, s.t); if (!t) return fail("ไม่พบหัวข้อต้นทาง — กู้คืนหัวข้อก่อน");
        if (k === "line") n = putAll(t.lines, rec.items);
        else {
          if (!t.ov) return fail("หัวข้อนี้ไม่มี Overall status แล้ว");
          if (k === "ovblock") n = putAll(t.ov.blocks, rec.items);
          else {
            var bl = find(t.ov.blocks, s.b); if (!bl) return fail("ไม่พบตารางต้นทาง — กู้คืนตารางก่อน");
            if (k === "ovproc") n = putAll(bl.procs, rec.items);
            else if (k === "ovjig") { var pr = find(bl.procs, s.p); if (!pr) return fail("ไม่พบ Process ต้นทาง"); n = putAll(pr.jigs, rec.items); }
            else return fail("ไม่รู้จักประเภทรายการ");
          }
        }
      }
      return doneMsg(n, rec.items.length);
    });
  };

  REST.mj = function (rec) {
    var api = window.MJ; if (!api || !api.getData || !api.setData) return fail("โมดูล Main QE Jobs ยังไม่พร้อม");
    var cur = api.getData(); if (!cur) return fail("ข้อมูลยังไม่พร้อม");
    var k = rec.kind, s = rec.scope, n = 0, arr = null, np = cur.newproj || {};
    if (k === "pcrperson") arr = cur.pcr && cur.pcr.people;
    else if (k === "claim") arr = cur.claim;
    else if (k === "claimpath") { var c = find(cur.claim, s.c); if (!c) return fail("ไม่พบหัวข้อ Claim ต้นทาง"); arr = c.paths; }
    else if (k === "cpitem") arr = cur.claimPlan && cur.claimPlan.items;
    else if (k === "cpev") { var it = find(cur.claimPlan && cur.claimPlan.items, s.it); if (!it) return fail("ไม่พบรายการ Q-patrol ต้นทาง — กู้คืนรายการก่อน"); arr = it.evs; }
    else if (k === "sched") arr = np.schedule && np.schedule.models;
    else if (k === "pvmodel") arr = np.pv && np.pv.models;
    else if (k === "fuitem") { var pj = np.followup && np.followup[s.pk]; if (!pj) return fail("ไม่พบโปรเจกต์ Follow-up ต้นทาง"); arr = (pj.cats = pj.cats || {})[s.cat] = (pj.cats[s.cat] || []); }
    else if (k === "orgmem") arr = cur.org && cur.org.members;
    else if (k === "orgline") arr = cur.org && cur.org.lines;
    if (!Array.isArray(arr)) return fail("ไม่พบตำแหน่งเดิมของรายการนี้");
    n = putAll(arr, rec.items);
    if (!n) return doneMsg(0, rec.items.length);
    if (api.setData(cur) === false) return fail("บันทึกข้อมูลไม่สำเร็จ");
    return doneMsg(n, rec.items.length);
  };

  var CHUNK = { ms: "mission", hs: "hoshin", mj: "mainjobs" }, APIN = { ms: "MS", hs: "HS", mj: "MJ" }, TAB = { ck: "tabS", ms: "tabM", hs: "tabH", mj: "tabJ" };
  function ensure(mod) {
    if (!CHUNK[mod] || window[APIN[mod]]) return Promise.resolve();
    try { if (window.QE98Features && window.QE98Features.load) return window.QE98Features.load(CHUNK[mod]).then(function () { return new Promise(function (r) { setTimeout(r, 60); }); }); } catch (e) { diag(e); }
    return Promise.resolve();
  }
  function restoreRec(rec) {
    if (isRO()) return Promise.resolve(fail("บัญชีนี้ดูอย่างเดียว — กู้คืนไม่ได้"));
    return ensure(rec.mod).then(function () {
      var res;
      busy++; try { res = REST[rec.mod](rec); } catch (e) { diag(e, "trash111-restore"); res = fail("กู้คืนไม่สำเร็จ: " + (e && e.message || e)); } finally { busy--; }
      if (res.ok) {
        try { LS.removeItem(rec._k); } catch (e) { diag(e); }
        refreshBadges();
        try { var t = D.getElementById(TAB[rec.mod]); if (t && rec.mod !== "ck") t.click(); } catch (e) { }
      }
      return res;
    });
  }
  function purge(rec) {
    if (!isAdmin()) return false;
    try { LS.removeItem(rec._k); refreshBadges(); return true; } catch (e) { diag(e); return false; }
  }

  /* ---------- UI ---------- */
  var css = D.createElement("style");
  css.id = "qt111Css";
  css.textContent =
    "#qt111{position:fixed;inset:0;z-index:10060;background:rgba(15,23,42,.55);display:none;align-items:center;justify-content:center;padding:16px}" +
    "#qt111.on{display:flex}" +
    "#qt111 .qt-b{background:var(--pop,#fff);color:var(--txt,#1e293b);border:1px solid var(--line,#cbd5e1);border-radius:14px;width:100%;max-width:900px;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 18px 50px rgba(0,0,0,.4)}" +
    "#qt111 .qt-h{display:flex;align-items:center;gap:10px;padding:16px 20px 6px}#qt111 .qt-h h3{margin:0;font-size:18px;flex:1}" +
    "#qt111 .qt-x{border:0;background:none;color:inherit;font-size:20px;cursor:pointer;padding:2px 8px;border-radius:8px}" +
    "#qt111 .qt-s{padding:0 20px 8px;color:var(--mut,#64748b);font-size:12.5px;line-height:1.55}" +
    "#qt111 .qt-f{display:flex;flex-wrap:wrap;gap:6px;padding:4px 20px 10px}" +
    "#qt111 .qt-f button{padding:5px 12px;font-size:12.5px;font-weight:700;border-radius:99px;border:1px solid var(--line,#cbd5e1);background:transparent;color:inherit;cursor:pointer}" +
    "#qt111 .qt-f button.on{background:var(--pri,#2563eb);color:var(--on-pri,#fff);border-color:var(--pri,#2563eb)}" +
    "#qt111 .qt-l{overflow:auto;padding:0 20px 8px;flex:1;min-height:120px}" +
    "#qt111 .qt-r{display:grid;grid-template-columns:116px minmax(0,1fr) auto;gap:10px;align-items:center;padding:9px 0;border-top:1px dashed var(--line,#cbd5e1)}" +
    "#qt111 .qt-r:first-child{border-top:0}" +
    "#qt111 .qt-w{font-size:12px;color:var(--mut,#64748b);line-height:1.45}#qt111 .qt-w b{display:block;color:var(--txt,#1e293b);font-size:12.5px}" +
    "#qt111 .qt-t{min-width:0}#qt111 .qt-t b{display:block;font-size:13.5px;line-height:1.4;word-break:break-word}" +
    "#qt111 .qt-t small{display:block;color:var(--mut,#64748b);font-size:12px;line-height:1.45;word-break:break-word}" +
    "#qt111 .qt-k{display:inline-block;margin-right:6px;padding:1px 8px;border-radius:99px;font-size:11.5px;font-weight:800;background:var(--soft2,#e2e8f0);color:var(--txt,#1e293b);vertical-align:1px}" +
    "#qt111 .qt-a{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}" +
    "#qt111 .qt-a button{padding:6px 12px;font-size:12.5px;font-weight:700;border-radius:9px;border:1px solid var(--line,#cbd5e1);background:transparent;color:inherit;cursor:pointer}" +
    "#qt111 .qt-a .rs{border-color:var(--ok,#16a34a);color:var(--t-ok,#15803d)}#qt111 .qt-a .dl{border-color:var(--dang,#dc2626);color:var(--t-dang,#b91c1c)}" +
    "#qt111 .qt-a button:disabled{opacity:.5;cursor:wait}" +
    "#qt111 .qt-e{padding:28px 6px;text-align:center;color:var(--mut,#64748b)}" +
    "#qt111 .qt-ft{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:10px 20px 16px;border-top:1px solid var(--line,#cbd5e1)}" +
    "#qt111 .qt-ft button{padding:6px 12px;font-size:12.5px;font-weight:700;border-radius:9px;border:1px solid var(--line,#cbd5e1);background:transparent;color:inherit;cursor:pointer}" +
    "#qt111 .qt-ft .g{flex:1}#qt111 .qt-ft span{font-size:12px;color:var(--mut,#64748b)}" +
    "#qt111 button:focus-visible{outline:3px solid var(--ring,#93c5fd);outline-offset:2px}" +
    "@media(max-width:640px){#qt111 .qt-r{grid-template-columns:1fr}#qt111 .qt-a{justify-content:flex-start}#qt111 .qt-x,#qt111 .qt-f button,#qt111 .qt-a button,#qt111 .qt-ft button{min-height:44px;min-width:44px}}" +
    ".qt-open{white-space:nowrap}" +
    "#trBtn,#ov5,#nvMenu [data-b=\"trBtn\"]{display:none!important}";
  D.head.appendChild(css);

  var root = null, curFilter = "all", lastFocus = null;
  function build() {
    if (root) return root;
    root = D.createElement("div"); root.id = "qt111";
    root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true"); root.setAttribute("aria-labelledby", "qt111T");
    root.innerHTML =
      '<div class="qt-b"><div class="qt-h"><h3 id="qt111T">🗑 ถังขยะกลาง — แยกตามหน้า</h3><button type="button" class="qt-x" data-q="close" aria-label="ปิด">✕</button></div>' +
      '<div class="qt-s">รวมรายการที่ลบจากทุกหน้าไว้จุดเดียว แล้วเลือกดูตามหัวข้อด้านล่าง · กด “↩ กู้คืน” เพื่อนำกลับตำแหน่งเดิม · การลบถาวรทำได้เฉพาะ Admin</div>' +
      '<div class="qt-f" id="qt111F"></div><div class="qt-l" id="qt111L"></div>' +
      '<div class="qt-ft"><span class="g"></span><span id="qt111N"></span><button type="button" data-q="clear" class="dl" style="color:var(--t-dang,#b91c1c)">🗑 ล้างถังขยะหมวดที่แสดง</button></div></div>';
    D.body.appendChild(root);
    root.addEventListener("mousedown", function (e) { if (e.target === root) closeModal(); });
    root.addEventListener("click", onClick);
    D.addEventListener("keydown", function (e) { if (e.key === "Escape" && root.classList.contains("on")) { e.stopPropagation(); closeModal(); } }, true);
    return root;
  }
  function render() {
    var recs = list(), trs = trackerItems(), c = allCounts(), admin = isAdmin(), ro = isRO();
    var F = D.getElementById("qt111F"), L = D.getElementById("qt111L");
    var tabs = [["all", "ทั้งหมด", c.totalItems], ["tr", "📊 Tracker", c.tr], ["mtg", "🗓️ ประชุม", c.mtg], ["ck", "📝 Checklist", c.ck], ["ms", "🎯 7 Mission", c.ms], ["hs", "🧭 Hoshin", c.hs], ["mj", "🧰 Main QE Jobs", c.mj]];
    F.innerHTML = tabs.map(function (f) { return '<button type="button" data-q="f" data-f="' + f[0] + '" class="' + (curFilter === f[0] ? "on" : "") + '">' + f[1] + " (" + f[2] + ")</button>"; }).join("");
    var html = "";
    if (curFilter === "all" || curFilter === "tr") html += trs.map(function (t) {
      var due = trackerDue(t), cm = clip(t && t.cm || "", 90), meta = [];
      if (t && t.owner) meta.push("ผู้แจ้ง " + t.owner);
      if (due) meta.push("Due " + fmtD(due));
      if (t && t.status) meta.push(t.status);
      if (cm) meta.push("🛠 " + cm);
      return '<div class="qt-r" data-trk="' + esc(t && t.id) + '"><div class="qt-w"><b>' + esc(trackerWhen(t)) + '</b>Tracker</div><div class="qt-t"><b><span class="qt-k">📊 Tracker</span>' + esc(clip(t && t.issue || "(ไม่มีชื่อ)", 120)) + '</b><small>' + esc(meta.join(" · ")) + '</small></div><div class="qt-a"><button type="button" class="rs" data-q="trs"' + (ro ? ' disabled' : '') + '>↩ กู้คืน</button>' + (admin ? '<button type="button" class="dl" data-q="tdl">ลบถาวร</button>' : '') + '</div></div>';
    }).join("");
    if (curFilter === "all" || curFilter === "mtg") html += '<div class="qt-r qt-source"><div class="qt-w"><b>🗓️ ประชุม</b>ถังขยะของหน้าประชุม</div><div class="qt-t"><b>รายการประชุมที่ลบหรือหายจากการซิงก์</b><small>' + c.mtg + ' รายการ · เก็บตามระบบเดิม 30 วัน</small></div><div class="qt-a"><button type="button" class="rs" data-q="mtg">เปิด / กู้คืน</button></div></div>';
    var show = (curFilter === "tr" || curFilter === "mtg") ? [] : recs.filter(function (r) { return curFilter === "all" || r.mod === curFilter; });
    html += show.map(function (r) {
      var first = r.items[0] || {}, more = r.items.length - 1;
      var tip = r.items.slice(0, 14).map(function (i) { return i.label; }).join("\n") + (r.items.length > 14 ? "\n…" : "");
      var when = ""; try { when = new Date(r.at).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); } catch (e) { when = r.at; }
      return '<div class="qt-r" data-k="' + esc(r._k) + '"><div class="qt-w"><b>' + esc(when) + '</b>โดย ' + esc(r.by || '?') + '</div><div class="qt-t" title="' + esc(tip) + '"><b><span class="qt-k">' + MODI[r.mod] + ' ' + esc(KIND[r.kind] || r.kind) + '</span>' + esc(first.label || '') + (more > 0 ? ' และอีก ' + more + ' รายการ' : '') + '</b><small>' + esc(r.sub || MODN[r.mod]) + '</small></div><div class="qt-a"><button type="button" class="rs" data-q="rs"' + (ro ? ' disabled' : '') + '>↩ กู้คืน</button>' + (admin ? '<button type="button" class="dl" data-q="dl">ลบถาวร</button>' : '') + '</div></div>';
    }).join("");
    if (!html) html = '<div class="qt-e">ถังขยะว่างเปล่า 🎉<br><small>ในหมวดนี้</small></div>';
    L.innerHTML = html;
    D.getElementById("qt111N").textContent = c.totalItems + " รายการ · " + c.all + " เหตุการณ์ในโมดูลกลาง";
    var clr = root.querySelector('[data-q="clear"]'), clearable = recs.filter(function (r) { return curFilter === "all" || r.mod === curFilter; });
    var canClearTracker = curFilter === "tr" && trs.length;
    clr.style.display = admin && (canClearTracker || (clearable.length && curFilter !== "mtg" && curFilter !== "tr")) ? "" : "none";
    clr.textContent = curFilter === "tr" ? "🗑 ล้างถังขยะ Tracker" : (curFilter === "all" ? "🗑 ล้างถังขยะ 4 โมดูลที่แสดง" : "🗑 ล้างถังขยะหมวดนี้");
  }
  function validFocusTarget(el) {
    return !!(el && el !== D.body && el !== D.documentElement && D.contains(el) && typeof el.focus === "function");
  }
  function restoreFocus() {
    var el = lastFocus;
    lastFocus = null;
    if (!validFocusTarget(el)) return false;
    try {
      if (window.QE105Sidebar && typeof window.QE105Sidebar.revealControl === "function" && window.QE105Sidebar.revealControl(el)) return true;
      el.focus({ preventScroll: true });
      return D.activeElement === el;
    } catch (e) { return false; }
  }
  function openModal(filter, opener) {
    build(); if (filter) curFilter = filter;
    lastFocus = validFocusTarget(opener) ? opener : D.activeElement;
    if (isAdmin()) autoExpire();
    render(); root.classList.add("on");
    var x = root.querySelector(".qt-x"); x && x.focus();
  }
  function closeModal(restore) {
    if (root) root.classList.remove("on");
    if (restore !== false) restoreFocus(); else lastFocus = null;
  }
  function autoExpire() {
    var lim = Date.now() - KEEP_DAYS * 864e5;
    list().forEach(function (r) { var t = Date.parse(r.at); if (isFinite(t) && t < lim) { try { LS.removeItem(r._k); } catch (e) { } } });
  }
  function confirmBox(msg) {
    try { if (window.QE84Dialog && window.QE84Dialog.confirm) return window.QE84Dialog.confirm(msg, { title: "ลบถาวร", ok: "ลบถาวร", cancel: "ยกเลิก", danger: true }); } catch (e) { }
    return Promise.resolve(window.confirm(msg));
  }
  function onClick(e) {
    var b = e.target.closest("[data-q]"); if (!b) return;
    var q = b.dataset.q;
    if (q === "close") return closeModal();
    if (q === "f") { curFilter = b.dataset.f; return render(); }
    if (q === "mtg") {
      closeModal(false);
      var mt = D.querySelector('[data-mg="trash"]');
      if (mt) { mt.click(); return; }
      var nav = Array.prototype.filter.call(D.querySelectorAll("button"), function (x) { return /ประชุม/.test(x.textContent || "") && !x.closest("#qt111"); })[0];
      if (nav) nav.click();
      (function waitTrash(n) { var x = D.querySelector('[data-mg="trash"]'); if (x) return x.click(); if (n < 20) return setTimeout(function () { waitTrash(n + 1); }, 100); say("เปิดหน้าประชุม แล้วกด 🗑 ถังขยะ", true); })(0);
      return;
    }
    if (q === "clear") {
      if (!isAdmin() || curFilter === "mtg") return;
      if (curFilter === "tr") {
        var te = D.getElementById("trEmpty");
        if (te) {
          te.click();
          [80, 300, 1000].forEach(function (ms) { setTimeout(function () { if (root && root.classList.contains("on")) render(); }, ms); });
        }
        return;
      }
      var target = list().filter(function (r) { return curFilter === "all" || r.mod === curFilter; });
      var scope = curFilter === "all" ? "Checklist / 7 Mission / Hoshin / Main QE Jobs" : MODN[curFilter];
      return confirmBox("ลบถาวรใน " + scope + " (" + target.length + " เหตุการณ์)?\nไม่รวม Tracker/ประชุม และกู้คืนไม่ได้อีก").then(function (y) { if (y) { target.forEach(purge); render(); say("ล้างถังขยะ " + scope + " แล้ว"); } });
    }
    var row = b.closest(".qt-r"); if (!row) return;
    if (q === "trs" || q === "tdl") {
      var id = Number(row.dataset.trk);
      if (!isFinite(id)) { say("ไม่พบ ID ของรายการ Tracker", true); return; }
      if (q === "trs") {
        if (isRO()) return;
        try {
          if (typeof window.trashRestore !== "function") throw new Error("Tracker restore API unavailable");
          window.trashRestore(id); render();
        } catch (x) { diag(x, "trash115-tracker-restore"); say("กู้คืน Tracker ไม่สำเร็จ", true); }
        return;
      }
      if (!isAdmin()) return;
      b.disabled = true;
      try {
        if (typeof window.trashPurge !== "function") throw new Error("Tracker purge API unavailable");
        return Promise.resolve(window.trashPurge(id)).then(render, function (x) { diag(x, "trash115-tracker-purge"); render(); say("ลบถาวร Tracker ไม่สำเร็จ", true); });
      } catch (x) { diag(x, "trash115-tracker-purge"); b.disabled = false; say("ลบถาวร Tracker ไม่สำเร็จ", true); return; }
    }
    var rec = list().filter(function (r) { return r._k === row.dataset.k; })[0]; if (!rec) { render(); return; }
    if (q === "rs") {
      b.disabled = true;
      restoreRec(rec).then(function (res) {
        say((res.ok ? "↩ " : "⚠ ") + res.msg, !res.ok);
        if (res.ok) closeModal(); else { b.disabled = false; render(); }
      });
    } else if (q === "dl") {
      confirmBox("ลบถาวร “" + (rec.items[0] && rec.items[0].label || "") + "”" + (rec.items.length > 1 ? " และอีก " + (rec.items.length - 1) + " รายการ" : "") + "?\nกู้คืนไม่ได้อีก").then(function (y) { if (y && purge(rec)) { render(); say("ลบถาวรแล้ว"); } });
    }
  }

  /* ---------- entry points (buttons) ---------- */
  function mkBtn(mod, cls) {
    var b = D.createElement("button"); b.type = "button"; b.className = (cls || "btn-g") + " qt-open"; b.setAttribute("data-qt111", mod);
    b.title = "ถังขยะ — กู้คืนรายการที่ลบพลาด (ใช้ร่วมกันทั้งทีม)";
    b.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); openModal(mod === "all" ? "all" : mod, e.currentTarget); });
    return b;
  }
  function setBadge(b) {
    var m = b.getAttribute("data-qt111"), c = allCounts(), n = c[m] != null ? c[m] : c.totalItems;
    b.textContent = "🗑 ถังขยะ" + (n ? " (" + n + ")" : "");
  }
  function refreshBadges() { try { D.querySelectorAll("[data-qt111]").forEach(setBadge); } catch (e) { diag(e); } }
  function inject() {
    try {
      var tr = D.getElementById("trBtn"), ov = D.getElementById("ov5");
      if (tr) { tr.hidden = true; tr.tabIndex = -1; tr.setAttribute("aria-hidden", "true"); }
      if (ov) { ov.classList.remove("on"); ov.hidden = true; ov.setAttribute("aria-hidden", "true"); }
      var bar = D.querySelector("#viewSheet .sh-bar");
      if (bar && !bar.querySelector('[data-qt111="ck"]')) { var b = mkBtn("ck"); setBadge(b); var imp = D.getElementById("shImp"); imp && imp.nextSibling ? bar.insertBefore(b, imp.nextSibling) : bar.appendChild(b); }
      [["viewMission", ".ms-tools", "ms"], ["viewHoshin", ".ms-tools", "hs"], ["viewMainJobs", ".mje-tb", "mj"]].forEach(function (c) {
        var v = D.getElementById(c[0]); if (!v) return;
        var host = v.querySelector(c[1]); if (!host || host.querySelector('[data-qt111="' + c[2] + '"]')) return;
        var b = mkBtn(c[2]); setBadge(b);
        var g = c[2] === "mj" ? host.querySelector(".grow") : null;
        g ? host.insertBefore(b, g) : host.appendChild(b);
      });
      var menu = D.getElementById("nvMenu");
      if (menu && !menu.querySelector("[data-qt111-menu]")) {
        var tb = menu.querySelector('[data-b="trBtn"]');
        if (tb) {
           tb.hidden = true; tb.tabIndex = -1; tb.setAttribute("aria-hidden", "true");
          var m = D.createElement("button"); m.type = "button"; m.className = "nv-mi"; m.setAttribute("role", "menuitem"); m.setAttribute("data-qt111-menu", "1");
          var n = allCounts().totalItems;
          m.innerHTML = '<span class="mi-ic" aria-hidden="true">🗑</span><span><span>ถังขยะกลาง' + (n ? " (" + n + ")" : "") + "</span><small>Tracker · ประชุม · Checklist · 7 Mission · Hoshin · Main QE Jobs</small></span>";
          m.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); var opener = e.currentTarget; menu.hidden = true; var mb = D.getElementById("nvMenuBtn"); mb && mb.setAttribute("aria-expanded", "false"); openModal("all", opener); });
          tb.insertAdjacentElement("afterend", m);
        }
      }
    } catch (e) { diag(e); }
  }
  var pend = 0;
  function sched() { if (pend) return; pend = 1; (window.requestAnimationFrame || setTimeout)(function () { pend = 0; inject(); }); }
  function watch() {
    ["viewMission", "viewHoshin", "viewMainJobs", "nvMenu"].forEach(function (id) {
      var el = D.getElementById(id);
      if (el && !el.__qt111 && window.MutationObserver) { el.__qt111 = 1; new MutationObserver(sched).observe(el, { childList: true }); }
    });
  }
  var tries = 0, iv = setInterval(function () { tries++; watch(); inject(); if (tries > 60) clearInterval(iv); }, 500);
  D.addEventListener("click", function (e) {
    var t = e.target && e.target.closest && e.target.closest('#trBtn,[data-b="trBtn"]');
    if (!t || t.closest("#qt111")) return;
    e.preventDefault(); e.stopImmediatePropagation(); openModal("tr", t);
  }, true);
  watch(); inject();
  setInterval(function () { if (!D.hidden) { refreshBadges(); watch(); } }, 15000);
  D.addEventListener("visibilitychange", function () { if (!D.hidden) refreshBadges(); });

  window.QE111Trash = { open: openModal, count: function () { return counts().all; }, list: list };
  window.__QE111_TRASH_T = { DIFF: DIFF, REST: REST, saveGroup: saveGroup, list: list, restoreRec: restoreRec, after: after, touch: touch };
})();
