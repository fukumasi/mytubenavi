import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInWithRedirect, getRedirectResult } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";
import { error } from './client/utils/logger';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// 環境変数が設定されているか確認
const checkEnvVariables = () => {
  const requiredEnvVars = [
    'REACT_APP_FIREBASE_API_KEY',
    'REACT_APP_FIREBASE_AUTH_DOMAIN',
    'REACT_APP_FIREBASE_PROJECT_ID',
    'REACT_APP_FIREBASE_STORAGE_BUCKET',
    'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
    'REACT_APP_FIREBASE_APP_ID'
  ];

  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      // eslint-disable-next-line no-console
      console.warn(`Missing environment variable: ${varName}. Using default value.`);
    }
  });
};

checkEnvVariables();

// Initialize Firebase
let app;
let db;
let auth;
let storage;
let analytics = null;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  storage = getStorage(app);

  if (process.env.NODE_ENV === 'production') {
    analytics = getAnalytics(app);
  }
} catch (err) {
  // eslint-disable-next-line no-console
  console.error("Error initializing Firebase:", err);
  throw err;
}

// エラーハンドリング関数
export const handleFirebaseError = (err) => {
  error("Firebase error:", err.code, err.message);
  // ここでエラーログをサーバーに送信したり、ユーザーに通知したりできます
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.error('Firebase error:', err);
  }
};

// リダイレクト認証を使用する関数
export const signInWithRedirectWrapper = (provider) => {
  signInWithRedirect(auth, provider).catch(handleFirebaseError);
};

// リダイレクト結果を処理する関数
export const handleRedirectResult = () => {
  getRedirectResult(auth)
    .then((result) => {
      if (result) {
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.log('ユーザーがサインインしました', result.user);
        }
      }
    })
    .catch(handleFirebaseError);
};

export { app, db, auth, storage, analytics };
export default firebaseConfig;