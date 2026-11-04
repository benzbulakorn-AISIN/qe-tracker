/* QE Tracker v96 same-origin application-shell service worker. API/cloud traffic is never cached. */
'use strict';
const VERSION='96';
const CACHE='qe-tracker-v'+VERSION+'-shell';
const SHELL=[
  './index_v96.html',
  './core-v96.min.css',
  './bootstrap-v96.min.js',
  './core-v96.min.js',
  './manifest-v96.webmanifest',
  './qe-icon-v96.svg',
  './vendor/pptxgenjs-4.0.0.min.js'
];
const SHELL_PATHS=new Set(SHELL.map(path=>new URL(path,self.registration.scope).pathname));

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)));
});

self.addEventListener('activate',event=>{
  event.waitUntil(Promise.all([
    caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('qe-tracker-v')&&key!==CACHE).map(key=>caches.delete(key)))),
    self.clients.claim()
  ]));
});

async function navigation(request){
  try{
    const response=await fetch(request,{cache:'no-store'});
    if(response&&response.ok){
      const cache=await caches.open(CACHE);
      cache.put('./index_v96.html',response.clone());
    }
    return response;
  }catch(_){
    return (await caches.match(request))||(await caches.match('./index_v96.html'))||Response.error();
  }
}

async function shellAsset(request,url){
  const cached=await caches.match(request);
  if(cached) return cached;
  const response=await fetch(request);
  if(response&&response.ok){
    const cache=await caches.open(CACHE);
    cache.put(request,response.clone());
  }
  return response;
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET') return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin) return;
  if(request.mode==='navigate'){
    event.respondWith(navigation(request));
    return;
  }
  if(SHELL_PATHS.has(url.pathname)) event.respondWith(shellAsset(request,url));
});

self.addEventListener('message',event=>{
  if(event.data&&event.data.type==='SKIP_WAITING') self.skipWaiting();
  if(event.data&&event.data.type==='STATUS'&&event.source) event.source.postMessage({type:'QE96_SW_STATUS',version:VERSION,cache:CACHE});
});
