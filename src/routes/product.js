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
} = require("../controllers/productController");
const upload = require("../middlewares/upload");

router.post(
  "/add-product",
  requireRole("ADMIN"),
  upload.fields([
    { name: "images", maxCount: 100 },
    { name: "videos", maxCount: 100 },
  ]),
  validate(createProductSchema),
  addProduct
);
router.delete("/delete-product/:id", requireRole("ADMIN"), removeProduct);
router.patch(
  "/edit-product/:id",
  requireRole("ADMIN"),
  validate(editProductSchema),
  changeProduct
);
router.get("/get-products", requireLogin, getProducts);
router.get("/get-featured-products", requireLogin, getFeatured);
router.post("/add-to-favorites/:productId", requireLogin, AddToFavorites);
router.get("/favorites", requireLogin, getFavorites);
router.post("/add-to-cart", requireLogin, AddToCart);
router.get("/cart", requireLogin, GetCart);

module.exports = router;
