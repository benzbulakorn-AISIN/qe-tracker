/* =====================================================================
   QE Tracker — Space Theme + น้องดุ๊กดิ๊ก (v5)
   ใส่บรรทัดเดียวก่อน </body> ของ index.html (ใส่ไว้แล้ว):
       <script src="space-theme.js" defer></script>
   v5 เพิ่ม:
   • น้องพูดขึ้นมาเอง “โดยไม่ต้องกด” แล้วฟองหายไปเองภายในไม่กี่วินาที
       - ฟองพูดสั้น = ข้อความล้วน ไม่มีปุ่ม ไม่ขวางการคลิก (pointer-events:none)
       - ครั้งแรกประมาณ 4 วินาทีหลังเปิดหน้า แล้วสุ่มทุก 2–4 นาที (ปรับได้ที่ window.QE_SPACE_CFG)
       - ไม่พูดตอนกำลังพิมพ์ / มีหน้าต่างเปิดอยู่ (login, popup) / แท็บถูกซ่อน / กำลังลากน้อง / เมนูน้องเปิดอยู่
       - ปุ่มใหม่ในเมนูน้อง: 💬 ปิด/เปิดคำพูดเอง  (จำค่าไว้ในเครื่อง)
   • คลิกที่น้อง = เปิดเมนูเต็ม (ธีม / ดาว-จรวด / ตำแหน่ง / ซ่อนน้อง) เหมือนเดิม
   v4: ธีมสว่างมีดาว+จรวด · v3: ตัวอักษรอ่านง่ายบนธีมมืด, ลากน้องได้ + จำตำแหน่ง
   • ไม่แตะข้อมูลงาน/Checklist/ประชุม และไม่ซิงก์ Cloud (เก็บแค่ค่าในเครื่องนี้: ux_space_*)
   • ปิดแอนิเมชันอัตโนมัติถ้าเครื่องตั้ง “ลดการเคลื่อนไหว” · ซ่อนตอนพิมพ์ (Print)

   ปรับแต่ง (ไม่บังคับ) ใส่ก่อนโหลดไฟล์นี้:
       window.QE_SPACE_CFG = { firstMs:4000, minMs:120000, maxMs:240000, showMs:6500 };
   ===================================================================== */
