// src/lib/stripe.ts

import { loadStripe } from '@stripe/stripe-js';

// 公開キーを環境変数から取得（フォールバック値を設定）
const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_51R0NUQCNKD1NSGcSqzhhjOmjcq7xp1mUgqVpfYeCY6VN1s4FIvgmVYRfRm9BGTbINqH6YRPxYzAHDsGtAbbcQS6x00b1cqwyQk';

// Stripeの初期化
let stripePromise: Promise<any> | null = null;

export const getStripe = () => {
  if (!stripePromise) {
    console.log('Stripe public key:', stripePublicKey);
    stripePromise = loadStripe(stripePublicKey);
  }
  return stripePromise;
};

export default {
  getStripe
};