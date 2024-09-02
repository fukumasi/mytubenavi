const crypto = require("crypto");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const jwt = require("jsonwebtoken");
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 30 * 60 * 1000; // 30分
const RECOVERY_CODE_COUNT = 10;
const RECOVERY_CODE_LENGTH = 10;

const validatePassword = (password) => {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;
  return regex.test(password);
};

const generateToken = (userId, userType) => {
  return jwt.sign(
    { userId, userType },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};

const generateRecoveryCodes = () => {
  const codes = [];
  for (let i = 0; i < RECOVERY_CODE_COUNT; i++) {
    codes.push(crypto.randomBytes(RECOVERY_CODE_LENGTH / 2).toString('hex'));
  }
  return codes;
};

exports.register = async (req, res) => {
  try {
    const { username, email, password, userType } = req.body;

    if (!['general', 'creator', 'admin'].includes(userType)) {
      return res.status(400).json({ message: "無効なユーザータイプです" });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({ message: "パスワードは12文字以上で、大文字、小文字、数字、特殊文字を含む必要があります" });
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
    const { email, password, twoFactorToken, recoveryCode } = req.body;
    const user = await User.findOne({ email, isDeleted: false }).select('+password +twoFactorSecret +recoveryCodes');

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
        return res.status(401).json({ message: "アカウントがロックされました。30分後に再試行してください" });
      }
      return res.status(401).json({ message: "メールアドレスまたはパスワードが間違っています" });
    }

    if (!user.isEmailConfirmed) {
      return res.status(401).json({ message: "メールアドレスが確認されていません" });
    }

    if (user.isTwoFactorEnabled) {
      if (recoveryCode) {
        const codeIndex = user.recoveryCodes.indexOf(recoveryCode);
        if (codeIndex === -1) {
          return res.status(401).json({ message: "無効なリカバリーコードです" });
        }
        user.recoveryCodes.splice(codeIndex, 1);
      } else if (twoFactorToken) {
        const verified = speakeasy.totp.verify({
          secret: user.twoFactorSecret,
          encoding: 'base32',
          token: twoFactorToken
        });
        if (!verified) {
          return res.status(401).json({ message: "2要素認証コードが無効です" });
        }
      } else {
        return res.status(401).json({ message: "2要素認証コードまたはリカバリーコードが必要です" });
      }
    }

    user.loginAttempts = 0;
    user.isLocked = false;
    user.lockUntil = null;
    user.lastLogin = new Date();
    user.loginHistory.push({
      timestamp: new Date(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    await user.save();

    const token = generateToken(user._id, user.userType);
    await user.addSession(token);

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
    const user = await User.findById(req.user.userId).select("-password -twoFactorSecret");
    if (!user || user.isDeleted) {
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
    const user = await User.findOne({ email: req.body.email, isDeleted: false });
    if (!user) {
      return res.status(404).json({ message: "ユーザーが見つかりません" });
    }

    const resetToken = user.generatePasswordResetToken();
    await user.save({ validateBeforeSave: false });

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
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
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
      isDeleted: false
    }).select('+passwordHistory');

    if (!user) {
      return res.status(400).json({ message: "無効または期限切れのトークンです" });
    }

    if (!validatePassword(req.body.password)) {
      return res.status(400).json({ message: "パスワードは12文字以上で、大文字、小文字、数字、特殊文字を含む必要があります" });
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
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "ユーザーが見つかりません" });
    }

    await user.removeSession(req.token);
    res.status(200).json({ message: "ログアウトしました" });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: "ログアウト処理中にエラーが発生しました" });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.userId).select('+password +passwordHistory');

    if (!user || user.isDeleted) {
      return res.status(404).json({ message: "ユーザーが見つかりません" });
    }

    if (!(await user.validatePassword(currentPassword))) {
      return res.status(401).json({ message: "現在のパスワードが正しくありません" });
    }

    if (!validatePassword(newPassword)) {
      return res.status(400).json({ message: "新しいパスワードは12文字以上で、大文字、小文字、数字、特殊文字を含む必要があります" });
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

exports.updateProfile = async (req, res) => {
  try {
    const allowedUpdates = ['firstName', 'lastName', 'bio', 'avatar'];
    const updates = Object.keys(req.body).filter(update => allowedUpdates.includes(update));
    
    const user = await User.findById(req.user.userId);
    if (!user || user.isDeleted) {
      return res.status(404).json({ message: "ユーザーが見つかりません" });
    }

    updates.forEach(update => user[update] = req.body[update]);
    await user.save();

    res.status(200).json({ message: "プロフィールが更新されました", user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: "プロフィールの更新に失敗しました" });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.isDeleted) {
      return res.status(404).json({ message: "ユーザーが見つかりません" });
    }

    await user.deleteAccount();

    res.status(200).json({ message: "アカウントが削除されました" });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ message: "アカウントの削除に失敗しました" });
  }
};

