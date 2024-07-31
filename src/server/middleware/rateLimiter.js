const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 5, // 15分間に5回までのリクエストを許可
  message: 'Too many login attempts from this IP, please try again after 15 minutes'
});

module.exports = loginLimiter;