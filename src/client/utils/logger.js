const isDevelopment = process.env.NODE_ENV === 'development';

export const log = (...args) => {
  if (isDevelopment) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
};

export const error = (...args) => {
  if (isDevelopment) {
    // eslint-disable-next-line no-console
    console.error(...args);
  }
  // TODO: プロダクション環境では、エラーロギングサービスにエラーを送信するなどの処理を実装
};