exports.enable2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.isDeleted) {
      return res.status(404).json({ message: "ユーザーが見つかりません" });
    }

    const secret = speakeasy.generateSecret({ length: 32 });
    user.twoFactorSecret = secret.base32;
    user.isTwoFactorEnabled = false; // 確認後に有効化
    user.recoveryCodes = generateRecoveryCodes();
    await user.save();

    const otpAuthUrl = speakeasy.otpauthURL({
      secret: secret.ascii,
      label: `MyTubeNavi:${user.email}`,
      issuer: 'MyTubeNavi'
    });

    const qrCodeDataUrl = await qrcode.toDataURL(otpAuthUrl);

    res.status(200).json({
      message: "2要素認証の設定が開始されました。QRコードをスキャンして確認コードを入力してください。",
      qrCode: qrCodeDataUrl,
      secret: secret.base32,
      recoveryCodes: user.recoveryCodes
    });
  } catch (error) {
    console.error('Enable 2FA error:', error);
    res.status(500).json({ message: "2要素認証の設定開始に失敗しました" });
  }
};

exports.verify2FA = async (req, res) => {
  try {
    const { verificationCode } = req.body;
    const user = await User.findById(req.user.userId).select('+twoFactorSecret');
    
    if (!user || user.isDeleted) {
      return res.status(404).json({ message: "ユーザーが見つかりません" });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: verificationCode
    });

    if (verified) {
      user.isTwoFactorEnabled = true;
      await user.save();
      res.status(200).json({ message: "2要素認証が正常に有効化されました" });
    } else {
      res.status(400).json({ message: "無効な確認コードです" });
    }
  } catch (error) {
    console.error('Verify 2FA error:', error);
    res.status(500).json({ message: "2要素認証の確認に失敗しました" });
  }
};

exports.disable2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('+twoFactorSecret');
    if (!user || user.isDeleted) {
      return res.status(404).json({ message: "ユーザーが見つかりません" });
    }

    user.twoFactorSecret = undefined;
    user.isTwoFactorEnabled = false;
    user.recoveryCodes = [];
    await user.save();

    res.status(200).json({ message: "2要素認証が無効化されました" });
  } catch (error) {
    console.error('Disable 2FA error:', error);
    res.status(500).json({ message: "2要素認証の無効化に失敗しました" });
  }
};

exports.getLoginHistory = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('loginHistory');
    if (!user || user.isDeleted) {
      return res.status(404).json({ message: "ユーザーが見つかりません" });
    }

    res.status(200).json({
      message: "ログイン履歴を取得しました",
      loginHistory: user.loginHistory
    });
  } catch (error) {
    console.error('Get login history error:', error);
    res.status(500).json({ message: "ログイン履歴の取得に失敗しました" });
  }
};

exports.requestDataExport = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.isDeleted) {
      return res.status(404).json({ message: "ユーザーが見つかりません" });
    }

    // TODO: データエクスポートの処理を実装
    // 例: バックグラウンドジョブを開始し、完了時にユーザーにメールを送信

    res.status(202).json({ message: "データエクスポートのリクエストを受け付けました。処理が完了次第メールでお知らせします。" });
  } catch (error) {
    console.error('Request data export error:', error);
    res.status(500).json({ message: "データエクスポートのリクエストに失敗しました" });
  }
};

