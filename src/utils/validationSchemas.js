const Joi = require('joi');

// Schema for creating a product
const createProductSchema = Joi.object({
  nameEn: Joi.string().required(),
  nameAr: Joi.string().required(),
  company: Joi.string().required(),
  category: Joi.string().required(),
  description: Joi.string().required(),
  rate: Joi.number().min(0).max(5).optional(),
  rentPrice: Joi.number().allow(null),
  sellPrice: Joi.number().allow(null),
  availableForRent: Joi.bool(),
  availableForSale: Joi.bool(),
  rentStock: Joi.number().integer(),
  saleStock: Joi.number().integer(),
  qrCode: Joi.string().optional(),
  // We parse images and videos separately
}).unknown(true);

// Schema for editing a product
const editProductSchema = Joi.object({
  nameEn: Joi.string().optional(),
  nameAr: Joi.string().optional(),
  company: Joi.string().optional(),
  category: Joi.string().optional(),
  description: Joi.string().optional(),
  rentPrice: Joi.number().min(0).optional(),
  sellPrice: Joi.number().min(0).optional(),
  availableForRent: Joi.boolean().optional(),
  availableForSale: Joi.boolean().optional(),
  rentStock: Joi.number().integer().min(0).optional(),
  saleStock: Joi.number().integer().min(0).optional(),
  images: Joi.array().items(Joi.string().uri()).optional(),
  qrCode: Joi.string().optional(),

  ProductVideo: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      bio: Joi.string().required(),
      url: Joi.string().uri().required(),
    })
  ).optional(),
});

module.exports = {
  createProductSchema,
  editProductSchema,
};
