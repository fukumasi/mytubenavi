import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/', // PWAのために絶対パスを使用するように設定
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // @をsrcにエイリアス設定
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'], // 依存関係の除外設定（lucide-reactだけ除外）
  },
  build: {
    outDir: 'dist',       // ビルド出力先をdistに指定
    emptyOutDir: true,    // ビルド前に出力先ディレクトリを空にする
    sourcemap: true,      // ソースマップを有効化
  },
  server: {
    host: true,           // ローカルネットワークアクセスを許可
    port: 3000,           // 開発サーバーのポート番号
    open: true,           // サーバー起動時にブラウザを自動で開く
    hmr: {
      host: 'localhost',  // Hot Module ReplacementのためのWebSocket設定
      protocol: 'ws',
      port: 3000,
    },
    headers: {
      'Cache-Control': 'no-store', // ✅ ここを追加してブラウザキャッシュ無効化
    },
  },
});
