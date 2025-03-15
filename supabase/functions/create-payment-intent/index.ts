import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import Stripe from 'https://esm.sh/stripe@12.6.0?dts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // CORSプリフライトリクエストの処理
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // リクエストボディのパース
    const { amount, slotId, duration, type = 'promotion' } = await req.json();

    // エラーチェック
    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: '有効な金額が指定されていません' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!slotId) {
      return new Response(
        JSON.stringify({ error: 'スロットIDが指定されていません' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Supabaseクライアントの初期化
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // リクエストからユーザーを認証
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: '認証が必要です' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: '認証に失敗しました' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // スロットの存在を確認
    if (type === 'promotion') {
      const { data: slot, error: slotError } = await supabase
        .from('promotion_slots')
        .select('*')
        .eq('id', slotId)
        .single();

      if (slotError || !slot) {
        return new Response(
          JSON.stringify({ error: '指定されたスロットが見つかりません' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Stripeクライアントの初期化
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEYが設定されていません');
    }
    
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // ユーザーに関連付けられたStripeカスタマー情報を取得または作成
    const { data: profileData } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email, display_name')
      .eq('id', user.id)
      .single();

    let stripeCustomerId = profileData?.stripe_customer_id;

    if (!stripeCustomerId) {
      // Stripeカスタマーを作成
      const customer = await stripe.customers.create({
        email: user.email,
        name: profileData?.display_name || user.email,
        metadata: {
          supabase_id: user.id,
        },
      });

      stripeCustomerId = customer.id;

      // プロフィールにStripeカスタマーIDを保存
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', user.id);
    }

    // Payment Intentの作成
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Stripeは金額をセント単位で受け取る
      currency: 'jpy',
      customer: stripeCustomerId,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        user_id: user.id,
        slot_id: slotId,
        duration: duration,
        type: type,
      },
    });

    // クライアントシークレットをクライアントに返す
    return new Response(
      JSON.stringify({ 
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error creating payment intent:', error);
    
    return new Response(
      JSON.stringify({ error: '決済情報の作成に失敗しました: ' + error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});