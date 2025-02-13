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

useEffect(() => {
  const initializeAuth = async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    setSession(currentSession);
    setCurrentUser(currentSession?.user || null);

    if (currentSession?.user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentSession.user.id)
        .single();
      setYoutuberProfile(data);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('Auth event:', event);
      console.log('New session:', newSession);
      setSession(newSession);
      setCurrentUser(newSession?.user || null);

      if (newSession?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', newSession.user.id)
          .single();
        setYoutuberProfile(data);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
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
  const { error } = await supabase.auth.signOut();
  if (!error) {
    setCurrentUser(null);
    setSession(null);
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

return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
const context = useContext(AuthContext);
if (!context) {
  throw new Error('useAuth must be used within an AuthProvider');
}
return context;
};