/* QE Tracker v89 — Holo galaxy and original inline-SVG “น้องดุ๊กดิ๊ก”. No network or business-data writes. */
(function(){
'use strict';
if(window.QE89Mascot)return;
var POS_KEY='ux_qe_mascot_pos_v1',HIDE_KEY='ux_qe_mascot_hidden_v1',msgIndex=0,cycleTimer=0,lastAuthName='';
function node(tag,cls){var e=document.createElement(tag);if(cls)e.className=cls;return e;}
function safeName(v){try{return window.QEPeople?QEPeople.display(v):String(v||'').split('@')[0]}catch(_){return String(v||'').split('@')[0]||'เพื่อน QE'}}
function currentName(){var u=window.QEAuth&&QEAuth.user&&QEAuth.user();return safeName(lastAuthName||(u&&u.email)||localStorage.getItem('ux_me')||'เพื่อน QE')}
function period(){var h=new Date().getHours();return h<12?'สวัสดีตอนเช้า':h<17?'สวัสดีตอนบ่าย':'สวัสดีตอนเย็น'}
function messages(){
 var pending=Number((document.getElementById('cRemain')||{}).textContent)||0,late=Number((document.getElementById('cLate')||{}).textContent)||0,name=currentName();
 return [
  period()+' คุณ '+name+' 👋',
  late>0?'มีงานเลยกำหนด '+late+' รายการ ลองเปิด Tracker ดูนะครับ':'วันนี้ค่อยๆ ทำทีละเรื่อง เดี๋ยวงานก็เรียบร้อยครับ ✨',
  pending>0?'ยังมีงานค้าง '+pending+' รายการ น้องดุ๊กดิ๊กเป็นกำลังใจให้ครับ':'งานวันนี้ดูเรียบร้อยดีมากครับ 🌟',
  'อย่าลืมกดบันทึกเมื่อแก้ข้อมูลเสร็จนะครับ 💾',
  'พักสายตาสั้นๆ แล้วกลับมาลุยต่อกันครับ 🚀',
  'มีอะไรเร่งด่วน ลองดูหน้า “วันนี้” ก่อนนะครับ'
 ];
}
function astronautSvg(){return '<svg viewBox="0 0 120 150" aria-hidden="true" focusable="false">'+
 '<defs><linearGradient id="qe89Suit" x1="28" y1="76" x2="92" y2="140" gradientUnits="userSpaceOnUse"><stop stop-color="#ffffff"/><stop offset="1" stop-color="#dbe3eb"/></linearGradient><linearGradient id="qe89Glass" x1="34" y1="29" x2="88" y2="83" gradientUnits="userSpaceOnUse"><stop stop-color="#d9edf7"/><stop offset=".55" stop-color="#9fb7c6"/><stop offset="1" stop-color="#71899a"/></linearGradient></defs>'+
 '<path d="M25 93C13 97 10 110 18 117" fill="none" stroke="#eef2f6" stroke-width="13" stroke-linecap="round"/><circle cx="17" cy="118" r="7" fill="#7b8793" stroke="#374151" stroke-width="2"/>'+
 '<path d="M95 93c12 4 15 17 7 24" fill="none" stroke="#eef2f6" stroke-width="13" stroke-linecap="round"/><circle cx="103" cy="118" r="7" fill="#7b8793" stroke="#374151" stroke-width="2"/>'+
 '<rect x="31" y="83" width="58" height="54" rx="22" fill="url(#qe89Suit)" stroke="#374151" stroke-width="3"/>'+
 '<path d="M42 88l7 41M78 88l-7 41" fill="none" stroke="#8b5e3c" stroke-width="5" stroke-linecap="round"/>'+
 '<rect x="43" y="98" width="34" height="23" rx="5" fill="#f8fafc" stroke="#4b5563" stroke-width="2"/><rect x="47" y="102" width="26" height="5" rx="2" fill="#f59e0b"/><circle cx="50" cy="114" r="2.3" fill="#2563eb"/><circle cx="57" cy="114" r="2.3" fill="#22c55e"/><rect x="63" y="111" width="9" height="5" rx="1.5" fill="#64748b"/>'+
 '<rect x="34" y="122" width="52" height="7" rx="3.5" fill="#6b7280"/><rect x="55" y="121" width="10" height="9" rx="2" fill="#f59e0b" stroke="#374151" stroke-width="1.5"/>'+
 '<path d="M44 133l-4 11M76 133l4 11" stroke="#eef2f6" stroke-width="12" stroke-linecap="round"/><path d="M31 145h22M67 145h22" stroke="#6b7280" stroke-width="8" stroke-linecap="round"/>'+
 '<circle cx="60" cy="52" r="43" fill="#ffffff" stroke="#374151" stroke-width="3.5"/><rect x="37" y="8" width="46" height="16" rx="7" fill="#eef2ff" stroke="#374151" stroke-width="2"/><text x="60" y="19.5" text-anchor="middle" font-family="Arial,Segoe UI,sans-serif" font-size="10" font-weight="800" letter-spacing=".5" fill="#143d75">AISIN</text>'+
 '<ellipse cx="60" cy="56" rx="35" ry="31" fill="url(#qe89Glass)" stroke="#334155" stroke-width="3"/><path d="M34 38c8-10 45-13 54 1l-3 8c-10-9-41-9-50 1z" fill="#6f472f"/>'+
 '<ellipse cx="60" cy="60" rx="27" ry="23" fill="#ffd3b6"/>'+
 '<path d="M38 50c7-13 15-15 23-12 8-4 17 1 21 12-8-5-15-7-21-4-8-4-15-1-23 4z" fill="#74472f"/>'+
 '<ellipse cx="49" cy="59" rx="5.5" ry="7" fill="#111827"/><ellipse cx="71" cy="59" rx="5.5" ry="7" fill="#111827"/><circle cx="47" cy="56" r="2" fill="#fff"/><circle cx="69" cy="56" r="2" fill="#fff"/><circle cx="51" cy="62" r="1" fill="#fff"/><circle cx="73" cy="62" r="1" fill="#fff"/>'+
 '<ellipse cx="42" cy="68" rx="6" ry="3.5" fill="#f59aaf" opacity=".72"/><ellipse cx="78" cy="68" rx="6" ry="3.5" fill="#f59aaf" opacity=".72"/><path d="M55 70c3 3 7 3 10 0" fill="none" stroke="#8a3f4c" stroke-width="2.3" stroke-linecap="round"/>'+
 '<path d="M31 34c5-8 12-13 19-15" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".85"/><circle cx="36" cy="31" r="3" fill="#fff" opacity=".92"/>'+
 '</svg>'}
function rocketSvg(){return '<svg viewBox="0 0 76 54" aria-hidden="true" focusable="false"><g transform="rotate(-20 38 27)"><path d="M24 29C35 10 51 7 66 9c2 15-5 30-24 38z" fill="#fff" stroke="#6d5cae" stroke-width="2"/><path d="M47 13c7-3 13-4 19-4-1 6-3 12-7 18z" fill="#ef4444"/><circle cx="46" cy="25" r="7" fill="#8ee8f2" stroke="#4338ca" stroke-width="2"/><path d="M28 31l-12 0 6 10M42 43l-2 10-9-6" fill="#f59e0b" stroke="#a84d16" stroke-width="2"/><path d="M20 36l-11 6M25 42l-10 8" stroke="#ec4899" stroke-width="4" stroke-linecap="round"/></g></svg>'}
function buildGalaxy(){
 if(document.getElementById('qe89Galaxy'))return;
 var g=node('div','qe89-galaxy');g.id='qe89Galaxy';g.setAttribute('aria-hidden','true');
 var pts=[[2,9,'c'],[10,27,'p'],[18,74,'y'],[27,16,'p'],[36,53,'c'],[42,87,'y'],[52,14,'y'],[61,69,'p'],[69,34,'c'],[77,82,'y'],[88,25,'p'],[97,44,'c'],[8,91,'y'],[30,95,'c'],[57,37,'p'],[82,58,'c'],[95,76,'p']];
 pts.forEach(function(v,i){var s=node('i','qe89-star '+v[2]);s.style.left=v[0]+'vw';s.style.top=v[1]+'vh';s.style.animationDelay=(i%6*.37)+'s';g.appendChild(s)});
 var r=node('div','qe89-rocket');r.innerHTML=rocketSvg();g.appendChild(r);document.body.appendChild(g);document.body.classList.add('qe89-space-ready');
}
function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
function saved(){try{var p=JSON.parse(localStorage.getItem(POS_KEY)||'null');return p&&isFinite(p.x)&&isFinite(p.y)?p:null}catch(_){return null}}
function remember(x,y){try{localStorage.setItem(POS_KEY,JSON.stringify({x:Math.round(x),y:Math.round(y)}))}catch(_){}}
function hiddenSaved(){try{return localStorage.getItem(HIDE_KEY)==='1'}catch(_){return false}}
function buildMascot(){
 if(document.getElementById('qe89Mascot'))return;
 var w=node('aside','qe89-mascot');w.id='qe89Mascot';w.setAttribute('aria-label','น้องดุ๊กดิ๊ก ผู้ช่วยประจำ QE Tracker');
 var bubble=node('div','qe89-mascot-bubble');bubble.id='qe89MascotGreeting';bubble.setAttribute('role','status');bubble.setAttribute('aria-live','polite');
 var btn=node('button','qe89-mascot-btn');btn.type='button';btn.innerHTML=astronautSvg();btn.title='น้องดุ๊กดิ๊ก · ลากเพื่อย้ายตำแหน่ง';btn.setAttribute('aria-label','น้องดุ๊กดิ๊ก — กดเพื่อทักทาย หรือลากเพื่อย้ายตำแหน่ง');btn.setAttribute('aria-describedby',bubble.id);
 var hide=node('button','qe89-mascot-hide');hide.type='button';hide.textContent='×';hide.title='ซ่อนน้องดุ๊กดิ๊ก';hide.setAttribute('aria-label','ซ่อนน้องดุ๊กดิ๊ก');
 var restore=node('button','qe89-mascot-restore');restore.id='qe89MascotRestore';restore.type='button';restore.innerHTML='<span aria-hidden="true">👩‍🚀</span> แสดงน้อง';restore.title='แสดงน้องดุ๊กดิ๊ก';restore.setAttribute('aria-label','แสดงน้องดุ๊กดิ๊ก');
 w.append(bubble,btn,hide);document.body.append(w,restore);
 var p=saved(),bw=window.innerWidth<=700?50:246,bh=68,x=p?p.x:window.innerWidth-bw-12,y=p?p.y:92;
 function place(nx,ny,save){x=clamp(nx,4,Math.max(4,window.innerWidth-bw-4));y=clamp(ny,62,Math.max(62,window.innerHeight-bh-6));w.style.left=x+'px';w.style.top=y+'px';w.classList.toggle('bubble-right',x<Math.min(280,window.innerWidth*.38));if(save)remember(x,y)}
 function setHidden(yes){w.hidden=!!yes;restore.hidden=!yes;try{localStorage.setItem(HIDE_KEY,yes?'1':'0')}catch(_){}if(!yes){place(x,y,true);setTimeout(function(){hello(false)},40)}}
 place(x,y,false);
 function paint(i){var list=messages();msgIndex=((i==null?msgIndex:i)%list.length+list.length)%list.length;bubble.textContent=list[msgIndex];var n=node('span','qe89-mascot-name');n.textContent='น้องดุ๊กดิ๊ก · '+(window.QE_APP_VERSION_LABEL||'v89');bubble.appendChild(n)}
 function hello(next){if(w.hidden)return;if(next)msgIndex++;paint();w.classList.add('show');clearTimeout(w.__hide);w.__hide=setTimeout(function(){w.classList.remove('show')},6200)}
 var drag=null,moved=false;
 btn.addEventListener('pointerdown',function(e){if(e.button!==0)return;drag={id:e.pointerId,sx:e.clientX,sy:e.clientY,x:x,y:y};moved=false;btn.setPointerCapture(e.pointerId);w.classList.add('dragging')});
 btn.addEventListener('pointermove',function(e){if(!drag||e.pointerId!==drag.id)return;var dx=e.clientX-drag.sx,dy=e.clientY-drag.sy;if(Math.abs(dx)+Math.abs(dy)>5)moved=true;place(drag.x+dx,drag.y+dy,moved)});
 function end(e){if(!drag||e.pointerId!==drag.id)return;place(x,y,true);drag=null;w.classList.remove('dragging');if(!moved)hello(true)}
 btn.addEventListener('pointerup',end);btn.addEventListener('pointercancel',end);
 btn.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();hello(true)}});
 hide.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();setHidden(true)});restore.addEventListener('click',function(){setHidden(false);btn.focus()});
 window.addEventListener('resize',function(){place(x,y,true)},{passive:true});
 window.addEventListener('qeauth:ready',function(e){lastAuthName=e&&e.detail&&(e.detail.email||e.detail.displayName)||'';msgIndex=0;hello(false)});
 paint(0);setHidden(hiddenSaved());if(!w.hidden)hello(false);cycleTimer=setInterval(function(){if(document.hidden||document.body.classList.contains('qe-chat-open')||w.hidden)return;hello(true)},36000);
 w.__qeHello=hello;w.__qePaint=paint;w.__qePlace=place;w.__qeSetHidden=setHidden;
}
function addStyle(){if(document.getElementById('qe89SpaceStyle'))return;var st=node('style');st.id='qe89SpaceStyle';st.textContent=`
 #qeMain{position:relative;z-index:1}
 body.qe89-space-ready:not(.neo),body.neo.holo.qe89-space-ready{--bgbase:#f8f5ff;--bg:#f8f5ff;--card:rgba(255,255,255,.94);--pop:#fff;--txt:#24143f;--mut:#5e4c70;--line:#b9a9d9;color-scheme:light;background:radial-gradient(900px 540px at 7% -8%,rgba(244,114,182,.25),transparent 61%),radial-gradient(880px 560px at 98% 4%,rgba(129,140,248,.25),transparent 61%),radial-gradient(760px 520px at 55% 108%,rgba(56,189,248,.20),transparent 62%),linear-gradient(145deg,#fff8fc 0%,#f4efff 48%,#eef9ff 100%);background-attachment:fixed}
 body.neo:not(.holo).qe89-space-ready{--bgbase:#111a34;--bg:#111a34;--card:rgba(21,32,61,.95);--txt:#f8fafc;--mut:#cbd5e1;--pop:#15203d;background:radial-gradient(980px 620px at 7% -8%,rgba(79,70,229,.27),transparent 60%),radial-gradient(900px 620px at 100% 5%,rgba(190,24,93,.18),transparent 62%),radial-gradient(760px 520px at 52% 108%,rgba(8,145,178,.17),transparent 62%),linear-gradient(145deg,#101a35 0%,#171c40 56%,#2b193b 100%);background-attachment:fixed}
 body.neo.holo.qe89-space-ready .card,body.neo.holo.qe89-space-ready form,body.neo.holo.qe89-space-ready .ot-nav{background:rgba(255,255,255,.92)}
 .qe89-galaxy{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
 .qe89-star{position:absolute;width:10px;height:10px;opacity:.55;filter:drop-shadow(0 0 4px currentColor);animation:qe89Twinkle 3.2s ease-in-out infinite}
 .qe89-star::before,.qe89-star::after{content:'';position:absolute;left:4px;top:0;width:2px;height:10px;border-radius:99px;background:currentColor}.qe89-star::after{transform:rotate(90deg)}
 .qe89-star.c{color:#0284a8}.qe89-star.p{color:#c02670}.qe89-star.y{color:#b45309}body.neo:not(.holo) .qe89-star{opacity:.82}.qe89-star:nth-child(3n){width:7px;height:7px}.qe89-star:nth-child(3n)::before{left:3px;height:7px}.qe89-star:nth-child(3n)::after{left:3px;height:7px}
 .qe89-rocket{position:absolute;left:-88px;top:18vh;width:50px;height:36px;opacity:.86;will-change:transform;animation:qe89RocketCruise 22s ease-in-out infinite alternate;pointer-events:none}
 .qe89-rocket svg{display:block;width:100%;height:100%}
 .qe89-mascot{position:fixed;z-index:10025;display:flex;align-items:flex-start;gap:5px;pointer-events:none;filter:drop-shadow(0 6px 12px rgba(49,46,129,.20));touch-action:none;user-select:none}
 .qe89-mascot[hidden],body.qe-chat-open .qe89-mascot,.qe89-mascot.qe-chat-occluded{display:none!important}
 .qe89-mascot-btn{pointer-events:auto;width:52px;height:66px;border:0;padding:0;background:transparent;cursor:grab;touch-action:none}.qe89-mascot-btn:active,.qe89-mascot.dragging .qe89-mascot-btn{cursor:grabbing}.qe89-mascot-btn svg{width:52px;height:66px;display:block}
 .qe89-mascot-btn:focus-visible,.qe89-mascot-hide:focus-visible,.qe89-mascot-restore:focus-visible{outline:3px solid #b45309;outline-offset:2px}
 .qe89-mascot-hide{position:absolute;right:42px;top:-5px;z-index:2;pointer-events:auto;width:22px;height:22px;border:1px solid #7766a8;border-radius:50%;padding:0;background:#fff;color:#312e81;font:800 16px/18px Arial;cursor:pointer;box-shadow:0 2px 8px rgba(49,46,129,.2)}
 .qe89-mascot.bubble-right .qe89-mascot-hide{right:auto;left:42px}
 .qe89-mascot-restore{position:fixed;right:52px;bottom:14px;z-index:10026;min-height:32px;padding:5px 10px;border:1px solid #7766a8;border-radius:999px;background:#fff;color:#312e81;font:800 11px/1.2 "Segoe UI",sans-serif;cursor:pointer;box-shadow:0 5px 18px rgba(49,46,129,.22)}
 .qe89-mascot-restore[hidden],body.qe-chat-open .qe89-mascot-restore{display:none!important}
 .qe89-mascot-bubble{order:-1;align-self:flex-start;max-width:184px;margin-top:7px;border:1px solid #7766a8;border-radius:14px 5px 14px 14px;padding:7px 9px;background:#fff;color:#312e81;font-size:11.5px;font-weight:800;line-height:1.42;box-shadow:0 7px 20px rgba(49,46,129,.18);opacity:0;transform:translateY(-4px) scale(.98);transition:opacity .18s,transform .18s;pointer-events:none}
 .qe89-mascot.show .qe89-mascot-bubble,.qe89-mascot:focus-within .qe89-mascot-bubble{opacity:1;transform:none}
 .qe89-mascot.bubble-right{flex-direction:row-reverse}.qe89-mascot.bubble-right .qe89-mascot-bubble{border-radius:5px 14px 14px 14px}
 .qe89-mascot-name{display:block;margin-top:3px;color:#4338ca;font-size:10px}
 body.neo:not(.holo) .qe89-mascot-bubble,body.neo:not(.holo) .qe89-mascot-restore,body.neo:not(.holo) .qe89-mascot-hide{background:#15203d;color:#f8fafc;border-color:#9aa5d5}body.neo:not(.holo) .qe89-mascot-name{color:#c7d2fe}
 @keyframes qe89Twinkle{0%,100%{transform:scale(.72);opacity:.30}50%{transform:scale(1.2);opacity:.9}}
 @keyframes qe89RocketCruise{0%{transform:translate3d(0,0,0) rotate(-5deg)}24%{transform:translate3d(calc(25vw + 40px),7vh,0) rotate(1deg)}52%{transform:translate3d(calc(54vw + 80px),-4vh,0) rotate(-3deg)}76%{transform:translate3d(calc(78vw + 110px),9vh,0) rotate(2deg)}100%{transform:translate3d(calc(100vw + 170px),1vh,0) rotate(-4deg)}}
 @media(max-width:700px){.qe89-mascot-btn,.qe89-mascot-btn svg{width:46px;height:58px}.qe89-mascot-bubble{display:none}.qe89-mascot-hide{right:-2px;top:-8px}.qe89-mascot.bubble-right .qe89-mascot-hide{left:36px}.qe89-rocket{width:42px;top:16vh}.qe89-mascot-restore{right:48px}}
 @media(prefers-reduced-motion:reduce){.qe89-star,.qe89-rocket{animation:none}.qe89-rocket{left:auto;right:8vw;top:72px;transform:none}.qe89-mascot-bubble{transition:none}}
 @media print{.qe89-galaxy,.qe89-mascot,.qe89-mascot-restore{display:none!important}}
 `;document.head.appendChild(st)}
function start(){addStyle();buildGalaxy();buildMascot()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
var api=Object.freeze({version:String(window.QE_APP_VERSION||'89'),refresh:function(){var w=document.getElementById('qe89Mascot');if(w&&w.__qeHello)w.__qeHello(false)},resetPosition:function(){try{localStorage.removeItem(POS_KEY)}catch(_){}location.reload()},show:function(){var w=document.getElementById('qe89Mascot');if(w&&w.__qeSetHidden)w.__qeSetHidden(false)},hide:function(){var w=document.getElementById('qe89Mascot');if(w&&w.__qeSetHidden)w.__qeSetHidden(true)}});window.QE89Mascot=api;window.QE88Mascot=api;window.QE87Mascot=api;window.QE86Mascot=api;
})();
