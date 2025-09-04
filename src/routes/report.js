const express = require('express');
const router = express.Router();
const requireLogin = require('../middlewares/requireLogin');
const requireRole = require('../middlewares/requireRole');
const requireRoles = require('../middlewares/requireRoles');
const { getEarningsReport } = require('../controllers/reportController');

router.get('/earnings', requireLogin, requireRoles(['ACCOUNTANT', 'ADMIN']), getEarningsReport);

module.exports = router;