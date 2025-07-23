const {
  createProduct,
  deleteProduct,
  editProduct,
  getProducts,
  addToFavorites,
  addToCart,
} = require("../services/productService");

async function addProduct(req, res) {
  try {
    // check if the body{name price ....} is not null
    const product = await createProduct(req.body);
    res.status(201).json({ message: "Product created successfully", product });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
  try {
    const { id } = req.params;
    const data = req.body;
    const updateProduct = await editProduct(Number(id), data);
    return res.status(200).json({
      message: "Product updated successfully",
      product: updateProduct,
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

async function showProducts(req, res) {
  try {
    const { includeMedia = "true" } = req.query;
    const products = await getProducts(includeMedia === "true");
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function AddToFavorites(req, res) {
  const userId = req.user.id;
  const productId = parseInt(req.params.productId);

  const result = await addToFavorites(userId, productId);
  res.json({ message: "Product added to favorites", result });
}

async function AddToCart(req, res) {
  const userId = req.user.id;
  const productId = parseInt(req.params.productId);

  const result = await addToCart(userId, productId);
  res.json({ message: "Product added to cart", result });
}

module.exports = {
  addProduct,
  removeProduct,
  changeProduct,
  showProducts,
  AddToFavorites,
  AddToCart,
};
