// src/services/verificationService.ts

import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult,
  signOut as firebaseSignOut,
  Auth,
  ApplicationVerifier
} from 'firebase/auth';
import { supabase } from '../lib/supabase';

// Firebase設定 - 実際の設定値は.envから読み込むようにする
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
};

// Firebase初期化 - 有効な設定がある場合のみ初期化
let firebaseApp;
let firebaseAuth: Auth | undefined;

// APIキーが設定されている場合のみFirebaseを初期化
if (firebaseConfig.apiKey) {
  try {
    firebaseApp = initializeApp(firebaseConfig);
    firebaseAuth = getAuth(firebaseApp);
    console.log('Firebase 認証初期化成功');
  } catch (error) {
    console.error('Firebase 初期化エラー:', error);
  }
} else {
  console.warn('Firebase 設定が見つかりません。環境変数を確認してください。');
}

// 認証レベル定義
export enum VerificationLevel {
  EMAIL_ONLY = 1,
  PHONE_VERIFIED = 2,
  ID_VERIFIED = 3
}

// 検証状態の型定義
export interface VerificationState {
  emailVerified: boolean;
  phoneVerified: boolean;
  idVerified: boolean;
  verificationLevel: VerificationLevel;
  phoneNumber?: string;
  verificationProvider?: string;
  verificationId?: string;
  verificationExpiry?: Date;
}

// グローバル変数
let recaptchaVerifier: RecaptchaVerifier | null = null;
let confirmationResult: ConfirmationResult | null = null;

/**
 * 電話番号を国際形式にフォーマット
 * @param phoneNumber ローカル形式の電話番号 (例: 09012345678)
 * @returns 国際形式の電話番号 (例: +819012345678)
 */
const formatToInternational = (phoneNumber: string): string => {
  // すでに国際形式の場合はそのまま返す
  if (phoneNumber.startsWith('+')) {
    return phoneNumber;
  }
  
  // 日本の電話番号: 先頭の0を除去して+81を付ける
  return `+81${phoneNumber.replace(/^0/, '')}`;
};

/**
 * reCAPTCHAの初期化
 * @param containerId reCAPTCHAを表示する要素のID
 * @returns Promise<RecaptchaVerifier>
 */
const initRecaptcha = (containerId: string): Promise<ApplicationVerifier> => {
  return new Promise((resolve, reject) => {
    try {
      // Firebase認証が初期化されていない場合
      if (!firebaseAuth) {
        reject(new Error('Firebase認証が初期化されていません。環境変数を確認してください'));
        return;
      }

      // 既存のreCAPTCHA verifierがあればクリア
      if (recaptchaVerifier) {
        try {
          recaptchaVerifier.clear();
        } catch (e) {
          console.warn('既存のreCAPTCHAクリア中にエラーが発生しました:', e);
        }
        recaptchaVerifier = null;
      }

      // DOM要素が存在するか確認
      const container = document.getElementById(containerId);
      if (!container) {
        reject(new Error(`reCAPTCHAコンテナ要素 (ID: ${containerId}) が見つかりません`));
        return;
      }

      // reCAPTCHA verifierを新規作成
      recaptchaVerifier = new RecaptchaVerifier(firebaseAuth, containerId, {
        size: 'normal',
        callback: () => {
          console.log('reCAPTCHA解決完了');
          resolve(recaptchaVerifier!);
        },
        'expired-callback': () => {
          console.warn('reCAPTCHA期限切れ');
          reject(new Error('reCAPTCHAの有効期限が切れました。ページを更新して再試行してください'));
        },
        'error-callback': (error: Error) => {
          console.error('reCAPTCHAエラー:', error);
          reject(new Error('reCAPTCHAの検証中にエラーが発生しました'));
        }
      });

      // reCAPTCHAをレンダリング
      recaptchaVerifier.render()
        .then(() => {
          console.log('reCAPTCHAレンダリング成功');
        })
        .catch((error) => {
          console.error('reCAPTCHAレンダリングエラー:', error);
          reject(new Error('reCAPTCHAの表示に失敗しました'));
        });
    } catch (error) {
      console.error('reCAPTCHA初期化エラー:', error);
      reject(error);
    }
  });
};

/**
 * 電話番号認証コードの送信
 * @param phoneNumber 電話番号 
 * @param recaptchaContainerId reCAPTCHA表示要素のID
 * @returns Promise<boolean> 送信成功したかどうか
 */
