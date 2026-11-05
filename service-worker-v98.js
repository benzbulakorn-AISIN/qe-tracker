/* QE Tracker v98 cross-version-safe same-origin application-shell service worker. API/cloud traffic is never cached. */
'use strict';
const VERSION='98';
const CACHE='qe-tracker-v'+VERSION+'-shell-r2';
const INDEX='./index_v98.html';
const SHELL=[
  INDEX,
  './core-v98.min.css',
  './theme-early-v98.min.js',
  './bootstrap-v98.min.js',
  './core-v98.min.js',
  './mission-v98.min.js',
  './hoshin-v98.min.js',
  './mainjobs-v98.min.js',
  './executive-report-v98.min.js',
  './manifest-v98.webmanifest',
  './qe-icon-v98.svg',
  './qe-icon-v98-192.png',
  './qe-icon-v98-512.png',
  './vendor/pptxgenjs-4.0.0.min.js'
];
const INDEX_URL=new URL(INDEX,self.registration.scope);
const SHELL_PATHS=new Set(SHELL.map(path=>new URL(path,self.registration.scope).pathname));

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)));
});

self.addEventListener('activate',event=>{
  event.waitUntil(Promise.all([
    caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('qe-tracker-v'+VERSION+'-')&&key!==CACHE).map(key=>caches.delete(key)))),
    self.clients.claim()
  ]));
});

async function versionNavigation(request){
  try{
    const response=await fetch(request,{cache:'no-store'});
    if(response&&response.ok){
      const cache=await caches.open(CACHE);
      await cache.put(INDEX,response.clone());
    }
    return response;
  }catch(_){
    return (await caches.match(INDEX,{ignoreSearch:true}))||Response.error();
  }
}

async function shellAsset(request){
  const cached=await caches.match(request,{ignoreSearch:true});
  if(cached) return cached;
  const response=await fetch(request);
  if(response&&response.ok){
    const cache=await caches.open(CACHE);
    await cache.put(request,response.clone());
  }
  return response;
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||request.headers.has('range')) return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin) return;
  if(request.mode==='navigate'){
    /* Exact-path gate prevents v98 from intercepting index.html, v95/v96 or unrelated pages. */
    if(url.pathname===INDEX_URL.pathname) event.respondWith(versionNavigation(request));
    return;
  }
  if(SHELL_PATHS.has(url.pathname)) event.respondWith(shellAsset(request));
});

self.addEventListener('message',event=>{
  if(event.data&&event.data.type==='SKIP_WAITING') self.skipWaiting();
  if(event.data&&event.data.type==='CLEAR_V98_CACHE') event.waitUntil(caches.delete(CACHE));
  if(event.data&&event.data.type==='STATUS'&&event.source) event.source.postMessage({type:'QE98_SW_STATUS',version:VERSION,cache:CACHE,index:INDEX_URL.pathname});
});
