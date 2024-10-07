export const validatePassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);

  const errors = [];

  if (password.length < minLength) {
    errors.push(`パスワードは${minLength}文字以上である必要があります。`);
  }

  if (!hasUpperCase || !hasLowerCase) {
    errors.push('パスワードは大文字と小文字を含む必要があります。');
  }

  if (!hasNumbers) {
    errors.push('パスワードは少なくとも1つの数字を含む必要があります。');
  }

  return errors;
};