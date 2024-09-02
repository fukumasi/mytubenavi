const rateLimit = require("express-rate-limit");

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests
  message: "Too many login attempts from this IP, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // 2000 requests per 15 minutes
  message: "Too many requests from this IP, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
});

const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120, // 120 requests per minute
  message: "Too many search requests from this IP, please try again after 1 minute",
  standardHeaders: true,
  legacyHeaders: false,
});

const videoLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200, // 200 requests per minute
  message: "Too many video requests from this IP, please try again after 1 minute",
  standardHeaders: true,
  legacyHeaders: false,
});

const relatedVideoLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200, // 200 requests per minute
  message: "Too many related video requests from this IP, please try again after 1 minute",
  standardHeaders: true,
  legacyHeaders: false,
});

const featuredVideoLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 400, // 400 requests per 5 minutes
  message: "Too many featured video requests from this IP, please try again after 5 minutes",
  standardHeaders: true,
  legacyHeaders: false,
});

// バースト的なトラフィックに対応するための関数
const burstLimiter = (normalLimit, burstLimit, burstTime) => {
  let tokenBucket = burstLimit;
  const refillRate = normalLimit / (60 * 1000); // tokens per millisecond

  setInterval(() => {
    tokenBucket = Math.min(burstLimit, tokenBucket + refillRate * 1000);
  }, 1000);

  return (req, res, next) => {
    if (tokenBucket >= 1) {
      tokenBucket -= 1;
      next();
    } else {
      res.status(429).send('Too Many Requests');
    }
  };
};

// バースト対応のリミッターを作成
const burstApiLimiter = burstLimiter(2000, 4000, 60000); // 通常は1分あたり2000リクエスト、バースト時は4000まで
const burstSearchLimiter = burstLimiter(120, 240, 60000); // 通常は1分あたり120リクエスト、バースト時は240まで
const burstVideoLimiter = burstLimiter(200, 400, 60000); // 通常は1分あたり200リクエスト、バースト時は400まで

module.exports = {
  loginLimiter,
  apiLimiter,
  searchLimiter,
  videoLimiter,
  relatedVideoLimiter,
  featuredVideoLimiter,
  burstApiLimiter,
  burstSearchLimiter,
  burstVideoLimiter
};