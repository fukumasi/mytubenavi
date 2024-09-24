import { getAnalytics, logEvent } from 'firebase/analytics';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { log, error } from './logger';

// 開発環境でのみコンソールにエラーを出力
const isDevelopment = process.env.NODE_ENV === 'development';

// Firebaseのエラーロギング関数
const logErrorToFirebase = async (err, errorInfo) => {
  if (!isDevelopment) {
    try {
      // Firebase Analyticsにエラーイベントを記録
      const analytics = getAnalytics();
      logEvent(analytics, 'error', {
        error_message: err.toString(),
        error_info: JSON.stringify(errorInfo)
      });

      // Firestoreにエラーログを保存
      const db = getFirestore();
      await addDoc(collection(db, 'error_logs'), {
        error: err.toString(),
        errorInfo,
        timestamp: new Date()
      });
    } catch (logError) {
      error('Error logging to Firebase:', logError);
    }
  }
};

export const logError = (err, errorInfo = {}) => {
  if (isDevelopment) {
    log('Logged error:', err);
    log('Error Info:', errorInfo);
  }
  
  logErrorToFirebase(err, errorInfo);
  
  // ここに追加のエラー処理ロジックを実装できます
  // 例：エラー分析サービスへの送信、ユーザーへの通知など
};

// TODO: エラーの重大度に基づいたログレベルの実装
// TODO: エラーのグルーピングと集約
// TODO: カスタムエラータイプの定義と処理
// TODO: エラーレポートの自動生成機能
// TODO: 開発環境と本番環境での異なるエラー処理ロジックの実装