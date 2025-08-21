const express = require('express');
const router = express.Router();
const { getUserProfile, updateCurrentUserProfile } = require('../controllers/userController');
const requireLogin = require('../middlewares/requireLogin');
const upload = require('../middlewares/upload');

router.get('/get-profile/:id', requireLogin, getUserProfile);
router.patch('/me', requireLogin, upload.single('image'), updateCurrentUserProfile); //edit profile

module.exports = router;