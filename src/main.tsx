import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { register as registerServiceWorker } from './registerServiceWorker';
import { initPWA } from './pwaUtils'; // PWA初期化関数をインポート

// PWA管理を初期化（最初に呼び出す）
initPWA();

// Service Workerを登録
registerServiceWorker();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

const root = createRoot(rootElement);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
