/* =====================================================================
   QE Tracker — Teams Chat (v3)   แชตสองทางกับ Microsoft Teams (QE ABS Dream team)
   บรรทัดเรียกใช้ (ใส่ไว้ใน index.html แล้ว):
       <script src="teams-chat.js" defer></script>

   v3: แก้ปุ่ม “บันทึก (1) / ยังไม่บันทึก 1 รายการ” ขึ้นเองเมื่อเปิดหน้า
       สาเหตุ: v2 เก็บตำแหน่งข้อความที่อ่านแล้วในคีย์ qe_teams_seen_v1 ซึ่งขึ้นต้นด้วย qe_
               ระบบซิงก์ของ Tracker มองว่าเป็นข้อมูลกลางที่ต้องบันทึกขึ้น Cloud
       แก้: เปลี่ยนเป็นคีย์ ux_teams_seen_v1 (ขึ้นต้น ux_ = เก็บเฉพาะเครื่องนี้ ไม่ซิงก์ ไม่ขึ้นรายการค้างบันทึก)

   ทิศทาง
   • พิมพ์ในหน้าเว็บ  → Edge Function  teams-send-message    → Workflows webhook → แชต Teams
   • พิมพ์ใน Teams    → Power Automate → Gmail → Apps Script → Edge Function teams-receive-message → ตาราง chat_messages → หน้าเว็บ
   • ใช้ตาราง chat_messages เดิม ห้อง (room_key) = teams-qe  — ไม่ยุ่งกับห้อง LINE / PCR / Audit / Meeting
   • ใช้ Supabase URL/key เดียวกับ Line Chat (window.COUNTERMEASURE_CLOUD_DEFAULTS)

   ปรับแต่ง (ไม่บังคับ) ใส่ก่อนโหลดไฟล์นี้:
       window.QE_TEAMS_CHAT_CFG = { chatLabel:'QE ABS Dream team', room:'teams-qe', fnSend:'teams-send-message' };
   ===================================================================== */
