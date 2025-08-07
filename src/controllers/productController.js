const { createProduct, deleteProduct, editProduct, fetchProducts, addToFavorites, addToCart } = require('../services/productService');


async function addProduct(req, res) {
    try {
        const imageFiles = req.files?.images || [];
        const videoFiles = req.files?.videos || [];

        const product = await createProduct(
            req.body,
            imageFiles,
            videoFiles
        );

        res.status(201).json({
            message: 'Product created successfully',
            product,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}



async function removeProduct(req, res) {
    try {
        const { id } = req.params;
        const result = await deleteProduct(Number(id));
        return res.status(200).json({ message: 'Product deleted successfully', product: result });
    } catch (error) {
        return res.status(404).json({ error: error.message });
    }
}

async function changeProduct(req, res) {
    try {
        const { id } = req.params;
        const data = req.body;

        const updated = await editProduct(Number(id), data);
        return res.status(200).json({
            message: 'Product updated successfully',
            product: updated,
        });
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
}

async function getProducts(req, res) {
    try {
        const { category, withVideos } = req.query;

        const products = await fetchProducts(category, withVideos === 'true');

        return res.status(200).json({ products });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

async function AddToFavorites(req, res) {
    const userId = req.user.id;
    const productId = parseInt(req.params.productId);

    const result = await addToFavorites(userId, productId);
    res.json({ message: 'Product added to favorites', result });
}

async function AddToCart(req, res) {
    try {
        const userId = req.user.id;
        const { productId, quantity } = req.body;

        if (!productId) {
            return res.status(400).json({ error: 'Product ID is required' });
        }

        const added = await addToCart(userId, Number(productId), quantity ?? 1);
        return res.status(200).json({
            message: 'Product added to cart',
            item: added,
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}


module.exports = {
    addProduct,
    removeProduct,
    changeProduct,
    getProducts,
    AddToFavorites,
    AddToCart,
};
