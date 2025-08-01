const Joi = require('joi');

// Schema for creating a product
const createProductSchema = Joi.object({
  nameEn: Joi.string().required(),
  nameAr: Joi.string().required(),
  company: Joi.string().required(),
  category: Joi.string().required(),
  description: Joi.string().required(),
  rentPrice: Joi.number().min(0).optional(),
  sellPrice: Joi.number().min(0).optional(),
  availableForRent: Joi.boolean().required(),
  availableForSale: Joi.boolean().required(),
  rentStock: Joi.number().integer().min(0).required(),
  saleStock: Joi.number().integer().min(0).required(),
  images: Joi.array().items(Joi.string().uri()).required(),
  qrCode: Joi.string().optional(),

  ProductVideo: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      bio: Joi.string().required(),
      url: Joi.string().uri().required(),
    })
  ).optional(),
});

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
