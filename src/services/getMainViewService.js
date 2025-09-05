const { prisma } = require('../config/prisma');
const { fetchFeaturedProducts } = require("./productService");
const { getAllActiveAdvertisements } = require("./advertisementService");

// async function getMainViewService(userId,req) {
//   //   const allOrdersCount ;
//   //   const rentedorders ;
//   //   const maintainedorders ;
//   const products = await fetchFeaturedProducts(6, true);
//   const ads = await getAllActiveAdvertisements();
//   return { products, ads };
// }

async function getMainViewService(userId, req) {

  const userOrdersCount = await prisma.Order.count({
    where: {
      userId: userId,
    },
  });

  const userRentalsCount = await prisma.RentalContract.count({
    where: {
      userId: userId,
    },
  });

  const userMaintenanceCount = await prisma.MaintenanceRequest.count({
    where: {
      customerId: userId,
    },
  });

  const products = await fetchFeaturedProducts(6, true);
  const ads = await getAllActiveAdvertisements(req);

  return {
    userStats: {
      totalOrders: userOrdersCount,
      totalRentals: userRentalsCount,
      totalMaintenance: userMaintenanceCount,
    },
    featuredProducts: products,
    advertisements: ads,
  };
}

module.exports = { getMainViewService };
