const crypto = require("crypto");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const jwt = require("jsonwebtoken");

exports.register = async (req, res) => {
  try {
    const { username, email, password, userType } = req.body;

    // メール確認トークンの生成
    const emailConfirmToken = crypto.randomBytes(20).toString("hex");

    const user = new User({
      username,
      email,
      password,
      userType,
      emailConfirmToken: crypto
        .createHash("sha256")
        .update(emailConfirmToken)
        .digest("hex"),
      emailConfirmTokenExpire: Date.now() + 24 * 60 * 60 * 1000, // 24時間有効
    });

    await user.save();

    // 確認メールの送信
    const confirmUrl = `${req.protocol}://${req.get("host")}/api/auth/confirm-email/${emailConfirmToken}`;
    const message = `メールアドレスを確認するには、このリンクをクリックしてください: ${confirmUrl}`;

    await sendEmail({
      email: user.email,
      subject: "メールアドレスの確認",
      message,
    });

    res
      .status(201)
      .json({ message: "登録が完了しました。確認メールを送信しました。" });
  } catch (error) {
    res.status(400).json({ message: error.message });
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
      return res
        .status(400)
        .json({ message: "無効または期限切れのトークンです" });
    }

    user.isEmailConfirmed = true;
    user.emailConfirmToken = undefined;
    user.emailConfirmTokenExpire = undefined;

    await user.save();

    res.status(200).json({ message: "メールアドレスが確認されました" });
  } catch (error) {
    res.status(500).json({ message: "メールアドレスの確認に失敗しました" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.isLocked) {
      // アカウントがロックされている場合
      const lockTime = Math.ceil((user.lockUntil - Date.now()) / 1000 / 60);
      return res.status(401).json({
        message: `Account is locked. Try again in ${lockTime} minutes`,
      });
    }

    if (!(await user.comparePassword(password))) {
      await user.incrementLoginAttempts();
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.isEmailConfirmed) {
      return res
        .status(401)
        .json({ message: "メールアドレスが確認されていません" });
    }

    // ログイン成功時にログイン試行回数をリセット
    user.loginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });
    res.json({
      token,
      user: { id: user._id, username: user.username, userType: user.userType },
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
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

    res
      .status(200)
      .json({ message: "パスワードリセット用のメールが送信されました" });
  } catch (error) {
    console.error(error);
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
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "無効または期限切れのトークンです" });
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.status(200).json({ message: "パスワードが正常にリセットされました" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "パスワードのリセットに失敗しました" });
  }
};
