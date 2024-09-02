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
  } else {
    return '予期せぬエラーが発生しました';
  }
};