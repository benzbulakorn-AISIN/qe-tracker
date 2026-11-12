/*! QE Elec. Daily Job Tracker — backup-fallback-v132.js  (ใช้คู่กับ tracker-toolbar-v131.js)
    ปัญหา: Chrome บางเครื่องปฏิเสธหน้าต่าง "บันทึกไฟล์/เลือกโฟลเดอร์" (AbortError) → กด 💾 Backup แล้วไม่ได้ไฟล์
    แก้:  ห่อ window.showSaveFilePicker แบบโปร่งใส — ถ้า Chrome ปฏิเสธ จะส่ง "file handle จำลอง" ให้ระบบเดิม
          ระบบเดิมเขียนข้อมูลตามปกติ (เนื้อหาไฟล์เดิม 100%) แล้วไฟล์จะถูกดาวน์โหลดลงโฟลเดอร์ Downloads แทน
    ไม่แตะ: business logic, Backup schema, localStorage, Cloud Sync, Auth/Role/RLS, LINE/Teams, Trash
    ไม่มี network และไม่มี dependency ภายนอก */
(function () {
  "use strict";
  if (window.__QE132_BKFB) return;
  window.__QE132_BKFB = true;

  var D = document;
  function diag(e, c) { try { window.QE86Diagnostics && window.QE86Diagnostics.capture(e, c || "backup-fallback-v132"); } catch (_) {} }

  function toast(msg) {
    try {
      var t = D.createElement("div");
      t.textContent = msg;
      t.setAttribute("role", "status");
      t.setAttribute("aria-live", "polite");
      t.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:10050;max-width:92vw;" +
        "padding:12px 18px;border-radius:12px;background:#1e293b;color:#fff;font-size:14px;font-weight:600;line-height:1.5;" +
        "box-shadow:0 10px 30px rgba(0,0,0,.3);white-space:pre-line;font-family:inherit";
      D.body.appendChild(t);
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 6000);
    } catch (_) {}
  }

  function download(name, parts) {
    var blob = new Blob(parts, { type: /\.json$/i.test(name) ? "application/json" : "application/octet-stream" });
    var a = D.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.style.display = "none";
    D.body.appendChild(a);
    a.click();
    a.parentNode.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
    toast("💾 สำรองข้อมูลแล้ว\nไฟล์ “" + name + "” อยู่ในโฟลเดอร์ Downloads");
  }

  /* file handle จำลอง — รองรับ API ที่ระบบเดิมใช้ (createWritable → write → close) */
  function fakeHandle(name) {
    var parts = [];
    var writer = {
      write: function (d) {
        if (d && typeof d === "object" && !(d instanceof Blob) && !(d instanceof ArrayBuffer) && !ArrayBuffer.isView(d) && "data" in d) d = d.data;
        if (d != null) parts.push(d);
        return Promise.resolve();
      },
      truncate: function () { return Promise.resolve(); },
      seek: function () { return Promise.resolve(); },
      abort: function () { parts = []; return Promise.resolve(); },
      close: function () { download(name, parts); return Promise.resolve(); }
    };
    return {
      kind: "file",
      name: name,
      createWritable: function () { return Promise.resolve(writer); },
      getFile: function () { return Promise.resolve(new File(parts, name)); },
      queryPermission: function () { return Promise.resolve("granted"); },
      requestPermission: function () { return Promise.resolve("granted"); },
      isSameEntry: function () { return Promise.resolve(false); }
    };
  }

  var orig = window.showSaveFilePicker;
  if (typeof orig !== "function" || orig.__qe132) return;

  var wrapped = function (opts) {
    var name = (opts && opts.suggestedName) ||
      ("qe_tracker_backup_" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + ".json");
    var p;
    try { p = orig.call(window, opts); }
    catch (e) { p = Promise.reject(e); }
    return Promise.resolve(p).catch(function (e) {
      var n = e && e.name;
      if (n === "AbortError" || n === "SecurityError" || n === "NotAllowedError") {
        diag(e, "backup-fallback-v132 → download");
        return fakeHandle(name);
      }
      throw e;
    });
  };
  wrapped.__qe132 = true;
  try { window.showSaveFilePicker = wrapped; } catch (e) { diag(e, "backup-fallback-v132 wire"); }
})();
