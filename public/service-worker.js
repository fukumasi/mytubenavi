const CACHE_NAME = 'mytubenavi-cache-v2'; // バージョン番号を上げる
const DEBUG = true; // デバッグモード

// デバッグログ出力関数
function log(message) {
  if (DEBUG) {
    console.log(`[ServiceWorker] ${message}`);
  }
}

// キャッシュするアセットのリスト
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/placeholder.jpg',
  '/default-avatar.jpg',
  // サウンドファイル
  '/sounds/notification.mp3',
  '/sounds/achievement.mp3',
  '/sounds/important-notification.mp3',
  '/sounds/premium-notification.mp3',
  '/sounds/premium-special.mp3',
  // PWAアイコン
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png',
  // メインJS/CSSファイル (Viteのプレフィックスパターンに合わせる必要あり)
  '/assets/index.css',
  '/assets/index.js'
];

// Service Workerのインストール時
self.addEventListener('install', event => {
  log('インストール開始...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        log(`キャッシュを開きました: ${CACHE_NAME}`);
        // 個別にキャッシュすることでエラー処理を改善
        return Promise.all(
          urlsToCache.map(url => {
            return cache.add(url).catch(error => {
              log(`キャッシュに追加できませんでした: ${url} - ${error.message}`);
              // エラーでもプロセスを続行
              return Promise.resolve();
            });
          })
        );
      })
      .then(() => {
        log('キャッシングが完了しました');
        return self.skipWaiting();
      })
      .catch(error => {
        log(`インストール中にエラーが発生しました: ${error.message}`);
      })
  );
});

// Service Workerのアクティベート時
self.addEventListener('activate', event => {
  log('アクティベート中...');
  
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      log(`既存のキャッシュを検出: ${cacheNames.join(', ')}`);
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // 古いキャッシュを削除
            log(`古いキャッシュを削除: ${cacheName}`);
            return caches.delete(cacheName);
          }
          return Promise.resolve();
        })
      );
    })
    .then(() => {
      log('Service Worker アクティベート完了');
      return self.clients.claim();
    })
    .catch(error => {
      log(`アクティベート中にエラーが発生しました: ${error.message}`);
    })
  );
});

// fetch イベントリスナーの修正部分

// フェッチリクエスト時
self.addEventListener('fetch', event => {
  // HEADリクエストはキャッシュしない
  if (event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // リクエストURLのログ（デバッグ用・過剰なログを避けるため制限）
  if (DEBUG && Math.random() < 0.1) { // 10%のリクエストのみログ出力
    log(`フェッチリクエスト: ${event.request.url}`);
  }
  
  // HTMLリクエストにはネットワークファーストを適用
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          return response;
        })
        .catch(() => {
          return caches.match('/index.html');
        })
    );
    return;
  }
  
  // 外部APIリクエストにはネットワークファーストを適用
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('supabase') || 
      event.request.url.includes('youtube.com')) {
    event.respondWith(
      fetch(event.request)
        .catch(error => {
          log(`API fetch失敗: ${error.message}`);
          // オフライン時はキャッシュから取得を試みる
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // 静的アセットにはキャッシュファーストを適用
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // キャッシュがある場合はそれを返す
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // キャッシュがない場合はフェッチして新たにキャッシュする
        return fetch(event.request)
          .then(response => {
            // 有効なレスポンスかチェック
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // レスポンスをクローンしてキャッシュ
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
                if (DEBUG) {
                  log(`新しいリソースをキャッシュしました: ${event.request.url}`);
                }
              })
              .catch(error => {
                log(`キャッシュに保存できませんでした: ${error.message}`);
              });

            return response;
          })
          .catch(error => {
            log(`フェッチ失敗: ${error.message}`);
            // ネットワークエラー時の処理
            return new Response('Network error occurred', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

// プッシュ通知
self.addEventListener('push', event => {
  log('プッシュ通知を受信しました');
  
  let notificationData = {
    title: 'MyTubeNavi',
    body: '新しい通知があります',
    url: '/'
  };
  
  try {
    if (event.data) {
      notificationData = event.data.json();
    }
  } catch (e) {
    log(`プッシュデータの解析エラー: ${e.message}`);
  }
  
  const options = {
    body: notificationData.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: notificationData.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

// 通知クリック時の処理
self.addEventListener('notificationclick', event => {
  log('通知がクリックされました');
  
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        // すでに開いているウィンドウがあるかチェック
        for (let client of windowClients) {
          if (client.url === event.notification.data.url && 'focus' in client) {
            return client.focus();
          }
        }
        // 新しいウィンドウを開く
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data.url);
        }
      })
      .catch(error => {
        log(`通知クリック処理エラー: ${error.message}`);
      })
  );
});

// メッセージの受信
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    log('SKIP_WAITING メッセージを受信しました');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CHECK_VERSION') {
    log('バージョンチェックリクエストを受信しました');
    event.ports[0].postMessage({
      version: CACHE_NAME
    });
  }
});

// Service Workerの読み込み完了
log('Service Worker が正常に読み込まれました');