const { productSchema } = require('../utils/validationSchemas');

async function validateProductInput(req, res, next) {
    const { error } = productSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    next();
}

module.exports = validateProductInput;