const sendVerificationCode = async (
  phoneNumber: string,
  recaptchaContainerId: string
): Promise<boolean> => {
  // Firebase認証が初期化されていない場合
  if (!firebaseAuth) {
    console.error('Firebase認証が初期化されていません');
    return false;
  }

  try {
    // reCAPTCHAを初期化
    await initRecaptcha(recaptchaContainerId);
    
    if (!recaptchaVerifier) {
      throw new Error('reCAPTCHAが初期化されていません');
    }

    // 電話番号を国際形式に変換
    const formattedPhoneNumber = formatToInternational(phoneNumber);
    console.log(`認証コードを送信: ${formattedPhoneNumber}`);

    // 電話番号認証を開始
    confirmationResult = await signInWithPhoneNumber(
      firebaseAuth,
      formattedPhoneNumber,
      recaptchaVerifier
    );
    
    console.log('認証コード送信成功');
    return true;
  } catch (error: any) {
    console.error('認証コード送信エラー:', error);
    
    // エラーメッセージの詳細をログに記録
    if (error.code) {
      console.error('Firebase エラーコード:', error.code);
      
      // よくあるエラーについてのログ
      switch(error.code) {
        case 'auth/invalid-phone-number':
          console.error('無効な電話番号形式です');
          break;
        case 'auth/quota-exceeded':
          console.error('リクエスト制限を超えました');
          break;
        case 'auth/captcha-check-failed':
          console.error('reCAPTCHA検証に失敗しました');
          break;
        default:
          console.error('その他のFirebaseエラー');
      }
    }
    
    // reCAPTCHAをクリア
    if (recaptchaVerifier) {
      try {
        recaptchaVerifier.clear();
        recaptchaVerifier = null;
      } catch (e) {
        console.warn('reCAPTCHAクリア中にエラーが発生しました:', e);
      }
    }
    
    return false;
  }
};

/**
 * 認証コードの確認
 * @param verificationCode 6桁の認証コード
 * @returns Promise<boolean> 認証成功したかどうか
 */
const verifyCode = async (verificationCode: string): Promise<boolean> => {
  // Firebase認証が初期化されていない場合
  if (!firebaseAuth) {
    console.error('Firebase認証が初期化されていません');
    return false;
  }

  try {
    if (!confirmationResult) {
      throw new Error('認証セッションが見つかりません。認証コードの送信を先に実行してください');
    }

    console.log('認証コードを確認中...');
    const result = await confirmationResult.confirm(verificationCode);
    
    if (result.user) {
      console.log('認証コード確認成功:', result.user.phoneNumber);
      
      // Firebaseの電話番号認証が成功したら、Supabaseのユーザー情報を更新
      const currentUser = await supabase.auth.getUser();
      if (currentUser.data?.user) {
        // 認証情報を設定
        const verificationExpiry = new Date();
        verificationExpiry.setFullYear(verificationExpiry.getFullYear() + 1); // 有効期限を1年に設定
        
        const updateSuccess = await updateVerificationLevel(
          VerificationLevel.PHONE_VERIFIED, 
          result.user.phoneNumber,
          'firebase',
          result.user.uid,
          verificationExpiry
        );
        
        if (updateSuccess) {
          console.log('Supabaseユーザー認証情報を更新しました');
          return true;
        } else {
          console.error('Supabaseユーザー認証情報の更新に失敗しました');
          return false;
        }
      }
    }
    
    return false;
  } catch (error: any) {
    console.error('認証コード確認エラー:', error);
    
    // エラーコードに基づく詳細なログ
    if (error.code) {
      switch(error.code) {
        case 'auth/invalid-verification-code':
          console.error('無効な認証コードです');
          break;
        case 'auth/code-expired':
          console.error('認証コードの有効期限が切れました');
          break;
        default:
          console.error('その他のFirebaseエラー:', error.code);
      }
    }
    
    return false;
  } finally {
    // 認証処理終了後、confirmationResultをクリア
    confirmationResult = null;
  }
};

/**
 * ユーザーの検証レベルを更新
 * @param level 新しい検証レベル
 * @param phoneNumber 電話番号 (オプション)
 * @param provider 認証プロバイダ (オプション)
 * @param verificationId 外部認証ID (オプション)
 * @param expiry 認証有効期限 (オプション)
 * @returns Promise<boolean> 更新成功したかどうか
 */
