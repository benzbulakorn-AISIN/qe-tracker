/* QE Tracker v88 — v84-style galaxy theme and “น้องดุ๊กดิ๊ก”. No network or business-data writes. */
(function(){
'use strict';
if(window.QE88Mascot)return;
var POS_KEY='ux_qe_mascot_pos_v1',msgIndex=0,cycleTimer=0,lastAuthName='';
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
function astronautSvg(){return '<svg viewBox="0 0 92 104" aria-hidden="true" focusable="false">'+
 '<defs><linearGradient id="qe88Suit" x1="18" y1="16" x2="74" y2="92" gradientUnits="userSpaceOnUse"><stop stop-color="#fff"/><stop offset="1" stop-color="#dbeafe"/></linearGradient><linearGradient id="qe88Glass" x1="28" y1="24" x2="67" y2="60" gradientUnits="userSpaceOnUse"><stop stop-color="#bfdbfe"/><stop offset=".55" stop-color="#fef3c7"/><stop offset="1" stop-color="#c4b5fd"/></linearGradient></defs>'+
 '<path d="M16 71c-9 5-11 15-6 20 4 4 10 1 15-6M76 71c9 5 11 15 6 20-4 4-10 1-15-6" fill="none" stroke="#a5b4fc" stroke-width="7" stroke-linecap="round"/>'+
 '<rect x="24" y="61" width="44" height="36" rx="18" fill="url(#qe88Suit)" stroke="#818cf8" stroke-width="3"/><path d="M36 92v8M56 92v8" stroke="#6366f1" stroke-width="7" stroke-linecap="round"/>'+
 '<circle cx="46" cy="42" r="31" fill="url(#qe88Suit)" stroke="#818cf8" stroke-width="3"/><circle cx="46" cy="42" r="23" fill="url(#qe88Glass)" stroke="#f8fafc" stroke-width="4"/>'+
 '<circle cx="38" cy="40" r="2.5" fill="#312e81"/><circle cx="54" cy="40" r="2.5" fill="#312e81"/><path d="M39 50c4 5 10 5 14 0" fill="none" stroke="#db2777" stroke-width="2.5" stroke-linecap="round"/>'+
 '<circle cx="33" cy="47" r="3" fill="#f9a8d4" opacity=".75"/><circle cx="59" cy="47" r="3" fill="#f9a8d4" opacity=".75"/>'+
 '<rect x="38" y="68" width="16" height="12" rx="3" fill="#4f46e5"/><circle cx="42" cy="74" r="1.5" fill="#67e8f9"/><circle cx="49" cy="74" r="1.5" fill="#facc15"/>'+
 '<path d="M68 24l6-7M22 24l-6-7" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round"/><circle cx="75" cy="16" r="3" fill="#facc15"/><circle cx="15" cy="16" r="3" fill="#22d3ee"/>'+
 '</svg>'}
function rocketSvg(){return '<svg viewBox="0 0 76 54" aria-hidden="true" focusable="false"><g transform="rotate(-20 38 27)"><path d="M24 29C35 10 51 7 66 9c2 15-5 30-24 38z" fill="#fff" stroke="#a78bfa" stroke-width="2"/><path d="M47 13c7-3 13-4 19-4-1 6-3 12-7 18z" fill="#ef4444"/><circle cx="46" cy="25" r="7" fill="#67e8f9" stroke="#4f46e5" stroke-width="2"/><path d="M28 31l-12 0 6 10M42 43l-2 10-9-6" fill="#f59e0b" stroke="#d97706" stroke-width="2"/><path d="M20 36l-11 6M25 42l-10 8" stroke="#ec4899" stroke-width="4" stroke-linecap="round"/></g></svg>'}
function buildGalaxy(){
 if(document.getElementById('qe88Galaxy'))return;
 var g=node('div','qe88-galaxy');g.id='qe88Galaxy';g.setAttribute('aria-hidden','true');
 var pts=[[2,9,'c'],[10,27,'p'],[18,74,'y'],[27,16,'p'],[36,53,'c'],[42,87,'y'],[52,14,'y'],[61,69,'p'],[69,34,'c'],[77,82,'y'],[88,25,'p'],[97,44,'c'],[8,91,'y'],[30,95,'c'],[57,37,'p'],[82,58,'c'],[95,76,'p']];
 pts.forEach(function(v,i){var s=node('i','qe88-star '+v[2]);s.style.left=v[0]+'vw';s.style.top=v[1]+'vh';s.style.animationDelay=(i%6*.37)+'s';g.appendChild(s)});
 var r=node('div','qe88-rocket');r.innerHTML=rocketSvg();g.appendChild(r);document.body.appendChild(g);document.body.classList.add('qe88-space-ready');
}
function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
function saved(){try{var p=JSON.parse(localStorage.getItem(POS_KEY)||'null');return p&&isFinite(p.x)&&isFinite(p.y)?p:null}catch(_){return null}}
function remember(x,y){try{localStorage.setItem(POS_KEY,JSON.stringify({x:Math.round(x),y:Math.round(y)}))}catch(_){}}
function buildMascot(){
 if(document.getElementById('qe88Mascot'))return;
 var w=node('aside','qe88-mascot');w.id='qe88Mascot';w.setAttribute('aria-label','น้องดุ๊กดิ๊ก ผู้ช่วยประจำ QE Tracker');
 var bubble=node('div','qe88-mascot-bubble');bubble.id='qe88MascotGreeting';bubble.setAttribute('role','status');bubble.setAttribute('aria-live','polite');
 var btn=node('button','qe88-mascot-btn');btn.type='button';btn.innerHTML=astronautSvg();btn.title='น้องดุ๊กดิ๊ก · ลากเพื่อย้ายตำแหน่ง';btn.setAttribute('aria-label','น้องดุ๊กดิ๊ก — กดเพื่อทักทาย หรือลากเพื่อย้ายตำแหน่ง');btn.setAttribute('aria-describedby',bubble.id);
 w.append(bubble,btn);document.body.appendChild(w);
 var p=saved(),bw=window.innerWidth<=700?52:252,bh=78,x=p?p.x:window.innerWidth-bw-12,y=p?p.y:96;
 function place(nx,ny,save){x=clamp(nx,4,Math.max(4,window.innerWidth-bw-4));y=clamp(ny,70,Math.max(70,window.innerHeight-bh-6));w.style.left=x+'px';w.style.top=y+'px';w.classList.toggle('bubble-right',x<Math.min(280,window.innerWidth*.38));if(save)remember(x,y)}
 place(x,y,false);
 function paint(i){var list=messages();msgIndex=((i==null?msgIndex:i)%list.length+list.length)%list.length;bubble.textContent=list[msgIndex];var n=node('span','qe88-mascot-name');n.textContent='น้องดุ๊กดิ๊ก · '+(window.QE_APP_VERSION_LABEL||'v88');bubble.appendChild(n)}
 function hello(next){if(next)msgIndex++;paint();w.classList.add('show');clearTimeout(w.__hide);w.__hide=setTimeout(function(){w.classList.remove('show')},6200)}
 var drag=null,moved=false;
 btn.addEventListener('pointerdown',function(e){if(e.button!==0)return;drag={id:e.pointerId,sx:e.clientX,sy:e.clientY,x:x,y:y};moved=false;btn.setPointerCapture(e.pointerId);w.classList.add('dragging')});
 btn.addEventListener('pointermove',function(e){if(!drag||e.pointerId!==drag.id)return;var dx=e.clientX-drag.sx,dy=e.clientY-drag.sy;if(Math.abs(dx)+Math.abs(dy)>5)moved=true;place(drag.x+dx,drag.y+dy,moved)});
 function end(e){if(!drag||e.pointerId!==drag.id)return;place(x,y,true);drag=null;w.classList.remove('dragging');if(!moved)hello(true)}
 btn.addEventListener('pointerup',end);btn.addEventListener('pointercancel',end);
 /* Mouse fallback keeps drag reliable in older Chromium/WebView builds while Pointer Events remain primary. */
 btn.addEventListener('mousedown',function(e){if(e.button!==0||drag)return;drag={id:'mouse',sx:e.clientX,sy:e.clientY,x:x,y:y};moved=false;w.classList.add('dragging');e.preventDefault()});
 window.addEventListener('mousemove',function(e){if(!drag)return;var dx=e.clientX-drag.sx,dy=e.clientY-drag.sy;if(Math.abs(dx)+Math.abs(dy)>5)moved=true;place(drag.x+dx,drag.y+dy,moved)});
 window.addEventListener('mouseup',function(){if(!drag)return;place(x,y,true);drag=null;w.classList.remove('dragging');if(!moved)hello(true)});
 btn.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();hello(true)}});
 window.addEventListener('resize',function(){place(x,y,true)},{passive:true});
 window.addEventListener('qeauth:ready',function(e){lastAuthName=e&&e.detail&&(e.detail.email||e.detail.displayName)||'';msgIndex=0;hello(false)});
 paint(0);hello(false);cycleTimer=setInterval(function(){if(document.hidden||document.body.classList.contains('qe-chat-open'))return;hello(true)},36000);
 w.__qeHello=hello;w.__qePaint=paint;w.__qePlace=place;
}
function addStyle(){if(document.getElementById('qe88SpaceStyle'))return;var st=node('style');st.id='qe88SpaceStyle';st.textContent=`
 #qeMain{position:relative;z-index:1}
 body.qe88-space-ready:not(.neo){--bg:#f6f5ff;background:radial-gradient(900px 520px at 8% -8%,rgba(129,140,248,.19),transparent 62%),radial-gradient(820px 540px at 96% 3%,rgba(244,114,182,.17),transparent 60%),radial-gradient(700px 520px at 54% 108%,rgba(34,211,238,.13),transparent 61%),linear-gradient(145deg,#fbfdff 0%,#f2f1ff 54%,#fff5fb 100%);background-attachment:fixed}
 body.neo.qe88-space-ready{--bgbase:#0d1937;--bg:#0d1937;--card:rgba(17,31,62,.92);--txt:#f8fafc;--mut:#cbd5e1;--pop:#111f3e;background:radial-gradient(980px 620px at 7% -8%,rgba(79,70,229,.28),transparent 60%),radial-gradient(900px 620px at 100% 5%,rgba(190,24,93,.20),transparent 62%),radial-gradient(760px 520px at 52% 108%,rgba(8,145,178,.18),transparent 62%),linear-gradient(145deg,#0b1733 0%,#12183a 56%,#2a1737 100%);background-attachment:fixed}
 .qe88-galaxy{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
 .qe88-star{position:absolute;width:10px;height:10px;opacity:.58;filter:drop-shadow(0 0 4px currentColor);animation:qe88Twinkle 3.2s ease-in-out infinite}
 .qe88-star::before,.qe88-star::after{content:'';position:absolute;left:4px;top:0;width:2px;height:10px;border-radius:99px;background:currentColor}.qe88-star::after{transform:rotate(90deg)}
 .qe88-star.c{color:#0891b2}.qe88-star.p{color:#db2777}.qe88-star.y{color:#d97706}body.neo .qe88-star{opacity:.8}.qe88-star:nth-child(3n){width:7px;height:7px}.qe88-star:nth-child(3n)::before{left:3px;height:7px}.qe88-star:nth-child(3n)::after{left:3px;height:7px}
 .qe88-rocket{position:absolute;left:-88px;top:18vh;width:54px;height:38px;opacity:.84;will-change:transform;animation:qe88RocketCruise 22s ease-in-out infinite alternate;pointer-events:none}
 .qe88-rocket svg{display:block;width:100%;height:100%}
 .qe88-mascot{position:fixed;z-index:10025;display:flex;align-items:flex-start;gap:6px;pointer-events:none;filter:drop-shadow(0 6px 12px rgba(49,46,129,.22));touch-action:none;user-select:none}
 .qe88-mascot[hidden],body.qe-chat-open .qe88-mascot,.qe88-mascot.qe-chat-occluded{display:none!important}
 .qe88-mascot-btn{pointer-events:auto;width:58px;height:72px;border:0;padding:0;background:transparent;cursor:grab;touch-action:none}.qe88-mascot-btn:active,.qe88-mascot.dragging .qe88-mascot-btn{cursor:grabbing}.qe88-mascot-btn svg{width:58px;height:72px;display:block}
 .qe88-mascot-btn:focus-visible{outline:3px solid #d97706;outline-offset:2px;border-radius:28px}
 .qe88-mascot-bubble{order:-1;align-self:flex-start;max-width:188px;margin-top:8px;border:1px solid #818cf8;border-radius:14px 5px 14px 14px;padding:7px 9px;background:#fff;color:#312e81;font-size:11.5px;font-weight:800;line-height:1.42;box-shadow:0 7px 20px rgba(49,46,129,.20);opacity:0;transform:translateY(-4px) scale(.98);transition:opacity .18s,transform .18s;pointer-events:none}
 .qe88-mascot.show .qe88-mascot-bubble,.qe88-mascot:focus-within .qe88-mascot-bubble{opacity:1;transform:none}
 .qe88-mascot.bubble-right{flex-direction:row-reverse}.qe88-mascot.bubble-right .qe88-mascot-bubble{border-radius:5px 14px 14px 14px}
 .qe88-mascot-name{display:block;margin-top:3px;color:#4338ca;font-size:10px}
 body.neo .qe88-mascot-bubble{background:#111f3e;color:#f8fafc;border-color:#818cf8}body.neo .qe88-mascot-name{color:#c7d2fe}
 @keyframes qe88Twinkle{0%,100%{transform:scale(.72);opacity:.32}50%{transform:scale(1.2);opacity:.9}}
 @keyframes qe88RocketCruise{0%{transform:translate3d(0,0,0) rotate(-5deg)}24%{transform:translate3d(calc(25vw + 40px),7vh,0) rotate(1deg)}52%{transform:translate3d(calc(54vw + 80px),-4vh,0) rotate(-3deg)}76%{transform:translate3d(calc(78vw + 110px),9vh,0) rotate(2deg)}100%{transform:translate3d(calc(100vw + 170px),1vh,0) rotate(-4deg)}}
 @media(max-width:700px){.qe88-mascot-btn,.qe88-mascot-btn svg{width:48px;height:60px}.qe88-mascot-bubble{display:none}.qe88-rocket{width:44px;top:16vh}}
 @media(prefers-reduced-motion:reduce){.qe88-star,.qe88-rocket{animation:none}.qe88-rocket{left:auto;right:8vw;top:74px;transform:none}.qe88-mascot-bubble{transition:none}}
 @media print{.qe88-galaxy,.qe88-mascot{display:none!important}}
 `;document.head.appendChild(st)}
function start(){addStyle();buildGalaxy();buildMascot()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
var api=Object.freeze({version:String(window.QE_APP_VERSION||'88'),refresh:function(){var w=document.getElementById('qe88Mascot');if(w&&w.__qeHello)w.__qeHello(false)},resetPosition:function(){try{localStorage.removeItem(POS_KEY)}catch(_){}location.reload()}});window.QE88Mascot=api;window.QE87Mascot=api;window.QE86Mascot=api;
})();
