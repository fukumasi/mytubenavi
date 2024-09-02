const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res
      .status(401)
      .json({ message: "アクセスするには認証が必要です" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({ message: "ユーザーが見つかりません" });
    }

    // アカウントがロックされているかチェック
    if (user.isLocked && user.lockUntil > Date.now()) {
      return res.status(401).json({ message: "アカウントがロックされています" });
    }

    // トークンが発行された後にパスワードが変更されていないかチェック
    if (user.passwordChangedAt && decoded.iat < user.passwordChangedAt.getTime() / 1000) {
      return res.status(401).json({ message: "パスワードが変更されました。再度ログインしてください" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "トークンの有効期限が切れています" });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "無効なトークンです" });
    }
    return res
      .status(500)
      .json({ message: "認証処理中にエラーが発生しました" });
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.userType)) {
      return res.status(403).json({ message: "このアクションを実行する権限がありません" });
    }
    next();
  };
};

exports.optionalAuth = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");
    if (user) {
      req.user = user;
    }
  } catch (error) {
    console.error('Optional auth error:', error);
  }

  next();
};

exports.requireEmailConfirmation = (req, res, next) => {
  if (!req.user.isEmailConfirmed) {
    return res.status(403).json({ message: "メールアドレスの確認が必要です" });
  }
  next();
};

exports.requireTwoFactor = (req, res, next) => {
  if (req.user.twoFactorEnabled && !req.session.twoFactorAuthenticated) {
    return res.status(403).json({ message: "二段階認証が必要です" });
  }
  next();
};