const updateVerificationLevel = async (
  level: VerificationLevel,
  phoneNumber?: string | null,
  provider?: string,
  verificationId?: string,
  expiry?: Date
): Promise<boolean> => {
  try {
    const currentUser = (await supabase.auth.getUser()).data.user;
    
    if (!currentUser) {
      throw new Error('ユーザーが認証されていません');
    }

    console.log(`ユーザー ${currentUser.id} の認証レベルを更新します: レベル ${level}`);

    // user_verificationテーブルを確認または作成
    const { data: existingData, error: fetchError } = await supabase
      .from('user_verification')
      .select('*')
      .eq('user_id', currentUser.id)
      .limit(1);

    if (fetchError) {
      console.error('認証データ取得エラー:', fetchError);
      return false;
    }

    const updateData: any = {
      verification_level: level
    };

    // 検証レベルに基づいてフィールドを更新
    if (level >= VerificationLevel.EMAIL_ONLY) {
      updateData.email_verified = true;
    }
    
    if (level >= VerificationLevel.PHONE_VERIFIED) {
      updateData.phone_verified = true;
      if (phoneNumber) {
        updateData.phone_number = phoneNumber;
      }
      // 認証プロバイダ情報を追加
      if (provider) {
        updateData.verification_provider = provider;
      }
      if (verificationId) {
        updateData.verification_id = verificationId;
      }
      if (expiry) {
        updateData.verification_expiry = expiry.toISOString();
      }
    }
    
    if (level >= VerificationLevel.ID_VERIFIED) {
      updateData.id_verified = true;
    }

    updateData.last_verified = new Date().toISOString();

    // 既存のレコードがあれば更新、なければ新規作成
    if (existingData && existingData.length > 0) {
      console.log('既存の認証レコードを更新します');
      const { error: updateError } = await supabase
        .from('user_verification')
        .update(updateData)
        .eq('user_id', currentUser.id);

      if (updateError) {
        console.error('認証レベル更新エラー:', updateError);
        return false;
      }
    } else {
      console.log('新しい認証レコードを作成します');
      const { error: insertError } = await supabase
        .from('user_verification')
        .insert({
          user_id: currentUser.id,
          ...updateData
        });

      if (insertError) {
        console.error('認証レコード作成エラー:', insertError);
        return false;
      }
    }

    // ポイント付与処理 (初回の電話番号認証時のみ)
    if (level === VerificationLevel.PHONE_VERIFIED && (!existingData || !existingData[0]?.phone_verified)) {
      console.log('電話番号認証ボーナスを付与します');
      const bonusGranted = await grantVerificationBonus(currentUser.id);
      if (bonusGranted) {
        console.log('認証ボーナス付与成功');
      } else {
        console.warn('認証ボーナス付与に失敗しました');
      }
    }

    return true;
  } catch (error) {
    console.error('認証レベル更新エラー:', error);
    return false;
  }
};

/**
 * 認証ボーナスポイントの付与
 * @param userId ユーザーID
 * @returns Promise<boolean> 付与成功したかどうか
 */
const grantVerificationBonus = async (userId: string): Promise<boolean> => {
  try {
    const VERIFICATION_BONUS = 20; // 初回認証ボーナス20ポイント
    
    console.log(`ユーザー ${userId} に認証ボーナス ${VERIFICATION_BONUS} ポイントを付与します`);
    
    // user_pointsテーブルのチェック
    const { data: pointsData, error: pointsError } = await supabase
      .from('user_points')
      .select('*')
      .eq('user_id', userId)
      .limit(1);
 
    if (pointsError) {
      console.error('ポイントデータ取得エラー:', pointsError);
      return false;
    }
 
    // ポイントレコードの更新または作成
    if (pointsData && pointsData.length > 0) {
      // 既存のポイントを更新
      const { error: updateError } = await supabase
        .from('user_points')
        .update({
          balance: pointsData[0].balance + VERIFICATION_BONUS,
          lifetime_earned: pointsData[0].lifetime_earned + VERIFICATION_BONUS,
          last_updated: new Date().toISOString()
        })
        .eq('user_id', userId);
 
      if (updateError) {
        console.error('ポイント更新エラー:', updateError);
        return false;
      }
    } else {
      // 新しいポイントレコードを作成
      const { error: insertError } = await supabase
        .from('user_points')
        .insert({
          user_id: userId,
          balance: VERIFICATION_BONUS,
          lifetime_earned: VERIFICATION_BONUS,
          last_updated: new Date().toISOString()
        });
 
      if (insertError) {
        console.error('ポイントレコード作成エラー:', insertError);
        return false;
      }
    }
 
    // ポイント取引履歴に記録
    const { error: transactionError } = await supabase
      .from('point_transactions')
      .insert({
        user_id: userId,
        amount: VERIFICATION_BONUS,
        transaction_type: 'login_bonus',  // 'verification_bonus'から許可されている値'login_bonus'に変更
        description: '電話番号認証ボーナス',
        created_at: new Date().toISOString()
      });
 
    if (transactionError) {
      console.error('取引記録エラー:', transactionError);
      // メイントランザクションは成功したためtrueを返す
      return true;
    }
 
    return true;
  } catch (error) {
    console.error('認証ボーナス付与エラー:', error);
    return false;
  }
};

