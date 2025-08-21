const {prisma} = require("../config/prisma");

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
      rate: Number(data.rate) || undefined,
      rentPrice: Number(data.rentPrice),
      sellPrice: Number(data.sellPrice),
      availableForRent: data.availableForRent === "true",
      availableForSale: data.availableForSale === "true",
      rentStock: Number(data.rentStock),
      saleStock: Number(data.saleStock),
      qrCode: data.qrCode,
      usageInstructions: data.usageInstructions, // ← جديد
      maintenanceGuidelines: data.maintenanceGuidelines, // ← جديد
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
async function getFavoritesService(userId, withVideos = false) {
  const favorites = await prisma.Product.findMany({
    where: { favoritedBy: { some: { id: userId } } },
    include: {
      videos: withVideos
        ? { select: { id: true, name: true, bio: true, url: true } }
        : false,
      _count: { select: { favoritedBy: true } }, // (اختياري) مفيد لو حابب تشوف الشعبية
    },
    orderBy: { createdAt: "desc" },
  });

  // بما إنو هاد مسار المفضّلة، كل عنصر فعليًا isFavorite = true
  return {
    favorites: favorites.map((p) => ({ ...p, isFavorite: true })),
  };
}
async function addToCart(userId, productId, quantity = 1) {
  try {
    if (!Number.isInteger(quantity) || quantity < 0)
      throw new Error("Invalid quantity");
    const product = await prisma.Product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) throw new Error("Product not found");

    if (quantity === 0) {
      const existing = await prisma.CartItem.findUnique({
        where: { userId_productId: { userId, productId } },
      });
      if (!existing) return "Product not found in cart, nothing to remove.";
      await prisma.CartItem.delete({
        where: { userId_productId: { userId, productId } },
      });
      return "Product removed from cart.";
    }

    const existing = await prisma.CartItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (existing) {
      return await prisma.CartItem.update({
        where: { userId_productId: { userId, productId } },
        data: { quantity },
      });
    }

    return await prisma.CartItem.create({
      data: { userId, productId, quantity },
    });
  } catch (err) {
    throw new Error(err?.message || "Could not add to cart");
  }
}

async function getCartService(userId) {
  const cartItems = await prisma.CartItem.findMany({
    where: { userId },
    include: {
      product: {
        select: {
          id: true,
          nameEn: true,
          nameAr: true,
          company: true,
          category: true,
          images: true,
          qrCode: true,
          sellPrice: true,
        },
      },
    },
    orderBy: { addedAt: "desc" },
  });

  const cartitems = cartItems.map((ci) => {
    const lineTotal = (ci.product.sellPrice || 0) * ci.quantity;
    return {
      quantity: ci.quantity,
      lineTotal,
      product: ci.product,
    };
  });

  const totalPrice = cartitems.reduce((sum, item) => sum + item.lineTotal, 0);

  return { cartitems, totalPrice };
}
async function searchProductsService({
  q = "",
  category,
  minPrice,
  maxPrice,
  page = 1,
  pageSize = 12,
  sortBy = "createdAt", // "createdAt" | "rate" | "price"
  order = "desc", // "asc" | "desc"
  withVideos = false,
  userId = null,
}) {
  const where = {};

  // نص البحث (OR على الحقول المهمة)
  if (q && q.trim()) {
    where.OR = [
      { nameEn: { contains: q, mode: "insensitive" } },
      { nameAr: { contains: q, mode: "insensitive" } },
      { company: { contains: q, mode: "insensitive" } },
      { category: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }

  if (category) where.category = category;

  // فلترة السعر (بيع فقط)
  if (minPrice || maxPrice) {
    where.sellPrice = {};
    if (minPrice != null) where.sellPrice.gte = Number(minPrice);
    if (maxPrice != null) where.sellPrice.lte = Number(maxPrice);
  }

  const take = Number(pageSize);
  const skip = (Number(page) - 1) * take;

  const orderBy =
    sortBy === "price"
      ? { sellPrice: order }
      : sortBy === "rate"
      ? { rate: order }
      : { createdAt: order };

  const [items, total] = await prisma.$transaction([
    prisma.Product.findMany({
      where,
      include: {
        videos: withVideos
          ? { select: { id: true, name: true, bio: true, url: true } }
          : false,
        favoritedBy: userId
          ? { where: { id: userId }, select: { id: true } }
          : false,
      },
      orderBy,
      skip,
      take,
    }),
    prisma.Product.count({ where }),
  ]);

  // isFavorite + إزالة favoritedBy من الخرج
  const products = items.map((p) => {
    const isFavorite = Array.isArray(p.favoritedBy) && p.favoritedBy.length > 0;
    const { favoritedBy, ...rest } = p;
    return { ...rest, isFavorite };
  });

  return {
    products,
    pagination: { page: Number(page), pageSize: take, total },
  };
}

module.exports = {
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
};
