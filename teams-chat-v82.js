/*
  QE Tracker — Microsoft Teams Chat v82 — 2-Nov-2026
  Change log:
  1) New companion file based on teams-chat-v81.js; earlier Teams chat files are not overwritten.
  2) Message sender names are formatted through the shared QEPeople display directory (nickname, optional directory display_name, or readable email local-part).
  3) Raw sender_name/sender_id payloads, Auth tokens, viewer/editor/admin permissions, polling, unread logic, Supabase REST calls, and teams-send-message behavior are unchanged.
*/
(function(){
'use strict';
if(window.__QE_TEAMS_CHAT)return;
window.__QE_TEAMS_CHAT=true;

var C={room:'teams-qe',title:'QE Teams Chat',chatLabel:'QE ABS Dream team',fnSend:'teams-send-message',pollOpen:5000,pollIdle:20000,limit:100,maxLen:1000};
var U=window.QE_TEAMS_CHAT_CFG||{};
Object.keys(U).forEach(function(k){C[k]=U[k];});
var cloud=window.COUNTERMEASURE_CLOUD_DEFAULTS||{};
var base=String(cloud.supabaseUrl||'').replace(/\/$/,''),key=String(cloud.supabaseKey||'');
var SEENK='ux_teams_seen_v1',seen=null;
try{var sv=localStorage.getItem(SEENK);seen=sv===null?null:(Number(sv)||0);}catch(e){seen=null;}
function saveSeen(v){seen=Number(v)||0;try{localStorage.setItem(SEENK,String(seen));}catch(e){}}
function $(id){return document.getElementById(id);}
function E(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function me(){try{var au=window.QEAuth&&QEAuth.enabled&&QEAuth.enabled()&&QEAuth.user&&QEAuth.user();var n=(au&&au.email)||localStorage.getItem('ux_me')||(($('cbWn')||{}).title)||(($('cbWn')||{}).textContent)||'';return String(n).replace(/^บัญชี:\s*/,'').split(' · ')[0].trim()||'Guest';}catch(e){return'Guest';}}
function shown(v){try{return window.QEPeople?QEPeople.display(v):String(v||'');}catch(e){return String(v||'');}}
function stamp(v){try{return new Intl.DateTimeFormat('th-TH',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'short'}).format(new Date(v));}catch(e){return'';}}
function linkify(escaped){return escaped.replace(/(https?:\/\/[^\s<]+)/g,function(u){var tail='',m=/[.,;:!?)\]]+$/.exec(u);if(m){tail=m[0];u=u.slice(0,-tail.length);}return'<a href="'+u+'" target="_blank" rel="noopener noreferrer">'+u+'</a>'+tail;});}
function authOn(){try{return!!(window.QEAuth&&QEAuth.enabled&&QEAuth.enabled());}catch(e){return false;}}
function canSend(){try{return!authOn()||QEAuth.can('write');}catch(e){return!authOn();}}
async function accessToken(){
 if(!authOn())return key;
 if(!window.QEAuth||!QEAuth.getAccessToken)throw new Error('ยังไม่พร้อมใช้งาน Supabase Auth — กรุณารีเฟรชหน้าและล็อกอินใหม่');
 await QEAuth.ready();
 return await QEAuth.getAccessToken();
}
async function headers(extra){
 var token=await accessToken();
 if(authOn()&&!token)throw new Error('Session หมดอายุ — กรุณาล็อกอินใหม่');
 return Object.assign({'Accept':'application/json','apikey':key,'Authorization':'Bearer '+token},extra||{});
}
async function cloudFetch(url,opt,retry){
 opt=Object.assign({},opt||{});var extra=Object.assign({},opt.headers||{});delete extra.apikey;delete extra.Authorization;
 opt.headers=await headers(extra);
 var r=await fetch(url,opt);
 if((r.status===401||r.status===403)&&authOn()&&retry!==false){
  try{await QEAuth.refreshSession();opt.headers=await headers(extra);return await fetch(url,opt);}catch(e){try{await QEAuth.signOut();}catch(x){}throw new Error('Session หมดอายุหรือไม่มีสิทธิ์ — กรุณาล็อกอินใหม่');}
 }
 return r;
}

