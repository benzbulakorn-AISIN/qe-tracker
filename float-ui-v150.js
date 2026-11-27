/*! QE Elec. Daily Job Tracker — float-ui-v150.js  (แทน float-ui-v149.js · โหลดต่อจาก core-v125.min.js · ทำงานทุกหน้า)
    v146–v148: ปุ่มแชต / AI / แสดง-ซ่อนน้อง อยู่มุมขวาบน · หน้าต่างแชตเปิดลงมาจากบน · เนื้อหาระยะซ้าย = ขวา
    v149: ปุ่มวงกลมเข้ม 38px + ไอคอน SVG ใหม่ · หน้าต่าง AI แบบ Copilot / Claude · ข้อความน้องดุ๊กดิ๊กในกล่องลอย
    v150: 1) หน้าต่าง AI — คำทักทายตอนยังไม่เริ่มคุยถูกตัดบน/ล่าง (จัดกลางแบบ flex แล้วล้นพื้นที่)
             → จัดกลางด้วย margin:auto (ล้นแล้วเลื่อนอ่านได้ครบ) · ไอคอนเล็กลง · การ์ดคำถามแนะนำเตี้ยลง เรียง 4 ช่อง
             → พื้นที่คำทักทายสูงขึ้น เห็นครบทุกบรรทัดบนจอ 1366×768
          2) ปุ่ม AI บางหน้ามีตัวอักษร "AI" เดิมซ้อนไอคอน → ซ่อนตัวอักษร/ไอคอนเดิมทุกแบบ (รวม ::before / ::after)
    ปรับหน้าตาอย่างเดียว: ไม่แตะข้อมูล / Cloud / การส่งคำถาม AI / ระบบแชต / ตำแหน่งน้อง (ux_qe_mascot_pos_v1)
    ไม่มี network และไม่มี dependency ภายนอก */
