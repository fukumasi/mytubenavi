// src/components/shared/PWAInstaller.tsx
import { useState, useEffect } from 'react';
import { pwaManager } from '../../pwaUtils'; // pwaManagerをインポート

const PWAInstaller = () => {
  const [isInstalled, setIsInstalled] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(false);
  
  // インストール可能状態を記録
  const [installable, setInstallable] = useState(false);

  // PWAがすでにインストールされているかチェック
  useEffect(() => {
    // iOS/Androidのstandaloneモードチェック
    const isInStandaloneMode = () => 
      (window.matchMedia('(display-mode: standalone)').matches) || 
      ((window.navigator as any).standalone === true) || 
      document.referrer.includes('android-app://');
    
    // iOSデバイスの検出
    const checkIOSDevice = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      return /iphone|ipad|ipod/.test(userAgent);
    };
    
    const isIOSDevice = checkIOSDevice();
    const isStandalone = isInStandaloneMode();
    
    setIsInstalled(isStandalone || pwaManager.isPWAInstalled());
    setIsIOS(isIOSDevice);
    
    // すでにインストールされている場合はバナー表示しない
    if (isStandalone || pwaManager.isPWAInstalled()) {
      setShowBanner(false);
      return;
    }
    
    // インストール可能イベントをリッスン
    const handleInstallable = () => {
      console.log('PWA is installable');
      setInstallable(true);
      
      // フォールバックモードでなければバナー表示
      if (!fallbackMode) {
        const lastDismissed = localStorage.getItem('pwaPromptDismissed');
        const showPrompt = !lastDismissed || 
                         (Date.now() - parseInt(lastDismissed, 10)) > 24 * 60 * 60 * 1000;
        
        if (showPrompt) {
          setShowBanner(true);
        }
      }
    };
    
    // インストール完了イベントをリッスン
    const handleAppInstalled = () => {
      console.log('PWA was installed');
      setIsInstalled(true);
      setShowBanner(false);
      setInstallable(false);
    };
    
    // PWAマネージャーのリスナーを追加
    pwaManager.addInstallListener(handleInstallable);
    
    // インストール完了イベントをリッスン
    window.addEventListener('appinstalled', handleAppInstalled);
    
    // すでにインストールプロンプトが利用可能か確認
    if (pwaManager.isInstallPromptAvailable()) {
      console.log('Install prompt is already available');
      setInstallable(true);
      
      const lastDismissed = localStorage.getItem('pwaPromptDismissed');
      const showPrompt = !lastDismissed || 
                       (Date.now() - parseInt(lastDismissed, 10)) > 24 * 60 * 60 * 1000;
      
      if (showPrompt) {
        setShowBanner(true);
      }
    } else {
      console.log('No install prompt available - checking fallback');
      
      // 条件を満たす状況でフォールバックバナーを表示
      if (isIOSDevice || navigator.userAgent.includes('Android')) {
        // 5秒後にフォールバックバナーを表示（不自然にならないよう遅延）
        const timer = setTimeout(() => {
          const lastDismissed = localStorage.getItem('pwaPromptDismissed');
          const showPrompt = !lastDismissed || 
                           (Date.now() - parseInt(lastDismissed, 10)) > 24 * 60 * 60 * 1000;
          
          if (showPrompt && !isInstalled) {
            console.log('Showing fallback install banner');
            setFallbackMode(true);
            setShowBanner(true);
          }
        }, 5000);
        
        return () => clearTimeout(timer);
      }
    }
    
    return () => {
      pwaManager.removeInstallListener(handleInstallable);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [fallbackMode, isInstalled]);

  // アプリをインストールする関数
  const installApp = async () => {
    // iOSデバイスまたはフォールバックモードの場合は手動インストール方法を案内
    if (isIOS || fallbackMode) {
      if (isIOS) {
        alert('iOSでのインストール方法:\n1. Safariの共有ボタンをタップします\n2. 「ホーム画面に追加」を選択します\n3. 「追加」をタップします');
      } else {
        alert('インストール方法:\n1. ブラウザのメニューボタンをタップします\n2. 「ホーム画面に追加」または「アプリをインストール」を選択します');
      }
      closeBanner();
      return;
    }
    
    // インストールプロンプトが利用可能かチェック
    if (!pwaManager.isInstallPromptAvailable()) {
      console.log('No installation prompt available');
      // 代替手段を表示
      alert('インストールプロンプトが利用できません。ブラウザのメニューから「ホーム画面に追加」または「アプリをインストール」を選択して、MyTubeNaviをインストールできます。');
      closeBanner();
      return;
    }

    try {
      // pwaManagerでプロンプトを表示
      console.log('Showing installation prompt');
      const choiceResult = await pwaManager.showInstallPrompt();
      
      if (choiceResult && choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
        setIsInstalled(true);
      }
      
      setShowBanner(false);
      setInstallable(false);
    } catch (error) {
      console.error('Error during installation:', error);
      alert('インストール中にエラーが発生しました。ブラウザのメニューから「ホーム画面に追加」を試してください。');
      closeBanner();
    }
  };

  // バナーを閉じる
  const closeBanner = () => {
    setShowBanner(false);
    // 24時間再表示しないようにタイムスタンプを保存
    localStorage.setItem('pwaPromptDismissed', Date.now().toString());
  };

  // 表示条件を満たさない場合は何も表示しない
  if (isInstalled || !showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-primary-600 text-white flex flex-col md:flex-row justify-between items-start md:items-center shadow-lg dark:bg-dark-surface dark:border-t dark:border-dark-border">
      <div>
        <h3 className="text-lg font-bold">MyTubeNaviをインストール</h3>
        {isIOS ? (
          <p className="text-sm">Safariの「共有」→「ホーム画面に追加」でインストールできます</p>
        ) : fallbackMode ? (
          <p className="text-sm">ブラウザのメニューから「ホーム画面に追加」を選択してアプリとして利用できます</p>
        ) : (
          <p className="text-sm">ホーム画面に追加して、アプリのようにMyTubeNaviを使おう！</p>
        )}
        {process.env.NODE_ENV === 'development' && (
          <p className="text-xs mt-1 opacity-75">
            Mode: {fallbackMode ? 'Fallback' : 'Native'}, 
            Installable: {installable ? 'Yes' : 'No'}
          </p>
        )}
      </div>
      <div className="flex space-x-2 mt-2 md:mt-0">
        <button 
          onClick={closeBanner}
          className="px-3 py-1 text-sm bg-transparent border border-white rounded-md hover:bg-primary-700 dark:text-dark-text-primary dark:border-dark-text-secondary"
        >
          あとで
        </button>
        <button 
          onClick={installApp}
          className="px-3 py-1 text-sm bg-white text-primary-600 rounded-md hover:bg-gray-100 dark:bg-dark-text-primary dark:text-dark-bg dark:hover:bg-gray-300"
        >
          {isIOS || fallbackMode ? '方法を見る' : 'インストール'}
        </button>
      </div>
    </div>
  );
};

export default PWAInstaller;