exports.getActiveSessions = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('activeSessions');
    if (!user || user.isDeleted) {
      return res.status(404).json({ message: "ユーザーが見つかりません" });
    }

    res.status(200).json({
      message: "アクティブセッションを取得しました",
      activeSessions: user.activeSessions
    });
  } catch (error) {
    console.error('Get active sessions error:', error);
    res.status(500).json({ message: "アクティブセッションの取得に失敗しました" });
  }
};

exports.revokeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const user = await User.findById(req.user.userId);
    if (!user || user.isDeleted) {
      return res.status(404).json({ message: "ユーザーが見つかりません" });
    }

    await user.removeSession(sessionId);
    res.status(200).json({ message: "セッションが正常に削除されました" });
  } catch (error) {
    console.error('Revoke session error:', error);
    res.status(500).json({ message: "セッションの削除に失敗しました" });
  }
};

exports.recoverAccount = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email, isDeleted: true });
    if (!user) {
      return res.status(404).json({ message: "削除されたアカウントが見つかりません" });
    }

    user.isDeleted = false;
    user.deletedAt = undefined;
    await user.save();

    res.status(200).json({ message: "アカウントが正常に復旧されました" });
  } catch (error) {
    console.error('Recover account error:', error);
    res.status(500).json({ message: "アカウントの復旧に失敗しました" });
  }
};

exports.getRecoveryCodes = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('+recoveryCodes');
    if (!user || user.isDeleted) {
      return res.status(404).json({ message: "ユーザーが見つかりません" });
    }

    if (!user.isTwoFactorEnabled) {
      return res.status(400).json({ message: "2要素認証が有効になっていません" });
    }

    res.status(200).json({
      message: "リカバリーコードを取得しました",
      recoveryCodes: user.recoveryCodes
    });
  } catch (error) {
    console.error('Get recovery codes error:', error);
    res.status(500).json({ message: "リカバリーコードの取得に失敗しました" });
  }
};

exports.regenerateRecoveryCodes = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.isDeleted) {
      return res.status(404).json({ message: "ユーザーが見つかりません" });
    }

    if (!user.isTwoFactorEnabled) {
      return res.status(400).json({ message: "2要素認証が有効になっていません" });
    }

    user.recoveryCodes = generateRecoveryCodes();
    await user.save();

    res.status(200).json({
      message: "新しいリカバリーコードが生成されました",
      recoveryCodes: user.recoveryCodes
    });
  } catch (error) {
    console.error('Regenerate recovery codes error:', error);
    res.status(500).json({ message: "リカバリーコードの再生成に失敗しました" });
  }
};

module.exports = exports;

// TODO: アカウント復旧機能の実装
// TODO: ソーシャルログイン（Google, Facebook等）の統合
// TODO: アクティビティログの実装と管理
// TODO: ユーザーロールとアクセス権限の詳細な管理
// TODO: セッション管理の改善（複数デバイスからのログインなど）
// TODO: アカウント凍結機能の実装
// TODO: ユーザー行動分析とセキュリティアラートの実装
// TODO: IPアドレスベースの不正アクセス検知と防御
// TODO: 認証情報の暗号化レベルの向上
// TODO: パスワードリセットの頻度制限の実装
// TODO: 多言語対応の改善
// TODO: ログイン試行の詳細なログ記録と分析
// TODO: バルク操作（複数ユーザーの一括管理）機能の実装
// TODO: ユーザーフィードバックシステムの統合
// TODO: ユーザーアクティビティに基づいた異常検知システムの実装
// TODO: リカバリーコード使用履歴の追跡と管理
// TODO: リカバリーコードの有効期限設定機能の実装
// TODO: ユーザーへのリカバリーコード使用通知機能の追加