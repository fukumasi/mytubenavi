import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';  // この行を変更
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export const useTheme = () => {
  const [theme, setTheme] = useState('light');
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    const loadTheme = async () => {
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists() && userDoc.data().theme) {
            setTheme(userDoc.data().theme);
          } else {
            // ユーザードキュメントが存在しないか、テーマが設定されていない場合
            // デフォルトのテーマを設定
            setTheme('light');
          }
        } catch (error) {
          setError('テーマの読み込みに失敗しました。デフォルトのテーマを使用します。');
          setTheme('light');
        }
      } else {
        // ユーザーがログインしていない場合、ローカルストレージから取得
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
          setTheme(savedTheme);
        }
      }
    };

    loadTheme();
  }, [user]);

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);

    if (user) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, { theme: newTheme }, { merge: true });
      } catch (error) {
        setError('テーマの保存に失敗しました。設定は一時的にのみ適用されます。');
      }
    } else {
      // ユーザーがログインしていない場合、ローカルストレージに保存
      localStorage.setItem('theme', newTheme);
    }
  };

  return { theme, toggleTheme, error };
};

export default useTheme;