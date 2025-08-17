const prisma = require("../config/prisma");

async function createProduct(data, imageFiles, videoFiles) {
  const images = imageFiles.map((file) => file.path);
  const videos = videoFiles.map((file) => ({
    name: file.originalname,
    bio: "",
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
      availableForRent: data.availableForRent === "true",
      availableForSale: data.availableForSale === "true",
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
  if (!existing) throw new Error("Product not found");

  await prisma.ProductVideo.deleteMany({
    where: { productId: id },
  });

  const deleted = await prisma.Product.delete({ where: { id } });
  return deleted;
}

async function editProduct(id, data) {
  const existingProduct = await prisma.Product.findUnique({ where: { id } });
  if (!existingProduct) throw new Error("Product not found");

  const { videos, ...productData } = data;

  const updated = await prisma.Product.update({
    where: { id },
    data: {
      ...productData,
      ...(videos && {
        videos: {
          deleteMany: {},
          create: ProductVideo,
        },
      }),
    },
    include: {
      videos: true,
    },
  });

  return updated;
}

// كان: async function fetchProducts(category, withVideos = false) {
async function fetchProducts(category, withVideos = false, userId = null) {
  const where = category ? { category } : {};

  const products = await prisma.Product.findMany({
    where,
    include: {
      videos: withVideos
        ? {
            select: { id: true, name: true, bio: true, url: true },
          }
        : false,
      // نجيب فقط إذا في userId (مفلتر على نفس المستخدم)
      favoritedBy: userId
        ? {
            where: { id: userId },
            select: { id: true },
          }
        : false,
    },
    orderBy: { createdAt: "desc" },
  });

  // أضف isFavorite واحذف الـ favoritedBy من الشكل المرجوع
  return products.map((p) => {
    const isFavorite = Array.isArray(p.favoritedBy) && p.favoritedBy.length > 0;
    const { favoritedBy, ...rest } = p;
    return { ...rest, isFavorite };
  });
}

// src/services/productService.js
async function fetchFeaturedProducts(
  limit = 10,
  withVideos = false,
  userId = null
) {
  const products = await prisma.Product.findMany({
    take: limit,
    where: {
      // only show items the shop can actually offer
      OR: [{ availableForSale: true }, { availableForRent: true }],
    },
    include: {
      videos: withVideos
        ? { select: { id: true, name: true, bio: true, url: true } }
        : false,
      // for computing isFavorite for the current user (optional)
      favoritedBy: userId
        ? { where: { id: userId }, select: { id: true } }
        : false,
      // for showing how “popular” a product is (optional, nice to have)
      _count: { select: { favoritedBy: true } },
    },
    // “Featured” ranking: highest rate → most favorited → newest
    orderBy: [
      { rate: "desc" },
      { favoritedBy: { _count: "desc" } },
      { createdAt: "desc" },
    ],
  });

  return products.map((p) => {
    const isFavorite = Array.isArray(p.favoritedBy) && p.favoritedBy.length > 0;
    const { favoritedBy, ...rest } = p;
    return { ...rest, isFavorite };
  });
}

async function addToFavorites(userId, productId) {
  // 1) تأكّد المنتج موجود
  const prod = await prisma.Product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      // هل هو مفضّل من هالمستخدم؟
      favoritedBy: {
        where: { id: userId },
        select: { id: true },
      },
    },
  });

  if (!prod) {
    throw new Error("Product not found");
  }

  const isAlreadyFavorite =
    Array.isArray(prod.favoritedBy) && prod.favoritedBy.length > 0;

  // 2) بدّل بين connect / disconnect حسب الحالة الحالية
  const updatedUser = await prisma.Users.update({
    where: { id: userId },
    data: {
      favorites: isAlreadyFavorite
        ? { disconnect: { id: productId } }
        : { connect: { id: productId } },
    },
    include: { favorites: true },
  });

  // 3) رجّع نتيجة واضحة
  return {
    action: isAlreadyFavorite ? "removed" : "added",

    productId,
  };
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
        data: { quantity: quantity },
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
    throw new Error("Could not add to cart");
  }
}

module.exports = {
  createProduct,
  deleteProduct,
  editProduct,
  fetchProducts,
  fetchFeaturedProducts,
  addToFavorites,
  addToCart,
};
