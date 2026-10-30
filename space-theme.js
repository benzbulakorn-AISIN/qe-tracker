/* =====================================================================
   QE Tracker — Space Theme + น้องดุ๊กดิ๊ก (v2: น้องหน้าตาน่ารักขึ้น + จรวด + ดวงดาว)
   ใส่บรรทัดเดียวก่อน </body> ของ index.html :
       <script src="space-theme.js" defer></script>
   • ไม่แตะข้อมูลงาน/Checklist/ประชุม และไม่ซิงก์ Cloud (เก็บแค่ค่าเปิด-ปิดในเครื่องนี้: ux_space_theme, ux_space_pet)
   • ธีมอวกาศ = พื้นหลังดาวระยิบช้า ๆ + ดวงดาวหลากสี/ประกายลอยเบา ๆ + จรวดบินผ่านนาน ๆ ครั้ง + ดาวตก + ดาวเคราะห์ที่ขอบจอ (ไม่ขยับตามการเลื่อนหน้า)
   • น้องดุ๊กดิ๊ก = นักบินอวกาศหัวโต ตาโต แก้มแดง หูกลม มุมขวาล่าง ขยับดุ๊กดิ๊กเบา ๆ — คลิกแล้วน้องจะยิงจรวดขึ้นฟ้า + มีคำให้กำลังใจ / เปิด-ปิดธีม / ซ่อนน้อง
   • ปิดแอนิเมชันอัตโนมัติถ้าเครื่องตั้ง “ลดการเคลื่อนไหว” · ซ่อนตอนพิมพ์ (Print)
   ===================================================================== */
