/* QE Tracker v86 — packaged mascot “น้องดุ๊กดิ๊ก”. No network or data writes. */
(function(){
'use strict';
if(window.QE86Mascot)return;
function nameOf(v){try{return window.QEPeople?QEPeople.display(v):String(v||'').split('@')[0]}catch(_){return String(v||'').split('@')[0]||'เพื่อน QE'}}
function currentName(){var u=window.QEAuth&&QEAuth.user&&QEAuth.user();return nameOf(u&&u.email||localStorage.getItem('ux_me')||'เพื่อน QE')}
function greeting(){var h=new Date().getHours(),p=h<12?'สวัสดีตอนเช้า':h<17?'สวัสดีตอนบ่าย':'สวัสดีตอนเย็น';return p+' คุณ '+currentName()+' 👋'}
function build(){if(document.getElementById('qe86Mascot'))return;var w=document.createElement('aside');w.id='qe86Mascot';w.className='qe86-mascot';w.setAttribute('aria-label','น้องดุ๊กดิ๊ก ผู้ช่วยประจำ QE Tracker');var b=document.createElement('div');b.className='qe86-mascot-bubble';b.id='qe86MascotGreeting';var btn=document.createElement('button');btn.type='button';btn.className='qe86-mascot-btn';btn.setAttribute('aria-describedby',b.id);btn.setAttribute('aria-label','น้องดุ๊กดิ๊ก — แสดงคำทักทาย');btn.title='น้องดุ๊กดิ๊ก';btn.textContent='🧑‍🚀';w.append(b,btn);document.body.appendChild(w);function paint(){b.textContent=greeting();var n=document.createElement('span');n.className='qe86-mascot-name';n.textContent='น้องดุ๊กดิ๊ก · '+(window.QE_APP_VERSION_LABEL||'v86');b.appendChild(n)}function hello(){paint();w.classList.add('show');clearTimeout(w.__qeTimer);w.__qeTimer=setTimeout(function(){w.classList.remove('show')},8000)}btn.addEventListener('click',hello);window.addEventListener('qeauth:ready',function(){hello()});paint();hello();}
function start(){build()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.QE86Mascot=Object.freeze({version:String(window.QE_APP_VERSION||'86'),refresh:function(){var b=document.getElementById('qe86MascotGreeting');if(b){b.firstChild?b.firstChild.nodeValue=greeting():b.textContent=greeting()}}});
})();
