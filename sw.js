/* ============================================================
   時間表 PWA · Service Worker
   目的：把整個 App 快取到本機，無網絡也能開啟使用
   ============================================================ */

const VERSION = 'v46';
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

  // 1) 頁面導航：先食快取（秒開），同時背景靜默更新
  //    ⚠ 以前係 network-first，每次開 App 都要等一個網絡來回先有畫面；
  //      改成 cache-first 之後，離線／弱網都即刻開得到。
  //      新版照樣測得到 —— 頁面係靠 fetch('sw.js') 對比 VERSION，
  //      而 sw.js 上面已經 return 咗，唔會入快取。
  if (req.mode === 'navigate') {
    // 先起動網絡請求（唔等佢），成功就寫返落快取，下次開就係新版
    const net = fetch(req).then(function (res) {
      if (res && res.status === 200 && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    });

    // 快取唔命中時（第一次裝、或者啱啱更新清過快取）要用 cache:'reload'，
    // 連瀏覽器自己嘅 HTTP 快取都繞過 —— 唔係嘅話更新完可能又拿返舊 HTML。
    function netFresh() {
      try {
        return fetch(new Request(req, { cache: 'reload' })).then(function (res) {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then(function (c) { c.put(req, copy); });
          }
          return res;
        });
      } catch (err) { return net; }
    }

    e.respondWith(
      caches.match(req)
        .then(function (hit) { return hit || caches.match('./index.html'); })
        .then(function (hit) {
          if (hit) {
            // 有快取：即刻交畫面，網絡請求放去背景慢慢更新
            e.waitUntil(net.catch(function () {}));
            return hit;
          }
          // 冇快取（第一次裝）：等網絡；失敗就交離線提示
          return netFresh().catch(function () {
            return caches.match('./index.html').then(function (fb) {
              return fb || new Response(
                '<!doctype html><meta charset="utf-8"><title>離線</title>' +
                '<body style="font:16px/1.7 system-ui;padding:40px;text-align:center">' +
                '<h1 style="font-size:18px">暫時開唔到</h1>' +
                '<p>呢部機未快取過時間表，而且而家冇網絡。<br>連返網絡再開一次就得。</p>',
                { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
              );
            });
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
  // 導航係 cache-first，更新時要清走舊 HTML，唔係 reload 會拿到舊版
  if (d === 'purge-shell' || (d && d.type === 'PURGE_SHELL')) {
    e.waitUntil(
      caches.keys().then(function (keys) {
        return Promise.all(keys.map(function (k) {
          return caches.open(k).then(function (c) {
            return Promise.all(['./', './index.html'].map(function (u) {
              return c.delete(u).catch(function () {});
            }));
          }).catch(function () {});
        }));
      })
    );
  }
});
