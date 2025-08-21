const PrismaLibrary = require('../../generated/prisma'); 
const { withAccelerate } = require("@prisma/extension-accelerate");

const prisma = new PrismaLibrary.PrismaClient().$extends(withAccelerate());

module.exports = {
  prisma,          
  ...PrismaLibrary 
};