const express = require('express');
const router = express.Router();
const {
  login, register, logout, refresh, me,
  updateProfile, changePassword, updateAvatar,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiters');
const upload = require('../middleware/uploadMiddleware');

// 🔒 express-rate-limit était une dépendance installée mais jamais branchée
// nulle part : /login et /register étaient ouvertes à un nombre illimité de
// tentatives par minute, donc au brute-force de mots de passe.
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/refresh', authLimiter, refresh);
router.post('/logout', protect, logout);
router.get('/me', protect, me);

router.patch('/me', protect, updateProfile);
router.patch('/me/password', protect, authLimiter, changePassword);
router.post('/me/avatar', protect, upload.single('file'), updateAvatar);

module.exports = router;
