const express = require("express");
const router = express.Router();
const requireRole = require("../middlewares/requireRole");
const requireLogin = require("../middlewares/requireLogin");
const validate = require("../middlewares/validateProductInput");
const {
  createProductSchema,
  editProductSchema,
} = require("../utils/validationSchemas");
const {
  addProduct,
  removeProduct,
  changeProduct,
  getProducts,
  getFeatured,
  AddToFavorites,
  getFavorites,
  AddToCart,
  GetCart,
  searchProducts,
  getProductByQrCode
} = require("../controllers/productController");
const upload = require("../middlewares/upload");

const productUploads = upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'videos', maxCount: 5 }
]);

router.post('/add-product', requireLogin, requireRole('ADMIN'), productUploads, validate(createProductSchema), addProduct);
router.delete("/delete-product/:id", requireRole("ADMIN"), removeProduct);
router.patch('/edit-product/:id', requireLogin, requireRole('ADMIN'), productUploads, validate(editProductSchema), changeProduct);
router.get('/find-by-qrcode', requireLogin, getProductByQrCode);//new
router.get("/get-products", requireLogin, getProducts);
router.get("/get-featured-products", requireLogin, getFeatured);
router.post("/add-to-favorites/:productId", requireLogin, AddToFavorites);
router.get("/favorites", requireLogin, getFavorites);
router.post("/add-to-cart", requireLogin, AddToCart);
router.get("/cart", requireLogin, GetCart);
router.get("/search", requireLogin, searchProducts);

module.exports = router;
