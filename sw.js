// sw.js - Heken Service Worker

const CACHE_NAME = 'heken-cache-v1';

// Recursos mínimos para PWA
const urlsToCache = [
  '/',
  '/index.html',
  '/home.html',
  '/css/style.css'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  // Apenas busca na rede (não vamos cachear requests dinâmicos da API)
  // O cache aqui é apenas para permitir a instalação PWA
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
