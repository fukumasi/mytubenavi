const express = require('express');
const router = express.Router();

// 仮のログイン処理
router.post('/login', (req, res) => {
  res.json({ message: 'Login successful' });
});

// 仮の登録処理
router.post('/register', (req, res) => {
  res.json({ message: 'Registration successful' });
});

module.exports = router;