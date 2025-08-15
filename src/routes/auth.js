const express = require('express');
const router = express.Router();
const { registerWithEmailHandler, verifyCodeHandler, loginHandler, changePasswordHandler, forgotPasswordHandler, resetPasswordHandler } = require('../controllers/authController');
const authenticate = require('../middlewares/auth');


router.post('/register-with-email', registerWithEmailHandler); 
router.post('/verify-code', verifyCodeHandler);  
router.post('/login', loginHandler);  
router.post('/change-password', authenticate, changePasswordHandler);  
router.post('/forgot-password', forgotPasswordHandler);  
router.post('/reset-password', resetPasswordHandler);  

module.exports = router;
