const {
  createProduct,
  deleteProduct,
  editProduct,
  fetchProducts,
  fetchFeaturedProducts,
  addToFavorites,
  getFavoritesService,
  addToCart,
  getCartService,
  searchProductsService,
  findProductByQrCode
} = require("../services/productService");

async function addProduct(req, res) {
  try {
    // req.files is now an object with keys 'images' and 'videos'
    const imageFiles = req.files.images || [];
    const videoFiles = req.files.videos || [];

    // Add costPrice to the data passed to the service
    const data = req.body;

    const newProduct = await createProduct(data, imageFiles, videoFiles);
    res.status(201).json({ message: 'Product created successfully', product: newProduct });
  } catch (err) {
    console.error("Create Product Error:", err);
    res.status(500).json({ error: 'Failed to create product.' });
  }
}

async function removeProduct(req, res) {
  try {
    const { id } = req.params;
    const result = await deleteProduct(Number(id));
    return res
      .status(200)
      .json({ message: "Product deleted successfully", product: result });
  } catch (error) {
    return res.status(404).json({ error: error.message });
  }
}

async function changeProduct(req, res) {
  const { id } = req.params;
  try {
    const imageFiles = req.files.images || [];
    const videoFiles = req.files.videos || [];
    const data = req.body;

    const updatedProduct = await editProduct(id, data, imageFiles, videoFiles);
    res.status(200).json({ message: 'Product updated successfully', product: updatedProduct });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    console.error("Update Product Error:", err);
    res.status(500).json({ error: 'Failed to update product.' });
  }
}

async function getProducts(req, res) {
  try {
    const { category, withVideos } = req.query;
    const userId = req.user.id;

    const products = await fetchProducts(
      category,
      withVideos === "true",
      userId
    );

    return res.status(200).json({ products });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// src/controllers/productController.js
async function getFeatured(req, res) {
  try {
    const userId = req.user?.id || null; // use maybeLogin middleware if route is public
    const withVideos = req.query.withVideos === "true";
    const limit = Number(req.query.limit) || 10;

    const products = await fetchFeaturedProducts(limit, withVideos, userId);
    return res.status(200).json({ products });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function AddToFavorites(req, res) {
  const userId = req.user.id;
  const productId = parseInt(req.params.productId);

  const result = await addToFavorites(userId, productId);
  res.json({ message: "Product added to favorites", result });
}

async function getFavorites(req, res) {
  try {
    const userId = req.user.id; // المسار محمي بـ requireLogin
    const withVideos = req.query.withVideos === "true";
    const result = await getFavoritesService(userId, withVideos);
    return res.status(200).json(result); // { favorites:[...], total:n }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function AddToCart(req, res) {
  try {
    const userId = req.user.id;
    const { productId, quantity, transactionType } = req.body;

    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    const result = await addToCart(
      userId,
      Number(productId),
      quantity ?? 1,
      transactionType
    );
    return res.status(200).json({
      message: result,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
async function GetCart(req, res) {
  try {
    const userId = req.user.id;
    const result = await getCartService(userId);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
async function searchProducts(req, res) {
  try {
    const userId = req.user?.id || null; // استخدم maybeLogin لو المسار عام
    const {
      q = "",
      category,
      minPrice,
      maxPrice,
      page = "1",
      pageSize = "12",
      sortBy = "createdAt",
      order = "desc",
      withVideos = "false",
    } = req.query;

    const result = await searchProductsService({
      q,
      category,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      page: Number(page),
      pageSize: Number(pageSize),
      sortBy,
      order,
      withVideos: withVideos === "true",
      userId,
    });

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function getProductByQrCode(req, res) {
  // The full QR code content is sent as a query parameter named 'code'.
  // e.g., /by-qrcode?code=https://.../products/123
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'The "code" query parameter is required.' });
  }

  try {
    const product = await findProductByQrCode(code);
    res.status(200).json(product);
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    if (err.message.includes('Invalid')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'An error occurred while finding the product.' });
  }
}

module.exports = {
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
  getProductByQrCode,
};
