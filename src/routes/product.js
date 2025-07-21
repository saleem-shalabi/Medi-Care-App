const express = require('express');
const router = express.Router();
const requireRole = require('../middlewares/requireRole');
const requireLogin = require('../middlewares/requireLogin');
const validateProductInput = require('../middlewares/validateProductInput');
const { addProduct, removeProduct, changeProduct, showProducts, AddToFavorites, AddToCart } = require('../controllers/productController');

router.post('/add-product', requireRole('ADMIN'), validateProductInput, addProduct);
router.delete('/delete-product/:id', requireRole('ADMIN'), removeProduct);
router.patch('/edit-product/:id', requireRole('ADMIN'), changeProduct);
router.get('/get-products', showProducts);
router.post('/add-to-favorites/:productId', requireLogin, AddToFavorites);
router.post('/add-to-cart/:productId', requireLogin, AddToCart);

module.exports = router;