function boot(){
 if($('qeTeamsFab'))return;
 var css=document.createElement('style');css.id='qeTeamsV82Css';css.textContent=
 '.qet-fab{position:fixed;right:12px;bottom:174px;z-index:246;width:46px;height:46px;padding:0;border:0;border-radius:999px;background:linear-gradient(135deg,#6264a7,#464775);color:#fff;font:800 19px/1 "Segoe UI",sans-serif;box-shadow:0 8px 24px rgba(70,71,117,.38);cursor:pointer;display:flex;align-items:center;justify-content:center}.qet-fab:hover{filter:brightness(1.1)}.qet-badge{display:none;position:absolute;right:-5px;top:-5px;min-width:20px;height:20px;padding:0 5px;border-radius:99px;background:#dc2626;color:#fff;font-size:10px;align-items:center;justify-content:center}.qet-badge.on{display:flex}.qet-panel{position:fixed;right:18px;bottom:232px;z-index:247;width:min(390px,calc(100vw - 24px));height:min(540px,calc(100vh - 250px));display:none;flex-direction:column;overflow:hidden;border:1px solid var(--line,#cbd5e1);border-radius:18px;background:var(--card,#fff);color:var(--txt,#172033);box-shadow:0 18px 60px rgba(0,0,0,.36)}.qet-panel.on{display:flex}.qet-head{display:flex;align-items:center;gap:9px;padding:12px 14px;background:linear-gradient(135deg,#6264a7,#464775);color:#fff}.qet-head>div{flex:1;min-width:0}.qet-head b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.qet-sub{font-size:10px;opacity:.88;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.qet-dot{flex:0 0 auto;width:9px;height:9px;border-radius:50%;background:#f59e0b}.qet-dot.ok{background:#22c55e}.qet-dot.err{background:#ef4444}.qet-close{flex:0 0 auto;width:30px;height:30px;margin-left:auto;border:0;border-radius:999px;padding:0;background:rgba(255,255,255,.18);color:#fff;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;line-height:1}.qet-close:hover{background:rgba(255,255,255,.28)}.qet-close:focus-visible{outline:3px solid #fde68a;outline-offset:2px}.qet-msgs{flex:1;overflow:auto;padding:12px;background:color-mix(in srgb,var(--soft,#eef2ff) 70%,var(--card,#fff));display:flex;flex-direction:column;gap:8px}.qet-empty{text-align:center;color:var(--mut,#64748b);padding:28px 10px;font-size:13px}.qet-row{display:flex;flex-direction:column;align-items:flex-start}.qet-row.me{align-items:flex-end}.qet-meta{margin:0 5px 2px;color:var(--mut,#64748b);font-size:10px}.qet-bubble{max-width:85%;padding:8px 11px;border:1px solid var(--line,#cbd5e1);border-radius:14px 14px 14px 4px;background:var(--card,#fff);white-space:pre-wrap;word-break:break-word;font-size:13px;line-height:1.45}.qet-bubble a{color:#2563eb;text-decoration:underline}.qet-row.me .qet-bubble{border-color:#6264a7;border-radius:14px 14px 4px 14px;background:#6264a7;color:#fff}.qet-row.me .qet-bubble a{color:#fff}.qet-compose{padding:9px;border-top:1px solid var(--line,#cbd5e1);background:var(--card,#fff)}.qet-compose-row{display:flex;gap:7px}.qet-input{flex:1;min-width:0;min-height:40px;max-height:100px;resize:none;border:1px solid var(--line,#cbd5e1);border-radius:12px;padding:9px;background:var(--inp,#fff);color:var(--txt,#172033)}.qet-send{border:0;border-radius:12px;padding:8px 14px;background:#6264a7;color:#fff;font-weight:800;cursor:pointer}.qet-send:disabled{opacity:.5;cursor:not-allowed}.qet-status{min-height:14px;margin-top:5px;color:var(--mut,#64748b);font-size:10px}.qet-status.err{color:#dc2626}.qet-ro{font-weight:700;color:#b45309}@media(max-width:600px){.qet-fab{right:10px}.qet-panel{right:6px;bottom:228px;width:calc(100vw - 12px);height:min(520px,calc(100vh - 240px));border-radius:14px}}@media print{.qet-fab,.qet-panel{display:none!important}}';
 document.head.appendChild(css);
 var fab=document.createElement('button');fab.type='button';fab.id='qeTeamsFab';fab.className='qet-fab';fab.title=C.title;fab.setAttribute('aria-label',C.title);fab.innerHTML='T<span id="qeTeamsBadge" class="qet-badge">0</span>';
 var panel=document.createElement('section');panel.id='qeTeamsPanel';panel.className='qet-panel';panel.setAttribute('aria-label',C.title);panel.innerHTML='<div class="qet-head"><span id="qetDot" class="qet-dot"></span><div><b>'+E(C.title)+'</b><div class="qet-sub">'+E(C.chatLabel)+'</div></div><button type="button" id="qetClose" class="qet-close" aria-label="ปิดหน้าต่างแชท">✕</button></div><div id="qetMsgs" class="qet-msgs" role="region" aria-label="ข้อความ Microsoft Teams" tabindex="0"><div class="qet-empty">กำลังโหลดข้อความ…</div></div><div class="qet-compose"><div class="qet-compose-row"><textarea id="qetInput" class="qet-input" maxlength="'+Number(C.maxLen)+'" placeholder="พิมพ์ข้อความถึง Microsoft Teams…"></textarea><button type="button" id="qetSend" class="qet-send">ส่ง</button></div><div id="qetStatus" class="qet-status" aria-live="polite"></div></div>';
 document.body.appendChild(fab);document.body.appendChild(panel);
 run();
}

