const express = require('express')
const router = express.Router();
const {register, login, checkUser, forgotPassword, resetPassword } = require('../controllers/UserController')
const AuthMiddleware = require('../middlewares/AuthMiddleware');
router.post('/register', register);
router.post('/login', login);
router.get('/check-user', AuthMiddleware, checkUser);
// Password reset
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;