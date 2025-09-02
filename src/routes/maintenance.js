const express = require('express');
const router = express.Router();
const requireLogin = require('../middlewares/requireLogin');
const requireRole = require('../middlewares/requireRole');
const { createRequest, listAllRequests, assignTechnician, completeRequest, getRequestById } = require('../controllers/maintenanceController');

router.post('/maintenance-request', requireLogin, createRequest);
router.get('/list-all-requests', requireLogin, requireRole('ADMIN'), listAllRequests);
router.patch('/:id/assign-to-request', requireLogin, requireRole('ADMIN'), assignTechnician);//request id
router.patch('/:id/complete-request', requireLogin, completeRequest);//request id
router.get('/:id/get-request', requireLogin, getRequestById);//request id

module.exports = router;