function run(){
 var fab=$('qeTeamsFab'),panel=$('qeTeamsPanel'),elMsgs=$('qetMsgs'),elInput=$('qetInput'),elSend=$('qetSend'),elStatus=$('qetStatus'),elDot=$('qetDot'),elBadge=$('qeTeamsBadge');
 var busy=false,sending=false,timer=0;
 function place(){var up=$('ux33Top'),raised=!!(up&&up.classList.contains('on'));fab.style.bottom=(raised?230:174)+'px';panel.style.bottom=(raised?288:232)+'px';}
 function isOpen(){return panel.classList.contains('on');}
 function setStatus(t,err){elStatus.textContent=t||'';elStatus.classList.toggle('err',!!err);}
 function setDot(cls){elDot.className='qet-dot'+(cls?' '+cls:'');}
 function setBadge(n){elBadge.textContent=n>99?'99+':String(n);elBadge.classList.toggle('on',n>0);fab.title=C.title+(n?' — ข้อความใหม่ '+n:'');}
 function row(m){var raw=String(m.sender_name||''),own=raw===me();return'<div class="qet-row'+(own?' me':'')+'"><div class="qet-meta" title="'+E(raw)+'">'+E(shown(raw))+' · '+E(stamp(m.created_at))+(m.source?' · '+E(m.source):'')+'</div><div class="qet-bubble">'+linkify(E(m.message||''))+'</div></div>';}
 function draw(data){var near=elMsgs.scrollHeight-elMsgs.scrollTop-elMsgs.clientHeight<80,first=elMsgs.dataset.drawn!=='1';if(!data.length)elMsgs.innerHTML='<div class="qet-empty">ยังไม่มีข้อความ<br>พิมพ์ข้อความด้านล่าง ระบบจะส่งผ่าน Microsoft Teams <b></b></div>',elMsgs.querySelector('b').textContent=C.chatLabel;else elMsgs.innerHTML=data.map(row).join('');elMsgs.dataset.drawn='1';if(first||near)elMsgs.scrollTop=elMsgs.scrollHeight;}
 async function load(silent){
  if(!base||!key){setStatus('ไม่พบการตั้งค่า Supabase',true);setDot('err');draw([]);return;}
  if(busy)return;busy=true;
  try{var url=base+'/rest/v1/chat_messages?select=id,sender_name,message,created_at,source&room_key=eq.'+encodeURIComponent(C.room)+'&deleted_at=is.null&order=created_at.desc&limit='+Number(C.limit);var res=await cloudFetch(url,{headers:{}},true);var j=await res.json().catch(function(){return null;});if(!res.ok||!Array.isArray(j))throw new Error((j&&(j.message||j.error))||('HTTP '+res.status));var data=j.reverse(),latest=0;data.forEach(function(m){var n=Number(m.id)||0;if(n>latest)latest=n;});if(seen===null)saveSeen(latest);if(isOpen()){if(latest>seen)saveSeen(latest);setBadge(0);}else{var who=me(),n2=0;data.forEach(function(m){if((Number(m.id)||0)>seen&&m.sender_name!==who)n2++;});setBadge(n2);}draw(data);setDot('ok');if(!silent)setStatus('เชื่อมต่อแล้ว · '+data.length+' ข้อความ'+(canSend()?'':' · viewer ดูอย่างเดียว'));}
  catch(e){setDot('err');setStatus('โหลดข้อความไม่สำเร็จ: '+String(e.message||e),true);if(!elMsgs.dataset.drawn)elMsgs.innerHTML='<div class="qet-empty">โหลดข้อความไม่สำเร็จ</div>';}
  finally{busy=false;schedule();}
 }
 async function send(){
  var text=elInput.value.trim(),name=me();if(!text||sending)return;if(!canSend()){setStatus('บัญชี viewer อ่านได้ แต่ส่งข้อความไม่ได้',true);return;}if(name==='Guest'){setStatus('กรุณาล็อกอิน/ระบุชื่อผู้ใช้ก่อนส่งข้อความ',true);return;}
  sending=true;elSend.disabled=true;setStatus('กำลังส่ง…');
  try{var url=base+'/functions/v1/'+encodeURIComponent(C.fnSend);var res=await cloudFetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({room_key:C.room,sender_id:name,sender_name:name,message:text.slice(0,Number(C.maxLen)),source:'tracker'})},true);var raw=await res.text(),j={};try{j=raw?JSON.parse(raw):{};}catch(e){}if(!res.ok||j.ok===false)throw new Error(j.error||j.message||raw||('HTTP '+res.status));elInput.value='';setStatus('ส่งเข้า Microsoft Teams แล้ว');await load(false);}
  catch(e){setStatus('ส่งไม่สำเร็จ: '+String(e.message||e).slice(0,180),true);}
  finally{sending=false;elSend.disabled=!canSend();elInput.focus();}
 }
 function schedule(){clearTimeout(timer);timer=setTimeout(function(){load(true);},isOpen()?Number(C.pollOpen):Number(C.pollIdle));}
 function open(){panel.classList.add('on');setBadge(0);elSend.disabled=!canSend();if(!canSend())setStatus('viewer ดูข้อความได้อย่างเดียว');load(false);setTimeout(function(){elInput.focus();},30);}
 function close(){panel.classList.remove('on');schedule();}
 fab.addEventListener('click',open);$('qetClose').addEventListener('click',close);elSend.addEventListener('click',send);elInput.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}});window.addEventListener('qeauth:ready',function(){elSend.disabled=!canSend();load(false);});document.addEventListener('visibilitychange',function(){if(!document.hidden)load(true);});window.addEventListener('scroll',function(){requestAnimationFrame(place);},{passive:true});window.addEventListener('resize',place);place();
 load(true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
