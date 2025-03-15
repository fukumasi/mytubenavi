// supabase/functions/stripe/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import Stripe from 'https://esm.sh/stripe@12.5.0?target=deno'

// 環境変数の取得
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''

// Stripeクライアント初期化
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

// Supabaseクライアント初期化
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// リクエスト処理関数
const handleRequest = async (req: Request): Promise<Response> => {
  const url = new URL(req.url)
  const path = url.pathname.split('/').pop()
  
  // CORSヘッダー設定
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
  }
  
  // OPTIONSリクエスト（CORS preflight）への対応
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers })
  }
  
  try {
    // パスに応じた処理の振り分け
    switch (path) {
      case 'create-customer':
        return await handleCreateCustomer(req, headers)
      
      case 'create-subscription':
        return await handleCreateSubscription(req, headers)
        
      case 'cancel-subscription':
        return await handleCancelSubscription(req, headers)
        
      case 'create-promotion-payment':
        return await handleCreatePromotionPayment(req, headers)
        
      case 'webhook':
        return await handleWebhook(req)
        
      default:
        return new Response(
          JSON.stringify({ error: 'Not found' }),
          { status: 404, headers }
        )
    }
  } catch (error) {
    console.error('Error processing request:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers }
    )
  }
}

// 顧客作成ハンドラ
const handleCreateCustomer = async (req: Request, headers: HeadersInit): Promise<Response> => {
  const { email, name, userId } = await req.json()
  
  // ユーザーIDの検証
  if (!userId) {
    return new Response(
      JSON.stringify({ error: 'User ID is required' }),
      { status: 400, headers }
    )
  }
  
  // Stripeで顧客作成
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { userId },
  })
  
  // SupabaseのプロフィールにStripe顧客IDを保存
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ stripe_customer_id: customer.id })
    .eq('id', userId)
  
  if (updateError) {
    console.error('Error updating profile:', updateError)
  }
  
  return new Response(
    JSON.stringify({ customerId: customer.id }),
    { status: 200, headers }
  )
}

// サブスクリプション作成ハンドラ
const handleCreateSubscription = async (req: Request, headers: HeadersInit): Promise<Response> => {
  const { customerId, priceId } = await req.json()
  
  // 必須パラメータの確認
  if (!customerId || !priceId) {
    return new Response(
      JSON.stringify({ error: 'Customer ID and price ID are required' }),
      { status: 400, headers }
    )
  }
  
  // サブスクリプション作成
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.payment_intent'],
  })
  
  return new Response(
    JSON.stringify({
      subscriptionId: subscription.id,
      clientSecret: (subscription.latest_invoice as any).payment_intent.client_secret,
    }),
    { status: 200, headers }
  )
}

// サブスクリプションキャンセルハンドラ
const handleCancelSubscription = async (req: Request, headers: HeadersInit): Promise<Response> => {
  const { subscriptionId } = await req.json()
  
  if (!subscriptionId) {
    return new Response(
      JSON.stringify({ error: 'Subscription ID is required' }),
      { status: 400, headers }
    )
  }
  
  // サブスクリプションキャンセル
  const canceledSubscription = await stripe.subscriptions.cancel(subscriptionId)
  
  return new Response(
    JSON.stringify({ status: canceledSubscription.status }),
    { status: 200, headers }
  )
}

// 有料動画掲載枠支払いハンドラ
const handleCreatePromotionPayment = async (req: Request, headers: HeadersInit): Promise<Response> => {
  const { customerId, amount, metadata } = await req.json()
  
  if (!customerId || !amount) {
    return new Response(
      JSON.stringify({ error: 'Customer ID and amount are required' }),
      { status: 400, headers }
    )
  }
  
  // 支払いインテント作成
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: 'jpy',
    customer: customerId,
    metadata: metadata || {},
  })
  
  return new Response(
    JSON.stringify({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    }),
    { status: 200, headers }
  )
}

// Webhookハンドラ
const handleWebhook = async (req: Request): Promise<Response> => {
  const signature = req.headers.get('stripe-signature')
  
  if (!signature || !stripeWebhookSecret) {
    return new Response(
      JSON.stringify({ error: 'Missing signature or webhook secret' }),
      { status: 400 }
    )
  }
  
  // リクエストボディの取得
  const body = await req.text()
  
  let event
  try {
    // Webhook検証
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      stripeWebhookSecret
    )
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`)
    return new Response(
      JSON.stringify({ error: `Webhook Error: ${err.message}` }),
      { status: 400 }
    )
  }
  
  // イベントタイプに応じた処理
  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentIntentSucceeded(event.data.object)
      break
      
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object)
      break
      
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object)
      break
  }
  
  return new Response(JSON.stringify({ received: true }), { status: 200 })
}

// 支払い成功時の処理
const handlePaymentIntentSucceeded = async (paymentIntent: Stripe.PaymentIntent) => {
  console.log('Payment succeeded:', paymentIntent.id)
  
  // YouTuber向け広告掲載の場合
  if (paymentIntent.metadata.slotId) {
    await updatePromotionSlot(paymentIntent)
  }
}

// YouTuber向け広告掲載スロットの更新
const updatePromotionSlot = async (paymentIntent: Stripe.PaymentIntent) => {
  const { slotId, position, duration, videoId, userId } = paymentIntent.metadata
  
  // 掲載期間の計算
  const startDate = new Date()
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + parseInt(duration))
  
  // 掲載スロットの更新/作成
  const { error } = await supabase
    .from('slot_bookings')
    .insert({
      user_id: userId,
      slot_id: slotId,
      video_id: videoId,
      position: position,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      payment_intent_id: paymentIntent.id,
      status: 'active',
      amount_paid: paymentIntent.amount,
    })
    
  if (error) {
    console.error('Error updating promotion slot:', error)
  }
}

// サブスクリプション更新時の処理
const handleSubscriptionUpdated = async (subscription: Stripe.Subscription) => {
  // ユーザーIDの取得
  const customerId = subscription.customer as string
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    
  if (error || !profiles.length) {
    console.error('Error finding user for subscription:', error)
    return
  }
  
  const userId = profiles[0].id
  
  // サブスクリプションステータスに応じた処理
  if (subscription.status === 'active') {
    // 有効期限の計算
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000)
    
    // プランの特定
    let premiumPlan = 'monthly'
    if (subscription.items.data[0].price.recurring?.interval === 'year') {
      premiumPlan = 'yearly'
    } else if (subscription.items.data[0].price.recurring?.interval_count === 3) {
      premiumPlan = 'quarterly'
    }
    
    // プロフィール更新
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        is_premium: true,
        premium_plan: premiumPlan,
        premium_expiry: currentPeriodEnd.toISOString(),
        subscription_id: subscription.id,
      })
      .eq('id', userId)
      
    if (updateError) {
      console.error('Error updating user premium status:', updateError)
    }
  }
}

// サブスクリプション削除時の処理
const handleSubscriptionDeleted = async (subscription: Stripe.Subscription) => {
  // ユーザーIDの取得
  const customerId = subscription.customer as string
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    
  if (error || !profiles.length) {
    console.error('Error finding user for subscription:', error)
    return
  }
  
  const userId = profiles[0].id
  
  // プレミアムステータスの更新
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      is_premium: false,
      subscription_id: null,
    })
    .eq('id', userId)
    
  if (updateError) {
    console.error('Error updating user premium status:', updateError)
  }
}

// サーブ関数
serve(handleRequest)