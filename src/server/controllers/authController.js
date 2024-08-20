const crypto = require("crypto");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const jwt = require("jsonwebtoken");

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000; // 15分

const validatePassword = (password) => {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return regex.test(password);
};

exports.register = async (req, res) => {
  try {
    const { username, email, password, userType } = req.body;

    if (!['general', 'creator', 'admin'].includes(userType)) {
      return res.status(400).json({ message: "無効なユーザータイプです" });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({ message: "パスワードは8文字以上で、大文字、小文字、数字、特殊文字を含む必要があります" });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: "このメールアドレスまたはユーザー名は既に使用されています" });
    }

    const emailConfirmToken = crypto.randomBytes(20).toString("hex");

    const user = new User({
      username,
      email,
      password,
      userType,
      emailConfirmToken: crypto.createHash("sha256").update(emailConfirmToken).digest("hex"),
      emailConfirmTokenExpire: Date.now() + 24 * 60 * 60 * 1000,
    });

    await user.save();

    const confirmUrl = `${req.protocol}://${req.get("host")}/api/auth/confirm-email/${emailConfirmToken}`;
    const message = `メールアドレスを確認するには、このリンクをクリックしてください: ${confirmUrl}`;

    await sendEmail({
      email: user.email,
      subject: "メールアドレスの確認",
      message,
    });

    res.status(201).json({ message: "登録が完了しました。確認メールを送信しました。" });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: "登録処理中にエラーが発生しました" });
  }
};

exports.confirmEmail = async (req, res) => {
  const emailConfirmToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  try {
    const user = await User.findOne({
      emailConfirmToken,
      emailConfirmTokenExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "無効または期限切れのトークンです" });
    }

    user.isEmailConfirmed = true;
    user.emailConfirmToken = undefined;
    user.emailConfirmTokenExpire = undefined;

    await user.save();

    res.status(200).json({ message: "メールアドレスが確認されました" });
  } catch (error) {
    console.error('Email confirmation error:', error);
    res.status(500).json({ message: "メールアドレスの確認に失敗しました" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ message: "メールアドレスまたはパスワードが間違っています" });
    }

    if (user.isLocked && user.lockUntil > Date.now()) {
      const lockTime = Math.ceil((user.lockUntil - Date.now()) / 1000 / 60);
      return res.status(401).json({
        message: `アカウントがロックされています。${lockTime}分後に再試行してください`,
      });
    }

    if (user.isLocked && user.lockUntil < Date.now()) {
      user.loginAttempts = 0;
      user.isLocked = false;
      user.lockUntil = null;
    }

    if (!(await user.validatePassword(password))) {
      await user.incrementLoginAttempts();
      if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.isLocked = true;
        user.lockUntil = Date.now() + LOCK_TIME;
        await user.save();
        return res.status(401).json({ message: "アカウントがロックされました。15分後に再試行してください" });
      }
      return res.status(401).json({ message: "メールアドレスまたはパスワードが間違っています" });
    }

    if (!user.isEmailConfirmed) {
      return res.status(401).json({ message: "メールアドレスが確認されていません" });
    }

    user.loginAttempts = 0;
    user.isLocked = false;
    user.lockUntil = null;
    await user.save();

    const token = jwt.sign(
      { userId: user._id, userType: user.userType },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    res.json({
      token,
      user: { id: user._id, username: user.username, userType: user.userType },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: "ログイン処理中にエラーが発生しました" });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "ユーザーが見つかりません" });
    }
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: "プロフィールの取得に失敗しました" });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).json({ message: "ユーザーが見つかりません" });
    }

    const resetToken = crypto.randomBytes(20).toString("hex");
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10分間有効

    await user.save();

    const resetUrl = `${req.protocol}://${req.get("host")}/reset-password/${resetToken}`;
    const message = `パスワードをリセットするには、このリンクをクリックしてください: ${resetUrl}`;

    await sendEmail({
      email: user.email,
      subject: "パスワードリセットトークン",
      message,
    });

    res.status(200).json({ message: "パスワードリセット用のメールが送信されました" });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: "メールの送信に失敗しました" });
  }
};

exports.resetPassword = async (req, res) => {
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(req.params.resetToken)
    .digest("hex");

  try {
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    }).select('+passwordHistory');

    if (!user) {
      return res.status(400).json({ message: "無効または期限切れのトークンです" });
    }

    if (!validatePassword(req.body.password)) {
      return res.status(400).json({ message: "パスワードは8文字以上で、大文字、小文字、数字、特殊文字を含む必要があります" });
    }

    if (await user.isPasswordUsedBefore(req.body.password)) {
      return res.status(400).json({ message: "このパスワードは以前に使用されています。新しいパスワードを選択してください" });
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.status(200).json({ message: "パスワードが正常にリセットされました" });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: "パスワードのリセットに失敗しました" });
  }
};

exports.logout = async (req, res) => {
  // JWTを使用している場合、サーバー側でのログアウト処理は最小限です
  // クライアント側でトークンを削除することが主な処理になります
  res.status(200).json({ message: "ログアウトしました" });
  
  // もし将来的にリフレッシュトークンなどを使用する場合、
  // ここでデータベースからそのトークンを削除するなどの処理を追加します
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.userId).select('+password +passwordHistory');

    if (!(await user.validatePassword(currentPassword))) {
      return res.status(401).json({ message: "現在のパスワードが正しくありません" });
    }

    if (!validatePassword(newPassword)) {
      return res.status(400).json({ message: "新しいパスワードは8文字以上で、大文字、小文字、数字、特殊文字を含む必要があります" });
    }

    if (await user.isPasswordUsedBefore(newPassword)) {
      return res.status(400).json({ message: "このパスワードは以前に使用されています。別のパスワードを選択してください" });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: "パスワードが正常に変更されました" });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: "パスワードの変更に失敗しました" });
  }
};