(function () {
  "use strict";
  if (window.__QE150_FLOAT_UI) return;
  window.__QE150_FLOAT_UI = true;
  window.__QE149_FLOAT_UI = window.__QE148_FLOAT_UI = window.__QE147_FLOAT_UI = window.__QE146_FLOAT_UI = true; // กันรุ่นเก่าที่ค้างใน cache
  var D = document, SZ = 38, GAP = 8, EDGE_R = 20, TOP = 14;

  function diag(e) { try { window.QE86Diagnostics && window.QE86Diagnostics.capture(e, "float-ui-v150"); } catch (_) {} }
  function mobile() { return (window.innerWidth || 0) <= 640; }
  function $(id) { return D.getElementById(id); }

  /* ---------- ไอคอน ---------- */
  var ICON = {
    ai: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><defs><linearGradient id="fxAiG" x1="3" y1="3" x2="20" y2="20" gradientUnits="userSpaceOnUse"><stop stop-color="#ddd6fe"/><stop offset=".5" stop-color="#818cf8"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs><path d="M11 2.6c.62 4.75 3 7.13 7.75 7.75-4.75.62-7.13 3-7.75 7.75-.62-4.75-3-7.13-7.75-7.75 4.75-.62 7.13-3 7.75-7.75z" fill="url(#fxAiG)"/><path d="M18.4 14.2c.27 2.03 1.27 3.03 3.3 3.3-2.03.27-3.03 1.27-3.3 3.3-.27-2.03-1.27-3.03-3.3-3.3 2.03-.27 3.03-1.27 3.3-3.3z" fill="#67e8f9"/></svg>',
    chat: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 7.2A3.7 3.7 0 0 1 7.7 3.5h8.6A3.7 3.7 0 0 1 20 7.2v5.6a3.7 3.7 0 0 1-3.7 3.7h-5.1l-4.1 3.4c-.55.45-1.35.06-1.35-.65v-2.8A3.7 3.7 0 0 1 4 12.8z" fill="none" stroke="#e2e8f0" stroke-width="1.7" stroke-linejoin="round"/><circle cx="8.6" cy="10" r="1.15" fill="#7dd3fc"/><circle cx="12" cy="10" r="1.15" fill="#a5b4fc"/><circle cx="15.4" cy="10" r="1.15" fill="#c4b5fd"/></svg>',
    buddy: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><defs><linearGradient id="fxVisG" x1="7" y1="8" x2="17" y2="15" gradientUnits="userSpaceOnUse"><stop stop-color="#7dd3fc"/><stop offset="1" stop-color="#a78bfa"/></linearGradient></defs><path d="M12 2.2v1.6" stroke="#e2e8f0" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="2" r="1" fill="#fbbf24"/><circle cx="12" cy="11.4" r="7.4" fill="none" stroke="#e2e8f0" stroke-width="1.7"/><rect x="7.2" y="8.2" width="9.6" height="6.4" rx="3.2" fill="url(#fxVisG)"/><path d="M9.2 10.4h1.4" stroke="#fff" stroke-width="1.2" stroke-linecap="round" opacity=".85"/><path d="M8.2 20.6c1-1 2.3-1.5 3.8-1.5s2.8.5 3.8 1.5" fill="none" stroke="#e2e8f0" stroke-width="1.6" stroke-linecap="round"/></svg>',
    send: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    clear: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 5v4M12 5H8m4 0h4M5 9h14l-1.2 9.2A2 2 0 0 1 15.8 20H8.2a2 2 0 0 1-2-1.8z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>'
  };
  var SPARK_URL = "url(\"data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><linearGradient id="g" x1="3" y1="3" x2="20" y2="20" gradientUnits="userSpaceOnUse"><stop stop-color="#c4b5fd"/><stop offset=".5" stop-color="#6366f1"/><stop offset="1" stop-color="#06b6d4"/></linearGradient></defs><path d="M11 2.6c.62 4.75 3 7.13 7.75 7.75-4.75.62-7.13 3-7.75 7.75-.62-4.75-3-7.13-7.75-7.75 4.75-.62 7.13-3 7.75-7.75z" fill="url(#g)"/><path d="M18.4 14.2c.27 2.03 1.27 3.03 3.3 3.3-2.03.27-3.03 1.27-3.3 3.3-.27-2.03-1.27-3.03-3.3-3.3 2.03-.27 3.03-1.27 3.3-3.3z" fill="#22d3ee"/></svg>') + "\")";

  /* ---------- CSS ---------- */
  var F = "body.qe-fab-top ";
  var FABS = F + "#qeChatHubFab," + F + "#qeAiFab," + F + ".qe89-mascot-restore";
  var PSEUDO = F + "#qeChatHubFab::before," + F + "#qeChatHubFab::after," + F + "#qeAiFab::before," + F + "#qeAiFab::after," + F + ".qe89-mascot-restore::before," + F + ".qe89-mascot-restore::after";
  var CSS = [
    /* ปุ่มมุมขวาบน */
    FABS + "{position:fixed!important;top:" + TOP + "px!important;bottom:auto!important;left:auto!important;width:" + SZ + "px!important;height:" + SZ + "px!important;min-width:0!important;min-height:0!important;margin:0!important;padding:0!important;border-radius:50%!important;display:flex!important;align-items:center!important;justify-content:center!important;transform:none!important;translate:none!important;z-index:10040!important;overflow:visible!important;font-size:0!important;line-height:0!important;color:transparent!important;text-indent:0!important;letter-spacing:0!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;border:1px solid rgba(148,163,184,.30)!important;background:linear-gradient(150deg,#1e293b 0%,#0b1220 100%)!important;box-shadow:0 6px 16px rgba(15,23,42,.28),inset 0 1px 0 rgba(255,255,255,.10)!important;cursor:pointer;transition:transform .15s ease,box-shadow .15s ease,border-color .15s ease!important;animation:none!important}",
    PSEUDO + "{content:none!important;display:none!important}",
    F + "#qeChatHubFab:hover," + F + "#qeAiFab:hover," + F + ".qe89-mascot-restore:hover{transform:translateY(-1px)!important;border-color:rgba(165,180,252,.75)!important;box-shadow:0 10px 22px rgba(15,23,42,.34),0 0 0 3px rgba(129,140,248,.18)!important}",
    F + "#qeChatHubFab{right:" + EDGE_R + "px!important}",
    F + "#qeAiFab{right:" + (EDGE_R + SZ + GAP) + "px!important}",
    F + ".qe89-mascot-restore{right:" + (EDGE_R + 2 * (SZ + GAP)) + "px!important}",
    F + "#qeChatHubFab>:not(.fx-ic):not(#qeChatHubBadge)," + F + "#qeAiFab>:not(.fx-ic)," + F + ".qe89-mascot-restore>:not(.fx-ic){display:none!important}",
    ".fx-ic{display:flex;align-items:center;justify-content:center;width:20px;height:20px;pointer-events:none;-webkit-text-fill-color:initial}.fx-ic svg{display:block;width:20px;height:20px}",
    F + "#qeChatHubBadge{position:absolute!important;top:-4px!important;right:-4px!important;left:auto!important;bottom:auto!important;min-width:17px!important;height:17px!important;padding:0 4px!important;margin:0!important;border-radius:9px!important;background:#ef4444!important;color:#fff!important;-webkit-text-fill-color:#fff!important;font:800 10px/15px system-ui,'Segoe UI',sans-serif!important;text-align:center!important;border:1px solid #fff!important;box-sizing:border-box!important;box-shadow:0 2px 6px rgba(239,68,68,.45)!important}",
    F + "#qeChatHubBadge:not(.on){display:none!important}",
    F + "#qeChatHubFab[hidden]," + F + "#qeAiFab[hidden]," + F + ".qe89-mascot-restore[hidden],body.qe-chat-open.qe-fab-top .qe89-mascot-restore{display:none!important}",
    F + "#qeChatHubFab:focus-visible," + F + "#qeAiFab:focus-visible," + F + ".qe89-mascot-restore:focus-visible{outline:3px solid #f59e0b!important;outline-offset:2px!important}",
    F + "#qeChatPanel," + F + "#qeTeamsPanel{top:" + (TOP + SZ + 10) + "px!important;bottom:auto!important;right:" + EDGE_R + "px!important;max-height:calc(100vh - " + (TOP + SZ + 22) + "px)!important;max-height:calc(100dvh - " + (TOP + SZ + 22) + "px)!important}",
    "@media(min-width:901px){" + F + "#qeMain::before{content:'';display:block;height:18px}}",
    "@media(max-width:640px){" + FABS + "{top:10px!important;width:34px!important;height:34px!important}" + F + "#qeChatHubFab{right:10px!important}" + F + "#qeAiFab{right:52px!important}" + F + ".qe89-mascot-restore{right:94px!important}" + F + "#qeChatPanel," + F + "#qeTeamsPanel{top:54px!important;right:8px!important;left:8px!important;max-height:calc(100dvh - 62px)!important}}",
    "@media print{" + FABS + ",.fx-tip{display:none!important}}",
    /* ความกว้างเนื้อหา: ระยะซ้าย = ขวา */
    F + "#viewToday.tx-on{padding-right:0!important}",
    "body.qe-fit #qeMain>[id^=view]{box-sizing:border-box!important;width:var(--fx-w)!important;max-width:var(--fx-w)!important;margin-right:0!important}",
    /* น้องดุ๊กดิ๊ก: ซ่อนกล่องเดิมจากสายตา (ยังอ่านได้ด้วยโปรแกรมอ่านหน้าจอ) */
    "#qe89Mascot .qe89-mascot-bubble{position:absolute!important;width:1px!important;height:1px!important;min-width:0!important;max-width:none!important;margin:0!important;padding:0!important;border:0!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;clip-path:inset(50%)!important;opacity:0!important;white-space:nowrap!important}",
    ".fx-tip{position:fixed;z-index:10055;max-width:min(260px,calc(100vw - 24px));padding:9px 13px;border:1px solid #c7d2fe;border-radius:14px;background:#fff;color:#312e81;font:700 13px/1.45 system-ui,'Segoe UI',Tahoma,sans-serif;box-shadow:0 12px 30px rgba(49,46,129,.22);pointer-events:none;opacity:0;transform:translateY(-3px);transition:opacity .16s ease,transform .16s ease;visibility:hidden}",
    ".fx-tip.on{opacity:1;transform:none;visibility:visible}",
    ".fx-tip .qe89-mascot-name{display:block;margin-top:3px;color:#6366f1;font-size:11px;font-weight:700}",
    "body.neo:not(.holo) .fx-tip{background:#15203d;color:#f1f5f9;border-color:#4f5d8a}body.neo:not(.holo) .fx-tip .qe89-mascot-name{color:#c7d2fe}",
    "@media(prefers-reduced-motion:reduce){.fx-tip{transition:none}}",
    /* ===== QE AI Assistant ===== */
    "#qeAiOv{--ai-bg:#fff;--ai-soft:#f5f6fa;--ai-line:#e3e6ee;--ai-ink:#0f172a;--ai-mut:#64748b;--ai-acc:#4f46e5;--ai-acc2:#eef0ff;z-index:10060!important;background:rgba(15,23,42,.42)!important;-webkit-backdrop-filter:blur(5px);backdrop-filter:blur(5px)}",
    "body.neo:not(.holo) #qeAiOv{--ai-bg:#0f172a;--ai-soft:#152139;--ai-line:#26344f;--ai-ink:#e5e9f2;--ai-mut:#9aa7bd;--ai-acc:#818cf8;--ai-acc2:#1e2a4a}",
    "#qeAiOv .qeai-md{box-sizing:border-box!important;width:min(880px,calc(100vw - 32px))!important;max-width:none!important;height:min(860px,calc(100vh - 40px))!important;height:min(860px,calc(100dvh - 40px))!important;max-height:none!important;display:flex!important;flex-direction:column!important;gap:0!important;padding:0!important;margin:auto!important;border:1px solid var(--ai-line)!important;border-radius:22px!important;background:var(--ai-bg)!important;color:var(--ai-ink)!important;box-shadow:0 30px 80px rgba(15,23,42,.35)!important;overflow:hidden!important;font-family:system-ui,'Segoe UI',Tahoma,sans-serif}",
    "#qeAiOv .qeai-hd{order:0;flex:0 0 auto;display:flex!important;align-items:center!important;gap:6px!important;padding:10px 14px 8px 20px!important;margin:0!important;border-bottom:1px solid var(--ai-line)!important;background:transparent!important}",
    "#qeAiOv .qeai-hd>div:first-child{flex:1 1 auto;min-width:0;display:flex;align-items:center;gap:10px}",
    "#qeAiOv .qeai-hd>div:first-child::before{content:'';flex:0 0 30px;width:30px;height:30px;border-radius:10px;background:" + SPARK_URL + " center/18px no-repeat,linear-gradient(150deg,#1e293b,#0b1220)}",
    "#qeAiTitle{margin:0!important;font-size:16px!important;font-weight:750!important;color:var(--ai-ink)!important;letter-spacing:-.01em}",
    "#qeAiSub{display:none!important}",
    "#qeAiClear,#qeAiClose{flex:0 0 auto;width:36px!important;height:36px!important;min-width:0!important;padding:0!important;margin:0!important;border:0!important;border-radius:10px!important;background:transparent!important;color:var(--ai-mut)!important;font-size:0!important;display:flex!important;align-items:center;justify-content:center;cursor:pointer;box-shadow:none!important}",
    "#qeAiClear:hover,#qeAiClose:hover{background:var(--ai-soft)!important;color:var(--ai-ink)!important}",
    "#qeAiClear .fx-ic,#qeAiClose .fx-ic{width:19px;height:19px}#qeAiClear .fx-ic svg,#qeAiClose .fx-ic svg{width:19px;height:19px}",
    "#qeAiClear>:not(.fx-ic),#qeAiClose>:not(.fx-ic){display:none!important}",
    "#qeAiOv .qeai-mode{order:1;flex:0 0 auto;display:flex!important;flex-wrap:wrap;align-items:center!important;justify-content:center!important;gap:6px!important;padding:8px 16px 0!important;margin:0!important;border:0!important;background:transparent!important}",
    "#qeAiOv .qeai-mode [data-mode]{min-height:30px!important;padding:4px 14px!important;margin:0!important;border:1px solid var(--ai-line)!important;border-radius:999px!important;background:var(--ai-bg)!important;color:var(--ai-mut)!important;font-size:13px!important;font-weight:650!important;box-shadow:none!important;cursor:pointer}",
    "#qeAiOv .qeai-mode [data-mode][aria-checked=true]{background:var(--ai-acc)!important;border-color:var(--ai-acc)!important;color:#fff!important}",
    "#qeAiModeHint{flex-basis:100%;text-align:center;color:var(--ai-mut)!important;font-size:12px!important;margin:2px 0 0!important}",
    "#qeAiLog{order:3;flex:1 1 auto!important;min-height:0!important;height:auto!important;max-height:none!important;overflow-y:auto!important;margin:0!important;padding:16px max(18px,calc((100% - 720px)/2)) 12px!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;display:flex!important;flex-direction:column!important;justify-content:flex-start!important;gap:16px!important;font-size:14.5px;line-height:1.65;color:var(--ai-ink)}",
    "#qeAiLog>*{max-width:100%;box-sizing:border-box;flex:0 0 auto}",
    "#qeAiLog>.fx-u{align-self:flex-end!important;max-width:min(78%,560px)!important;margin:0!important;padding:10px 15px!important;border:0!important;border-radius:18px 18px 5px 18px!important;background:var(--ai-acc2)!important;color:var(--ai-ink)!important;box-shadow:none!important;white-space:pre-wrap}",
    "#qeAiLog>.fx-b{position:relative!important;align-self:stretch!important;margin:0!important;padding:2px 0 2px 42px!important;border:0!important;border-radius:0!important;background:transparent!important;color:var(--ai-ink)!important;box-shadow:none!important}",
    "#qeAiLog>.fx-b::before{content:'';position:absolute;left:0;top:2px;width:30px;height:30px;border-radius:10px;background:" + SPARK_URL + " center/17px no-repeat,linear-gradient(150deg,#1e293b,#0b1220)}",
    "#qeAiLog>.fx-b button{border-radius:8px!important}",
    /* ยังไม่เริ่มคุย: จัดกลางด้วย margin:auto (ล้นแล้วยังเลื่อนอ่านได้ครบ ไม่ถูกตัด) */
    "body.fx-ai-empty #qeAiLog{padding-top:12px!important;padding-bottom:12px!important}",
    "body.fx-ai-empty #qeAiLog>*{align-self:center!important;max-width:600px!important;margin:auto!important;padding:0 8px!important;border:0!important;background:transparent!important;box-shadow:none!important;text-align:center!important;color:var(--ai-mut)!important;font-size:13.5px!important;line-height:1.7!important}",
    "body.fx-ai-empty #qeAiLog>:first-child::before{content:'';display:block;width:42px;height:42px;margin:0 auto 10px;border-radius:13px;background:" + SPARK_URL + " center/23px no-repeat,linear-gradient(150deg,#1e293b,#0b1220);box-shadow:0 8px 20px rgba(79,70,229,.22)}",
    "body.fx-ai-empty #qeAiLog>:first-child>:first-child,body.fx-ai-empty #qeAiLog>:first-child b:first-child,body.fx-ai-empty #qeAiLog>:first-child strong:first-child{display:block;margin-bottom:4px;color:var(--ai-ink)!important;font-size:19px!important;font-weight:750;line-height:1.4}",
    "#qeAiQuick{order:4;flex:0 0 auto;display:flex!important;flex-wrap:nowrap!important;gap:8px!important;overflow-x:auto;padding:4px max(16px,calc((100% - 720px)/2)) 8px!important;margin:0!important;border:0!important;background:transparent!important;scrollbar-width:thin}",
    "#qeAiQuick .qeai-chip{flex:0 0 auto;min-height:32px!important;padding:5px 12px!important;margin:0!important;border:1px solid var(--ai-line)!important;border-radius:999px!important;background:var(--ai-bg)!important;color:var(--ai-ink)!important;font-size:12.5px!important;font-weight:600!important;box-shadow:none!important;cursor:pointer;white-space:nowrap}",
    "#qeAiQuick .qeai-chip:hover{border-color:var(--ai-acc)!important;background:var(--ai-acc2)!important}",
    "body.fx-ai-empty #qeAiQuick{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr));overflow:visible;padding:0 max(16px,calc((100% - 720px)/2)) 10px!important}",
    "body.fx-ai-empty #qeAiQuick .qeai-chip{min-height:40px!important;padding:7px 12px!important;border-radius:12px!important;text-align:left;white-space:normal;font-size:13px!important;line-height:1.3!important}",
    "#qeAiOv .qeai-in{order:5;flex:0 0 auto;position:relative;display:block!important;padding:4px max(16px,calc((100% - 720px)/2)) 6px!important;margin:0!important;border:0!important;background:transparent!important}",
    "#qeAiOv .qeai-label{position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;white-space:nowrap!important}",
    ".fx-composer{position:relative}",
    "#qeAiQuestion{box-sizing:border-box!important;display:block!important;width:100%!important;min-height:52px!important;max-height:200px!important;height:52px;resize:none!important;margin:0!important;padding:14px 58px 14px 18px!important;border:1px solid var(--ai-line)!important;border-radius:20px!important;background:var(--ai-bg)!important;color:var(--ai-ink)!important;font:15px/1.5 system-ui,'Segoe UI',Tahoma,sans-serif!important;box-shadow:0 4px 18px rgba(15,23,42,.08)!important;outline:none!important;overflow-y:auto}",
    "#qeAiQuestion:focus{border-color:var(--ai-acc)!important;box-shadow:0 0 0 3px rgba(99,102,241,.18),0 4px 18px rgba(15,23,42,.08)!important}",
    "#qeAiQuestion::placeholder{color:var(--ai-mut)}",
    "#qeAiRun{position:absolute!important;right:8px!important;bottom:8px!important;width:36px!important;height:36px!important;min-width:0!important;min-height:0!important;padding:0!important;margin:0!important;border:0!important;border-radius:50%!important;background:var(--ai-acc)!important;color:#fff!important;font-size:0!important;display:flex!important;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 12px rgba(79,70,229,.35)!important;animation:none!important}",
    "#qeAiRun>:not(.fx-ic){display:none!important}#qeAiRun .fx-ic svg{width:18px;height:18px}",
    "#qeAiRun:disabled{opacity:.45;cursor:wait}",
    "#qeAiRun:focus-visible{outline:3px solid #f59e0b!important;outline-offset:2px}",
    "#qeAiOv .qeai-bar{display:flex!important;align-items:center!important;gap:10px!important;margin:6px 2px 0!important;padding:0!important}",
    "#qeAiCopy{min-height:28px!important;padding:3px 10px!important;margin:0!important;border:1px solid var(--ai-line)!important;border-radius:999px!important;background:transparent!important;color:var(--ai-mut)!important;font-size:12px!important;font-weight:600!important;box-shadow:none!important;cursor:pointer}",
    "#qeAiCopy:hover{color:var(--ai-ink)!important;border-color:var(--ai-acc)!important}",
    "#qeAiStatus{flex:1 1 auto;color:var(--ai-mut)!important;font-size:12px!important;text-align:right}",
    ".fx-ai-hint{color:var(--ai-mut);font-size:11.5px}",
    "#qeAiNote{order:6;flex:0 0 auto;margin:0!important;padding:4px 20px 10px!important;border:0!important;background:transparent!important;color:var(--ai-mut)!important;font-size:11px!important;line-height:1.45!important;text-align:center!important}",
    "@media(max-width:900px){body.fx-ai-empty #qeAiQuick{grid-template-columns:repeat(2,minmax(0,1fr))}}",
    "@media(max-width:640px){#qeAiOv .qeai-md{width:100vw!important;height:100dvh!important;border-radius:0!important}#qeAiLog>.fx-u{max-width:88%!important}.fx-ai-hint{display:none}}"
  ].join("\n");
  function injectCss() {
    if ($("qe150FloatCss")) return;
    var st = D.createElement("style"); st.id = "qe150FloatCss"; st.textContent = CSS; D.head.appendChild(st);
    D.body.classList.add("qe-fab-top");
  }

  function addIcon(el, svg) {
    if (!el) return false;
    if (!el.querySelector(":scope > .fx-ic")) {
      var s = D.createElement("span"); s.className = "fx-ic"; s.setAttribute("aria-hidden", "true"); s.innerHTML = svg;
      el.appendChild(s);
    }
    return true;
  }

  /* ---------- 1) ปุ่มมุมขวาบน ---------- */
  function rightOf(i) { return mobile() ? 10 + i * 42 : EDGE_R + i * (SZ + GAP); }
  function pin(el, i) {
    if (!el) return;
    var want = { position: "fixed", top: (mobile() ? 10 : TOP) + "px", bottom: "auto", left: "auto", right: rightOf(i) + "px" };
    Object.keys(want).forEach(function (k) {
      if (el.style.getPropertyValue(k) !== want[k] || el.style.getPropertyPriority(k) !== "important") el.style.setProperty(k, want[k], "important");
    });
  }
  function fabs() { return [$("qeChatHubFab"), $("qeAiFab"), D.querySelector(".qe89-mascot-restore")]; }
  function pinAll() { fabs().forEach(function (el, i) { pin(el, i); }); }
  function decorate() {
    var f = fabs();
    addIcon(f[0], ICON.chat); addIcon(f[1], ICON.ai); addIcon(f[2], ICON.buddy);
    if (f[0] && !f[0].title) f[0].title = "แชต LINE / Teams";
    if (f[1]) { f[1].title = "ผู้ช่วย AI"; if (!f[1].getAttribute("aria-label")) f[1].setAttribute("aria-label", "ผู้ช่วย AI"); }
    if (f[2] && !f[2].title) f[2].title = "แสดง / ซ่อนน้องดุ๊กดิ๊ก";
  }
  function watch(el) {
    if (!el || el.__fx150) return !!el;
    el.__fx150 = true;
    new MutationObserver(function () { pinAll(); decorate(); }).observe(el, { attributes: true, attributeFilter: ["style"], childList: true });
    return true;
  }
  function hookFabs() {
    var f = fabs(), ok = f.map(watch);
    decorate(); pinAll();
    return ok[0] && ok[1] && ok[2];
  }

  /* ---------- 2) ความกว้างเนื้อหา ---------- */
  function sidebarRight() {
    var el = D.querySelector(".qe105-brand");
    while (el && el !== D.body) {
      var cs = getComputedStyle(el);
      if (cs.position === "fixed" || cs.position === "sticky") {
        var r = el.getBoundingClientRect();
        if (r.width > 30 && r.width < window.innerWidth * 0.6 && r.left < 10) return r.right;
      }
      el = el.parentElement;
    }
    return 0;
  }
  function activeView() {
    var vs = D.querySelectorAll("#qeMain > [id^=view]");
    for (var i = 0; i < vs.length; i++) { var r = vs[i].getBoundingClientRect(); if (r.width > 0 && r.height > 0) return vs[i]; }
    return null;
  }
  var pend = false, lastW = "";
  function fitWidth() {
    pend = false;
    try {
      if ((window.innerWidth || 0) <= 900) { if (D.body.classList.contains("qe-fit")) D.body.classList.remove("qe-fit"); return; }
      var v = activeView(), sb = sidebarRight(); if (!v || !sb) return;
      var vw = D.documentElement.clientWidth, left = v.getBoundingClientRect().left, gap = left - sb;
      if (gap < 0 || gap > 200) return;
      var w = Math.floor(vw - gap - left);
      if (w < 400) return;
      var s = w + "px";
      if (s !== lastW) { lastW = s; D.body.style.setProperty("--fx-w", s); }
      if (!D.body.classList.contains("qe-fit")) D.body.classList.add("qe-fit");
    } catch (e) { diag(e); }
  }
  function scheduleFit() { if (pend) return; pend = true; setTimeout(fitWidth, 60); }

  /* ---------- 3) ข้อความน้องดุ๊กดิ๊ก ---------- */
  var tip = null, tipUntil = 0, tipTimer = 0;
  function mascotState() {
    var m = $("qe89Mascot"), b = $("qe89MascotGreeting");
    if (!m || !b) return null;
    var btn = m.querySelector(".qe89-mascot-btn");
    var vis = !m.hidden && !m.classList.contains("dragging") && !m.classList.contains("qe-chat-occluded") &&
      !D.body.classList.contains("qe-chat-open") && getComputedStyle(m).display !== "none";
    return { m: m, b: b, btn: btn, vis: vis, show: m.classList.contains("show") || m.contains(D.activeElement) };
  }
  function placeTip(btn) {
    var r = btn.getBoundingClientRect(), vw = D.documentElement.clientWidth || window.innerWidth, vh = window.innerHeight;
    var w = tip.offsetWidth, h = tip.offsetHeight, x = r.left - 10 - w, y = r.top + 6;
    if (x < 8) x = r.right + 10;
    x = Math.max(8, Math.min(vw - 8 - w, x));
    y = Math.max(8, Math.min(vh - 8 - h, y));
    tip.style.left = Math.round(x) + "px"; tip.style.top = Math.round(y) + "px";
  }
  function syncTip(force) {
    try {
      var s = mascotState(); if (!s || !tip) return;
      var text = (s.b.textContent || "").trim();
      var want = s.vis && text && (s.show || force || Date.now() < tipUntil);
      if (!want) { if (tip.classList.contains("on")) tip.classList.remove("on"); return; }
      if (!tip.classList.contains("on") || force) tipUntil = Math.max(tipUntil, Date.now() + 5000);
      var html = s.b.innerHTML;
      if (tip.__src !== html) {
        tip.__src = html;
        tip.textContent = "";
        Array.prototype.forEach.call(s.b.childNodes, function (n) { tip.appendChild(n.cloneNode(true)); });
      }
      if (s.btn) placeTip(s.btn);
      tip.classList.add("on");
      clearTimeout(tipTimer);
      tipTimer = setTimeout(function () { syncTip(false); }, Math.max(200, tipUntil - Date.now() + 50));
    } catch (e) { diag(e); }
  }
  function hookMascot() {
    var m = $("qe89Mascot"), b = $("qe89MascotGreeting");
    if (!m || !b) return false;
    if (m.__fx150) return true;
    m.__fx150 = true;
    tip = D.createElement("div"); tip.className = "fx-tip"; tip.setAttribute("aria-hidden", "true");
    D.body.appendChild(tip);
    new MutationObserver(function () { syncTip(false); }).observe(m, { attributes: true, attributeFilter: ["class", "style", "hidden"] });
    new MutationObserver(function () { syncTip(false); }).observe(b, { childList: true, subtree: true, characterData: true });
    var down = null;
    m.addEventListener("pointerdown", function (e) { down = { x: e.clientX, y: e.clientY }; tipUntil = 0; if (tip) tip.classList.remove("on"); });
    m.addEventListener("pointerup", function (e) {
      var moved = down && (Math.abs(e.clientX - down.x) > 4 || Math.abs(e.clientY - down.y) > 4);
      down = null;
      setTimeout(function () { syncTip(!moved); }, 60);
    });
    syncTip(false);
    return true;
  }

  /* ---------- 4) QE AI Assistant ---------- */
  function classifyLog() {
    var log = $("qeAiLog"); if (!log) return;
    var kids = Array.prototype.slice.call(log.children);
    var isBot = function (k) { return !!k.querySelector("[data-ai],[data-go]") || /err|bot|assist|ans|\bai\b|\ba\b/i.test(k.className) || /กำลัง(วิเคราะห์|คิด|ตอบ)/.test(k.textContent || ""); };
    var isHello = function (k, i) { return i === 0 && !k.querySelector("[data-ai],[data-go]") && /สวัสดี|ลองถาม/.test(k.textContent || ""); };
    var bots = kids.map(isBot), convo = bots.some(Boolean);
    kids.forEach(function (k, i) {
      var bot = bots[i], hello = isHello(k, i);
      var user = !bot && !hello && (convo || /user|\bu\b|\bq\b|me|you/i.test(k.className));
      if (user) convo = true;
      k.classList.toggle("fx-b", bot);
      k.classList.toggle("fx-u", user);
    });
    var empty = !convo;
    if (D.body.classList.contains("fx-ai-empty") !== empty) D.body.classList.toggle("fx-ai-empty", empty);
    if (empty) log.scrollTop = 0;
  }
  function grow() {
    var q = $("qeAiQuestion"); if (!q) return;
    q.style.height = "52px";
    q.style.height = Math.min(200, Math.max(52, q.scrollHeight + 2)) + "px";
  }
  function hookAi() {
    var ov = $("qeAiOv"), q = $("qeAiQuestion"), run = $("qeAiRun"), log = $("qeAiLog");
    if (!ov || !q || !run || !log) return false;
    if (ov.__fx150) return true;
    ov.__fx150 = true;
    addIcon($("qeAiClose"), ICON.close);
    addIcon($("qeAiClear"), ICON.clear);
    addIcon(run, ICON.send);
    run.setAttribute("aria-label", "ส่งคำถาม (Enter)"); run.title = "ส่ง (Enter)";
    if (q.parentNode && !q.parentNode.classList.contains("fx-composer")) {
      var box = D.createElement("div"); box.className = "fx-composer";
      q.parentNode.insertBefore(box, q);
      box.appendChild(q); box.appendChild(run);
    }
    var bar = ov.querySelector(".qeai-bar");
    if (bar && !bar.querySelector(".fx-ai-hint")) {
      var h = D.createElement("span"); h.className = "fx-ai-hint"; h.textContent = "Enter ส่ง · Shift+Enter ขึ้นบรรทัดใหม่";
      bar.insertBefore(h, bar.firstChild);
    }
    q.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && !e.isComposing && e.keyCode !== 229) {
        e.preventDefault();
        if (!run.disabled) run.click();
      }
    });
    q.addEventListener("input", grow);
    q.addEventListener("focus", function () { setTimeout(grow, 0); });
    run.addEventListener("click", function () { setTimeout(grow, 50); });
    new MutationObserver(function () { classifyLog(); if (!D.body.classList.contains("fx-ai-empty")) log.scrollTop = log.scrollHeight; }).observe(log, { childList: true });
    new MutationObserver(function () { if (ov.classList.contains("on")) { classifyLog(); setTimeout(grow, 40); } }).observe(ov, { attributes: true, attributeFilter: ["class"] });
    classifyLog();
    return true;
  }

  function start() {
    try { injectCss(); } catch (e) { diag(e); }
    var rt = 0;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { pinAll(); scheduleFit(); syncTip(false); }, 150); });
    var ok = function () { var a = hookFabs(), b = hookMascot(), c = hookAi(); return a && b && c; };
    if (!ok()) { var n = 0, t = setInterval(function () { if (ok() || ++n > 80) clearInterval(t); }, 250); }
    Array.prototype.forEach.call(D.querySelectorAll("#qeMain > [id^=view]"), function (v) {
      new MutationObserver(scheduleFit).observe(v, { attributes: true, attributeFilter: ["style"] });
    });
    new MutationObserver(scheduleFit).observe(D.body, { attributes: true, attributeFilter: ["class"] });
    [300, 1200, 3000].forEach(function (ms) { setTimeout(function () { scheduleFit(); decorate(); pinAll(); }, ms); });
    window.QE150FloatUI = Object.freeze({ version: "v150", fit: fitWidth, tip: function () { syncTip(true); } });
  }
  if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", start, { once: true }); else start();
})();