(function () {
  'use strict';
  if (window.__QE_SPACE) return;
  window.__QE_SPACE = true;

  var K_THEME = 'ux_space_theme', K_PET = 'ux_space_pet';
  var ls = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  var themeOn = ls.get(K_THEME) !== 'off';   // ค่าเริ่มต้น = เปิด
  var petOn = ls.get(K_PET) !== 'off';

  /* ---------- CSS ---------- */
  var css = [
    /* ตัวแปรสีของแอป → โทนมืดแบบกระจกโปร่ง (ใช้ !important เพื่อชนะธีมสีเดิมเฉพาะตอนเปิดธีมอวกาศ) */
    'html.qe-space{--card:rgba(17,24,52,.80)!important;--txt:#e8ecff!important;--mut:#a9b4da!important;--line:rgba(148,163,255,.30)!important;--soft:rgba(99,102,241,.16)!important;--pop:#141a3a!important;--sh:rgba(0,0,0,.38)!important;color-scheme:dark}',
    'html.qe-space{background:#070b1f!important;background-image:none!important}',
    'html.qe-space body{background:transparent!important;background-image:none!important;color:var(--txt)}',
    'html.qe-space input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]):not([type=file]),html.qe-space select,html.qe-space textarea{background-color:rgba(9,13,38,.72)!important;color:var(--txt)!important;border-color:var(--line)!important}',
    'html.qe-space ::placeholder{color:#8f9bc8!important;opacity:1}',
    'html.qe-space [contenteditable="true"]{background-color:rgba(9,13,38,.45);color:var(--txt)}',

    /* ฉากหลัง */
    '#qeSpaceBg{position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden;display:none;',
    'background:radial-gradient(60% 50% at 14% 8%,rgba(124,58,237,.36),transparent 70%),radial-gradient(50% 45% at 92% 88%,rgba(14,165,233,.26),transparent 70%),radial-gradient(40% 40% at 72% 14%,rgba(236,72,153,.18),transparent 70%),linear-gradient(180deg,#070b1f 0%,#0d1233 55%,#150f3a 100%)}',
    'html.qe-space #qeSpaceBg{display:block}',
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


    /* ดวงดาวหลากสี + ประกาย */
    '#qeSpaceBg .qs-bs{position:absolute;display:block;animation:qsTw 4.5s ease-in-out infinite alternate,qsDr 14s ease-in-out infinite alternate}',
    '#qeSpaceBg .qs-bs.five{clip-path:polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)}',
    '#qeSpaceBg .qs-bs.four{clip-path:polygon(50% 0%,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0% 50%,38% 38%)}',
    '@keyframes qsDr{0%{transform:translateY(-4px) rotate(-8deg)}100%{transform:translateY(5px) rotate(10deg)}}',
    /* จรวดบินผ่าน */
    '#qeSpaceBg .qs-rk{position:absolute;left:0;top:0;width:34px;opacity:0;will-change:transform}',
    '#qeSpaceBg .qs-rk svg{display:block;width:100%;height:auto;overflow:visible}',
    '#qeSpaceBg .qs-rk .fl{transform-box:fill-box;transform-origin:50% 0;animation:qsFlame .18s ease-in-out infinite alternate}',
    '@keyframes qsFlame{0%{transform:scaleY(.8)}100%{transform:scaleY(1.25)}}',
    '#qeSpaceBg .r1{animation:qsRk1 44s linear 9s infinite}',
    '#qeSpaceBg .r2{width:26px;animation:qsRk2 61s linear 31s infinite}',
    '@keyframes qsRk1{0%{opacity:0;transform:translate(-6vw,106vh) rotate(38deg)}1%{opacity:.95}15%{opacity:.95}17%{opacity:0;transform:translate(104vw,-12vh) rotate(38deg)}100%{opacity:0;transform:translate(104vw,-12vh) rotate(38deg)}}',
    '@keyframes qsRk2{0%{opacity:0;transform:translate(104vw,98vh) rotate(-30deg)}1%{opacity:.9}18%{opacity:.9}20%{opacity:0;transform:translate(-8vw,-10vh) rotate(-30deg)}100%{opacity:0;transform:translate(-8vw,-10vh) rotate(-30deg)}}',

    /* น้องดุ๊กดิ๊ก */
    '#qeSpacePet{position:fixed;right:10px;bottom:128px;z-index:60;width:64px;pointer-events:none;font-family:inherit}',
    '#qeSpacePet .qs-btn{pointer-events:auto;display:block;width:66px;height:80px;padding:0;margin:0;border:0;background:transparent;cursor:pointer;border-radius:16px;filter:drop-shadow(0 4px 8px rgba(0,0,0,.35))}',
    '#qeSpacePet .qs-btn:focus-visible{outline:3px solid #a5b4fc;outline-offset:2px}',
    '#qeSpacePet svg{width:100%;height:100%;overflow:visible}',
    '#qeSpacePet .qs-bob{transform-box:fill-box;transform-origin:50% 100%;animation:qsBob 1.15s ease-in-out infinite alternate}',
    '@keyframes qsBob{0%{transform:translateY(0) rotate(-3deg) scale(1.02,.98)}100%{transform:translateY(-5px) rotate(3deg) scale(.98,1.02)}}',
    '#qeSpacePet .qs-arm{transform-box:fill-box;transform-origin:20% 15%;animation:qsWave 1.9s ease-in-out infinite}',
    '@keyframes qsWave{0%,60%,100%{transform:rotate(0)}70%{transform:rotate(-28deg)}80%{transform:rotate(8deg)}90%{transform:rotate(-22deg)}}',
    '#qeSpacePet .qs-eye{transform-box:fill-box;transform-origin:50% 50%;animation:qsBl 4.6s infinite}',
    '@keyframes qsBl{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}',
    '#qeSpacePet .qs-star{transform-box:fill-box;transform-origin:50% 50%;animation:qsSp 2.4s ease-in-out infinite alternate}',
    '@keyframes qsSp{0%{transform:scale(.85) rotate(-10deg)}100%{transform:scale(1.15) rotate(10deg)}}',

    '#qeSpacePet .qs-lau{position:absolute;left:50%;bottom:54px;width:22px;margin-left:-11px;pointer-events:none;opacity:0;animation:qsLau 1.5s ease-in forwards}',
    '#qeSpacePet .qs-lau svg{display:block;width:100%;height:auto;overflow:visible}',
    '#qeSpacePet .qs-lau .fl{transform-box:fill-box;transform-origin:50% 0;animation:qsFlame .15s ease-in-out infinite alternate}',
    '@keyframes qsLau{0%{opacity:0;transform:translateY(0) scale(.6)}12%{opacity:1}100%{opacity:0;transform:translateY(-68vh) scale(1.1)}}',
    '#qeSpacePet .qs-cheek{animation:qsCk 2.6s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:50% 50%}',
    '@keyframes qsCk{0%{opacity:.55}100%{opacity:.95}}',
    '#qeSpacePet.jump .qs-btn{animation:qsJump .6s cubic-bezier(.3,.7,.4,1)}',
    '@keyframes qsJump{0%{transform:translateY(0)}35%{transform:translateY(-22px) scale(.96,1.06)}65%{transform:translateY(0) scale(1.08,.92)}100%{transform:translateY(0)}}',
    '#qeSpacePet .qs-pop{pointer-events:auto;position:absolute;right:0;bottom:78px;width:210px;box-sizing:border-box;padding:10px 12px;border-radius:14px 14px 4px 14px;background:#fff;color:#1e1b4b;box-shadow:0 8px 26px rgba(0,0,0,.4);font-size:13px;line-height:1.45;display:none}',
    '#qeSpacePet .qs-pop.on{display:block;animation:qsPop .18s ease-out}',
    '@keyframes qsPop{0%{opacity:0;transform:translateY(6px) scale(.96)}100%{opacity:1;transform:none}}',
    '#qeSpacePet .qs-msg{margin:0 0 8px;font-weight:600}',
    '#qeSpacePet .qs-row{display:flex;gap:6px;flex-wrap:wrap}',
    '#qeSpacePet .qs-row button{flex:1 1 auto;font-size:12px;padding:5px 8px;border-radius:99px;border:1px solid #c7d2fe;background:#eef2ff;color:#312e81;cursor:pointer;font-weight:700;white-space:nowrap}',
    '#qeSpacePet .qs-row button:hover{background:#e0e7ff}',
    '#qeSpacePet .qs-row button:focus-visible{outline:2px solid #6366f1;outline-offset:1px}',
    '#qeSpaceChip{position:fixed;right:12px;bottom:128px;z-index:60;width:30px;height:30px;padding:0;border-radius:50%;border:1px solid rgba(148,163,255,.5);background:rgba(20,26,58,.85);color:#fff;font-size:15px;line-height:28px;cursor:pointer;opacity:.6;display:none}',
    '#qeSpaceChip:hover,#qeSpaceChip:focus-visible{opacity:1}',
    '@media(max-width:720px){#qeSpacePet{width:52px;right:6px;bottom:96px}#qeSpacePet .qs-btn{width:52px;height:58px}#qeSpacePet .qs-pop{bottom:64px;width:190px}#qeSpaceChip{bottom:96px;right:8px}#qeSpaceBg .p1,#qeSpaceBg .p2{opacity:.35}#qeSpaceBg .qs-bs.hide-sm{display:none}}',
    '@media(prefers-reduced-motion:reduce){#qeSpaceBg *,#qeSpacePet *,#qeSpacePet{animation:none!important}#qeSpaceBg .qs-rk,#qeSpacePet .qs-lau{display:none!important}}',
    '@media print{#qeSpaceBg,#qeSpacePet,#qeSpaceChip{display:none!important}}'
  ].join('\n');
  var st = document.createElement('style');
  st.id = 'qeSpaceCss';
  st.textContent = css;
  document.head.appendChild(st);

  /* ---------- ฉากหลัง ---------- */

  /* จรวดการ์ตูน (SVG ต้นฉบับ ชี้ขึ้น) — ใช้ทั้งบินผ่านฉากหลัง และตอนคลิกน้อง */
  var ROCKET = '<svg viewBox="0 0 40 78" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
    '<path class="fl" d="M13 56 Q20 84 27 56Z" fill="#fb923c"/><path class="fl" d="M16 56 Q20 74 24 56Z" fill="#fde047"/>' +
    '<path d="M8 40 L0 58 L12 52Z" fill="#f43f5e"/><path d="M32 40 L40 58 L28 52Z" fill="#f43f5e"/>' +
    '<path d="M20 0 C31 10 33 30 30 56 L10 56 C7 30 9 10 20 0Z" fill="#f8fafc" stroke="#c7d2fe" stroke-width="1.4"/>' +
    '<path d="M20 0 C25 4 28 9 29.5 15 L10.5 15 C12 9 15 4 20 0Z" fill="#f43f5e"/>' +
    '<circle cx="20" cy="30" r="6.2" fill="#38bdf8" stroke="#e0f2fe" stroke-width="2"/><circle cx="18" cy="28" r="1.8" fill="#fff" opacity=".85"/>' +
    '<rect x="10.5" y="47" width="19" height="3.2" rx="1.6" fill="#a5b4fc"/><rect x="14" y="52" width="12" height="4" rx="2" fill="#94a3b8"/></svg>';

  var bg = document.createElement('div');
  bg.id = 'qeSpaceBg';
  bg.setAttribute('aria-hidden', 'true');
  bg.innerHTML = '<div class="qs-s s1"></div><div class="qs-s s2"></div><div class="qs-s s3"></div>' +
    '<div class="qs-pl p1"></div><div class="qs-pl p2"></div><div class="qs-sh"></div>' +
    '<div class="qs-rk r1">' + ROCKET + '</div><div class="qs-rk r2">' + ROCKET + '</div>';
  document.body.insertBefore(bg, document.body.firstChild);

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
    var s1 = bg.querySelector('.s1'), s2 = bg.querySelector('.s2'), s3 = bg.querySelector('.s3');
    s1.style.boxShadow = starShadow(Math.round(95 * k));
    s2.style.boxShadow = starShadow(Math.round(40 * k));
    s3.style.boxShadow = starShadow(Math.round(16 * k));
  }
  paintStars();

  /* ดวงดาวหลากสีขนาดใหญ่ + ประกาย ✦ (กระจายแบบสุ่ม ไม่เยอะ ไม่ลายตา) */
  var BCOLS = ['#fde047', '#f9a8d4', '#67e8f9', '#c4b5fd', '#fdba74'];
  function paintBigStars() {
    Array.prototype.slice.call(bg.querySelectorAll('.qs-bs')).forEach(function (n) { n.remove(); });
    var small = (window.innerWidth || 1280) < 720, n = small ? 7 : 13;
    for (var i = 0; i < n; i++) {
      var d = document.createElement('i'), four = i % 3 === 1, sz = 8 + Math.random() * (four ? 12 : 11);
      d.className = 'qs-bs ' + (four ? 'four' : 'five') + (i > 6 ? ' hide-sm' : '');
      d.style.cssText = 'left:' + (Math.random() * 96).toFixed(1) + '%;top:' + (Math.random() * 94).toFixed(1) + '%;width:' + sz.toFixed(0) + 'px;height:' + sz.toFixed(0) + 'px;' +
        'background:' + BCOLS[i % BCOLS.length] + ';opacity:.8;filter:drop-shadow(0 0 5px ' + BCOLS[i % BCOLS.length] + ');' +
        'animation-duration:' + (3 + Math.random() * 4).toFixed(1) + 's,' + (10 + Math.random() * 10).toFixed(1) + 's;animation-delay:-' + (Math.random() * 8).toFixed(1) + 's,-' + (Math.random() * 12).toFixed(1) + 's';
      bg.appendChild(d);
    }
  }
  paintBigStars();
  var rzT = 0, lastW = window.innerWidth;
  window.addEventListener('resize', function () {
    clearTimeout(rzT);
    rzT = setTimeout(function () { if (Math.abs((window.innerWidth || 0) - lastW) > 40) { lastW = window.innerWidth; paintStars(); paintBigStars(); } }, 300);
  });

  /* ---------- น้องดุ๊กดิ๊ก (SVG ต้นฉบับ) ---------- */
  var SVG = '<svg viewBox="0 -10 100 124" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
    '<g class="qs-bob">' +
    /* เสาอากาศ + ดาว */
    '<path d="M50 14 Q47 6 52 0" fill="none" stroke="#e0e7ff" stroke-width="2.6" stroke-linecap="round"/>' +
    '<polygon class="qs-star" points="53,-11 55.8,-5 62.2,-4.3 57.4,0 58.9,6.3 53,3 47.1,6.3 48.6,0 43.8,-4.3 50.2,-5" fill="#fde047" stroke="#f59e0b" stroke-width=".9" stroke-linejoin="round"/>' +
    /* กระเป๋าหลัง + ถังออกซิเจนเล็ก */
    '<rect x="26" y="78" width="48" height="26" rx="11" fill="#f472b6"/><rect x="21" y="82" width="9" height="16" rx="4.5" fill="#fbcfe8"/><rect x="70" y="82" width="9" height="16" rx="4.5" fill="#fbcfe8"/>' +
    /* ตัวเล็กจิ๋ว */
    '<ellipse cx="50" cy="93" rx="19" ry="14.5" fill="#ffffff" stroke="#c7d2fe" stroke-width="2"/>' +
    '<circle cx="50" cy="95" r="4.2" fill="#38bdf8" stroke="#e0f2fe" stroke-width="1.5"/><path d="M46.5 94.5 L49 97 L54 92" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" opacity=".0"/>' +
    /* เท้า */
    '<ellipse cx="41" cy="106.5" rx="9.5" ry="5.4" fill="#a78bfa"/><ellipse cx="59" cy="106.5" rx="9.5" ry="5.4" fill="#a78bfa"/>' +
    '<ellipse cx="38" cy="104.5" rx="3" ry="1.6" fill="#ddd6fe" opacity=".8"/><ellipse cx="56" cy="104.5" rx="3" ry="1.6" fill="#ddd6fe" opacity=".8"/>' +
    /* แขนซ้าย + แขนขวาโบกมือ */
    '<ellipse cx="31" cy="93" rx="5.6" ry="9" fill="#ffffff" stroke="#c7d2fe" stroke-width="2" transform="rotate(16 31 93)"/><circle cx="28" cy="101" r="4.4" fill="#fde68a"/>' +
    '<g class="qs-arm"><ellipse cx="69" cy="91" rx="5.6" ry="9" fill="#ffffff" stroke="#c7d2fe" stroke-width="2" transform="rotate(-16 69 91)"/><circle cx="73" cy="82" r="4.8" fill="#fde68a"/></g>' +
    /* หูกลม */
    '<circle cx="19" cy="36" r="10" fill="#fde68a" stroke="#fbbf24" stroke-width="1.6"/><circle cx="19" cy="36" r="5.2" fill="#fda4af"/>' +
    '<circle cx="81" cy="36" r="10" fill="#fde68a" stroke="#fbbf24" stroke-width="1.6"/><circle cx="81" cy="36" r="5.2" fill="#fda4af"/>' +
    /* หมวกแก้ว + หน้ากลมโต */
    '<circle cx="50" cy="49" r="37" fill="rgba(186,230,253,.30)" stroke="#e0f2fe" stroke-width="3.4"/>' +
    '<circle cx="50" cy="51" r="30" fill="#fff4c9"/>' +
    '<path d="M42 22.5 Q50 14 58 22.5 Q50 27 42 22.5Z" fill="#fbbf24"/>' +
    /* ตาโตวิบวับ */
    '<g class="qs-eye"><ellipse cx="38.5" cy="51" rx="6" ry="7.6" fill="#1e293b"/><circle cx="40.6" cy="47.6" r="2.7" fill="#fff"/><circle cx="36.4" cy="54.4" r="1.3" fill="#fff" opacity=".9"/></g>' +
    '<g class="qs-eye"><ellipse cx="61.5" cy="51" rx="6" ry="7.6" fill="#1e293b"/><circle cx="63.6" cy="47.6" r="2.7" fill="#fff"/><circle cx="59.4" cy="54.4" r="1.3" fill="#fff" opacity=".9"/></g>' +
    /* แก้มแดง */
    '<ellipse class="qs-cheek" cx="28.5" cy="61" rx="5.8" ry="3.7" fill="#fb7185" opacity=".7"/><ellipse class="qs-cheek" cx="71.5" cy="61" rx="5.8" ry="3.7" fill="#fb7185" opacity=".7"/>' +
    /* จมูกจิ๋ว + ปากยิ้ม ω */
    '<ellipse cx="50" cy="57.6" rx="2.2" ry="1.6" fill="#f97316"/>' +
    '<path d="M43.5 61.2 Q46.7 65.6 50 61.4 Q53.3 65.6 56.5 61.2" fill="none" stroke="#9a3412" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    /* ประกายเงาแก้ว */
    '<path d="M22 42 A30 30 0 0 1 38 21" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" opacity=".75"/><circle cx="25.5" cy="53" r="1.9" fill="#fff" opacity=".7"/>' +
    /* ประกายลอยรอบตัว */
    '<polygon class="qs-star" points="91,14 93,20 99,22 93,24 91,30 89,24 83,22 89,20" fill="#fef08a"/>' +
    '<polygon class="qs-star" points="8,64 9.5,68.5 14,70 9.5,71.5 8,76 6.5,71.5 2,70 6.5,68.5" fill="#bae6fd"/>' +
    '</g></svg>';

  var pet = document.createElement('div');
  pet.id = 'qeSpacePet';
  pet.innerHTML = '<div class="qs-pop" role="dialog" aria-label="น้องดุ๊กดิ๊ก"><p class="qs-msg" aria-live="polite"></p>' +
    '<div class="qs-row"><button type="button" data-qs="theme"></button><button type="button" data-qs="hide">🙈 ซ่อนน้อง</button></div></div>' +
    '<button type="button" class="qs-btn" aria-label="น้องดุ๊กดิ๊ก — คลิกเพื่อดูข้อความ / ตั้งค่า" title="น้องดุ๊กดิ๊ก">' + SVG + '</button>';
  document.body.appendChild(pet);

  var chip = document.createElement('button');
  chip.id = 'qeSpaceChip';
  chip.type = 'button';
  chip.textContent = '🌌';
  chip.title = 'เรียกน้องดุ๊กดิ๊กกลับมา';
  chip.setAttribute('aria-label', 'เรียกน้องดุ๊กดิ๊กกลับมา');
  document.body.appendChild(chip);

  var pop = pet.querySelector('.qs-pop'), msg = pet.querySelector('.qs-msg'), btn = pet.querySelector('.qs-btn'),
      btnTheme = pet.querySelector('[data-qs="theme"]');

  /* ---------- ข้อความให้กำลังใจ ---------- */
  function who() { var n = (ls.get('ux_me') || '').trim(); return n || 'เพื่อน'; }
  function leftToday() {
    var d = new Date(), m = d.getHours() * 60 + d.getMinutes(), end = 16 * 60 + 30, dow = d.getDay();
    if (dow === 0 || dow === 6) return 'เสาร์-อาทิตย์แล้ว พักผ่อนบ้างนะ 🌙';
    if (m < 7 * 60 + 30) return 'ยังไม่ถึงเวลางาน ตั้งต้นวันเบา ๆ ก่อนนะ ☕';
    if (m >= end) return 'เลิกงาน 16:30 แล้ว — ถ้าทำ OT อย่าลืมพักสายตานะ 🌙';
    var r = end - m, h = Math.floor(r / 60), mm = r % 60;
    return 'อีก ' + (h ? h + ' ชม. ' : '') + mm + ' นาทีจะถึงเวลาเลิกงาน 🚀';
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
    function () { return 'เก็บดาวไปทีละดวง… งานเสร็จทีละอัน ⭐'; }
  ];
  var qi = -1;
  function nextQuip() { qi = (qi + 1 + Math.floor(Math.random() * (QUIPS.length - 1))) % QUIPS.length; return QUIPS[qi](); }

  /* ---------- การทำงาน ---------- */
  var popT = 0;
  function labelTheme() { btnTheme.textContent = themeOn ? '🌌 ปิดธีม' : '🌌 เปิดธีม'; }
  function applyAll() {
    document.documentElement.classList.toggle('qe-space', themeOn);
    pet.style.display = petOn ? 'block' : 'none';
    chip.style.display = petOn ? 'none' : 'block';
    labelTheme();
  }
  function closePop() { pop.classList.remove('on'); clearTimeout(popT); }
  function openPop(text) {
    msg.textContent = text || nextQuip();
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
  btn.addEventListener('click', function () {
    if (pop.classList.contains('on')) { closePop(); return; }
    jump(); launch(); openPop();
  });
  pop.addEventListener('click', function (e) {
    var b = e.target.closest('[data-qs]');
    if (!b) return;
    if (b.dataset.qs === 'theme') {
      themeOn = !themeOn; ls.set(K_THEME, themeOn ? 'on' : 'off'); applyAll();
      openPop(themeOn ? 'ยินดีต้อนรับสู่อวกาศ 🌌' : 'กลับมาธีมเดิมแล้วนะ ☀️');
    } else if (b.dataset.qs === 'hide') {
      petOn = false; ls.set(K_PET, 'off'); closePop(); applyAll();
    }
  });
  chip.addEventListener('click', function () {
    petOn = true; ls.set(K_PET, 'on'); applyAll(); jump(); launch(); openPop('กลับมาแล้ว! 👋');
  });
  document.addEventListener('click', function (e) { if (pop.classList.contains('on') && !pet.contains(e.target)) closePop(); }, true);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && pop.classList.contains('on')) closePop(); });

  /* ทักทายครั้งเดียวต่อรอบเปิดหน้า (ไม่รบกวน) + เตือนเบา ๆ ทุก ~40 นาที */
  var lastHi = 0;
  function hello() {
    if (!petOn || document.hidden || Date.now() - lastHi < 30 * 60000) return;
    if (document.querySelector('.ov.on,.pl-ov,#nfOv')) return;      // มี popup เปิดอยู่ → ไม่ทัก
    lastHi = Date.now(); jump(); openPop();
    setTimeout(function () { if (!pop.matches(':hover')) closePop(); }, 5000);
  }
  setTimeout(hello, 4000);
  setInterval(hello, 40 * 60000);

  applyAll();

  /* ใช้ควบคุมจาก Console ได้: QE_SPACE.theme(false) / QE_SPACE.pet(false) */
  window.QE_SPACE = {
    theme: function (on) { themeOn = on !== false; ls.set(K_THEME, themeOn ? 'on' : 'off'); applyAll(); },
    pet: function (on) { petOn = on !== false; ls.set(K_PET, petOn ? 'on' : 'off'); applyAll(); }
  };
})();