(function () {
  'use strict';
  if (window.__QE_TEAMS_CHAT) return;
  window.__QE_TEAMS_CHAT = true;

  var C = {
    room: 'teams-qe', title: 'QE Teams Chat', chatLabel: 'QE ABS Dream team',
    fnSend: 'teams-send-message', pollOpen: 5000, pollIdle: 20000, limit: 100, maxLen: 1000
  };
  var U = window.QE_TEAMS_CHAT_CFG || {};
  Object.keys(U).forEach(function (k) { C[k] = U[k]; });

  var cloud = window.COUNTERMEASURE_CLOUD_DEFAULTS || {};
  var base = String(cloud.supabaseUrl || '').replace(/\/$/, ''), key = String(cloud.supabaseKey || '');

  /* เก็บ id ข้อความล่าสุดที่อ่านแล้ว — คีย์ต้องไม่ขึ้นต้นด้วย qe_ หรือ issue_tracker_ (ไม่งั้นระบบซิงก์จะนับเป็นข้อมูลค้างบันทึก) */
  var SEENK = 'ux_teams_seen_v1';
  var seen = null;                                     // null = ยังไม่เคยตั้ง
  try { var o0 = JSON.parse(localStorage.getItem(SEENK) || '{}') || {}; if (o0[C.room] != null) seen = +o0[C.room] || 0; } catch (e) { seen = null; }
  function saveSeen(v) {
    seen = v;
    try { var o = JSON.parse(localStorage.getItem(SEENK) || '{}') || {}; o[C.room] = v; localStorage.setItem(SEENK, JSON.stringify(o)); } catch (e) {}
  }

  /* ---------- CSS ---------- */
  var css = [
    '.qet-fab{position:fixed;right:12px;bottom:12px;z-index:244;width:46px;height:46px;padding:0;border:0;border-radius:999px;background:linear-gradient(135deg,#6264a7,#464eb8);color:#fff;box-shadow:0 8px 24px rgba(70,78,184,.42);cursor:pointer;display:inline-flex;align-items:center;justify-content:center}',
    '.qet-fab:hover{filter:brightness(1.1)}.qet-fab:focus-visible{outline:3px solid #a5b4fc;outline-offset:2px}',
    '.qet-fab svg{width:24px;height:24px;display:block;pointer-events:none}',
    '.qet-badge{display:none;position:absolute;top:-4px;right:-4px;min-width:20px;height:20px;padding:0 5px;box-sizing:border-box;border-radius:99px;background:#ef4444;color:#fff;font-size:11px;font-weight:800;line-height:20px;text-align:center}',
    '.qet-badge.on{display:block}',
    '.qet-panel{position:fixed;right:18px;bottom:180px;z-index:245;width:min(390px,calc(100vw - 24px));height:min(610px,calc(100vh - 210px));display:none;flex-direction:column;background:var(--pop,#fff);color:var(--txt,#222);border:1px solid var(--line,#ddd);border-radius:18px;box-shadow:0 18px 60px rgba(0,0,0,.35);overflow:hidden}',
    '.qet-panel.on{display:flex}',
    '.qet-head{display:flex;align-items:center;gap:8px;padding:12px 14px;background:linear-gradient(135deg,#6264a7,#464eb8);color:#fff}',
    '.qet-head b{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.qet-who{font-size:11px;opacity:.92;white-space:nowrap}',
    '.qet-dot{width:9px;height:9px;border-radius:50%;background:#94a3b8;flex:0 0 auto}.qet-dot.ok{background:#34d399}.qet-dot.err{background:#f87171}',
    '.qet-close{border:0;background:rgba(255,255,255,.2);color:#fff;border-radius:8px;padding:5px 9px;cursor:pointer}',
    '.qet-close:hover{background:rgba(255,255,255,.32)}',
    '.qet-sub{padding:6px 12px;font-size:11px;color:var(--mut,#667);border-bottom:1px solid var(--line,#ddd);background:var(--soft,#f5f5fb);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.qet-msgs{flex:1;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:8px;background:color-mix(in srgb,var(--soft,#f3f3fa) 70%,var(--card,#fff))}',
    '.qet-empty{text-align:center;color:var(--mut,#667);padding:30px 10px;font-size:13px;line-height:1.6}',
    '.qet-row{display:flex;flex-direction:column;align-items:flex-start}.qet-row.me{align-items:flex-end}',
    '.qet-meta{font-size:10px;color:var(--mut,#667);margin:0 5px 2px;display:flex;gap:6px;align-items:center}',
    '.qet-chip{display:inline-block;padding:0 6px;border-radius:99px;font-size:9.5px;font-weight:800;line-height:15px;background:rgba(98,100,167,.18);color:color-mix(in srgb,#5b5fc7 65%,var(--txt,#222))}',
    '.qet-chip.tm{background:#5b5fc7;color:#fff}',
    '.qet-bubble{max-width:86%;padding:8px 11px;border-radius:14px 14px 14px 4px;background:var(--card,#fff);color:var(--txt,#222);border:1px solid var(--line,#ddd);white-space:pre-wrap;word-break:break-word;font-size:13px;line-height:1.45}',
    '.qet-bubble a{color:inherit;text-decoration:underline}',
    '.qet-row.me .qet-bubble{background:#5b5fc7;color:#fff;border-color:#5b5fc7;border-radius:14px 14px 4px 14px}',
    '.qet-row.pend .qet-bubble{opacity:.6}',
    '.qet-compose{padding:9px;border-top:1px solid var(--line,#ddd);background:var(--card,#fff)}',
    '.qet-crow{display:flex;gap:7px}',
    '.qet-input{flex:1;min-width:0;min-height:40px;max-height:110px;resize:none;border:1px solid var(--line,#ddd);background:var(--inp,#fff);color:var(--txt,#222);border-radius:12px;padding:9px;font:inherit;font-size:13px}',
    '.qet-input:focus{outline:none;border-color:#5b5fc7;box-shadow:0 0 0 3px rgba(91,95,199,.25)}',
    '.qet-send{border:0;border-radius:12px;background:#5b5fc7;color:#fff;padding:8px 14px;font-weight:800;cursor:pointer}',
    '.qet-send:hover{background:#4f52b2}.qet-send:disabled{opacity:.5;cursor:default}',
    '.qet-status{font-size:10.5px;color:var(--mut,#667);margin-top:5px;min-height:14px}.qet-status.err{color:#dc2626;font-weight:700}',
    '@media(max-width:600px){.qet-panel{right:6px;bottom:168px;width:calc(100vw - 12px);height:min(620px,calc(100vh - 180px));border-radius:14px}}',
    '@media print{.qet-fab,.qet-panel{display:none!important}}'
  ].join('\n');
  var st = document.createElement('style');
  st.id = 'qeTeamsCss';
  st.textContent = css;
  document.head.appendChild(st);

  /* ---------- DOM ---------- */
  var fab = document.createElement('button');
  fab.type = 'button'; fab.id = 'qeTeamsFab'; fab.className = 'qet-fab';
  fab.setAttribute('aria-label', 'เปิด/ปิดแชต Teams'); fab.title = C.title;
  fab.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 3.5h16a2.5 2.5 0 0 1 2.5 2.5v9a2.5 2.5 0 0 1-2.5 2.5h-8.2l-4.3 3.4c-.6.5-1.5.1-1.5-.7v-2.7H4A2.5 2.5 0 0 1 1.5 15V6A2.5 2.5 0 0 1 4 3.5z" fill="#fff"/><path d="M8.2 8.4h7.6M12 8.4v6.2" fill="none" stroke="#5b5fc7" stroke-width="2.2" stroke-linecap="round"/></svg><span id="qeTeamsBadge" class="qet-badge" aria-hidden="true">0</span>';
  document.body.appendChild(fab);

  var panel = document.createElement('section');
  panel.id = 'qeTeamsPanel'; panel.className = 'qet-panel';
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', C.title);
  panel.innerHTML =
    '<div class="qet-head"><b></b><span class="qet-dot" id="qetDot"></span><span class="qet-who" id="qetWho"></span>' +
    '<button type="button" class="qet-close" id="qetClose" aria-label="ปิดหน้าต่างแชต">✕</button></div>' +
    '<div class="qet-sub" id="qetSub"></div>' +
    '<div class="qet-msgs" id="qetMsgs" role="log" aria-live="polite" aria-label="ข้อความแชต Teams" tabindex="0"><div class="qet-empty">กำลังโหลดข้อความ…</div></div>' +
    '<div class="qet-compose"><div class="qet-crow"><textarea id="qetInput" class="qet-input" maxlength="' + C.maxLen + '" aria-label="พิมพ์ข้อความ" placeholder="พิมพ์ข้อความถึงทีมใน Teams…  (Enter ส่ง · Shift+Enter ขึ้นบรรทัดใหม่)"></textarea>' +
    '<button type="button" id="qetSend" class="qet-send">ส่ง</button></div><div id="qetStatus" class="qet-status" aria-live="polite"></div></div>';
  document.body.appendChild(panel);
  panel.querySelector('.qet-head b').textContent = '💬 ' + C.title;
  panel.querySelector('#qetSub').textContent = 'เชื่อมกับแชต Teams: ' + C.chatLabel;

  var $ = function (id) { return document.getElementById(id); };
  var elMsgs = $('qetMsgs'), elInput = $('qetInput'), elSend = $('qetSend'), elStatus = $('qetStatus'), elDot = $('qetDot'), elBadge = $('qeTeamsBadge');

  /* ---------- ตัวช่วย ---------- */
  function E(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function me() {
    try {
      var n = (localStorage.getItem('ux_me') || (document.getElementById('cbWn') || {}).textContent || '').trim();
      return n || 'Guest';
    } catch (e) { return 'Guest'; }
  }
  function stamp(v) { try { return new Intl.DateTimeFormat('th-TH', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }).format(new Date(v)); } catch (e) { return ''; } }
  function linkify(escaped) {
    return escaped.replace(/(https?:\/\/[^\s<]+)/g, function (u) {
      var tail = '', m = /[.,;:!?)\]]+$/.exec(u); if (m) { tail = m[0]; u = u.slice(0, -tail.length); }
      return '<a href="' + u + '" target="_blank" rel="noopener noreferrer">' + u + '</a>' + tail;
    });
  }
  function setStatus(t, err) { elStatus.textContent = t || ''; elStatus.classList.toggle('err', !!err); }
  function setDot(cls) { elDot.className = 'qet-dot' + (cls ? ' ' + cls : ''); }
  var hdr = function () { return { apikey: key, Authorization: 'Bearer ' + key }; };
  var isOpen = function () { return panel.classList.contains('on'); };

  /* ---------- ตำแหน่งปุ่ม: คอลัมน์เดียวกับปุ่ม Line Chat / AI วางไว้ "บนสุด" (Teams → LINE → AI จากบนลงล่าง)
       และดันหน้าต่างแชต + ปุ่มกลับขึ้นบน ให้อยู่เหนือปุ่ม Teams เพื่อไม่ให้บังกัน ---------- */
  var posCss = document.createElement('style');
  posCss.id = 'qeTeamsPosCss';
  document.head.appendChild(posCss);
  var lastPos = '';
  function place() {
    try {
      var de = document.documentElement, cw = de.clientWidth || window.innerWidth, ch = de.clientHeight || window.innerHeight, ref = null;
      [document.querySelector('.qeai-fab'), document.getElementById('qeChatFab')].forEach(function (el) {
        if (!el || !el.offsetWidth) return;
        var r = el.getBoundingClientRect();
        if (r.width && (!ref || r.top < ref.top)) ref = r;            // ปุ่มที่อยู่สูงสุดในคอลัมน์
      });
      if (!ref) return;
      var fr = fab.getBoundingClientRect(), z = (fab.offsetWidth && fr.width) ? fr.width / fab.offsetWidth : 1;   // รองรับ zoom ของหน้า
      if (!(z > 0.2 && z < 5)) z = 1;
      var size = fab.offsetHeight || 46;
      var right = Math.max(4, Math.round((cw - ref.right) / z));
      var bottom = Math.max(6, Math.round((ch - ref.top + 8) / z));   // ขอบล่างของ Teams อยู่เหนือปุ่มบนสุด 8px
      var panelBottom = bottom + size + 8;
      fab.style.right = right + 'px';
      fab.style.bottom = bottom + 'px';
      var sig = right + '|' + bottom;
      if (sig === lastPos) return;
      lastPos = sig;
      posCss.textContent =
        'html body .qet-panel{bottom:' + panelBottom + 'px!important;right:' + right + 'px!important;height:min(610px,calc(100vh - ' + (panelBottom + 30) + 'px))!important}' +
        'html body .qec-panel{bottom:' + panelBottom + 'px!important;height:min(610px,calc(100vh - ' + (panelBottom + 30) + 'px))!important}' +
        'html body .ux33-top{bottom:' + panelBottom + 'px!important}';
    } catch (e) {}
  }
  var plT = 0;
  function placeSoon() { if (plT) return; plT = setTimeout(function () { plT = 0; place(); }, 120); }
  window.addEventListener('resize', placeSoon);
  setInterval(place, 2000);
  setTimeout(place, 300);

  /* ---------- วาดข้อความ ---------- */
  var data = [], pending = [], lastSig = '';
  function row(m) {
    var mine = m.sender_name === me(), src = m.source === 'teams' ? 'Teams' : (m.source === 'line' ? 'LINE' : 'Tracker');
    return '<div class="qet-row' + (mine ? ' me' : '') + (m.pending ? ' pend' : '') + '"><div class="qet-meta"><span>' + E(m.sender_name) + '</span><span>' + E(m.pending ? 'กำลังส่ง…' : stamp(m.created_at)) + '</span>' +
      '<span class="qet-chip' + (m.source === 'teams' ? ' tm' : '') + '">' + src + '</span></div><div class="qet-bubble">' + linkify(E(m.message)) + '</div></div>';
  }
  function draw(force) {
    var all = data.concat(pending);
    var sig = all.map(function (m) { return (m.id || '') + ':' + (m.pending ? 'p' : '') + ':' + (m.message || '').length; }).join('|') + '#' + me();
    if (!force && sig === lastSig) return;
    lastSig = sig;
    var nearBottom = elMsgs.scrollHeight - elMsgs.scrollTop - elMsgs.clientHeight < 80, first = !elMsgs.dataset.drawn;
    if (!all.length) {
      elMsgs.innerHTML = '<div class="qet-empty">ยังไม่มีข้อความ<br>พิมพ์ข้อความด้านล่าง ระบบจะส่งเข้าแชต Teams <b></b> ให้</div>';
      elMsgs.querySelector('b').textContent = C.chatLabel;
    } else {
      elMsgs.innerHTML = all.map(row).join('');
    }
    elMsgs.dataset.drawn = '1';
    if (first || nearBottom || pending.length) elMsgs.scrollTop = elMsgs.scrollHeight;
  }
  function setBadge(n) { elBadge.textContent = n > 99 ? '99+' : String(n); elBadge.classList.toggle('on', n > 0); fab.title = C.title + (n ? ' — ข้อความใหม่ ' + n : ''); }

  /* ---------- โหลดข้อความ (ล่าสุดก่อน แล้วกลับลำดับ — ไม่ติดเพดาน 100 ข้อความแรก) ---------- */
  var busy = false;
  async function load(silent) {
    if (!base || !key) { setStatus('ไม่พบการตั้งค่า Supabase', true); setDot('err'); draw(true); return; }
    if (busy) return; busy = true;
    try {
      var url = base + '/rest/v1/chat_messages?select=id,sender_name,message,created_at,source&room_key=eq.' + encodeURIComponent(C.room) +
        '&deleted_at=is.null&order=created_at.desc&limit=' + C.limit;
      var res = await fetch(url, { headers: hdr() });
      var j = await res.json().catch(function () { return null; });
      if (!res.ok || !Array.isArray(j)) throw new Error((j && (j.message || j.error)) || ('HTTP ' + res.status));
      data = j.reverse();
      var latest = 0; data.forEach(function (m) { var n = Number(m.id) || 0; if (n > latest) latest = n; });
      if (seen == null) saveSeen(latest);                                  // ครั้งแรก: ไม่นับข้อความเก่าเป็น “ใหม่”
      if (isOpen()) { if (latest > seen) saveSeen(latest); setBadge(0); }
      else { var who = me(), n2 = 0; data.forEach(function (m) { if ((Number(m.id) || 0) > seen && m.sender_name !== who) n2++; }); setBadge(n2); }
      draw(false); setDot('ok');
      if (!silent) setStatus('เชื่อมต่อแล้ว · ' + data.length + ' ข้อความ');
    } catch (e) {
      setDot('err'); setStatus('โหลดข้อความไม่สำเร็จ: ' + (e.message || e), true);
      if (!elMsgs.dataset.drawn) { elMsgs.innerHTML = '<div class="qet-empty">โหลดข้อความไม่สำเร็จ</div>'; }
    } finally { busy = false; }
  }

  /* ---------- ส่งข้อความ ---------- */
  var sending = false;
  function errText(status, j, e) {
    if (e) return 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ — ตรวจอินเทอร์เน็ตแล้วลองใหม่';
    if (j && j.error) return j.error;
    if (status === 404) return 'ยังไม่ได้ติดตั้งฟังก์ชัน ' + C.fnSend + ' ใน Supabase';
    if (status === 401 || status === 403) return 'Supabase ปฏิเสธคำขอ — ตรวจว่าปิด Verify JWT ของฟังก์ชัน ' + C.fnSend + ' แล้ว';
    if (status === 429) return 'ส่งถี่เกินไป รอสักครู่แล้วลองใหม่';
    return 'ส่งไม่สำเร็จ (HTTP ' + status + ')';
  }
  async function send() {
    if (sending) return;
    var text = elInput.value.trim(), name = me();
    if (!text) return;
    if (name === 'Guest') { setStatus('กรุณา Login ชื่อผู้ใช้ก่อนส่งข้อความ', true); return; }
    if (!base || !key) { setStatus('ไม่พบการตั้งค่า Supabase', true); return; }
    sending = true; elSend.disabled = true; setStatus('กำลังส่งเข้า Teams…');
    var tmp = { id: 'p' + Date.now(), sender_name: name, message: text, created_at: new Date().toISOString(), source: 'tracker', pending: true };
    pending.push(tmp); draw(true);
    var status = 0, j = null, netErr = null;
    try {
      var res = await fetch(base + '/functions/v1/' + C.fnSend, {
        method: 'POST',
        headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_key: C.room, sender_id: name, sender_name: name, message: text })
      });
      status = res.status; j = await res.json().catch(function () { return null; });
      if (!res.ok || (j && j.ok === false)) throw new Error('x');
      elInput.value = '';
      pending = pending.filter(function (p) { return p !== tmp; });
      await load(true);
      setStatus(j && j.saved === false ? 'ส่งเข้า Teams แล้ว (แต่บันทึกประวัติในแชตไม่สำเร็จ)' : 'ส่งเข้า Teams แล้ว ✓');
    } catch (e) {
      if (!status) netErr = e;
      pending = pending.filter(function (p) { return p !== tmp; });
      draw(true);
      setStatus('⚠ ' + errText(status, j, netErr), true);   // ข้อความยังอยู่ในช่องพิมพ์ กดส่งซ้ำได้
    } finally { sending = false; elSend.disabled = false; elInput.focus(); }
  }

  /* ---------- เปิด/ปิด ---------- */
  var timer = 0;
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(function () { if (!document.hidden) load(true); schedule(); }, isOpen() ? C.pollOpen : C.pollIdle);
  }
  function open() {
    var line = document.getElementById('qeChatPanel'); if (line && line.classList) line.classList.remove('on');   // ปิดแชต LINE ถ้าเปิดอยู่
    panel.classList.add('on'); $('qetWho').textContent = 'ผู้ใช้: ' + me();
    var latest = 0; data.forEach(function (m) { var n = Number(m.id) || 0; if (n > latest) latest = n; });
    if (seen != null && latest > seen) saveSeen(latest);
    setBadge(0); draw(true); load(false); schedule();
    setTimeout(function () { elInput.focus(); elMsgs.scrollTop = elMsgs.scrollHeight; }, 30);
  }
  function close() { panel.classList.remove('on'); schedule(); }
  fab.addEventListener('click', function () { isOpen() ? close() : open(); });
  $('qetClose').addEventListener('click', close);
  elSend.addEventListener('click', send);
  elInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); }   // isComposing: พิมพ์ไทย/ญี่ปุ่นด้วย IME ไม่ส่งกลางคัน
  });
  panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') { close(); fab.focus(); } });
  document.addEventListener('click', function (e) {                       // กดปุ่ม Line Chat → ปิดแชต Teams
    var t = e.target && e.target.closest ? e.target.closest('#qeChatFab') : null;
    if (t && isOpen()) close();
  }, true);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) load(true); });

  setTimeout(function () { load(true); schedule(); }, 1200);
  window.QE_TEAMS_CHAT = { open: open, close: close, reload: function () { return load(false); } };
})();
