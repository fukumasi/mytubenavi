// src/client/api/userApi.js
import { getAuth, updateEmail, updatePassword, deleteUser as firebaseDeleteUser } from 'firebase/auth';
import { doc, getDoc, updateDoc, deleteDoc, getFirestore } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { logError } from '../utils/errorLogging';

const db = getFirestore();
const auth = getAuth();
const storage = getStorage();

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
      return {
        recentActivity: userData.recentActivity || [],
        favoriteVideos: userData.favoriteVideos || [],
      };
    } else {
      throw new Error('ユーザーが見つかりません');
    }
  } catch (error) {
    handleApiError(error, 'ダッシュボードデータの取得に失敗しました');
  }
};

export const uploadAvatar = async (userId, file) => {
  try {
    const fileExtension = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const storageRef = ref(storage, `profileImages/${userId}/${fileName}`);

    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);

    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { avatar: downloadURL });

    return { downloadURL };
  } catch (error) {
    console.error('Error uploading avatar:', error);
    if (error.code === 'storage/unauthorized') {
      throw new Error('アバター画像のアップロード権限がありません');
    } else {
      throw new Error('アバター画像のアップロードに失敗しました');
    }
  }
};

export const getAvatarUrl = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      return userSnap.data().avatar;
    } else {
      throw new Error('ユーザーが見つかりません');
    }
  } catch (error) {
    handleApiError(error, 'アバターURLの取得に失敗しました');
  }
};