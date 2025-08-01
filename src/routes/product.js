const express = require('express');
const router = express.Router();
const requireRole = require('../middlewares/requireRole');
const requireLogin = require('../middlewares/requireLogin');
const validate = require('../middlewares/validateProductInput');
const { createProductSchema, editProductSchema } = require('../utils/validationSchemas');
const { addProduct, removeProduct, changeProduct, getProducts, AddToFavorites, AddToCart } = require('../controllers/productController');
const { createProduct } = require('../services/productService');

router.post('/add-product', requireRole('ADMIN'), validate(createProductSchema), addProduct);
router.delete('/delete-product/:id', requireRole('ADMIN'), removeProduct);
router.patch('/edit-product/:id', requireRole('ADMIN'), validate(editProductSchema), changeProduct);
router.get('/get-products', getProducts);
router.post('/add-to-favorites/:productId', requireLogin, AddToFavorites);
router.post('/add-to-cart/:productId', requireLogin, AddToCart);

module.exports = router;