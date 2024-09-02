const User = require("../models/User");
const { validateEmail } = require('../utils/validation');
const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const { sanitizeUser } = require('../utils/sanitizer');
const Video = require("../models/Video"); // 動画モデルをインポート

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password -twoFactorSecret -passwordHistory");
    if (!user) {
      return res.status(404).json({ message: "ユーザーが見つかりません" });
    }
    res.json(sanitizeUser(user));
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: "プロフィールの取得中にエラーが発生しました" });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const updates = req.body;
    const allowedUpdates = [
      "username",
      "firstName",
      "lastName",
      "bio",
      "preferences",
      "socialLinks",
    ];
    const actualUpdates = Object.keys(updates)
      .filter((key) => allowedUpdates.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key];
        return obj;
      }, {});

    if (actualUpdates.preferences) {
      const { theme, language, notifications } = actualUpdates.preferences;
      if (theme && !["light", "dark"].includes(theme)) {
        return res.status(400).json({ message: "無効なテーマです" });
      }
      if (notifications !== undefined && typeof notifications !== 'boolean') {
        return res.status(400).json({ message: "無効な通知設定です" });
      }
      if (language && typeof language !== 'string') {
        return res.status(400).json({ message: "無効な言語設定です" });
      }
    }

    if (actualUpdates.socialLinks) {
      const { twitter, instagram, youtube } = actualUpdates.socialLinks;
      const urlRegex = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
      if (twitter && !urlRegex.test(twitter)) {
        return res.status(400).json({ message: "無効なTwitterリンクです" });
      }
      if (instagram && !urlRegex.test(instagram)) {
        return res.status(400).json({ message: "無効なInstagramリンクです" });
      }
      if (youtube && !urlRegex.test(youtube)) {
        return res.status(400).json({ message: "無効なYouTubeリンクです" });
      }
    }

    const user = await User.findByIdAndUpdate(req.user.userId, actualUpdates, {
      new: true,
      runValidators: true,
    }).select("-password -twoFactorSecret -passwordHistory");
    
    if (!user) {
      return res.status(404).json({ message: "ユーザーが見つかりません" });
    }
    res.json(sanitizeUser(user));
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(400).json({ message: "ユーザープロフィールの更新中にエラーが発生しました", error: error.message });
  }
};

exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "画像ファイルが提供されていません" });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "ユーザーが見つかりません" });
    }

    if (user.avatar) {
      const oldAvatarPath = path.join(__dirname, '..', '..', 'public', 'avatars', user.avatar);
      await fs.unlink(oldAvatarPath).catch(err => console.error('Failed to delete old avatar:', err));
    }

    const filename = `${user._id}-${Date.now()}.webp`;
    const outputPath = path.join(__dirname, '..', '..', 'public', 'avatars', filename);

    await sharp(req.file.buffer)
      .resize(200, 200)
      .webp({ quality: 80 })
      .toFile(outputPath);

    user.avatar = filename;
    await user.save();

    res.json({ message: "アバターが正常にアップロードされました", avatar: filename });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ message: "アバターのアップロード中にエラーが発生しました" });
  }
};

exports.changeEmail = async (req, res) => {
  try {
    const { newEmail } = req.body;
    if (!validateEmail(newEmail)) {
      return res.status(400).json({ message: "無効なメールアドレス形式です" });
    }

    const existingUser = await User.findOne({ email: newEmail });
    if (existingUser) {
      return res.status(400).json({ message: "このメールアドレスは既に使用されています" });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "ユーザーが見つかりません" });
    }

    user.email = newEmail;
    user.isEmailConfirmed = false;
    await user.save();

    // TODO: 確認メールの送信ロジックをここに追加

    res.json({ message: "メールアドレスが更新されました。確認メールを送信しました" });
  } catch (error) {
    console.error('Change email error:', error);
    res.status(400).json({ message: "メールアドレスの変更中にエラーが発生しました" });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.userId).select('+password');
    if (!user) {
      return res.status(404).json({ message: "ユーザーが見つかりません" });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: "現在のパスワードが正しくありません" });
    }

    if (await user.isPasswordUsedBefore(newPassword)) {
      return res.status(400).json({ message: "このパスワードは以前に使用されています。新しいパスワードを選択してください" });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: "パスワードが正常に変更されました" });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(400).json({ message: "パスワードの変更中にエラーが発生しました" });
  }
};

exports.getWatchHistory = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate('watchHistory.video');
    if (!user) {
      return res.status(404).json({ message: "ユーザーが見つかりません" });
    }
    res.json(user.watchHistory);
  } catch (error) {
    console.error('Get watch history error:', error);
    res.status(500).json({ message: "視聴履歴の取得中にエラーが発生しました" });
  }
};

exports.getFavorites = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate('favorites');
    if (!user) {
      return res.status(404).json({ message: "ユーザーが見つかりません" });
    }
    res.json(user.favorites);
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ message: "お気に入りの取得中にエラーが発生しました" });
  }
};

exports.getSubscriptions = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate('subscribedChannels');
    if (!user) {
      return res.status(404).json({ message: "ユーザーが見つかりません" });
    }
    res.json(user.subscribedChannels);
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({ message: "購読チャンネルの取得中にエラーが発生しました" });
  }
};

exports.getSearchHistory = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('searchHistory');
    if (!user) {
      return res.status(404).json({ message: "ユーザーが見つかりません" });
    }
    res.json(user.searchHistory);
  } catch (error) {
    console.error('Get search history error:', error);
    res.status(500).json({ message: "検索履歴の取得中にエラーが発生しました" });
  }
};

exports.addSearchHistory = async (req, res) => {
  try {
    const { query } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "ユーザーが見つかりません" });
    }
    user.searchHistory.unshift({ query, timestamp: new Date() });
    user.searchHistory = user.searchHistory.slice(0, 20); // 最新の20件のみを保持
    await user.save();
    res.json({ message: "検索履歴が追加されました" });
  } catch (error) {
    console.error('Add search history error:', error);
    res.status(500).json({ message: "検索履歴の追加中にエラーが発生しました" });
  }
};

exports.getRecommendedVideos = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "ユーザーが見つかりません" });
    }
    
    // ユーザーの視聴履歴やお気に入りに基づいて動画を推奨
    const recentWatchedVideos = user.watchHistory.slice(0, 5).map(h => h.video);
    const favoriteVideos = user.favorites.slice(0, 5);
    
    const recommendedVideos = await Video.find({
      $or: [
        { category: { $in: recentWatchedVideos.map(v => v.category) } },
        { tags: { $in: [...recentWatchedVideos, ...favoriteVideos].flatMap(v => v.tags) } }
      ],
      _id: { $nin: [...recentWatchedVideos, ...favoriteVideos].map(v => v._id) }
    }).limit(10);
    
    res.json(recommendedVideos);
  } catch (error) {
    console.error('Get recommended videos error:', error);
    res.status(500).json({ message: "おすすめ動画の取得中にエラーが発生しました" });
  }
};

module.exports = exports;