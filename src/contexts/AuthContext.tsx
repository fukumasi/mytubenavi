// src/contexts/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';


type AuthContextType = {
  currentUser: User | null;
  session: Session | null;
  signUp: (email: string, password: string, metadata?: any) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<any>;
};

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  session: null,
  signUp: async () => {},
  signIn: async () => {},
  signOut: async () => {},
  resetPassword: async () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);

    useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange((_, session) => {
            setSession(session);
            setCurrentUser(session?.user || null);
        });
    
        // 初期セッションを読み込む
        const fetchInitialSession = async () => {
            const { data, error } = await supabase.auth.getSession()
            if (error) {
                console.error("初期セッションの取得に失敗しました:", error);
                return;
            }
            setSession(data.session);
            setCurrentUser(data.session?.user || null);
        };
    
        fetchInitialSession();
    
        return () => {
            authListener.subscription.unsubscribe();
        };
      }, []);

  const signUp = async (email: string, password: string, metadata?: any) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata }
    });
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { data, error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email);
    return { data, error };
  };

  const value = {
    currentUser,
    session,
    signUp,
    signIn,
    signOut,
    resetPassword
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);