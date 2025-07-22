// src/components/shared/DebugInfo.tsx
import { useState, useEffect } from 'react';
import { pwaManager } from '../../pwaUtils'; // pwaManagerをインポート

// デバッグ情報表示コンポーネント
const DebugInfo = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [debugInfo, setDebugInfo] = useState<Record<string, any>>({
    // 初期デバッグ情報
    pwaStatus: '読み込み中...',
    displayMode: '取得中...',
    beforeInstallPromptCaptured: false,
    serviceWorkerStatus: '確認中...',
    userAgent: navigator.userAgent,
    screenSize: `${window.innerWidth}x${window.innerHeight}`,
    darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
    lastUpdated: new Date().toLocaleString('ja-JP')
  });

  // デバッグ情報を更新する関数
  const updateDebugInfo = () => {
    // マニフェストのチェック
    const manifestLink = document.querySelector('link[rel="manifest"]');
    const hasManifest = !!manifestLink;

    // Service Workerの条件をチェック
    const hasPushManager = 'PushManager' in window;
    const hasNotifications = 'Notification' in window;

    // HTTPS条件をチェック
    const isHTTPS = window.location.protocol === 'https:';

    // PWAインストール条件をすべて確認
    const pwaConditions = {
      https: isHTTPS,
      manifest: hasManifest, 
      serviceWorker: 'serviceWorker' in navigator,
      pushManager: hasPushManager,
      notifications: hasNotifications,
      displayModeSwitching: window.matchMedia('(display-mode: standalone)').media !== 'not all',
    };

    // pwaManagerから情報を取得
    const pwaInfo = pwaManager.getPWAInfo();

    // 現在の情報を拡張
    setDebugInfo(prev => ({
      ...prev,
      displayMode: pwaInfo.displayMode,
      pwaStatus: pwaManager.isPWAInstalled() ? 'インストール済み' : '未インストール',
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
      darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
      beforeInstallPromptCaptured: pwaManager.isInstallPromptAvailable(),
      installConditions: pwaConditions,
      lastUpdated: new Date().toLocaleString('ja-JP')
    }));
  };

  // ServiceWorkerの状態をチェック
  useEffect(() => {
    const checkServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          if (registrations.length > 0) {
            setDebugInfo(prev => ({
              ...prev,
              serviceWorkerStatus: `登録済み (${registrations.length}件)`,
              serviceWorkerScopes: registrations.map(r => r.scope).join(', ')
            }));
          } else {
            setDebugInfo(prev => ({
              ...prev,
              serviceWorkerStatus: '登録なし'
            }));
          }
        } catch (error) {
          console.error('Service Worker確認エラー:', error);
          setDebugInfo(prev => ({
            ...prev,
            serviceWorkerStatus: `エラー: ${error instanceof Error ? error.message : '不明'}`
          }));
        }
      } else {
        setDebugInfo(prev => ({
          ...prev,
          serviceWorkerStatus: '未対応'
        }));
      }
    };

    checkServiceWorker();
  }, []);

  // PWAイベントリスナーをセットアップ
  useEffect(() => {
    console.log('DebugInfo: Setting up PWA debugging');
    
    // インストールリスナーを追加
    const handleInstallPromptAvailable = () => {
      console.log('DebugInfo: Install prompt is now available');
      updateDebugInfo();
    };
    
    // PWAManagerのリスナーを追加
    pwaManager.addInstallListener(handleInstallPromptAvailable);
    
    // 画面サイズ変更時の更新
    window.addEventListener('resize', updateDebugInfo);
    
    // appinstalledイベントの検知
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed (detected in DebugInfo)');
      setDebugInfo(prev => ({
        ...prev,
        pwaStatus: 'インストール完了',
        installTime: new Date().toLocaleString('ja-JP')
      }));
      updateDebugInfo();
    });

    // 初期更新
    updateDebugInfo();

    return () => {
      pwaManager.removeInstallListener(handleInstallPromptAvailable);
      window.removeEventListener('resize', updateDebugInfo);
      window.removeEventListener('appinstalled', () => {});
    };
  }, []);

  // デバッグパネルの表示/非表示を切り替え
  const toggleVisibility = () => {
    setIsVisible(!isVisible);
    // 表示時に情報を更新
    if (!isVisible) {
      updateDebugInfo();
    }
  };

  // テスト用のインストールトリガー
  const triggerInstallPrompt = async () => {
    if (!pwaManager.isInstallPromptAvailable()) {
      alert('インストールプロンプトが利用できません。\n\n手動インストール方法:\n1. ブラウザのメニューボタンをタップ\n2. 「ホーム画面に追加」を選択');
      return;
    }

    try {
      const result = await pwaManager.showInstallPrompt();
      setDebugInfo(prev => ({
        ...prev,
        promptResult: result?.outcome,
        promptTime: new Date().toLocaleString('ja-JP')
      }));
      updateDebugInfo();
    } catch (error) {
      console.error('インストールプロンプトエラー:', error);
      setDebugInfo(prev => ({
        ...prev,
        promptError: error instanceof Error ? error.message : '不明なエラー'
      }));
    }
  };

  // キャッシュをクリアする関数
  const clearAppCache = async () => {
    try {
      if ('caches' in window) {
        const cacheNames = await window.caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => window.caches.delete(cacheName))
        );
        alert('キャッシュをクリアしました。ページをリロードしてください。');
        setDebugInfo(prev => ({
          ...prev,
          cacheStatus: 'クリア済み',
          cacheCleared: new Date().toLocaleString('ja-JP')
        }));
      } else {
        alert('このブラウザではキャッシュAPIが利用できません。');
      }
    } catch (error) {
      console.error('キャッシュクリアエラー:', error);
      alert('キャッシュクリア中にエラーが発生しました。');
    }
  };

  // 強制的にデバッグ情報を更新
  const forceUpdate = () => {
    updateDebugInfo();
  };

  return (
    <div className="fixed right-0 bottom-16 z-50">
      {/* デバッグ切り替えボタン */}
      <button
        onClick={toggleVisibility}
        className="bg-gray-700 text-white p-2 rounded-l-md opacity-70 hover:opacity-100"
        aria-label="デバッグ情報"
      >
        {isVisible ? '閉じる' : 'デバッグ'}
      </button>

      {/* デバッグパネル */}
      {isVisible && (
        <div className="p-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-xl max-w-md ml-4 mr-4 mb-2 max-h-[80vh] overflow-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold dark:text-white">PWA デバッグ情報</h3>
            <div className="flex space-x-2">
              <button
                onClick={forceUpdate}
                className="px-2 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
              >
                更新
              </button>
              <button
                onClick={triggerInstallPrompt}
                disabled={!pwaManager.isInstallPromptAvailable()}
                className={`px-2 py-1 text-white text-sm rounded ${
                  pwaManager.isInstallPromptAvailable() ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                インストールテスト
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {/* デバッグ情報の表示 */}
            {Object.entries(debugInfo).map(([key, value]) => (
              <div key={key} className="border-b border-gray-200 dark:border-gray-700 pb-1">
                <span className="font-semibold dark:text-gray-300">{key}: </span>
                <span className="dark:text-white">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}

            {/* 追加アクション */}
            <div className="mt-4 space-y-2">
              <button
                onClick={async () => {
                  if ('serviceWorker' in navigator) {
                    try {
                      const registration = await navigator.serviceWorker.register('/service-worker.js');
                      setDebugInfo(prev => ({
                        ...prev,
                        serviceWorkerStatus: `新規登録成功: ${registration.scope}`,
                        serviceWorkerUpdateTime: new Date().toLocaleString('ja-JP')
                      }));
                    } catch (error) {
                      console.error('ServiceWorker登録エラー:', error);
                      setDebugInfo(prev => ({
                        ...prev,
                        serviceWorkerStatus: `登録エラー: ${error instanceof Error ? error.message : '不明'}`,
                      }));
                    }
                  }
                }}
                className="px-2 py-1 bg-purple-500 text-white text-sm rounded hover:bg-purple-600"
              >
                ServiceWorker再登録
              </button>
              
              <button
                onClick={clearAppCache}
                className="px-2 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
              >
                キャッシュクリア
              </button>
              
              <button
                onClick={() => {
                  const url = new URL(window.location.href);
                  // 現在のクエリパラメータを保持しつつ、PWAをリセット
                  url.searchParams.set('pwa-reset', Date.now().toString());
                  window.location.href = url.toString();
                }}
                className="px-2 py-1 bg-orange-500 text-white text-sm rounded hover:bg-orange-600"
              >
                PWAリセット
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
            最終更新: {debugInfo.lastUpdated}
          </p>
        </div>
      )}
    </div>
  );
};

export default DebugInfo;