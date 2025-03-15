import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import Stripe from "https://esm.sh/stripe@12.6.0?dts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // CORSプリフライトリクエストの処理
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Stripeからのリクエストボディを取得
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return new Response(
        JSON.stringify({ error: "stripe-signatureヘッダーがありません" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Stripeクライアントの初期化
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeSecretKey || !webhookSecret) {
      throw new Error("Stripe環境変数が設定されていません");
    }
    
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16", 
    });

    // Webhookシグネチャを検証
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return new Response(
        JSON.stringify({ error: `Webhook signature verification failed: ${err.message}` }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Supabaseクライアントの初期化
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // イベントの種類に基づいて処理
    console.log(`Processing webhook event: ${event.type}`);

    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;
        console.log(`Payment succeeded for amount ${paymentIntent.amount}`);
        
        const { metadata } = paymentIntent;
        const { user_id, slot_id, duration, type, video_id } = metadata || {};

        if (type === "promotion" && slot_id && user_id) {
          // 広告掲載予約レコードを更新
          const { data, error } = await supabase
            .from("slot_bookings")
            .update({ 
              payment_status: "completed",
              payment_intent_id: paymentIntent.id,
              updated_at: new Date().toISOString()
            })
            .eq("payment_intent_id", paymentIntent.id);

          if (error) {
            console.error("Error updating booking:", error);
            // エラーがあっても、Stripeにはエラーを返さない（再試行されるため）
          }

          // 最新のslot_bookingsレコードがない場合は新規作成
          const { data: checkData } = await supabase
            .from("slot_bookings")
            .select("*")
            .eq("payment_intent_id", paymentIntent.id);

          if (!checkData || checkData.length === 0) {
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + Number(duration));

            const { error: insertError } = await supabase
              .from("slot_bookings")
              .insert([{
                slot_id,
                user_id,
                payment_intent_id: paymentIntent.id,
                video_id,
                payment_status: "completed",
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                amount: paymentIntent.amount / 100, // セントから円に変換
              }]);

            if (insertError) {
              console.error("Error creating booking:", insertError);
            }
          }

          // 通知レコードを作成
          try {
            // ユーザー情報を取得
            const { data: userData, error: userError } = await supabase
              .from("profiles")
              .select("display_name")
              .eq("id", user_id)
              .single();

            if (userError) {
              console.error("Error fetching user data:", userError);
            } else {
              // 掲載枠情報を取得
              const { data: slotData, error: slotError } = await supabase
                .from("promotion_slots")
                .select("name")
                .eq("id", slot_id)
                .single();

              if (slotError) {
                console.error("Error fetching slot data:", slotError);
              } else {
                // 通知作成
                const { error: notifError } = await supabase
                  .from("notifications")
                  .insert([{
                    user_id,
                    type: "promotion_completed",
                    title: "有料掲載枠のお支払いが完了しました",
                    content: `「${slotData.name}」の掲載が確定しました。${duration}日間の掲載をお楽しみください。`,
                    is_read: false,
                    metadata: { 
                      slot_id, 
                      duration,
                      payment_intent_id: paymentIntent.id,
                      video_id
                    }
                  }]);

                if (notifError) {
                  console.error("Error creating notification:", notifError);
                }
              }
            }
          } catch (notifErr) {
            console.error("Error in notification process:", notifErr);
          }
        } else if (type === "premium") {
          // プレミアム会員処理はsubscriptionイベントで処理
          console.log("Premium payment intent succeeded:", paymentIntent.id);
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object;
        console.log(`Payment failed for amount ${paymentIntent.amount}`);
        
        const { metadata } = paymentIntent;
        const { user_id, slot_id, type } = metadata || {};

        if (type === "promotion" && slot_id && user_id) {
          // 予約レコードを更新
          const { error } = await supabase
            .from("slot_bookings")
            .update({ 
              payment_status: "failed",
              updated_at: new Date().toISOString()
            })
            .eq("payment_intent_id", paymentIntent.id);

          if (error) {
            console.error("Error updating booking status:", error);
          }

          // 失敗通知を作成
          const { error: notifError } = await supabase
            .from("notifications")
            .insert([{
              user_id,
              type: "payment_failed",
              title: "お支払いに失敗しました",
              content: "有料掲載枠の決済処理に失敗しました。別の決済方法をお試しいただくか、サポートまでお問い合わせください。",
              is_read: false,
              metadata: { 
                slot_id, 
                payment_intent_id: paymentIntent.id,
                error: paymentIntent.last_payment_error?.message || "決済処理に失敗しました"
              }
            }]);

          if (notifError) {
            console.error("Error creating notification:", notifError);
          }
        } else if (type === "premium") {
          // プレミアム会員の支払い失敗
          const { data: userData, error: userError } = await supabase
            .from("profiles")
            .select("display_name, email")
            .eq("id", user_id)
            .single();

          if (userError) {
            console.error("Error fetching user data:", userError);
          } else {
            // 失敗通知を作成
            const { error: notifError } = await supabase
              .from("notifications")
              .insert([{
                user_id,
                type: "payment_failed",
                title: "プレミアム会員のお支払いに失敗しました",
                content: "プレミアム会員のお支払い処理に失敗しました。別の決済方法をお試しいただくか、サポートまでお問い合わせください。",
                is_read: false,
                metadata: { 
                  payment_intent_id: paymentIntent.id,
                  error: paymentIntent.last_payment_error?.message || "決済処理に失敗しました"
                }
              }]);

            if (notifError) {
              console.error("Error creating notification:", notifError);
            }
          }
        }
        break;
      }

      case "customer.subscription.created": {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        
        // Stripeカスタマーに関連付けられたユーザーを検索
        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId);

        if (profileError || !profiles || profiles.length === 0) {
          console.error("No profile found for Stripe customer:", customerId);
          break;
        }

        const userId = profiles[0].id;
        
        // サブスクリプションプランに基づいて有効期限を計算
        const now = new Date();
        let expiryDate = new Date();

        // サブスクリプションアイテムから情報を取得
        const item = subscription.items.data[0];
        const planId = item.price.id;
        
        let premiumPlan = "monthly"; // デフォルト
        
        // プランIDに基づいてプランの種類を設定
        if (planId.includes("monthly")) {
          premiumPlan = "monthly";
          expiryDate.setMonth(now.getMonth() + 1);
        } else if (planId.includes("quarterly")) {
          premiumPlan = "quarterly";
          expiryDate.setMonth(now.getMonth() + 3);
        } else if (planId.includes("yearly")) {
          premiumPlan = "yearly";
          expiryDate.setFullYear(now.getFullYear() + 1);
        }

        // プロフィールを更新してプレミアム会員に設定
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            is_premium: true,
            premium_plan: premiumPlan,
            premium_expiry: expiryDate.toISOString(),
            stripe_subscription_id: subscription.id,
            updated_at: now.toISOString()
          })
          .eq("id", userId);

        if (updateError) {
          console.error("Error updating profile:", updateError);
        }

        // 支払い履歴を記録
        const { error: paymentError } = await supabase
          .from("premium_payments")
          .insert([{
            user_id: userId,
            plan: premiumPlan,
            amount: subscription.items.data[0].price.unit_amount / 100, // セントから円へ変換
            payment_method: "stripe",
            status: "completed",
            expires_at: expiryDate.toISOString(),
            subscription_id: subscription.id
          }]);

        if (paymentError) {
          console.error("Error recording payment:", paymentError);
        }

        // 通知を作成
        const { error: notifError } = await supabase
          .from("notifications")
          .insert([{
            user_id: userId,
            type: "premium_activated",
            title: "プレミアム会員にアップグレードしました",
            content: `${premiumPlan === "monthly" ? "月額" : premiumPlan === "quarterly" ? "3ヶ月" : "年間"}プランのプレミアム会員になりました。特別な機能をお楽しみください。`,
            is_read: false,
            metadata: { 
              plan: premiumPlan,
              subscription_id: subscription.id,
              expiry_date: expiryDate.toISOString()
            }
          }]);

        if (notifError) {
          console.error("Error creating notification:", notifError);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        
        // サブスクリプションステータスをチェック
        if (subscription.status === "active") {
          const customerId = subscription.customer;
          
          // ユーザーを検索
          const { data: profiles, error: profileError } = await supabase
            .from("profiles")
            .select("id, premium_expiry")
            .eq("stripe_customer_id", customerId);

          if (profileError || !profiles || profiles.length === 0) {
            console.error("No profile found for Stripe customer:", customerId);
            break;
          }

          const userId = profiles[0].id;
          const currentExpiry = new Date(profiles[0].premium_expiry);
          
          // 有効期限を更新（現在の有効期限から延長）
          let newExpiryDate = new Date(currentExpiry);
          
          // サブスクリプションアイテムからプラン情報を取得
          const item = subscription.items.data[0];
          const planId = item.price.id;
          
          let premiumPlan = "monthly"; // デフォルト
          
          if (planId.includes("monthly")) {
            premiumPlan = "monthly";
            newExpiryDate.setMonth(currentExpiry.getMonth() + 1);
          } else if (planId.includes("quarterly")) {
            premiumPlan = "quarterly";
            newExpiryDate.setMonth(currentExpiry.getMonth() + 3);
          } else if (planId.includes("yearly")) {
            premiumPlan = "yearly";
            newExpiryDate.setFullYear(currentExpiry.getFullYear() + 1);
          }
          
          // プレミアム会員情報を更新
          const { error: updateError } = await supabase
            .from("profiles")
            .update({
              is_premium: true,
              premium_plan: premiumPlan,
              premium_expiry: newExpiryDate.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq("id", userId);

          if (updateError) {
            console.error("Error updating profile:", updateError);
          }

          // 更新通知を作成
          const { error: notifError } = await supabase
            .from("notifications")
            .insert([{
              user_id: userId,
              type: "premium_renewed",
              title: "プレミアム会員を更新しました",
              content: `${premiumPlan === "monthly" ? "月額" : premiumPlan === "quarterly" ? "3ヶ月" : "年間"}プランが更新されました。有効期限は${newExpiryDate.toLocaleDateString("ja-JP")}までです。`,
              is_read: false,
              metadata: { 
                plan: premiumPlan,
                subscription_id: subscription.id,
                expiry_date: newExpiryDate.toISOString()
              }
            }]);

          if (notifError) {
            console.error("Error creating notification:", notifError);
          }
        } else if (subscription.cancel_at_period_end) {
          // 更新停止の設定がされた場合
          const customerId = subscription.customer;
          
          // ユーザーを検索
          const { data: profiles, error: profileError } = await supabase
            .from("profiles")
            .select("id")
            .eq("stripe_customer_id", customerId);

          if (profileError || !profiles || profiles.length === 0) {
            console.error("No profile found for Stripe customer:", customerId);
            break;
          }

          const userId = profiles[0].id;
          
          // 通知を作成
          const { error: notifError } = await supabase
            .from("notifications")
            .insert([{
              user_id: userId,
              type: "premium_cancellation_scheduled",
              title: "プレミアム会員の自動更新が停止されました",
              content: `現在の期間が終了する${new Date(subscription.cancel_at).toLocaleDateString("ja-JP")}に自動更新が停止されます。その後もプレミアム会員を継続したい場合は、更新してください。`,
              is_read: false,
              metadata: { 
                subscription_id: subscription.id,
                cancel_at: subscription.cancel_at
              }
            }]);

          if (notifError) {
            console.error("Error creating notification:", notifError);
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        
        // ユーザーを検索
        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("id, premium_expiry")
          .eq("stripe_customer_id", customerId);

        if (profileError || !profiles || profiles.length === 0) {
          console.error("No profile found for Stripe customer:", customerId);
          break;
        }

        const userId = profiles[0].id;
        const currentExpiry = new Date(profiles[0].premium_expiry);
        const now = new Date();
        
        // 有効期限が過ぎている場合はプレミアム会員を解除
        if (currentExpiry < now) {
          const { error: updateError } = await supabase
            .from("profiles")
            .update({
              is_premium: false,
              stripe_subscription_id: null,
              updated_at: new Date().toISOString()
            })
            .eq("id", userId);

          if (updateError) {
            console.error("Error updating profile:", updateError);
          }
          
          // 通知を作成
          const { error: notifError } = await supabase
            .from("notifications")
            .insert([{
              user_id: userId,
              type: "premium_expired",
              title: "プレミアム会員が終了しました",
              content: "プレミアム会員の期間が終了しました。引き続き特別な機能を利用するには、プレミアム会員を更新してください。",
              is_read: false,
              metadata: { subscription_id: subscription.id }
            }]);

          if (notifError) {
            console.error("Error creating notification:", notifError);
          }
        } else {
          // サブスクリプションIDをnullに設定（期限が残っている場合は会員資格は継続）
          const { error: updateError } = await supabase
            .from("profiles")
            .update({
              stripe_subscription_id: null,
              updated_at: new Date().toISOString()
            })
            .eq("id", userId);

          if (updateError) {
            console.error("Error updating profile:", updateError);
          }
          
          // 通知を作成
          const { error: notifError } = await supabase
            .from("notifications")
            .insert([{
              user_id: userId,
              type: "premium_cancellation_complete",
              title: "プレミアム会員の更新が停止されました",
              content: `プレミアム会員の自動更新が停止されました。${currentExpiry.toLocaleDateString("ja-JP")}まで引き続きプレミアム会員としてご利用いただけます。`,
              is_read: false,
              metadata: { 
                subscription_id: subscription.id,
                expiry_date: currentExpiry.toISOString()
              }
            }]);

          if (notifError) {
            console.error("Error creating notification:", notifError);
          }
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        
        // サブスクリプションの支払い成功通知
        if (invoice.subscription) {
          const subscriptionId = invoice.subscription;
          
          // ユーザーを検索
          const { data: profiles, error: profileError } = await supabase
            .from("profiles")
            .select("id")
            .eq("stripe_subscription_id", subscriptionId);

          if (profileError || !profiles || profiles.length === 0) {
            console.error("No profile found for subscription:", subscriptionId);
            break;
          }

          const userId = profiles[0].id;
          
          // 通知を作成
          const { error: notifError } = await supabase
            .from("notifications")
            .insert([{
              user_id: userId,
              type: "payment_succeeded",
              title: "お支払いが完了しました",
              content: `プレミアム会員のお支払い（${invoice.amount_paid / 100}円）が正常に処理されました。`,
              is_read: false,
              metadata: { 
                invoice_id: invoice.id,
                subscription_id: subscriptionId,
                amount: invoice.amount_paid / 100
              }
            }]);

          if (notifError) {
            console.error("Error creating notification:", notifError);
          }

          // 支払い履歴を記録
          const { error: paymentError } = await supabase
            .from("premium_payments")
            .insert([{
              user_id: userId,
              subscription_id: subscriptionId,
              amount: invoice.amount_paid / 100,
              payment_method: "stripe",
              status: "completed",
              invoice_id: invoice.id
            }]);

          if (paymentError) {
            console.error("Error recording payment:", paymentError);
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        
        if (invoice.subscription) {
          const subscriptionId = invoice.subscription;
          
          // ユーザーを検索
          const { data: profiles, error: profileError } = await supabase
            .from("profiles")
            .select("id, email")
            .eq("stripe_subscription_id", subscriptionId);

          if (profileError || !profiles || profiles.length === 0) {
            console.error("No profile found for subscription:", subscriptionId);
            break;
          }

          const userId = profiles[0].id;
          
          // 通知を作成
          const { error: notifError } = await supabase
            .from("notifications")
            .insert([{
              user_id: userId,
              type: "payment_failed",
              title: "お支払いに失敗しました",
              content: "プレミアム会員の定期支払いに失敗しました。お支払い方法を更新してください。",
              is_read: false,
              metadata: { 
                invoice_id: invoice.id,
                subscription_id: subscriptionId,
                attempt_count: invoice.attempt_count
              }
            }]);

          if (notifError) {
            console.error("Error creating notification:", notifError);
          }
        }
        break;
      }

      // 必要に応じて他のイベントタイプを処理
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // 処理成功のレスポンス
    return new Response(
      JSON.stringify({ received: true }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (err) {
    console.error(`Error processing webhook: ${err.message}`);
    
    // エラーが発生しても200を返す（StripeはエラーがあるとWebhookを再試行するため）
    return new Response(
      JSON.stringify({ error: err.message }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});