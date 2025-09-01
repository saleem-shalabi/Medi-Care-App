const express = require('express');
const router = express.Router();
const { createOrder, confirmPayment, setOrderStatus, listAllOrders, getUserOrders, requestExtension, getCurrentUserContracts, setContractStatus, processReturn } = require('../controllers/orderController');
const requireLogin = require('../middlewares/requireLogin');
const requireRole = require('../middlewares/requireRole');
const requireRoles = require('../middlewares/requireRoles');

router.post('/create-order', requireLogin, createOrder);
router.post('/:orderId/confirm-payment', requireLogin, requireRole('ADMIN'), confirmPayment);
router.patch('/:orderId/set-status', requireLogin, requireRole('ADMIN'), setOrderStatus);
router.get('/get-orders', requireLogin, requireRoles(['ADMIN', 'ACCOUNTANT']), listAllOrders);
router.get('/get-user-orders/:userId', requireLogin, getUserOrders);
router.post('/extend-contract/:contractId', requireLogin, requestExtension);
router.get('/get-user-contracts', requireLogin, getCurrentUserContracts);
router.patch('/:contractId/update-contract-status', requireLogin, requireRole('ADMIN'), setContractStatus);
router.post('/:contractId/return-rented', requireLogin, requireRoles(['ADMIN', 'MAINTENANCE']), processReturn);

module.exports = router;