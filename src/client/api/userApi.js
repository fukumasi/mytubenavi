// src/client/api/userApi.js
import { getAuth, updateEmail, updatePassword, deleteUser as firebaseDeleteUser } from 'firebase/auth';
import { doc, getDoc, updateDoc, deleteDoc, getFirestore } from 'firebase/firestore';
import { logError } from '../utils/errorLogging';

const db = getFirestore();
const auth = getAuth();

const handleApiError = (error, errorMessage) => {
  logError(error, { message: errorMessage });
  throw new Error(errorMessage);
};

export const updateUser = async (userData) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('ユーザーが認証されていません');

    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, userData);
    return { message: 'ユーザー情報が更新されました' };
  } catch (error) {
    handleApiError(error, 'ユーザー情報の更新に失敗しました');
  }
};

export const changeEmail = async (newEmail) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('ユーザーが認証されていません');

    await updateEmail(user, newEmail);
    return { message: 'メールアドレスが変更されました' };
  } catch (error) {
    handleApiError(error, 'メールアドレスの変更に失敗しました');
  }
};

export const changePassword = async (newPassword) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('ユーザーが認証されていません');

    await updatePassword(user, newPassword);
    return { message: 'パスワードが変更されました' };
  } catch (error) {
    handleApiError(error, 'パスワードの変更に失敗しました');
  }
};

export const getUserProfile = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return userSnap.data();
    } else {
      throw new Error('ユーザーが見つかりません');
    }
  } catch (error) {
    handleApiError(error, 'ユーザープロフィールの取得に失敗しました');
  }
};

export const deleteUser = async () => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('ユーザーが認証されていません');

    const userRef = doc(db, 'users', user.uid);
    await deleteDoc(userRef);
    await firebaseDeleteUser(user);
    return { message: 'ユーザーアカウントが削除されました' };
  } catch (error) {
    handleApiError(error, 'ユーザーアカウントの削除に失敗しました');
  }
};

export const getUserDashboardData = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      // ダッシュボードに必要なデータを取得
      // 例: 最近の活動、お気に入り動画など
      return {
        recentActivity: userData.recentActivity || [],
        favoriteVideos: userData.favoriteVideos || [],
        // 他のダッシュボードデータ
      };
    } else {
      throw new Error('ユーザーが見つかりません');
    }
  } catch (error) {
    handleApiError(error, 'ダッシュボードデータの取得に失敗しました');
  }
};