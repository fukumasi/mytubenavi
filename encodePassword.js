// encodePassword.js

const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

function encodeAndLog(password) {
  const encodedPassword = encodeURIComponent(password);
  // eslint-disable-next-line no-console
  console.log("Original password: [HIDDEN]");
  // eslint-disable-next-line no-console
  console.log("Encoded password:", encodedPassword);
  // eslint-disable-next-line no-console
  console.log("Are they different?", password !== encodedPassword);
}

// eslint-disable-next-line no-console
console.log("Warning: Do not use this script for actual passwords. This is for demonstration purposes only.");

readline.question('Enter a password to encode: ', (password) => {
  encodeAndLog(password);
  
  // 特殊文字のテスト
  // eslint-disable-next-line no-console
  console.log("\nTesting with a password containing special characters:");
  encodeAndLog("Test@123!");

  readline.close();
});

// セキュリティに関する注意事項
// eslint-disable-next-line no-console
console.log("\nSecurity Note:");
// eslint-disable-next-line no-console
console.log("- Never store or log actual passwords in plain text.");
// eslint-disable-next-line no-console
console.log("- In a real application, use secure methods for password handling.");
// eslint-disable-next-line no-console
console.log("- For Firebase, use Firebase Authentication for secure user management.");