const { fetchFeaturedProducts } = require("./productService");
const { getAllActiveAdvertisements } = require("./advertisementService");

async function getMainViewService() {
  //   const allOrdersCount ;
  //   const rentedorders ;
  //   const maintainedorders ;
  const products = await fetchFeaturedProducts(6, true);
  const ads = await getAllActiveAdvertisements();
  return { products, ads };
}

module.exports = { getMainViewService };
