const express = require('express');
const router = express.Router();
const requireLogin = require('../middlewares/requireLogin');
const requireRole = require('../middlewares/requireRole');
const requireRoles = require('../middlewares/requireRoles');
const { setAdvertisement, getAllAdvertisements } = require('../controllers/advertisementController');
const upload = require('../middlewares/upload');

router.get('/list-advertisement', getAllAdvertisements);
router.post('/create-advertisement', requireLogin, requireRole('ADMIN'), upload.single('image'), setAdvertisement);

module.exports = router;