(function () {
  'use strict';
  if (window.__QE_SPACE) return;
  window.__QE_SPACE = true;

  var K_THEME = 'ux_space_theme', K_PET = 'ux_space_pet', K_POS = 'ux_space_pet_pos', K_FX = 'ux_space_fx', K_TALK = 'ux_space_talk';
  var ls = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  var themeOn = ls.get(K_THEME) !== 'off';   // true = ธีมอวกาศ (มืด) · false = ธีมสว่างเดิมของระบบ
  var petOn = ls.get(K_PET) !== 'off';
  var fxOn = ls.get(K_FX) !== 'off';         // ดาว + จรวด
  var talkOn = ls.get(K_TALK) !== 'off';     // น้องพูดเอง
  var PW = 66, PH = 80;                        // ขนาดน้อง (px)

  var UC = window.QE_SPACE_CFG || {};
  var CFG = {
    firstMs: +UC.firstMs || 4000,
    minMs: +UC.minMs || 120000,
    maxMs: +UC.maxMs || 240000,
    showMs: +UC.showMs || 6500,
    retryMs: +UC.retryMs || 20000
  };
  if (CFG.maxMs < CFG.minMs) CFG.maxMs = CFG.minMs;

  /* ---------- CSS ---------- */
  var css = [
    /* ธีมมืด: พื้นโปร่งเพื่อให้เห็นดาว + ตัวแปรสีที่อ่านง่ายบนพื้นมืด */
    'html.qe-space{background:#070b1f!important;background-image:none!important;color-scheme:dark}',
    'html.qe-space body{background:transparent!important;background-image:none!important;--card:rgba(13,19,44,.86)!important;--mut:#b4c0e0!important;--txt:#eef1ff!important}',
    'html.qe-space ::placeholder{color:#9aa6cf!important;opacity:1}',

    /* ฉากหลัง (อยู่หลังเนื้อหา) */
    '#qeSpaceBg{position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden;display:none;',
    'background:radial-gradient(60% 50% at 14% 8%,rgba(124,58,237,.36),transparent 70%),radial-gradient(50% 45% at 92% 88%,rgba(14,165,233,.26),transparent 70%),radial-gradient(40% 40% at 72% 14%,rgba(236,72,153,.18),transparent 70%),linear-gradient(180deg,#070b1f 0%,#0d1233 55%,#150f3a 100%)}',
    'html.qe-space #qeSpaceBg{display:block}',
    /* ธีมสว่าง: ไม่มีพื้นมืด/ดาวเล็ก/ดาวเคราะห์ — เหลือเฉพาะดวงดาวสีสด (หลังเนื้อหา) */
    'html:not(.qe-space) #qeSpaceBg{display:block;background:none}',
    'html:not(.qe-space) #qeSpaceBg .qs-s,html:not(.qe-space) #qeSpaceBg .qs-pl,html:not(.qe-space) #qeSpaceBg .qs-sh,html:not(.qe-space) #qeSpaceBg .qs-rk{display:none}',
    '#qeSpaceBg .qs-s{position:absolute;left:0;top:0;border-radius:50%;background:transparent}',
    '#qeSpaceBg .s1{width:1px;height:1px;opacity:.75}',
    '#qeSpaceBg .s2{width:2px;height:2px;animation:qsTw 5s ease-in-out infinite alternate}',
    '#qeSpaceBg .s3{width:3px;height:3px;animation:qsTw 7s ease-in-out -2s infinite alternate}',
    '@keyframes qsTw{0%{opacity:.25}100%{opacity:1}}',
    '#qeSpaceBg .qs-pl{position:absolute;border-radius:50%;opacity:.55;animation:qsFl 16s ease-in-out infinite alternate}',
    '#qeSpaceBg .p1{width:150px;height:150px;right:-46px;top:16%;background:radial-gradient(circle at 30% 28%,#fcd9a0,#f59e0b 48%,#9a3412 100%);box-shadow:inset -14px -10px 26px rgba(0,0,0,.45),0 0 40px rgba(251,191,36,.18)}',
    '#qeSpaceBg .p1::after{content:"";position:absolute;left:-34%;top:40%;width:168%;height:20%;border:3px solid rgba(254,243,199,.55);border-radius:50%;transform:rotate(-18deg)}',
    '#qeSpaceBg .p2{width:84px;height:84px;left:-26px;bottom:24%;background:radial-gradient(circle at 32% 30%,#e0e7ff,#818cf8 55%,#312e81 100%);box-shadow:inset -8px -6px 16px rgba(0,0,0,.45);animation-duration:19s;animation-delay:-6s}',
    '@keyframes qsFl{0%{transform:translateY(-8px)}100%{transform:translateY(10px)}}',
    '#qeSpaceBg .qs-sh{position:absolute;right:22%;top:-4%;width:110px;height:2px;background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.95));opacity:0;transform:rotate(35deg);animation:qsSh 31s linear 6s infinite}',
    '@keyframes qsSh{0%{opacity:0;transform:translate(0,0) rotate(35deg)}1.2%{opacity:1}5%{opacity:0;transform:translate(-380px,300px) rotate(35deg)}100%{opacity:0;transform:translate(-380px,300px) rotate(35deg)}}',

    /* ดวงดาวหลากสี + ประกาย (ใช้ทั้งหลังเนื้อหา และชั้นหน้าของธีมสว่าง) — สีเข้มขึ้นอัตโนมัติบนพื้นสว่าง */
    '.qs-bs{position:absolute;display:block;opacity:.85;filter:drop-shadow(0 0 5px currentColor);animation:qsTw 4.5s ease-in-out infinite alternate,qsDr 14s ease-in-out infinite alternate}',
    '.qs-bs.five{clip-path:polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)}',
    '.qs-bs.four{clip-path:polygon(50% 0%,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0% 50%,38% 38%)}',
    '.qs-bs.c0{background:#fde047;color:#fde047}.qs-bs.c1{background:#f9a8d4;color:#f9a8d4}.qs-bs.c2{background:#67e8f9;color:#67e8f9}.qs-bs.c3{background:#c4b5fd;color:#c4b5fd}.qs-bs.c4{background:#fdba74;color:#fdba74}',
    'html:not(.qe-space) .qs-bs.c0{background:#f59e0b;color:#f59e0b}html:not(.qe-space) .qs-bs.c1{background:#ec4899;color:#ec4899}html:not(.qe-space) .qs-bs.c2{background:#06b6d4;color:#06b6d4}html:not(.qe-space) .qs-bs.c3{background:#8b5cf6;color:#8b5cf6}html:not(.qe-space) .qs-bs.c4{background:#f97316;color:#f97316}',
    '@keyframes qsDr{0%{transform:translateY(-4px) rotate(-8deg)}100%{transform:translateY(5px) rotate(10deg)}}',

    /* จรวดบินผ่าน (ตำแหน่ง/ทิศ/มุม ตั้งค่าด้วย JS ผ่านตัวแปร --x0 --y0 --x1 --y1 --a) */
    '.qs-rk{position:absolute;left:0;top:0;width:34px;opacity:0;will-change:transform}',
    '.qs-rk svg{display:block;width:100%;height:auto;overflow:visible}',
    '.qs-fl{transform-box:fill-box;transform-origin:50% 0;animation:qsFlame .18s ease-in-out infinite alternate}',
    '@keyframes qsFlame{0%{transform:scaleY(.8)}100%{transform:scaleY(1.25)}}',
    '@keyframes qsRkV{0%{opacity:0;transform:translate(var(--x0),var(--y0)) rotate(var(--a))}1%{opacity:.95}15%{opacity:.95}17%,100%{opacity:0;transform:translate(var(--x1),var(--y1)) rotate(var(--a))}}',
    /* ชั้นหน้า (ธีมสว่างเท่านั้น): ดาวที่ขอบจอ + จรวดบินทับหน้าจอ แต่กดทะลุได้ */
    '#qeSkyFx{position:fixed;inset:0;z-index:30;pointer-events:none;overflow:hidden;display:none}',
    'html:not(.qe-space) #qeSkyFx{display:block}',
    '#qeSkyFx .qs-bs{opacity:.7}',
    '#qeSkyFx .qs-rk{width:30px}#qeSkyFx .qs-rk.r2{width:24px}#qeSkyFx .qs-rk.r3{width:20px}',
    '#qeSkyFx .qs-rk svg{filter:drop-shadow(0 0 1px #6366f1) drop-shadow(0 3px 5px rgba(79,70,229,.38))}',
    '#qeSpaceBg .qs-rk.r2{width:26px}',
    'html.qs-nofx #qeSpaceBg .qs-bs,html.qs-nofx #qeSpaceBg .qs-rk,html.qs-nofx #qeSkyFx{display:none!important}',

    /* น้องดุ๊กดิ๊ก (ลากได้) — z-index สูงกว่าปุ่ม LINE/AI (244-245) */
    '#qeSpacePet{position:fixed;right:76px;bottom:16px;z-index:246;width:' + PW + 'px;pointer-events:none;font-family:inherit}',
    '#qeSpacePet .qs-btn{pointer-events:auto;display:block;width:' + PW + 'px;height:' + PH + 'px;padding:0;margin:0;border:0;background:transparent;cursor:grab;border-radius:16px;touch-action:none;-webkit-user-select:none;user-select:none;filter:drop-shadow(0 4px 8px rgba(0,0,0,.35))}',
    '#qeSpacePet.drag .qs-btn{cursor:grabbing;filter:drop-shadow(0 10px 14px rgba(0,0,0,.5))}',
    '#qeSpacePet .qs-btn:focus-visible{outline:3px solid #a5b4fc;outline-offset:2px}',
    '#qeSpacePet svg{width:100%;height:100%;overflow:visible;pointer-events:none}',
    '#qeSpacePet.drag .qs-bob{animation-duration:.45s}',
    '#qeSpacePet .qs-bob{transform-box:fill-box;transform-origin:50% 100%;animation:qsBob 1.15s ease-in-out infinite alternate}',
    '@keyframes qsBob{0%{transform:translateY(0) rotate(-3deg) scale(1.02,.98)}100%{transform:translateY(-5px) rotate(3deg) scale(.98,1.02)}}',
    '#qeSpacePet .qs-arm{transform-box:fill-box;transform-origin:20% 15%;animation:qsWave 1.9s ease-in-out infinite}',
    '@keyframes qsWave{0%,60%,100%{transform:rotate(0)}70%{transform:rotate(-28deg)}80%{transform:rotate(8deg)}90%{transform:rotate(-22deg)}}',
    '#qeSpacePet .qs-eye{transform-box:fill-box;transform-origin:50% 50%;animation:qsBl 4.6s infinite}',
    '@keyframes qsBl{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}',
    '#qeSpacePet .qs-star{transform-box:fill-box;transform-origin:50% 50%;animation:qsSp 2.4s ease-in-out infinite alternate}',
    '@keyframes qsSp{0%{transform:scale(.85) rotate(-10deg)}100%{transform:scale(1.15) rotate(10deg)}}',
    '#qeSpacePet .qs-cheek{animation:qsCk 2.6s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:50% 50%}',
    '@keyframes qsCk{0%{opacity:.55}100%{opacity:.95}}',
    '#qeSpacePet .qs-lau{position:absolute;left:50%;bottom:54px;width:22px;margin-left:-11px;pointer-events:none;opacity:0;animation:qsLau 1.5s ease-in forwards}',
    '#qeSpacePet .qs-lau svg{display:block;width:100%;height:auto;overflow:visible}',
    '@keyframes qsLau{0%{opacity:0;transform:translateY(0) scale(.6)}12%{opacity:1}100%{opacity:0;transform:translateY(-68vh) scale(1.1)}}',
    '#qeSpacePet.jump .qs-btn{animation:qsJump .6s cubic-bezier(.3,.7,.4,1)}',
    '@keyframes qsJump{0%{transform:translateY(0)}35%{transform:translateY(-22px) scale(.96,1.06)}65%{transform:translateY(0) scale(1.08,.92)}100%{transform:translateY(0)}}',

    /* ฟองพูดสั้น (พูดเอง): ข้อความล้วน ไม่มีปุ่ม กดทะลุได้ ค่อย ๆ ปรากฏแล้วจางหาย
       ตำแหน่งตามน้อง: ปกติอยู่เหนือน้อง / ชิดขอบบน → ใต้น้อง / ชิดซ้าย → ชิดขอบซ้าย */
    '#qeSpacePet .qs-say{position:absolute;right:0;bottom:' + (PH + 10) + 'px;width:max-content;max-width:230px;box-sizing:border-box;padding:8px 12px;border-radius:14px 14px 4px 14px;background:#fff;color:#1e1b4b;box-shadow:0 8px 24px rgba(0,0,0,.38);font-size:13px;font-weight:600;line-height:1.45;pointer-events:none;opacity:0;visibility:hidden;transform:translateY(6px) scale(.96);transform-origin:90% 100%;transition:opacity .28s ease,transform .28s ease,visibility 0s linear .28s}',
    '#qeSpacePet .qs-say.on{opacity:1;visibility:visible;transform:none;transition:opacity .28s ease,transform .28s ease,visibility 0s}',
    '#qeSpacePet .qs-say::after{content:"";position:absolute;right:24px;bottom:-5px;width:10px;height:10px;background:#fff;transform:rotate(45deg);border-radius:0 0 3px 0}',
    '#qeSpacePet.below .qs-say{bottom:auto;top:' + (PH + 10) + 'px;border-radius:4px 14px 14px 14px;transform-origin:90% 0}',
    '#qeSpacePet.below .qs-say::after{bottom:auto;top:-5px;border-radius:3px 0 0 0}',
    '#qeSpacePet.lft .qs-say{right:auto;left:0;transform-origin:10% 100%}',
    '#qeSpacePet.lft .qs-say::after{right:auto;left:24px}',

    /* เมนูน้อง (คลิกที่น้อง) */
    '#qeSpacePet .qs-pop{pointer-events:auto;position:absolute;right:0;bottom:' + (PH + 8) + 'px;width:228px;box-sizing:border-box;padding:10px 12px;border-radius:14px 14px 4px 14px;background:#fff;color:#1e1b4b;box-shadow:0 8px 26px rgba(0,0,0,.4);font-size:13px;line-height:1.45;display:none}',
    '#qeSpacePet.below .qs-pop{bottom:auto;top:' + (PH + 8) + 'px;border-radius:4px 14px 14px 14px}',
    '#qeSpacePet.lft .qs-pop{right:auto;left:0}',
    '#qeSpacePet .qs-pop.on{display:block;animation:qsPop .18s ease-out}',
    '@keyframes qsPop{0%{opacity:0;transform:translateY(6px) scale(.96)}100%{opacity:1;transform:none}}',
    '#qeSpacePet .qs-msg{margin:0 0 8px;font-weight:600;color:#1e1b4b}',
    '#qeSpacePet .qs-hint{margin:0 0 8px;font-size:11px;color:#5b6491}',
    '#qeSpacePet .qs-row{display:flex;gap:6px;flex-wrap:wrap}',
    '#qeSpacePet .qs-row button{flex:1 1 auto;font-size:12px;padding:5px 8px;border-radius:99px;border:1px solid #c7d2fe;background:#eef2ff;color:#312e81;cursor:pointer;font-weight:700;white-space:nowrap}',
    '#qeSpacePet .qs-row button:hover{background:#e0e7ff}',
    '#qeSpacePet .qs-row button:focus-visible{outline:2px solid #6366f1;outline-offset:1px}',
    '#qeSpaceChip{position:fixed;right:76px;bottom:16px;z-index:246;width:32px;height:32px;padding:0;border-radius:50%;border:1px solid rgba(148,163,255,.5);background:rgba(20,26,58,.9);color:#fff;font-size:16px;line-height:30px;cursor:pointer;opacity:.7;display:none}',
    '#qeSpaceChip:hover,#qeSpaceChip:focus-visible{opacity:1}',
    '@media(max-width:720px){#qeSpacePet .qs-pop{width:196px}#qeSpacePet .qs-say{max-width:190px}#qeSpaceBg .p1,#qeSpaceBg .p2{opacity:.35}.qs-bs.hide-sm{display:none}#qeSkyFx .qs-bs{opacity:.5}}',
    '@media(prefers-reduced-motion:reduce){#qeSpaceBg *,#qeSkyFx *,#qeSpacePet *,#qeSpacePet{animation:none!important}#qeSpacePet .qs-say{transition:none!important}#qeSpaceBg .qs-rk,#qeSkyFx .qs-rk,#qeSpacePet .qs-lau{display:none!important}}',
    '@media print{#qeSpaceBg,#qeSkyFx,#qeSpacePet,#qeSpaceChip{display:none!important}}'
  ].join('\n');
  var st = document.createElement('style');
  st.id = 'qeSpaceCss';
  st.textContent = css;
  document.head.appendChild(st);

  /* ---------- จรวดการ์ตูน (SVG ต้นฉบับ ชี้ขึ้น) ---------- */
  var ROCKET = [
    '<svg viewBox="0 0 40 78" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">',
    '<path class="qs-fl" d="M13 56 Q20 84 27 56Z" fill="#fb923c"/><path class="qs-fl" d="M16 56 Q20 74 24 56Z" fill="#fde047"/>',
    '<path d="M8 40 L0 58 L12 52Z" fill="#f43f5e"/><path d="M32 40 L40 58 L28 52Z" fill="#f43f5e"/>',
    '<path d="M20 0 C31 10 33 30 30 56 L10 56 C7 30 9 10 20 0Z" fill="#f8fafc" stroke="#c7d2fe" stroke-width="1.4"/>',
    '<path d="M20 0 C25 4 28 9 29.5 15 L10.5 15 C12 9 15 4 20 0Z" fill="#f43f5e"/>',
    '<circle cx="20" cy="30" r="6.2" fill="#38bdf8" stroke="#e0f2fe" stroke-width="2"/><circle cx="18" cy="28" r="1.8" fill="#fff" opacity=".85"/>',
    '<rect x="10.5" y="47" width="19" height="3.2" rx="1.6" fill="#a5b4fc"/><rect x="14" y="52" width="12" height="4" rx="2" fill="#94a3b8"/></svg>'
  ].join('');

  /* ---------- ฉากหลัง (หลังเนื้อหา) ---------- */
  var bg = document.createElement('div');
  bg.id = 'qeSpaceBg';
  bg.setAttribute('aria-hidden', 'true');
  bg.innerHTML = '<div class="qs-s s1"></div><div class="qs-s s2"></div><div class="qs-s s3"></div>' +
    '<div class="qs-pl p1"></div><div class="qs-pl p2"></div><div class="qs-sh"></div>' +
    '<div class="qs-rk r1">' + ROCKET + '</div><div class="qs-rk r2">' + ROCKET + '</div>';
  document.body.insertBefore(bg, document.body.firstChild);

  /* ---------- ชั้นหน้าของธีมสว่าง: ดาวที่ขอบจอ + จรวด 3 ลำ (กดทะลุได้) ---------- */
  var sky = document.createElement('div');
  sky.id = 'qeSkyFx';
  sky.setAttribute('aria-hidden', 'true');
  sky.innerHTML = '<div class="qs-rk r1">' + ROCKET + '</div><div class="qs-rk r2">' + ROCKET + '</div><div class="qs-rk r3">' + ROCKET + '</div>';
  document.body.appendChild(sky);

  var COLS = ['#ffffff', '#dbeafe', '#fef9c3', '#e9d5ff'];
  function starShadow(n) {
    var W = Math.max(320, window.innerWidth || 1280), H = Math.max(320, window.innerHeight || 720), a = [];
    for (var i = 0; i < n; i++) {
      a.push((Math.random() * W | 0) + 'px ' + (Math.random() * H | 0) + 'px 0 0 ' + COLS[(Math.random() * COLS.length) | 0]);
    }
    return a.join(',');
  }
  function paintStars() {
    var W = window.innerWidth || 1280, k = W < 720 ? 0.55 : 1;
    bg.querySelector('.s1').style.boxShadow = starShadow(Math.round(95 * k));
    bg.querySelector('.s2').style.boxShadow = starShadow(Math.round(40 * k));
    bg.querySelector('.s3').style.boxShadow = starShadow(Math.round(16 * k));
  }
  function mkStar(i, left, top, szMin, szVar) {
    var d = document.createElement('i'), four = i % 3 === 1, sz = szMin + Math.random() * (four ? szVar + 2 : szVar);
    d.className = 'qs-bs ' + (four ? 'four' : 'five') + ' c' + (i % 5) + (i > 6 ? ' hide-sm' : '');
    d.style.cssText = 'left:' + left.toFixed(1) + '%;top:' + top.toFixed(1) + '%;width:' + sz.toFixed(0) + 'px;height:' + sz.toFixed(0) + 'px;' +
      'animation-duration:' + (3 + Math.random() * 4).toFixed(1) + 's,' + (10 + Math.random() * 10).toFixed(1) + 's;animation-delay:-' + (Math.random() * 8).toFixed(1) + 's,-' + (Math.random() * 12).toFixed(1) + 's';
    return d;
  }
  function clearStars(box) { Array.prototype.slice.call(box.querySelectorAll('.qs-bs')).forEach(function (n) { n.remove(); }); }
  function paintBigStars() {
    /* หลังเนื้อหา: กระจายทั้งจอ */
    clearStars(bg);
    var small = (window.innerWidth || 1280) < 720, n = small ? 7 : 13;
    for (var i = 0; i < n; i++) bg.appendChild(mkStar(i, Math.random() * 96, Math.random() * 94, 8, 11));
    /* ชั้นหน้า (ธีมสว่าง): เฉพาะแถบขอบซ้าย/ขวา เพื่อไม่ทับข้อความ */
    clearStars(sky);
    var m = small ? 6 : 12;
    for (var j = 0; j < m; j++) {
      var left = (j % 2 === 0) ? 0.6 + Math.random() * 2.8 : 96.4 + Math.random() * 2.8;
      sky.appendChild(mkStar(j + 3, left, 6 + (j / m) * 84 + Math.random() * 5, 9, 9));
    }
  }
  /* จรวด: คำนวณจุดเริ่ม/จุดจบ/มุมหัวจรวด ให้ชี้ไปตามทิศที่บินจริงตามขนาดหน้าจอ */
  var ROUTES = {
    r1: { a: [-0.05, 1.06], b: [1.05, -0.12] },
    r2: { a: [1.05, 0.96], b: [-0.06, -0.10] },
    r3: { a: [-0.05, 0.62], b: [1.05, 0.02] }
  };
  var TIMING = { bg: { r1: [44, 9], r2: [61, 31] }, sky: { r1: [40, 4], r2: [57, 20], r3: [73, 38] } };
  function setRockets() {
    var W = window.innerWidth || 1280, H = window.innerHeight || 720;
    [['bg', bg], ['sky', sky]].forEach(function (p) {
      Array.prototype.slice.call(p[1].querySelectorAll('.qs-rk')).forEach(function (e) {
        var mm = /\br([123])\b/.exec(e.className || ''), key = mm ? 'r' + mm[1] : '', R = ROUTES[key], T = TIMING[p[0]][key];
        if (!R || !T) return;
        var x0 = R.a[0] * W, y0 = R.a[1] * H, x1 = R.b[0] * W, y1 = R.b[1] * H;
        var ang = Math.atan2(x1 - x0, -(y1 - y0)) * 180 / Math.PI;
        e.style.setProperty('--x0', Math.round(x0) + 'px'); e.style.setProperty('--y0', Math.round(y0) + 'px');
        e.style.setProperty('--x1', Math.round(x1) + 'px'); e.style.setProperty('--y1', Math.round(y1) + 'px');
        e.style.setProperty('--a', ang.toFixed(1) + 'deg');
        e.style.animation = 'qsRkV ' + T[0] + 's linear ' + T[1] + 's infinite';
      });
    });
  }
  paintStars();
  paintBigStars();
  setRockets();

  /* ---------- น้องดุ๊กดิ๊ก (SVG ต้นฉบับ) ---------- */
  var SVG = [
    '<svg viewBox="0 -10 100 124" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><g class="qs-bob">',
    '<path d="M50 14 Q47 6 52 0" fill="none" stroke="#e0e7ff" stroke-width="2.6" stroke-linecap="round"/>',
    '<polygon class="qs-star" points="53,-11 55.8,-5 62.2,-4.3 57.4,0 58.9,6.3 53,3 47.1,6.3 48.6,0 43.8,-4.3 50.2,-5" fill="#fde047" stroke="#f59e0b" stroke-width=".9" stroke-linejoin="round"/>',
    '<rect x="26" y="78" width="48" height="26" rx="11" fill="#f472b6"/><rect x="21" y="82" width="9" height="16" rx="4.5" fill="#fbcfe8"/><rect x="70" y="82" width="9" height="16" rx="4.5" fill="#fbcfe8"/>',
    '<ellipse cx="50" cy="93" rx="19" ry="14.5" fill="#ffffff" stroke="#c7d2fe" stroke-width="2"/>',
    '<circle cx="50" cy="95" r="4.2" fill="#38bdf8" stroke="#e0f2fe" stroke-width="1.5"/>',
    '<ellipse cx="41" cy="106.5" rx="9.5" ry="5.4" fill="#a78bfa"/><ellipse cx="59" cy="106.5" rx="9.5" ry="5.4" fill="#a78bfa"/>',
    '<ellipse cx="38" cy="104.5" rx="3" ry="1.6" fill="#ddd6fe" opacity=".8"/><ellipse cx="56" cy="104.5" rx="3" ry="1.6" fill="#ddd6fe" opacity=".8"/>',
    '<ellipse cx="31" cy="93" rx="5.6" ry="9" fill="#ffffff" stroke="#c7d2fe" stroke-width="2" transform="rotate(16 31 93)"/><circle cx="28" cy="101" r="4.4" fill="#fde68a"/>',
    '<g class="qs-arm"><ellipse cx="69" cy="91" rx="5.6" ry="9" fill="#ffffff" stroke="#c7d2fe" stroke-width="2" transform="rotate(-16 69 91)"/><circle cx="73" cy="82" r="4.8" fill="#fde68a"/></g>',
    '<circle cx="19" cy="36" r="10" fill="#fde68a" stroke="#fbbf24" stroke-width="1.6"/><circle cx="19" cy="36" r="5.2" fill="#fda4af"/>',
    '<circle cx="81" cy="36" r="10" fill="#fde68a" stroke="#fbbf24" stroke-width="1.6"/><circle cx="81" cy="36" r="5.2" fill="#fda4af"/>',
    '<circle cx="50" cy="49" r="37" fill="rgba(186,230,253,.30)" stroke="#e0f2fe" stroke-width="3.4"/>',
    '<circle cx="50" cy="51" r="30" fill="#fff4c9"/>',
    '<path d="M42 22.5 Q50 14 58 22.5 Q50 27 42 22.5Z" fill="#fbbf24"/>',
    '<g class="qs-eye"><ellipse cx="38.5" cy="51" rx="6" ry="7.6" fill="#1e293b"/><circle cx="40.6" cy="47.6" r="2.7" fill="#fff"/><circle cx="36.4" cy="54.4" r="1.3" fill="#fff" opacity=".9"/></g>',
    '<g class="qs-eye"><ellipse cx="61.5" cy="51" rx="6" ry="7.6" fill="#1e293b"/><circle cx="63.6" cy="47.6" r="2.7" fill="#fff"/><circle cx="59.4" cy="54.4" r="1.3" fill="#fff" opacity=".9"/></g>',
    '<ellipse class="qs-cheek" cx="28.5" cy="61" rx="5.8" ry="3.7" fill="#fb7185" opacity=".7"/><ellipse class="qs-cheek" cx="71.5" cy="61" rx="5.8" ry="3.7" fill="#fb7185" opacity=".7"/>',
    '<ellipse cx="50" cy="57.6" rx="2.2" ry="1.6" fill="#f97316"/>',
    '<path d="M43.5 61.2 Q46.7 65.6 50 61.4 Q53.3 65.6 56.5 61.2" fill="none" stroke="#9a3412" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    '<path d="M22 42 A30 30 0 0 1 38 21" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" opacity=".75"/><circle cx="25.5" cy="53" r="1.9" fill="#fff" opacity=".7"/>',
    '<polygon class="qs-star" points="91,14 93,20 99,22 93,24 91,30 89,24 83,22 89,20" fill="#fef08a"/>',
    '<polygon class="qs-star" points="8,64 9.5,68.5 14,70 9.5,71.5 8,76 6.5,71.5 2,70 6.5,68.5" fill="#bae6fd"/>',
    '</g></svg>'
  ].join('');

  var pet = document.createElement('div');
  pet.id = 'qeSpacePet';
  pet.innerHTML = '<div class="qs-say" aria-hidden="true"></div>' +
    '<div class="qs-pop" role="dialog" aria-label="น้องดุ๊กดิ๊ก"><p class="qs-msg" aria-live="polite"></p>' +
    '<p class="qs-hint">💡 ลากน้องไปวางตรงไหนก็ได้ (หรือกดลูกศรเมื่อโฟกัสที่น้อง)</p>' +
    '<div class="qs-row"><button type="button" data-qs="theme"></button><button type="button" data-qs="fx"></button><button type="button" data-qs="talk"></button><button type="button" data-qs="reset">📍 ตำแหน่งเดิม</button><button type="button" data-qs="hide">🙈 ซ่อนน้อง</button></div></div>' +
    '<button type="button" class="qs-btn" aria-label="น้องดุ๊กดิ๊ก — คลิกเพื่อดูเมนู / ลากเพื่อย้ายตำแหน่ง" title="น้องดุ๊กดิ๊ก — คลิกเพื่อเปิดเมนู · ลากเพื่อย้าย">' + SVG + '</button>';
  document.body.appendChild(pet);

  var chip = document.createElement('button');
  chip.id = 'qeSpaceChip';
  chip.type = 'button';
  chip.textContent = '🌌';
  chip.title = 'เรียกน้องดุ๊กดิ๊กกลับมา';
  chip.setAttribute('aria-label', 'เรียกน้องดุ๊กดิ๊กกลับมา');
  document.body.appendChild(chip);

  var pop = pet.querySelector('.qs-pop'), msg = pet.querySelector('.qs-msg'), btn = pet.querySelector('.qs-btn'), say = pet.querySelector('.qs-say'),
      btnTheme = pet.querySelector('[data-qs="theme"]'), btnFx = pet.querySelector('[data-qs="fx"]'), btnTalk = pet.querySelector('[data-qs="talk"]');

  /* ---------- ธีมสีของหน้าเว็บ: ใช้ชุดมืด “Neo” ของระบบเอง ตอนเปิดธีมอวกาศ ---------- */
  var APP_THEMES = ['calm', 'neo', 'holo', 'ember', 'classic'];
  function appTheme() { var t = ls.get('ui_theme') || 'calm'; return APP_THEMES.indexOf(t) < 0 ? 'calm' : t; }
  function classesFor(t) { return t === 'calm' ? ['calm'] : (t === 'classic' ? [] : ((t === 'holo' || t === 'ember') ? ['neo', t] : ['neo'])); }
  function setBodyClasses(list) {
    var b = document.body;
    ['neo', 'holo', 'ember', 'calm'].forEach(function (c) { if (list.indexOf(c) < 0 && b.classList.contains(c)) b.classList.remove(c); });
    list.forEach(function (c) { if (!b.classList.contains(c)) b.classList.add(c); });
  }
  function enforceDark() {
    if (!themeOn) return;
    var b = document.body, want = b.classList.contains('ember') ? ['neo', 'ember'] : ['neo'];
    var has = ['neo', 'holo', 'ember', 'calm'].filter(function (c) { return b.classList.contains(c); });
    if (has.length !== want.length || has.some(function (c) { return want.indexOf(c) < 0; })) setBodyClasses(want);
  }
  var mo = null;
  function watchBody() {
    if (mo || !window.MutationObserver) return;
    mo = new MutationObserver(function () { enforceDark(); });
    mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }
  function unwatchBody() { if (mo) { mo.disconnect(); mo = null; } }
  /* กดปุ่มเปลี่ยนธีมของระบบ (🌗) ระหว่างเปิดธีมอวกาศ → ปิดธีมอวกาศให้ก่อน เพื่อให้ธีมที่เลือกแสดงผลจริง */
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('#themeBtn') : null;
    if (t && themeOn) { themeOn = false; ls.set(K_THEME, 'off'); applyAll(); }
  }, true);

  /* ---------- ตำแหน่ง / การลากน้อง ---------- */
  var R0 = 76, B0 = 16;   // ตำแหน่งเริ่มต้น: ซ้ายของปุ่ม LINE / AI
  function clampR(r) { return Math.max(4, Math.min(r, Math.max(4, (window.innerWidth || 1280) - PW - 4))); }
  function clampB(b) { return Math.max(4, Math.min(b, Math.max(4, (window.innerHeight || 720) - PH - 4))); }
  var posR = R0, posB = B0;
  function readPos() {
    try { var o = JSON.parse(ls.get(K_POS) || 'null'); if (o && isFinite(o.r) && isFinite(o.b)) { posR = +o.r; posB = +o.b; return; } } catch (e) {}
    posR = R0; posB = B0;
  }
  function savePos() { ls.set(K_POS, JSON.stringify({ r: Math.round(posR), b: Math.round(posB) })); }
  function place(r, b) {
    posR = clampR(r); posB = clampB(b);
    pet.style.right = posR + 'px';
    pet.style.bottom = posB + 'px';
    var W = window.innerWidth || 1280, H = window.innerHeight || 720;
    pet.classList.toggle('lft', (W - posR - PW) < 150);       // ชิดซ้ายมาก → ฟองชิดซ้ายของน้อง
    pet.classList.toggle('below', (H - posB - PH) < 190);      // ชิดบนมาก → ฟองอยู่ใต้น้อง
  }
  readPos();
  place(posR, posB);
  var rzT = 0, lastW = window.innerWidth;
  window.addEventListener('resize', function () {
    clearTimeout(rzT);
    rzT = setTimeout(function () {
      place(posR, posB);
      setRockets();
      if (Math.abs((window.innerWidth || 0) - lastW) > 40) { lastW = window.innerWidth; paintStars(); paintBigStars(); }
    }, 250);
  });

  var drag = null, lastDragEnd = 0;
  btn.addEventListener('pointerdown', function (e) {
    if (e.button !== undefined && e.button !== 0) return;
    drag = { x: e.clientX, y: e.clientY, r: posR, b: posB, id: e.pointerId, moved: false };
    try { btn.setPointerCapture(e.pointerId); } catch (err) {}
  });
  btn.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved) {
      if (Math.sqrt(dx * dx + dy * dy) < 6) return;       // ขยับน้อยกว่า 6px ถือว่าเป็นการคลิก
      drag.moved = true; closePop(); hideSay(); pet.classList.add('drag');
    }
    place(drag.r - dx, drag.b - dy);
    e.preventDefault();
  });
  function endDrag(e) {
    if (!drag || (e && e.pointerId !== undefined && e.pointerId !== drag.id)) return;
    var was = drag.moved;
    try { btn.releasePointerCapture(drag.id); } catch (err) {}
    drag = null; pet.classList.remove('drag');
    if (was) { lastDragEnd = Date.now(); savePos(); }
  }
  btn.addEventListener('pointerup', endDrag);
  btn.addEventListener('pointercancel', endDrag);
  btn.addEventListener('keydown', function (e) {
    var step = e.shiftKey ? 72 : 24, dr = 0, db = 0;
    if (e.key === 'ArrowLeft') dr = step; else if (e.key === 'ArrowRight') dr = -step;
    else if (e.key === 'ArrowUp') db = step; else if (e.key === 'ArrowDown') db = -step;
    else return;
    e.preventDefault(); closePop(); hideSay(); place(posR + dr, posB + db); savePos();
  });

  /* ---------- ข้อความของน้อง ---------- */
  function who() { var n = (ls.get('ux_me') || '').trim(); return n || 'เพื่อน'; }
  function leftToday() {
    var d = new Date(), m = d.getHours() * 60 + d.getMinutes(), end = 16 * 60 + 30, dow = d.getDay();
    if (dow === 0 || dow === 6) return 'เสาร์-อาทิตย์แล้ว พักผ่อนบ้างนะ 🌙';
    if (m < 7 * 60 + 30) return 'ยังไม่ถึงเวลางาน ตั้งต้นวันเบา ๆ ก่อนนะ ☕';
    if (m >= end) return 'เลิกงาน 16:30 แล้ว — ถ้าทำ OT อย่าลืมพักสายตานะ 🌙';
    var r = end - m, h = Math.floor(r / 60), mm = r % 60;
    return 'อีก ' + (h ? h + ' ชม. ' : '') + mm + ' นาทีจะถึงเวลาเลิกงาน 🚀';
  }
  function greeting() {
    var h = new Date().getHours();
    if (h < 11) return 'อรุณสวัสดิ์ครับ คุณ' + who() + ' ☀️ วันนี้ลุยกัน!';
    if (h < 13) return 'สวัสดีครับ คุณ' + who() + ' 😊 อย่าลืมพักกินข้าวนะ';
    if (h < 17) return 'สวัสดีตอนบ่ายครับ คุณ' + who() + ' 🚀 สู้ ๆ';
    return 'สวัสดีตอนเย็นครับ คุณ' + who() + ' 🌙';
  }
  var QUIPS = [
    function () { return 'สู้ ๆ นะครับ คุณ' + who() + ' 🚀'; },
    leftToday,
    function () { return 'ดื่มน้ำสักแก้วไหม 💧'; },
    function () { return 'มองไกล ๆ 20 วินาที พักสายตาหน่อย 👀'; },
    function () { return 'ก่อนเลิกงาน ลองเช็กงานที่ Delay / ครบกำหนดวันนี้ดูอีกรอบนะ ✅'; },
    function () { return 'ยืดเส้นยืดสายสักนิด แล้วค่อยลุยต่อ 🙆'; },
    function () { return 'งานเยอะก็ทำทีละดวง ดาวทุกดวงเริ่มจากจุดเล็ก ๆ ✨'; },
    function () { return 'วันนี้ทำได้ดีแล้วนะ 🌟'; },
    function () { return 'จรวดพร้อมแล้ว! เคลียร์งาน Delay แล้วออกเดินทางกัน 🚀'; },
    function () { return 'เก็บดาวไปทีละดวง… งานเสร็จทีละอัน ⭐'; },
    function () { return 'นั่งนานแล้วนะ ลุกเดินสักนิดไหม 🚶'; },
    function () { return 'หายใจลึก ๆ… แล้วไปต่อ 😌'; }
  ];
  var qi = -1;
  function nextQuip() { qi = (qi + 1 + Math.floor(Math.random() * (QUIPS.length - 1))) % QUIPS.length; return QUIPS[qi](); }

  /* ---------- เมนู (คลิกที่น้อง) ---------- */
  var popT = 0;
  function labelBtns() {
    btnTheme.textContent = themeOn ? '☀️ ธีมสว่าง' : '🌌 ธีมมืด';
    btnFx.textContent = fxOn ? '✨ ปิดดาว/จรวด' : '✨ เปิดดาว/จรวด';
    btnTalk.textContent = talkOn ? '💬 ปิดคำพูดเอง' : '💬 เปิดคำพูดเอง';
  }
  function applyAll() {
    document.documentElement.classList.toggle('qe-space', themeOn);
    document.documentElement.classList.toggle('qs-nofx', !fxOn);
    if (themeOn) { enforceDark(); watchBody(); }
    else { unwatchBody(); setBodyClasses(classesFor(appTheme())); }   // คืนธีมเดิมของระบบ
    pet.style.display = petOn ? 'block' : 'none';
    chip.style.display = petOn ? 'none' : 'block';
    if (!petOn) hideSay();
    labelBtns();
  }
  function closePop() { pop.classList.remove('on'); clearTimeout(popT); }
  function openPop(text) {
    hideSay();
    msg.textContent = text || nextQuip();
    place(posR, posB);
    pop.classList.add('on');
    clearTimeout(popT);
    popT = setTimeout(closePop, 9000);
  }
  function launch() {
    var r = document.createElement('div');
    r.className = 'qs-lau';
    r.innerHTML = ROCKET;
    pet.appendChild(r);
    setTimeout(function () { if (r.parentNode) r.parentNode.removeChild(r); }, 1700);
  }
  function jump() {
    pet.classList.remove('jump');
    void pet.offsetWidth;
    pet.classList.add('jump');
    setTimeout(function () { pet.classList.remove('jump'); }, 700);
  }

  /* ---------- พูดเอง: ฟองสั้น ไม่มีปุ่ม หายเอง ---------- */
  var sayT = 0, talkT = 0, firstDone = false;
  function hideSay() { clearTimeout(sayT); say.classList.remove('on'); }
  function showSay(text) {
    var dur = CFG.showMs + Math.min(3500, String(text).length * 35);   // ข้อความยาวอยู่นานขึ้นอีกนิด
    place(posR, posB);
    say.textContent = text;
    say.classList.add('on');
    clearTimeout(sayT);
    sayT = setTimeout(hideSay, dur);
    return dur;
  }
  function shown(el) {   // หน้า Tracker มีหน้าต่างป๊อปอัปแฝงอยู่ในหน้าตลอด (ซ่อนอยู่) — นับเฉพาะตัวที่มองเห็นจริง
    if (!el) return false;
    try {
      if (!(el.offsetWidth > 0 || el.offsetHeight > 0 || (el.getClientRects && el.getClientRects().length))) return false;
      var cs = window.getComputedStyle(el);
      return cs.visibility !== 'hidden' && cs.display !== 'none';
    } catch (e) { return false; }
  }
  function busyUI() {
    try {
      var ms = document.querySelectorAll('[aria-modal="true"],.ov.on,.pl-ov,#nfOv');   // login / popup / หน้าต่างยืนยัน
      for (var i = 0; i < ms.length; i++) if (shown(ms[i])) return true;
      var a = document.activeElement;
      if (a && a !== document.body && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable) && !pet.contains(a)) return true;   // กำลังพิมพ์
    } catch (e) {}
    return false;
  }
  function canSpeak() {
    return petOn && talkOn && !document.hidden && !drag && !pop.classList.contains('on') && !busyUI();
  }
  function speakNow() {                                     // คืนค่า: ระยะเวลาที่ฟองจะอยู่ (ms) หรือ 0 ถ้าพูดไม่ได้ตอนนี้
    if (!canSpeak()) return 0;
    var text = firstDone ? nextQuip() : greeting();
    firstDone = true;
    jump();
    return showSay(text);
  }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function scheduleTalk(ms) {
    clearTimeout(talkT);
    if (!talkOn) return;
    talkT = setTimeout(function () {
      var dur = speakNow();
      if (dur) scheduleTalk(dur + rand(CFG.minMs, CFG.maxMs));   // นับช่วงห่างหลังฟองหายไปแล้ว
      else scheduleTalk(CFG.retryMs);                         // พูดไม่ได้ตอนนี้ (กำลังพิมพ์/มีหน้าต่างเปิด) → ลองใหม่เร็ว ๆ
    }, ms);
  }

  btn.addEventListener('click', function () {
    if (Date.now() - lastDragEnd < 400) return;             // เพิ่งลากเสร็จ ไม่นับเป็นการคลิก
    if (pop.classList.contains('on')) { closePop(); return; }
    jump(); launch(); openPop();
  });
  pop.addEventListener('click', function (e) {
    var b = e.target.closest('[data-qs]');
    if (!b) return;
    if (b.dataset.qs === 'theme') {
      themeOn = !themeOn; ls.set(K_THEME, themeOn ? 'on' : 'off'); applyAll();
      openPop(themeOn ? 'ยินดีต้อนรับสู่อวกาศ 🌌' : (fxOn ? 'กลับมาธีมสว่างแล้ว ☀️ ดาวกับจรวดยังบินอยู่นะ' : 'กลับมาธีมสว่างแล้ว ☀️'));
    } else if (b.dataset.qs === 'fx') {
      fxOn = !fxOn; ls.set(K_FX, fxOn ? 'on' : 'off'); applyAll();
      openPop(fxOn ? 'ดาวกับจรวดกลับมาแล้ว 🚀✨' : 'พักดาวกับจรวดไว้ก่อนนะ 😌');
    } else if (b.dataset.qs === 'talk') {
      talkOn = !talkOn; ls.set(K_TALK, talkOn ? 'on' : 'off'); applyAll();
      if (talkOn) { scheduleTalk(rand(CFG.minMs, CFG.maxMs)); openPop('ได้เลย! เดี๋ยวน้องแวะมาทักเป็นระยะนะ 💬'); }
      else { clearTimeout(talkT); openPop('โอเค น้องจะเงียบ ๆ ไม่พูดเองแล้ว 🤐 (คลิกที่น้องเพื่อคุยได้เสมอ)'); }
    } else if (b.dataset.qs === 'reset') {
      ls.del(K_POS); place(R0, B0); openPop('กลับมาที่เดิมแล้ว 📍');
    } else if (b.dataset.qs === 'hide') {
      petOn = false; ls.set(K_PET, 'off'); closePop(); applyAll();
    }
  });
  chip.addEventListener('click', function () {
    petOn = true; ls.set(K_PET, 'on'); applyAll(); place(posR, posB); jump(); launch(); openPop('กลับมาแล้ว! 👋');
    if (talkOn) scheduleTalk(rand(CFG.minMs, CFG.maxMs));
  });
  document.addEventListener('click', function (e) { if (pop.classList.contains('on') && !pet.contains(e.target)) closePop(); }, true);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && pop.classList.contains('on')) closePop(); });

  applyAll();
  scheduleTalk(CFG.firstMs);

  /* ควบคุมจาก Console ได้: QE_SPACE.theme(false) / .pet(false) / .fx(false) / .talk(false) / .say('ข้อความ') / .reset() */
  window.QE_SPACE = {
    theme: function (on) { themeOn = on !== false; ls.set(K_THEME, themeOn ? 'on' : 'off'); applyAll(); },
    pet: function (on) { petOn = on !== false; ls.set(K_PET, petOn ? 'on' : 'off'); applyAll(); },
    fx: function (on) { fxOn = on !== false; ls.set(K_FX, fxOn ? 'on' : 'off'); applyAll(); },
    talk: function (on) { talkOn = on !== false; ls.set(K_TALK, talkOn ? 'on' : 'off'); applyAll(); if (talkOn) scheduleTalk(rand(CFG.minMs, CFG.maxMs)); else { clearTimeout(talkT); hideSay(); } },
    say: function (t) { if (petOn) { jump(); showSay(String(t || nextQuip())); } },
    reset: function () { ls.del(K_POS); place(R0, B0); }
  };
})();
