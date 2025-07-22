// src/registerServiceWorker.ts

// ServiceWorkerを登録する関数
export function register() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const swUrl = '/service-worker.js';
      
      navigator.serviceWorker
        .register(swUrl)
        .then(registration => {
          console.log('ServiceWorker登録成功:', registration.scope);
          
          // 更新確認インターバルの設定
          setInterval(() => {
            registration.update();
            console.log('ServiceWorker更新チェック');
          }, 60 * 60 * 1000); // 1時間ごとに更新を確認
          
          // キャッシュのクリーンアップ
          registration.addEventListener('updatefound', () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.addEventListener('statechange', () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    console.log('新しいバージョンが利用可能です。');
                    // ここにユーザーに更新を通知するコードを追加できます
                  } else {
                    console.log('ServiceWorkerがオフライン用にキャッシュされました。');
                  }
                }
              });
            }
          });
        })
        .catch(error => {
          console.error('ServiceWorker登録エラー:', error);
        });
      
      // すでに登録されているServiceWorkerの検出
      navigator.serviceWorker.ready.then(registration => {
        console.log('ServiceWorkerが準備完了:', registration.scope);
      });
      
      // グローバルServiceWorkerイベントの処理
      navigator.serviceWorker.addEventListener('message', event => {
        console.log('ServiceWorkerからメッセージを受信:', event.data);
      });
      
      if (navigator.serviceWorker.controller) {
        console.log('このページはServiceWorkerによってコントロールされています');
      } else {
        console.log('このページはServiceWorkerによってコントロールされていません');
      }
    });
  } else {
    console.log('このブラウザではServiceWorkerはサポートされていません');
  }
}

// ServiceWorkerの登録を解除する関数
export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then(registration => {
        registration.unregister();
      })
      .catch(error => {
        console.error(error.message);
      });
  }
}

// ServiceWorkerの状態をチェックする関数
export async function checkServiceWorkerStatus() {
  if (!('serviceWorker' in navigator)) {
    return { supported: false, registered: false, controlling: false };
  }
  
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const controlling = !!navigator.serviceWorker.controller;
    
    return {
      supported: true,
      registered: registrations.length > 0,
      registrations: registrations.map(r => ({
        scope: r.scope,
        active: !!r.active,
        installing: !!r.installing,
        waiting: !!r.waiting
      })),
      controlling
    };
  } catch (error) {
    console.error('ServiceWorkerのステータス確認エラー:', error);
    return {
      supported: true,
      registered: false,
      error: error instanceof Error ? error.message : '不明なエラー',
      controlling: false
    };
  }
}