/*! QE Elec. Daily Job Tracker V120 — compatibility service worker (filename kept for bootstrap-v98) */
"use strict";
var CACHE = "qe-elec-tracker-v120-shell-1";
var SHELL = [
  "./",
  "./index.html",
  "./core-v98.min.css",
  "./sidebar-v118.css",
  "./sidebar-v118.js",
  "./theme-early-v98.min.js",
  "./bootstrap-v98.min.js",
  "./core-v120.min.js",
  "./scheduled-summary-v120.js",
  "./trash-v118.js",
  "./version-v120.js",
  "./mission-v98.min.js",
  "./hoshin-v98.min.js",
  "./mainjobs-v98.min.js",
  "./executive-report-v98.min.js",
  "./manifest-v120.webmanifest",
  "./qe-icon-v98-192.png"
];
self.addEventListener("install", function (event) {
  event.waitUntil(caches.open(CACHE).then(function (cache) { return cache.addAll(SHELL); }));
});
self.addEventListener("activate", function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (key) { return key.indexOf("qe-elec-tracker-") === 0 && key !== CACHE; }).map(function (key) { return caches.delete(key); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("message", function (event) {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});
self.addEventListener("fetch", function (event) {
  var request = event.request;
  if (request.method !== "GET") return;
  var url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(fetch(request).then(function (response) {
    if (response && response.ok) {
      var copy = response.clone();
      caches.open(CACHE).then(function (cache) { cache.put(request, copy); });
    }
    return response;
  }).catch(function () {
    return caches.match(request).then(function (cached) {
      if (cached) return cached;
      if (request.mode === "navigate") return caches.match("./index.html");
      return Response.error();
    });
  }));
});
