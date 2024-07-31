const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  userType: { type: String, enum: ['viewer', 'creator'], default: 'viewer' },
  twoFactorSecret: String,
  twoFactorEnabled: { type: Boolean, default: false },
  // 新しいフィールド
  firstName: String,
  lastName: String,
  bio: String,
  avatar: String,
  preferences: {
    theme: { type: String, enum: ['light', 'dark'], default: 'light' },
    language: { type: String, default: 'en' },
    notifications: { type: Boolean, default: true }
  },
  socialLinks: {
    twitter: String,
    instagram: String,
    youtube: String
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// パスワードハッシュ化の pre-save フック
userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  this.updatedAt = Date.now();
  next();
});

// パスワード検証メソッド
userSchema.methods.validatePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;