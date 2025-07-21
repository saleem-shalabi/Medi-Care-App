const prisma = require('../config/prisma');

async function createProduct(data) {
    const product = await prisma.Product.create({ data });
    return product;
}

async function deleteProduct(id) {
    const existing = await prisma.Product.findUnique({ where: { id } });
    if (!existing) throw new Error('Product not found');

    const deleted = await prisma.Product.delete({ where: { id } });
    return deleted;
}

async function editProduct(id, data) {
    const product = await prisma.Product.findUnique({ where: { id } });
    if (!product) throw new Error('Product not found');

    const updated = await prisma.product.update({
        where: { id },
        data,
    });

    return updated;
}

async function getProducts(includeMedia = true) {
    return await prisma.Product.findMany({
        select: {
            id: true,
            nameEn: true,
            nameAr: true,
            company: true,
            category: true,
            description: true,
            rate: true,
            rentPrice: true,
            sellPrice: true,
            availableForRent: true,
            availableForSale: true,
            rentStock: true,
            saleStock: true,
            qrCode: true,
            createdAt: true,
            updatedAt: true,
            images: includeMedia,
            videos: includeMedia,
        }, orderBy: { createdAt: 'desc' },
    });
}

async function addToFavorites(userId, productId) {
    return await prisma.Users.update({
        where: { id: userId },
        data: {
            favorites: {
                connect: { id: productId }
            }
        },
        include: { favorites: true }
    });
}

async function addToCart(userId, productId) {
    return await prisma.Users.update({
        where: { id: userId },
        data: {
            cart: {
                connect: { id: productId }
            }
        },
        include: { cart: true }
    });
}

module.exports = {
    createProduct,
    deleteProduct,
    editProduct,
    getProducts,
    addToFavorites,
    addToCart,
};
