/* QE Tracker v97 cross-version-safe same-origin application-shell service worker. API/cloud traffic is never cached. */
'use strict';
const VERSION='97';
const CACHE='qe-tracker-v'+VERSION+'-shell-r1';
const INDEX='./index_v97.html';
const SHELL=[
  INDEX,
  './core-v97.min.css',
  './bootstrap-v97.min.js',
  './core-v97.min.js',
  './manifest-v97.webmanifest',
  './qe-icon-v97.svg',
  './qe-icon-v97-192.png',
  './qe-icon-v97-512.png',
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
    /* Exact-path gate prevents v97 from intercepting index.html, v95/v96 or unrelated pages. */
    if(url.pathname===INDEX_URL.pathname) event.respondWith(versionNavigation(request));
    return;
  }
  if(SHELL_PATHS.has(url.pathname)) event.respondWith(shellAsset(request));
});

self.addEventListener('message',event=>{
  if(event.data&&event.data.type==='SKIP_WAITING') self.skipWaiting();
  if(event.data&&event.data.type==='CLEAR_V97_CACHE') event.waitUntil(caches.delete(CACHE));
  if(event.data&&event.data.type==='STATUS'&&event.source) event.source.postMessage({type:'QE97_SW_STATUS',version:VERSION,cache:CACHE,index:INDEX_URL.pathname});
});