/**
 * ユーザーの現在の検証状態を取得
 * @param userId ユーザーID (オプション、指定なしの場合は現在のユーザー)
 * @returns Promise<VerificationState | null> 検証状態またはnull
 */
const getVerificationState = async (userId?: string): Promise<VerificationState | null> => {
  try {
    // ユーザーIDが指定されていない場合は現在のユーザーを使用
    let userIdToUse = userId;
    
    if (!userIdToUse) {
      const currentUser = (await supabase.auth.getUser()).data.user;
      if (!currentUser) {
        console.warn('認証ユーザーが見つかりません');
        return null;
      }
      userIdToUse = currentUser.id;
    }

    // user_verificationテーブルからデータを取得
    const { data, error } = await supabase
      .from('user_verification')
      .select('*')
      .eq('user_id', userIdToUse)
      .limit(1);

    if (error) {
      console.error('認証状態取得エラー:', error);
      return null;
    }

    if (!data || data.length === 0) {
      // レコードがない場合はデフォルト値を返す
      console.log(`ユーザー ${userIdToUse} の認証レコードが見つかりません。デフォルト状態を返します`);
      return {
        emailVerified: true, // Supabaseのユーザーは常にメール認証済み
        phoneVerified: false,
        idVerified: false,
        verificationLevel: VerificationLevel.EMAIL_ONLY,
      };
    }

    // 取得したデータから状態を構築
    const verificationData = data[0];
    
    return {
      emailVerified: verificationData.email_verified || false,
      phoneVerified: verificationData.phone_verified || false,
      idVerified: verificationData.id_verified || false,
      verificationLevel: verificationData.verification_level || VerificationLevel.EMAIL_ONLY,
      phoneNumber: verificationData.phone_number,
      verificationProvider: verificationData.verification_provider,
      verificationId: verificationData.verification_id,
      verificationExpiry: verificationData.verification_expiry ? new Date(verificationData.verification_expiry) : undefined
    };
  } catch (error) {
    console.error('認証状態取得エラー:', error);
    return null;
  }
};

/**
 * 認証の有効期限をチェック
 * @param userId ユーザーID
 * @returns Promise<boolean> 認証が有効かどうか
 */
const checkVerificationExpiry = async (userId: string): Promise<boolean> => {
  try {
    const verificationState = await getVerificationState(userId);
    
    if (!verificationState) {
      return false;
    }
    
    // 有効期限がない場合はfalseを返す
    if (!verificationState.verificationExpiry) {
      return false;
    }
    
    // 現在の日付と比較
    const now = new Date();
    return now < verificationState.verificationExpiry;
  } catch (error) {
    console.error('認証有効期限チェックエラー:', error);
    return false;
  }
};

/**
 * Firebase認証のクリーンアップ
 * Supabaseからのログアウト時に呼び出す
 */
const cleanupFirebaseAuth = async (): Promise<void> => {
  // Firebase認証が初期化されていない場合
  if (!firebaseAuth) {
    return;
  }

  try {
    // 現在のFirebaseユーザーがあればログアウト
    if (firebaseAuth.currentUser) {
      await firebaseSignOut(firebaseAuth);
      console.log('Firebaseからログアウトしました');
    }
    
    // reCAPTCHAのクリーンアップ
    if (recaptchaVerifier) {
      try {
        recaptchaVerifier.clear();
        console.log('reCAPTCHAをクリアしました');
      } catch (e) {
        console.warn('reCAPTCHAクリア中にエラーが発生しました:', e);
      }
      recaptchaVerifier = null;
    }
    
    confirmationResult = null;
  } catch (error) {
    console.error('Firebase認証クリーンアップエラー:', error);
  }
};

// initRecaptchaもエクスポートに追加
export const verificationService = {
  initRecaptcha,
  sendVerificationCode,
  verifyCode,
  updateVerificationLevel,
  getVerificationState,
  checkVerificationExpiry,
  cleanupFirebaseAuth,
  formatToInternational,
  VerificationLevel
};

export default verificationService;