const prisma = require('../../generated/prisma');

async function getAllUsers() {
    return await prisma.users.findMany();
}

module.exports = {
    getAllUsers,
};