/*
  QE Tracker — Microsoft Teams Chat v88 — 2-Nov-2026
  Change log:
  1) Current-brand companion based on teams-chat-v86.js; earlier files are not overwritten.
  2) Uses an initial 100-message read, then incremental id>lastId reads; only required columns are selected.
  3) Polling remains 5 s while open, becomes 30 s while closed, and pauses while the tab is hidden.
  4) LINE and Teams panels are mutually exclusive; panel surfaces are opaque and controls stay above floating decorations.
  5) Viewer compose controls are disabled with a clear “ดูอย่างเดียว” explanation.
  6) Cloud/user text is rendered with textContent and safe link nodes; no message HTML is injected.
  7) Chat/storage errors are recorded in System Health without repetitive toast notifications.
*/
(function(){
'use strict';
if(window.__QE_TEAMS_CHAT)return;
window.__QE_TEAMS_CHAT=true;

var C={room:'teams-qe',title:'QE Teams Chat',chatLabel:'QE ABS Dream team',fnSend:'teams-send-message-v85',pollOpen:5000,pollIdle:30000,limit:100,maxLen:1000};
var U=window.QE_TEAMS_CHAT_CFG||{};Object.keys(U).forEach(function(k){C[k]=U[k];});
var cloud=window.COUNTERMEASURE_CLOUD_DEFAULTS||{};
var base=String(cloud.supabaseUrl||'').replace(/\/$/,''),key=String(cloud.supabaseKey||'');
var SEENK='ux_teams_seen_v1',seen=null,cache=[];

function $(id){return document.getElementById(id);}
function record(kind,e,ctx){try{if(window.QE84Error&&QE84Error.record)QE84Error.record(kind,e,ctx);else if(window.QE78&&QE78.recordError)QE78.recordError(kind,e,ctx);}catch(_){if(window.QE86Diagnostics)QE86Diagnostics.capture(_,"teams-chat");} }
try{var sv=localStorage.getItem(SEENK);seen=sv===null?null:(Number(sv)||0);}catch(e){seen=null;record('storage',e,'Teams read seen');}
function saveSeen(v){seen=Number(v)||0;try{localStorage.setItem(SEENK,String(seen));}catch(e){record('storage',e,'Teams save seen');}}
function me(){try{var au=window.QEAuth&&QEAuth.enabled&&QEAuth.enabled()&&QEAuth.user&&QEAuth.user();var n=(au&&au.email)||localStorage.getItem('ux_me')||(($('cbWn')||{}).title)||(($('cbWn')||{}).textContent)||'';return String(n).replace(/^บัญชี:\s*/,'').split(' · ')[0].trim()||'Guest';}catch(e){record('chat',e,'Teams identify user');return'Guest';}}
function shown(v){try{return window.QEPeople?QEPeople.display(v):String(v||'');}catch(e){record('chat',e,'Teams display name');return String(v||'');}}
function stamp(v){try{return new Intl.DateTimeFormat('th-TH',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'short'}).format(new Date(v));}catch(e){record('chat',e,'Teams message time');return'';}}
function authOn(){try{return!!(window.QEAuth&&QEAuth.enabled&&QEAuth.enabled());}catch(e){record('auth',e,'Teams auth status');return false;}}
function canSend(){try{return!authOn()||QEAuth.can('write');}catch(e){record('auth',e,'Teams role check');return!authOn();}}
async function accessToken(){if(!authOn())return key;if(!window.QEAuth||!QEAuth.getAccessToken)throw new Error('ยังไม่พร้อมใช้งาน Supabase Auth — กรุณารีเฟรชหน้าและล็อกอินใหม่');await QEAuth.ready();return await QEAuth.getAccessToken();}
async function headers(extra){var token=await accessToken();if(authOn()&&!token)throw new Error('Session หมดอายุ — กรุณาล็อกอินใหม่');return Object.assign({'Accept':'application/json','apikey':key,'Authorization':'Bearer '+token},extra||{});}
async function cloudFetch(url,opt,retry){opt=Object.assign({},opt||{});var extra=Object.assign({},opt.headers||{});delete extra.apikey;delete extra.Authorization;opt.headers=await headers(extra);var r=await fetch(url,opt);if((r.status===401||r.status===403)&&authOn()&&retry!==false){try{await QEAuth.refreshSession();opt.headers=await headers(extra);return await fetch(url,opt);}catch(e){record('auth',e,'Teams refresh session');try{await QEAuth.signOut();}catch(x){record('auth',x,'Teams sign out');}throw new Error('Session หมดอายุหรือไม่มีสิทธิ์ — กรุณาล็อกอินใหม่');}}return r;}
function node(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function teamsLogo(cls){
 var ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),id='qetGrad'+Math.random().toString(36).slice(2,8);
 svg.setAttribute('viewBox','0 0 64 64');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');svg.setAttribute('class','qet-brand '+cls);
 svg.innerHTML='<defs><linearGradient id="'+id+'" x1="8" y1="8" x2="57" y2="57" gradientUnits="userSpaceOnUse"><stop stop-color="#8b8cf0"/><stop offset=".52" stop-color="#6264a7"/><stop offset="1" stop-color="#4f46e5"/></linearGradient></defs><circle cx="43" cy="17" r="8" fill="#aab2ff"/><circle cx="53" cy="24" r="6" fill="#7b83eb"/><path d="M31 28c0-5 4-9 9-9h6c8 0 14 6 14 14v10c0 7-6 13-13 13H36c-3 0-5-2-5-5z" fill="url(#'+id+')"/><path d="M43 29c0-3 2-5 5-5h4c5 0 9 4 9 9v9c0 5-4 9-9 9h-5c-2 0-4-2-4-4z" fill="#7b83eb" opacity=".9"/><rect x="4" y="23" width="35" height="35" rx="9" fill="#3730a3"/><rect x="8" y="27" width="27" height="27" rx="6" fill="#4f46e5"/><path d="M14 33h17v5h-6v14h-5V38h-6z" fill="#fff"/>';
 return svg;
}
function appendLinkedText(box,value){var text=String(value==null?'':value),rx=/(https?:\/\/[^\s]+)/g,last=0,m;while((m=rx.exec(text))){if(m.index>last)box.appendChild(document.createTextNode(text.slice(last,m.index)));var raw=m[0],tail='',tm=/[.,;:!?)\]]+$/.exec(raw);if(tm){tail=tm[0];raw=raw.slice(0,-tail.length);}try{var u=new URL(raw);if(u.protocol==='http:'||u.protocol==='https:'){var a=node('a','',raw);a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';box.appendChild(a);}else box.appendChild(document.createTextNode(raw));}catch(e){box.appendChild(document.createTextNode(raw));}if(tail)box.appendChild(document.createTextNode(tail));last=m.index+m[0].length;}if(last<text.length)box.appendChild(document.createTextNode(text.slice(last)));}

function boot(){
 if($('qeTeamsFab'))return;
 /* v88: styles moved to teams-chat-v88.css. */
 var fab=node('button','qet-fab');fab.type='button';fab.id='qeTeamsFab';fab.title=C.title;fab.setAttribute('aria-label',C.title);fab.appendChild(teamsLogo('qet-brand-fab'));var badge=node('span','qet-badge','0');badge.id='qeTeamsBadge';fab.appendChild(badge);
 var panel=node('section','qet-panel');panel.id='qeTeamsPanel';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','false');panel.setAttribute('aria-label',C.title);
 var head=node('div','qet-head'),brand=teamsLogo('qet-brand-head'),dot=node('span','qet-dot');dot.id='qetDot';var titles=node('div'),ttl=node('b','',C.title),sub=node('div','qet-sub',C.chatLabel);titles.append(ttl,sub);var close=node('button','qet-close','✕');close.type='button';close.id='qetClose';close.setAttribute('aria-label','ปิดหน้าต่างแชท');head.append(brand,dot,titles,close);
 var msgs=node('div','qet-msgs');msgs.id='qetMsgs';msgs.setAttribute('role','log');msgs.setAttribute('aria-live','polite');msgs.setAttribute('aria-label','ข้อความ Microsoft Teams');msgs.tabIndex=0;msgs.appendChild(node('div','qet-empty','กำลังโหลดข้อความ…'));
 var compose=node('div','qet-compose'),cr=node('div','qet-compose-row'),input=node('textarea','qet-input');input.id='qetInput';input.maxLength=Number(C.maxLen);input.placeholder='พิมพ์ข้อความถึง Microsoft Teams…';input.setAttribute('aria-label','ข้อความถึง Microsoft Teams');var send=node('button','qet-send','ส่ง');send.type='button';send.id='qetSend';cr.append(input,send);var status=node('div','qet-status');status.id='qetStatus';status.setAttribute('aria-live','polite');compose.append(cr,status);panel.append(head,msgs,compose);
 document.body.append(fab,panel);run();
}

function run(){
 var fab=$('qeTeamsFab'),panel=$('qeTeamsPanel'),elMsgs=$('qetMsgs'),elInput=$('qetInput'),elSend=$('qetSend'),elStatus=$('qetStatus'),elDot=$('qetDot'),elBadge=$('qeTeamsBadge');
 var busy=false,sending=false,timer=0,lastFocus=null,lastId=0;
 function isOpen(){return panel.classList.contains('on');}
 function setStatus(t,err,ro){elStatus.textContent=t||'';elStatus.classList.toggle('err',!!err);elStatus.classList.toggle('ro',!!ro);}
 function setDot(cls){elDot.className='qet-dot'+(cls?' '+cls:'');}
 function setBadge(n){elBadge.textContent=n>99?'99+':String(n);elBadge.classList.toggle('on',n>0);fab.title=C.title+(n?' — ข้อความใหม่ '+n:'');}
 function applyRole(){var ro=!canSend();elInput.disabled=ro;elSend.disabled=ro||sending;elInput.placeholder=ro?'ดูอย่างเดียว — บัญชีนี้ส่งข้อความไม่ได้':'พิมพ์ข้อความถึง Microsoft Teams…';if(ro)setStatus('ดูอย่างเดียว — บัญชี viewer อ่านได้ แต่ส่งข้อความไม่ได้',false,true);}
 function makeRow(m){var raw=String(m.sender_name||''),own=raw===me(),r=node('div','qet-row'+(own?' me':'')),meta=node('div','qet-meta',shown(raw)+' · '+stamp(m.created_at)+(m.source?' · '+String(m.source):'')),bubble=node('div','qet-bubble');meta.title=shown(raw);appendLinkedText(bubble,m.message||'');r.append(meta,bubble);return r;}
 function draw(){var near=elMsgs.scrollHeight-elMsgs.scrollTop-elMsgs.clientHeight<80,first=elMsgs.dataset.drawn!=='1';elMsgs.textContent='';if(!cache.length){var e=node('div','qet-empty','ยังไม่มีข้อความ — ระบบจะส่งผ่าน Microsoft Teams '+C.chatLabel);elMsgs.appendChild(e);}else cache.forEach(function(m){elMsgs.appendChild(makeRow(m));});elMsgs.dataset.drawn='1';if(first||near)elMsgs.scrollTop=elMsgs.scrollHeight;}
 async function load(silent){
  if(document.hidden){schedule();return;}if(!base||!key){setStatus('ไม่พบการตั้งค่า Supabase',true);setDot('err');draw();return;}if(busy)return;busy=true;
  try{var initial=!lastId,url=base+'/rest/v1/chat_messages?select=id,sender_name,message,created_at,source&room_key=eq.'+encodeURIComponent(C.room)+'&deleted_at=is.null&order=id.'+(initial?'desc':'asc')+'&limit='+Number(C.limit)+(initial?'':'&id=gt.'+encodeURIComponent(lastId));var res=await cloudFetch(url,{headers:{}},true);var j=await res.json().catch(function(e){record('chat',e,'Teams parse response');return null;});if(!res.ok||!Array.isArray(j))throw new Error((j&&(j.message||j.error))||('HTTP '+res.status));if(initial)j.reverse();if(j.length){var byId=new Map(cache.map(function(x){return[Number(x.id)||0,x];}));j.forEach(function(m){byId.set(Number(m.id)||0,m);lastId=Math.max(lastId,Number(m.id)||0);});cache=Array.from(byId.values()).sort(function(a,b){return(Number(a.id)||0)-(Number(b.id)||0);}).slice(-Number(C.limit));}
   if(seen===null)saveSeen(lastId);if(isOpen()){if(lastId>seen)saveSeen(lastId);setBadge(0);}else{var who=me(),n=0;cache.forEach(function(m){if((Number(m.id)||0)>seen&&m.sender_name!==who)n++;});setBadge(n);}draw();setDot('ok');if(!silent)setStatus('เชื่อมต่อแล้ว · '+cache.length+' ข้อความ'+(canSend()?'':' · ดูอย่างเดียว'),false,!canSend());
  }catch(e){record('chat',e,'Teams load');setDot('err');setStatus('โหลดข้อความไม่สำเร็จ: '+String(e.message||e).slice(0,180),true);if(!elMsgs.dataset.drawn){elMsgs.textContent='';elMsgs.appendChild(node('div','qet-empty','โหลดข้อความไม่สำเร็จ'));}}
  finally{busy=false;schedule();}
 }
 async function send(){var text=elInput.value.trim(),name=me();if(!text||sending)return;if(!canSend()){applyRole();return;}if(name==='Guest'){setStatus('กรุณาล็อกอิน/ระบุชื่อผู้ใช้ก่อนส่งข้อความ',true);return;}sending=true;applyRole();setStatus('กำลังส่ง…');try{var url=base+'/functions/v1/'+encodeURIComponent(C.fnSend),res=await cloudFetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({room_key:C.room,sender_id:name,sender_name:name,message:text.slice(0,Number(C.maxLen)),source:'tracker'})},true),raw=await res.text(),j={};try{j=raw?JSON.parse(raw):{};}catch(e){record('chat',e,'Teams send response');}if(!res.ok||j.ok===false)throw new Error(j.error||j.message||raw||('HTTP '+res.status));elInput.value='';setStatus('ส่งเข้า Microsoft Teams แล้ว');await load(false);}catch(e){record('chat',e,'Teams send');setStatus('ส่งไม่สำเร็จ: '+String(e.message||e).slice(0,180),true);}finally{sending=false;applyRole();if(!elInput.disabled)elInput.focus();}}
 function schedule(){clearTimeout(timer);timer=0;if(document.hidden)return;timer=setTimeout(function(){load(true);},isOpen()?Number(C.pollOpen):Number(C.pollIdle));}
 function open(){if(window.__QE_CHAT&&window.__QE_CHAT.close)window.__QE_CHAT.close();lastFocus=document.activeElement;panel.classList.add('on');setBadge(0);applyRole();load(false);setTimeout(function(){(elInput.disabled?$('qetClose'):elInput).focus();},30);}
 function close(){panel.classList.remove('on');schedule();if(lastFocus&&lastFocus.focus)lastFocus.focus();else fab.focus();}
 fab.addEventListener('click',function(){isOpen()?close():open();});$('qetClose').addEventListener('click',close);elSend.addEventListener('click',send);elInput.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}});document.addEventListener('keydown',function(e){if(e.key==='Escape'&&isOpen()){e.preventDefault();close();}});window.addEventListener('qeauth:ready',function(){applyRole();load(false);});document.addEventListener('visibilitychange',function(){if(document.hidden){clearTimeout(timer);timer=0;}else load(true);});applyRole();load(true);
 var api={version:String(window.QE_APP_VERSION||'88'),pollOpen:Number(C.pollOpen),pollIdle:Number(C.pollIdle),load:load,close:close,open:open};window.QE88TeamsChat=api;window.QE87TeamsChat=api;window.QE86TeamsChat=api;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
