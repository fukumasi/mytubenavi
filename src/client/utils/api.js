import axios from 'axios';
import { getAuth } from 'firebase/auth';
import { error } from './logger';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// リクエストインターセプター
api.interceptors.request.use(async (config) => {
  const auth = getAuth();
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
}, (err) => {
  return Promise.reject(err);
});

// レスポンスインターセプター
api.interceptors.response.use((response) => {
  return response;
}, async (err) => {
  if (err.response && err.response.status === 401) {
    // トークンが無効な場合、ユーザーをログアウトさせる
    const auth = getAuth();
    try {
      await auth.signOut();
      // TODO: ログアウト後の処理（例：ログインページへのリダイレクト）
    } catch (signOutError) {
      error('Sign out failed', signOutError);
    }
  }
  return Promise.reject(err);
});

export default api;