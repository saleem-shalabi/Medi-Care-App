const { PrismaClient } = require('../../generated/prisma');
const { withAccelerate } = require("@prisma/extension-accelerate");

const prisma = new PrismaClient().$extends(withAccelerate())
module.exports = prisma;