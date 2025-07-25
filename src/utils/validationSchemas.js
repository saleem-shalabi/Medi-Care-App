const Joi = require("joi");

const productSchema = Joi.object({
  nameEn: Joi.string().required(),
  nameAr: Joi.string().required(),
  companyEn: Joi.string().required(),
  companyAr: Joi.string().required(),
  categoryEn: Joi.string().required(),
  categoryAr: Joi.string().required(),
  descriptionEn: Joi.string().optional(),
  descriptionAr: Joi.string().optional(),
  rate: Joi.number().min(0).max(5).optional(),
  rentPrice: Joi.number().min(0).optional(),
  sellPrice: Joi.number().min(0).optional(),
  availableForRent: Joi.boolean().required(),
  availableForSale: Joi.boolean().required(),
  rentStock: Joi.number().integer().min(0).required(),
  saleStock: Joi.number().integer().min(0).required(),
  images: Joi.array().items(Joi.string().uri()).required(),
  videos: Joi.array().items(Joi.string().uri()).optional(),
  qrCode: Joi.string().uri().optional(),
});

module.exports = { productSchema };
