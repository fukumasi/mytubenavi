import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import Stripe from 'https://esm.sh/stripe@12.6.0?dts';

// corsヘッダーの修正
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',  // すべてのオリジンからのアクセスを許可
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',  // POSTとOPTIONSメソッドを許可
  'Access-Control-Max-Age': '86400',  // 24時間キャッシュを有効に
};

serve(async (req) => {
  // CORSプリフライトリクエストの処理
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // リクエストボディのパース
    const requestData = await req.json();
    const { 
      amount, 
      currency = 'jpy', 
      bookingId, 
      description, 
      type = 'promotion', 
      metadata = {},
      // チェックステータス機能用
      checkStatus = false,
      paymentIntentId = null,
      // 顧客作成機能用
      createCustomer = false,
      email = null,
      name = null,
      // サブスクリプション関連
      customerId = null,
      priceId = null,
      // その他の操作
      cancel = false,
      subscriptionId = null,
      refund = false,
      getSubscription = false
    } = requestData;

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

    // Stripeクライアントの初期化
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEYが設定されていません');
    }
    
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // 顧客作成リクエストの処理
    if (createCustomer) {
      const customerEmail = email || user.email;
      const customerName = name || customerEmail;
      
      // Stripeカスタマーを作成
      const customer = await stripe.customers.create({
        email: customerEmail,
        name: customerName,
        metadata: {
          supabase_id: user.id,
        },
      });

      return new Response(
        JSON.stringify({ customerId: customer.id }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 支払い状態確認リクエストの処理
    if (checkStatus && paymentIntentId) {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      return new Response(
        JSON.stringify({ 
          status: paymentIntent.status,
          payment_status: paymentIntent.status
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // サブスクリプション情報取得リクエストの処理
    if (getSubscription && subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      
      return new Response(
        JSON.stringify({
          hasActiveSubscription: subscription.status === 'active',
          status: subscription.status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
          plan: subscription.items.data[0]?.price.nickname,
          cancelAtPeriodEnd: subscription.cancel_at_period_end
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // サブスクリプションキャンセルリクエストの処理
    if (cancel && subscriptionId) {
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true
      });
      
      return new Response(
        JSON.stringify({ status: subscription.status }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 返金処理リクエストの処理
    if (refund && paymentIntentId) {
      const refundAmount = amount || undefined; // 全額返金の場合はundefined
      const refundReason = metadata.reason || 'requested_by_customer';
      
      const refundResult = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: refundAmount ? refundAmount * 100 : undefined,
        reason: refundReason
      });
      
      return new Response(
        JSON.stringify({ refundId: refundResult.id }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // サブスクリプション作成処理
    if (type === 'premium' && customerId && priceId) {
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });
      
      // @ts-ignore - Stripeの型定義の問題を回避
      const clientSecret = subscription.latest_invoice.payment_intent.client_secret;
      
      return new Response(
        JSON.stringify({ 
          subscriptionId: subscription.id,
          clientSecret: clientSecret
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 決済インテント作成のリクエスト処理
    if (type === 'promotion') {
      // 金額の検証
      if (!amount || amount <= 0) {
        return new Response(
          JSON.stringify({ error: '有効な金額が指定されていません' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // 予約IDの検証
      if (!bookingId) {
        return new Response(
          JSON.stringify({ error: '予約IDが指定されていません' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // 予約情報の取得
      const { data: booking, error: bookingError } = await supabase
        .from('slot_bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (bookingError || !booking) {
        return new Response(
          JSON.stringify({ error: '指定された予約が見つかりません' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // スロット情報の取得
      const { data: slot, error: slotError } = await supabase
        .from('promotion_slots')
        .select('*')
        .eq('id', booking.slot_id)
        .single();

      if (slotError || !slot) {
        return new Response(
          JSON.stringify({ error: '関連する掲載枠が見つかりません' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

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

      // 拡張メタデータの構築
      const enhancedMetadata = {
        user_id: user.id,
        booking_id: bookingId,
        slot_id: booking.slot_id,
        video_id: booking.video_id,
        slot_name: slot.name,
        slot_type: slot.type,
        payment_type: type,
        ...metadata
      };

      // 説明文の構築
      const paymentDescription = description || `掲載枠予約: ${slot.name} (${slot.type})`;

      // Payment Intentの作成
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount * 100, // Stripeは金額をセント単位で受け取る
        currency: currency,
        customer: stripeCustomerId,
        description: paymentDescription,
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: enhancedMetadata,
      });

      // 予約レコードにPayment Intent IDを保存
      await supabase
        .from('slot_bookings')
        .update({ 
          payment_intent_id: paymentIntent.id,
          payment_status: 'processing'
        })
        .eq('id', bookingId);

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
    }

    // サポートされていないタイプのリクエスト
    return new Response(
      JSON.stringify({ error: 'サポートされていないリクエストタイプです' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    
    return new Response(
      JSON.stringify({ error: 'リクエスト処理中にエラーが発生しました: ' + error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});