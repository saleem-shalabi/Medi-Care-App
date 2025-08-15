const express = require('express');
const router = express.Router();
const requireRole = require('../middlewares/requireRole');
const { deleteUser, banUser, unbanUser, createUserByAdmin, changeUserPassword, setUserRole, getUsers } = require('../controllers/adminController');

router.delete('/delete-user/:id', requireRole('ADMIN'), deleteUser);
router.put('/ban-user/:id', requireRole('ADMIN'), banUser);
router.put('/unban-user/:id', requireRole('ADMIN'), unbanUser);
router.post('/create-user', requireRole('ADMIN'), createUserByAdmin);
router.put('/change-password/:id', requireRole('ADMIN'), changeUserPassword);
router.put('/set-role/:id', requireRole('ADMIN'), setUserRole);
router.get('/get-users', requireRole('ADMIN'), getUsers);

module.exports = router;