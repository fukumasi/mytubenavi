export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export class NetworkError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class AuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthError';
  }
}

export class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RateLimitError';
  }
}

// Firebase特有のエラークラス
export class FirebaseError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'FirebaseError';
    this.code = code;
  }
}

export const getErrorMessage = (error) => {
  if (error instanceof ApiError) {
    return `APIエラー (${error.status}): ${error.message}`;
  } else if (error instanceof NetworkError) {
    return 'ネットワークエラー: インターネット接続を確認してください';
  } else if (error instanceof AuthError) {
    return '認証エラー: ログインが必要です';
  } else if (error instanceof NotFoundError) {
    return 'リソースが見つかりません';
  } else if (error instanceof RateLimitError) {
    return 'レート制限に達しました。しばらく待ってから再試行してください';
  } else if (error instanceof FirebaseError) {
    switch(error.code) {
      case 'auth/user-not-found':
        return 'ユーザーが見つかりません';
      case 'auth/wrong-password':
        return 'パスワードが間違っています';
      case 'auth/email-already-in-use':
        return 'このメールアドレスは既に使用されています';
      case 'auth/weak-password':
        return 'パスワードが弱すぎます';
      case 'auth/invalid-email':
        return '無効なメールアドレスです';
      default:
        return `Firebaseエラー: ${error.message}`;
    }
  } else {
    return '予期せぬエラーが発生しました';
  }
};