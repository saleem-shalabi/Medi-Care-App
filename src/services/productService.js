const prisma = require('../config/prisma');

async function createProduct(data, imageFiles, videoFiles) {
    const images = imageFiles.map((file) => file.path);
    const videos = videoFiles.map((file) => ({
        name: file.originalname,
        bio: '',
        url: file.path,
    }));

    const product = await prisma.Product.create({
        data: {
            nameEn: data.nameEn,
            nameAr: data.nameAr,
            company: data.company,
            category: data.category,
            description: data.description,
            rate: Number(data.rate),
            rentPrice: Number(data.rentPrice),
            sellPrice: Number(data.sellPrice),
            availableForRent: data.availableForRent === 'true',
            availableForSale: data.availableForSale === 'true',
            rentStock: Number(data.rentStock),
            saleStock: Number(data.saleStock),
            qrCode: data.qrCode,
            images,
            videos: {
                create: videos,
            },
        },
        include: {
            videos: true,
        },
    });

    return product;
}


async function deleteProduct(id) {
    const existing = await prisma.Product.findUnique({ where: { id } });
    if (!existing) throw new Error('Product not found');

    await prisma.ProductVideo.deleteMany({
        where: { productId: id },
    });

    const deleted = await prisma.Product.delete({ where: { id } });
    return deleted;
}

async function editProduct(id, data) {
    const existingProduct = await prisma.Product.findUnique({ where: { id } });
    if (!existingProduct) throw new Error('Product not found');

    const {
        ProductVideo, 
        ...productData
    } = data;

    const updated = await prisma.Product.update({
        where: { id },
        data: {
            ...productData,
            ...(ProductVideo && {
                ProductVideo: {
                    deleteMany: {},
                    create: ProductVideo,
                },
            }),
        },
        include: {
            ProductVideo: true,
        },
    });

    return updated;
}

async function fetchProducts(category, withVideos = false) {
    const where = category ? { category } : {};

    const products = await prisma.Product.findMany({
        where,
        include: {
            videos: withVideos
                ? {
                    select: {
                        id: true,
                        name: true,
                        bio: true,
                        url: true,
                    },
                }
                : false, // Don't include videos if not requested
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

    return products;
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

async function addToCart(userId, productId, quantity = 1) {
    try {
        const existing = await prisma.CartItem.findUnique({
            where: {
                userId_productId: {
                    userId,
                    productId,
                },
            },
        });

        if (existing) {
            // Optional: Update quantity if already exists
            return await prisma.CartItem.update({
                where: { userId_productId: { userId, productId } },
                data: { quantity: existing.quantity + quantity },
            });
        }

        return await prisma.cartItem.create({
            data: {
                userId,
                productId,
                quantity, //defaults to 1 if not provided
            },
        });
    } catch (err) {
        throw new Error('Could not add to cart');
    }
}


module.exports = {
    createProduct,
    deleteProduct,
    editProduct,
    fetchProducts,
    addToFavorites,
    addToCart,
};
