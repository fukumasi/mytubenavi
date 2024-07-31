const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const loginLimiter = require('../middleware/rateLimiter');

// 仮のログイン処理
router.post('/login', (req, res) => {
  res.json({ message: 'Login successful' });
});

// 仮の登録処理
router.post('/register', (req, res) => {
  res.json({ message: 'Registration successful' });
});

router.post('/forgot-password', authController.forgotPassword);
router.put('/reset-password/:resetToken', authController.resetPassword);

router.get('/confirm-email/:token', authController.confirmEmail);
router.post('/login', loginLimiter, authController.login);

module.exports = router;