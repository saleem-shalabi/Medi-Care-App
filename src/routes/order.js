const express = require('express');
const router = express.Router();
const { createOrder, confirmPayment, setOrderStatus } = require('../controllers/orderController');
const requireLogin = require('../middlewares/requireLogin');
const requireRole = require('../middlewares/requireRole');

router.post('/create-order', requireLogin, createOrder);
router.post('/:orderId/confirm-payment', requireLogin, requireRole('ADMIN'), confirmPayment);
router.patch('/:orderId/set-status', requireLogin, requireRole('ADMIN'), setOrderStatus);

module.exports = router;