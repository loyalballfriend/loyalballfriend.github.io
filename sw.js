/* ============================================================
   時間表 PWA · Service Worker
   目的：把整個 App 快取到本機，無網絡也能開啟使用
   ============================================================ */

const VERSION = 'v34';
const CACHE = 'timetable-' + VERSION;

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

/* ---------- 安裝：預先快取核心資源 ---------- */
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(ASSETS.map(function (u) {
        // 逐個加入，個別失敗不影響整體
        return c.add(new Request(u, { cache: 'reload' })).catch(function () {});
      }));
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

/* ---------- 啟用：清掉舊版本快取 ---------- */
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

/* ---------- 取用策略 ---------- */
self.addEventListener('fetch', function (e) {
  const req = e.request;

  // 只處理同源的 GET
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;

  // 0) 版本探測檔：一定要交返俾瀏覽器直出（唔可以食自己嘅快取）
  //    頁面靠 fetch('sw.js') 對比 VERSION 判斷有冇新版，快取咗就永遠測唔到。
  if (/\/sw\.js$/.test(url.pathname)) return;

  // 1) 頁面導航：先試網絡（拿最新版），失敗才用快取
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (res) {
        const copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) {
          return hit || caches.match('./index.html');
        });
      })
    );
    return;
  }

  // 2) 其他資源：先用快取（秒開），背景靜默更新
  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) {
        fetch(req).then(function (res) {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then(function (c) { c.put(req, copy); });
          }
        }).catch(function () {});
        return hit;
      }
      return fetch(req).then(function (res) {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        return caches.match('./index.html');
      });
    })
  );
});

/* ---------- 讓頁面可主動觸發更新 ---------- */
self.addEventListener('message', function (e) {
  const d = e.data;
  if (d === 'skip-waiting' || (d && d.type === 'SKIP_WAITING')) self.skipWaiting();
});
