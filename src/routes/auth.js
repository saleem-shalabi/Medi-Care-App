// routes/auth.js
const express = require('express');
const router = express.Router();
const {
  registerHandler,
  registerWithEmailHandler,
  verifyCodeHandler
} = require('../controllers/authController');
const { loginHandler } = require('../controllers/authController');
const authenticate = require('../middlewares/auth');
const { changePasswordHandler } = require('../controllers/authController');
const { forgotPassword, resetPassword } = require('../controllers/authController');

router.post('/register', registerHandler);             // No email verify
router.post('/register-with-email', registerWithEmailHandler); // With email
router.post('/verify-code', verifyCodeHandler);  // get verify code 
router.post('/login', loginHandler);  // login
router.post('/change-password', authenticate, changePasswordHandler); // change password
router.post('/forgot-password', forgotPassword); //forgot password
router.post('/reset-password', resetPassword); //forgot password

module.exports = router;
