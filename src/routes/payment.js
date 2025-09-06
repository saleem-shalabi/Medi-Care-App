const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const requireLogin = require('../middlewares/requireLogin');

router.post('/orders/:orderId/create-checkout-session', requireLogin, paymentController.createPaymentSession);
router.post('/stripe-webhook', paymentController.handleStripeWebhook);
router.get('/payment-success', paymentController.handlePaymentSuccess);
router.get('/payment-cancelled', paymentController.handlePaymentCancelled);

module.exports = router;