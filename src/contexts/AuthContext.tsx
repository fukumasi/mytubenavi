// src/contexts/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import type { Profile } from '../types';

interface AuthContextType {
 currentUser: User | null;
 session: Session | null;
 user: User | null;
 youtuberProfile: Profile | null;
 signUp: (email: string, password: string, metadata?: any) => Promise<any>;
 signIn: (email: string, password: string) => Promise<any>;
 signOut: () => Promise<void>;
 resetPassword: (email: string) => Promise<any>;
}

const AuthContext = createContext<AuthContextType>({
 currentUser: null,
 session: null,
 user: null,
 youtuberProfile: null,
 signUp: async () => {},
 signIn: async () => {},
 signOut: async () => {},
 resetPassword: async () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
 const [currentUser, setCurrentUser] = useState<User | null>(null);
 const [session, setSession] = useState<Session | null>(null);
 const [youtuberProfile, setYoutuberProfile] = useState<Profile | null>(null);
 const [isInitializing, setIsInitializing] = useState(true);

 useEffect(() => {
   const initializeAuth = async () => {
     try {
       const { data: { session: currentSession } } = await supabase.auth.getSession();
       
       if (currentSession) {
         setSession(currentSession);
         setCurrentUser(currentSession.user);

         const { data } = await supabase
           .from('profiles')
           .select('*')
           .eq('id', currentSession.user.id)
           .single();
         
         setYoutuberProfile(data);
       } else {
         // 初期化時にセッションがない場合は、ログアウトは行わない
         setCurrentUser(null);
         setSession(null);
         setYoutuberProfile(null);
       }

       const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
         console.log('Auth event:', event);
         console.log('New session:', newSession);

         if (newSession) {
           setSession(newSession);
           setCurrentUser(newSession.user);

           const { data } = await supabase
             .from('profiles')
             .select('*')
             .eq('id', newSession.user.id)
             .single();
           
           setYoutuberProfile(data);
         } else if (event === 'SIGNED_OUT') {
           // 明示的なログアウト時のみ状態をクリア
           setCurrentUser(null);
           setSession(null);
           setYoutuberProfile(null);
         }
       });

       setIsInitializing(false);
       return () => {
         subscription.unsubscribe();
       };
     } catch (error) {
       console.error('Authentication initialization error:', error);
       setCurrentUser(null);
       setSession(null);
       setYoutuberProfile(null);
       setIsInitializing(false);
     }
   };

   initializeAuth();
 }, []);

 const signUp = async (email: string, password: string, metadata?: any) => {
   const { data, error } = await supabase.auth.signUp({
     email,
     password,
     options: { data: metadata }
   });
   if (!error && data.user) {
     setCurrentUser(data.user);
   }
   return { data, error };
 };

 const signIn = async (email: string, password: string) => {
   const { data, error } = await supabase.auth.signInWithPassword({
     email,
     password
   });
   if (!error && data.user) {
     setCurrentUser(data.user);
   }
   return { data, error };
 };

 const signOut = async (): Promise<void> => {
   try {
     // まず状態をクリア
     setCurrentUser(null);
     setSession(null);
     setYoutuberProfile(null);
     
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
     
     // ここでリロードしない - 代わりにリダイレクトは呼び出し元で行う
   } catch (error) {
     console.error('Sign out error:', error);
   }
 };

 const resetPassword = async (email: string) => {
   const { data, error } = await supabase.auth.resetPasswordForEmail(email);
   return { data, error };
 };

 const value = {
   currentUser,
   session,
   user: currentUser,
   youtuberProfile,
   signUp,
   signIn,
   signOut,
   resetPassword
 };

 // 初期化中はローディング表示やnullを返すことも可能
 if (isInitializing) {
   return <div>Loading...</div>; // または null を返す
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