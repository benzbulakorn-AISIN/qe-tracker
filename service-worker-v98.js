/*! QE Elec. Daily Job Tracker V135 — compatibility service worker (filename kept for bootstrap-v98) */
"use strict";
var CACHE = "qe-elec-tracker-v158-shell-1";
var SHELL = [
  "./",
  "./index.html",
  "./core-v98.min.css",
  "./sidebar-v118.css",
  "./sidebar-v118.js",
  "./theme-early-v98.min.js",
  "./bootstrap-v98.min.js",
  "./core-v125.min.js",
  "./scheduled-summary-v125.js",
  "./trash-v118.js",
  "./version-v125.js",
  "./tracker-edit-v142.js",
  "./plan-excel-v137.js",
  "./schedule-free-v138.js",
  "./summary-style-v140.js",
  "./mission-v98.min.js",
  "./hoshin-v98.min.js",
  "./mainjobs-v98.min.js",
  "./executive-report-v98.min.js",
  "./manifest-v125.webmanifest",
  "./qe-icon-v98-192.png",
  "./today-ux-v145.js",
  "./float-ui-v151.js",
  "./app-version-v143.js",
  "./tracker-ux-v157.js",
  "./mywork-ux-v158.js",
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
