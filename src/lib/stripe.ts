// src/lib/stripe.ts

import { loadStripe } from '@stripe/stripe-js';

// 公開キーを環境変数から取得
const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;

// Stripeの初期化
export const getStripe = () => {
  if (!stripePublicKey) {
    console.error('Stripe public key is not defined');
    return null;
  }
  
  return loadStripe(stripePublicKey);
};