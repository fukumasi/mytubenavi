// src/pwaUtils.ts

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

// PWA関連の情報を管理するシングルトンクラス
class PWAManager {
  private static instance: PWAManager;
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private installListeners: (() => void)[] = [];
  
  private constructor() {
    // グローバル変数の初期化
    if (typeof window !== 'undefined') {
      window.deferredPrompt = null;
      
      //既存のリスナーを削除してイベントリスナーを登録
      this.setupEventListeners();
      
      // すでにキャプチャされているプロンプトをチェック
      if (window.deferredPrompt) {
        console.log('PWA Manager found existing prompt');
        this.deferredPrompt = window.deferredPrompt;
      }
      
      console.log('PWA Manager initialized');
    }
  }

  // イベントリスナーのセットアップ
  private setupEventListeners() {
    if (typeof window !== 'undefined') {
      // 既存のリスナーを削除して再登録
      window.removeEventListener('beforeinstallprompt', this.handleBeforeInstallPrompt);
      window.addEventListener('beforeinstallprompt', this.handleBeforeInstallPrompt);
      window.addEventListener('appinstalled', this.handleAppInstalled);
      
      // PWA診断用に情報をログ出力
      console.log('PWA EventListeners setup completed. Browser support status:');
      console.log('- ServiceWorker support:', 'serviceWorker' in navigator);
      console.log('- Push API support:', 'PushManager' in window);
      console.log('- Notifications support:', 'Notification' in window);
      console.log('- Display Mode media query:', window.matchMedia('(display-mode: standalone)').media !== 'not all');
    }
  }
  
  // シングルトンインスタンスを取得
  public static getInstance(): PWAManager {
    if (!PWAManager.instance) {
      PWAManager.instance = new PWAManager();
    }
    return PWAManager.instance;
  }
  
  // beforeinstallpromptイベントハンドラ
  private handleBeforeInstallPrompt = (e: Event) => {
    // デフォルトのプロンプト表示を防止
    e.preventDefault();
    
    // イベントを保存
    this.deferredPrompt = e as BeforeInstallPromptEvent;
    window.deferredPrompt = this.deferredPrompt;
    
    console.log('BeforeInstallPrompt event captured by PWAManager');
    
    // リスナーに通知
    this.notifyListeners();
    
    // カスタムイベントも発行（下位互換性のため）
    const customEvent = new CustomEvent('pwainstallable', { detail: true });
    window.dispatchEvent(customEvent);
  };
  
  // appinstalledイベントハンドラ
  private handleAppInstalled = () => {
    console.log('App was installed');
    this.deferredPrompt = null;
    window.deferredPrompt = null;
    
    // ローカルストレージに記録
    localStorage.setItem('pwaInstalled', 'true');
    localStorage.setItem('pwaInstalledDate', new Date().toISOString());
  };
  
  // インストールリスナーを登録
  public addInstallListener(callback: () => void): void {
    this.installListeners.push(callback);
    
    // すでにプロンプトが利用可能な場合は即座に通知
    if (this.deferredPrompt) {
      callback();
    }
  }
  
  // インストールリスナーを解除
  public removeInstallListener(callback: () => void): void {
    this.installListeners = this.installListeners.filter(listener => listener !== callback);
  }
  
  // 全リスナーに通知
  private notifyListeners(): void {
    this.installListeners.forEach(listener => listener());
  }
  
  // インストールプロンプトが利用可能か確認
  public isInstallPromptAvailable(): boolean {
    return !!this.deferredPrompt;
  }
  
  // インストールプロンプトを表示
  public async showInstallPrompt(): Promise<{ outcome: string } | null> {
    if (!this.deferredPrompt) {
      console.log('No installation prompt available');
      return null;
    }
    
    try {
      console.log('Showing installation prompt');
      await this.deferredPrompt.prompt();
      
      // ユーザーの選択を待つ
      const choiceResult = await this.deferredPrompt.userChoice;
      console.log('User choice result:', choiceResult.outcome);
      
      // 使用済みプロンプトをクリア
      this.deferredPrompt = null;
      window.deferredPrompt = null;
      
      return choiceResult;
    } catch (error) {
      console.error('Error showing install prompt:', error);
      return null;
    }
  }
  
  // PWAがインストール済みかチェック
  public isPWAInstalled(): boolean {
    if (typeof window === 'undefined') return false;
    
    // ブラウザ環境での判定
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInStandaloneMode = isStandalone || 
                             (window.navigator as any).standalone || 
                             document.referrer.includes('android-app://');
                             
    // ローカルストレージの確認
    const storedInstallState = localStorage.getItem('pwaInstalled') === 'true';
    
    return isInStandaloneMode || storedInstallState;
  }
  
  // PWA情報を取得
  public getPWAInfo(): Record<string, any> {
    return {
      isInstalled: this.isPWAInstalled(),
      isInstallPromptAvailable: this.isInstallPromptAvailable(),
      displayMode: this.getDisplayMode(),
      userAgent: navigator.userAgent,
      installedDate: localStorage.getItem('pwaInstalledDate') || 'unknown'
    };
  }
  
  // 表示モードを取得
  private getDisplayMode(): string {
    if (document.referrer.includes('android-app://')) {
      return 'twa';
    } else if ((navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches) {
      return 'standalone';
    }
    return 'browser';
  }
  
  // PWAを診断するための情報を取得
  public getDiagnosticInfo(): Record<string, any> {
    const manifestLink = document.querySelector('link[rel="manifest"]');
    
    return {
      userAgent: navigator.userAgent,
      pwaStatus: this.isPWAInstalled() ? 'インストール済み' : '未インストール',
      displayMode: this.getDisplayMode(),
      beforeInstallPromptCaptured: this.isInstallPromptAvailable(),
      hasPushManager: 'PushManager' in window,
      hasNotifications: 'Notification' in window,
      hasServiceWorker: 'serviceWorker' in navigator,
      isSecureContext: window.isSecureContext,
      hasManifest: !!manifestLink,
      isCapturing: true, // PWAManagerがキャプチャを試みていることを示す
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
      isDarkMode: window.matchMedia('(prefers-color-scheme: dark)').matches
    };
  }
  
  // イベントリスナーを再設定（トラブルシューティング用）
  public reinitializeEventListeners(): void {
    console.log('Reinitializing PWA event listeners');
    this.setupEventListeners();
  }
}

// グローバル型定義
declare global {
  interface Window {
    deferredPrompt: BeforeInstallPromptEvent | null;
    pwaManager?: PWAManager; // グローバル診断用
  }
}

// PWAマネージャーをエクスポート
export const pwaManager = PWAManager.getInstance();

// 診断用にグローバルに公開
if (typeof window !== 'undefined') {
  window.pwaManager = pwaManager;
}

// 初期化関数（main.tsxから呼び出す）
export function initPWA(): void {
  // PWAマネージャーのインスタンスを取得（初期化トリガー）
  const manager = PWAManager.getInstance();
  console.log('PWA initialization triggered');
  
  // PWA状態をデバッグのためにログ出力
  console.log('Initial PWA diagnostic information:', manager.getDiagnosticInfo());
}