// src/contexts/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import type { Profile } from '../types';
import LoadingSpinner from '../components/ui/LoadingSpinner';

// プレミアム会員のステータス情報を表す型
interface PremiumStatus {
  isActive: boolean;
  plan: string | null;
  expiresAt: string | null;
  daysRemaining: number | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  youtuberProfile: Profile | null;
  isPremium: boolean;
  premiumStatus: PremiumStatus | null;
  signUp: (email: string, password: string, metadata?: any) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<any>;
  updatePremiumStatus: (status: boolean, plan?: string, expiresAt?: string) => Promise<void>;
  refreshPremiumStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAuthenticated: false,
  youtuberProfile: null,
  isPremium: false,
  premiumStatus: null,
  signUp: async () => {},
  signIn: async () => {},
  signOut: async () => {},
  resetPassword: async () => {},
  updatePremiumStatus: async () => {},
  refreshPremiumStatus: async () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [youtuberProfile, setYoutuberProfile] = useState<Profile | null>(null);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // プレミアムステータスを計算する関数
  const calculatePremiumStatus = (profileData: any): PremiumStatus | null => {
    if (!profileData) return null;
    
    // プレミアム会員ではない場合
    if (!profileData.is_premium) {
      return {
        isActive: false,
        plan: null,
        expiresAt: null,
        daysRemaining: null
      };
    }
    
    // 有効期限を確認
    const expiresAt = profileData.premium_expiry;
    const now = new Date();
    const expiryDate = expiresAt ? new Date(expiresAt) : null;
    
    // 有効期限が過ぎている場合
    if (expiryDate && expiryDate < now) {
      return {
        isActive: false,
        plan: profileData.premium_plan || 'expired',
        expiresAt,
        daysRemaining: 0
      };
    }
    
    // 有効期限までの残り日数を計算
    const daysRemaining = expiryDate 
      ? Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) 
      : null;
    
    return {
      isActive: true,
      plan: profileData.premium_plan || 'standard',
      expiresAt,
      daysRemaining
    };
  };

  // プロフィールからプレミアム情報を取得して設定する関数
  const fetchAndSetPremiumInfo = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profileError) {
        console.error('Profile fetch error:', profileError);
        setIsPremium(false);
        setPremiumStatus(null);
        return;
      }
      
      // プレミアムステータスを計算
      const status = calculatePremiumStatus(profileData);
      
      // ステートを更新
      setIsPremium(!!status?.isActive);
      setPremiumStatus(status);
      
      // プレミアムステータスが有効期限切れの場合、自動的に更新
      if (status && !status.isActive && profileData.is_premium) {
        // ステータスを自動的に非プレミアムに更新
        await supabase
          .from('profiles')
          .update({ 
            is_premium: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);
      }
    } catch (error) {
      console.error('Error fetching premium info:', error);
      setIsPremium(false);
      setPremiumStatus(null);
    }
  };

  // YouTuberプロフィールを取得する関数 - 406エラー回避のため、profiles テーブルからデータを取得するように変更
  const fetchYoutuberProfile = async (userId: string) => {
    try {
      // profiles テーブルからデータを取得してYouTuberプロフィール情報を構築
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profileError) {
        console.error('Profile fetch error:', profileError);
        setYoutuberProfile(null);
        return;
      }
      
      // profileデータからYouTuber情報に必要なデータを抽出
      const youtuberProfileData = {
        id: profileData.id,
        username: profileData.username,
        bio: profileData.bio,
        avatar_url: profileData.avatar_url,
        channel_name: profileData.username || 'チャンネル未設定',
        channel_url: profileData.channel_url || '',
        description: profileData.description || '',
        created_at: profileData.created_at,
        updated_at: profileData.updated_at,
        // YouTuber固有のフィールドをprofileから構築
        subscribers: 0,
        total_views: 0
      };
      
      setYoutuberProfile(youtuberProfileData as Profile);
    } catch (error) {
      console.error('Error fetching youtuber profile:', error);
      setYoutuberProfile(null);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // セッション取得
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);

          // プレミアム情報取得
          await fetchAndSetPremiumInfo(currentSession.user.id);

          // YouTuberプロフィール取得
          await fetchYoutuberProfile(currentSession.user.id);
        } else {
          // 初期化時にセッションがない場合はステートをリセット
          setUser(null);
          setSession(null);
          setYoutuberProfile(null);
          setIsPremium(false);
          setPremiumStatus(null);
        }

        // 認証状態変更時のリスナー
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
          console.log('Auth event:', event);
          
          if (newSession) {
            setSession(newSession);
            setUser(newSession.user);

            // プレミアム情報取得
            await fetchAndSetPremiumInfo(newSession.user.id);

            // YouTuberプロフィール取得
            await fetchYoutuberProfile(newSession.user.id);
          } else if (event === 'SIGNED_OUT') {
            // 明示的なログアウト時のみ状態をクリア
            setUser(null);
            setSession(null);
            setYoutuberProfile(null);
            setIsPremium(false);
            setPremiumStatus(null);
          }
        });

        // 初期化完了
        setLoading(false);
        
        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Authentication initialization error:', error);
        setUser(null);
        setSession(null);
        setYoutuberProfile(null);
        setIsPremium(false);
        setPremiumStatus(null);
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const signUp = async (email: string, password: string, metadata?: any) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: metadata }
      });
      
      if (!error && data.user) {
        setUser(data.user);
      }
      
      return { data, error };
    } catch (error) {
      console.error('Sign up error:', error);
      return { data: null, error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (!error && data.user) {
        setUser(data.user);
      }
      
      return { data, error };
    } catch (error) {
      console.error('Sign in error:', error);
      return { data: null, error };
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      // まず状態をクリア
      setUser(null);
      setSession(null);
      setYoutuberProfile(null);
      setIsPremium(false);
      setPremiumStatus(null);
      
      // ログアウト処理を実行
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // ローカルストレージからトークンを削除
      localStorage.removeItem('sb-access-token');
      localStorage.removeItem('sb-refresh-token');
      
      // Supabaseの認証情報を削除する
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') && key.includes('-auth-token')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      
      return { data, error };
    } catch (error) {
      console.error('Reset password error:', error);
      return { data: null, error };
    }
  };

  // プレミアムステータスを更新する関数を拡張
  const updatePremiumStatus = async (
    status: boolean,
    plan?: string,
    expiresAt?: string
  ): Promise<void> => {
    try {
      if (!user) return;
      
      const updateData: any = { 
        is_premium: status,
        updated_at: new Date().toISOString()
      };
      
      // オプションパラメータがある場合は追加
      if (plan) updateData.premium_plan = plan;
      if (expiresAt) updateData.premium_expiry = expiresAt;
      
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);
        
      if (error) throw error;
      
      // 更新後にプレミアム情報を再取得
      await fetchAndSetPremiumInfo(user.id);
      
    } catch (error) {
      console.error('Premium status update error:', error);
    }
  };

  // プレミアムステータスを明示的に更新する関数
  const refreshPremiumStatus = async (): Promise<void> => {
    try {
      if (!user) return;
      await fetchAndSetPremiumInfo(user.id);
    } catch (error) {
      console.error('Premium status refresh error:', error);
    }
  };

  const value = {
    user,
    session,
    loading,
    isAuthenticated: !!user,
    youtuberProfile,
    isPremium,
    premiumStatus,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePremiumStatus,
    refreshPremiumStatus
  };

  // 初期化中はローディング表示
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};