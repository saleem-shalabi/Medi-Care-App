const { date } = require('joi');
const {prisma} = require('../config/prisma');
const bcrypt = require('bcrypt');
const { Role } = require('../../generated/prisma');

async function deleteUserById(id) {
    const userId = Number(id);
    const user = await prisma.Users.findUnique({
        where: { id: userId },
    });
    if (!user)
        throw new Error('User not found');
    if (user.role === 'ADMIN')
        throw new Error('Cannot delete another admin user');
    const deletedUser = await prisma.Users.delete({
        where: { id: userId },
    });
    return deletedUser;
}

async function banUserById(id) {
    const userId = Number(id);
    const user = await prisma.Users.findUnique({
        where: { id: userId },
    });
    if (!user)
        throw new Error('User not found');
    if (user.role === 'ADMIN')
        throw new Error('Cannot ban an admin user');
    const bannedUser = await prisma.Users.update({
        where: { id: userId },
        data: { isBanned: true },
    });
    return bannedUser;
}

async function unbanUserById(id) {
    const userId = Number(id);
    const user = await prisma.Users.findUnique({
        where: { id: userId },
    });
    if (!user)
        throw new Error('User not found');
    if (user.isBanned === false)
        throw new Error('User is not banned');
    const unbannedUser = await prisma.Users.update({
        where: { id: userId },
        data: { isBanned: false },
    });
    return unbannedUser;
}

async function createUser(userData) {
    const { username, email, password, role } = userData;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.Users.create({
        data: {
            username,
            email,
            password: hashedPassword,
            role: role || 'USER',
            isVerified: true,
        },
    });
    delete newUser.password;
    return newUser;
}

async function changeUserPasswordById(id, newPassword) {
    const userId = Number(id);
    const user = await prisma.Users.findUnique({
        where: { id: userId },
    });
    if (!user)
        throw new Error('User not found');
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updatedUser = await prisma.Users.update({
        where: { id: userId },
        data: { password: hashedPassword },
    });
    delete updatedUser.password;
    return updatedUser;
}

async function setUserRoleById(id, newRole) {
    const userId = Number(id);
    const user = await prisma.Users.findUnique({
        where: { id: userId },
    });
    if (!user)
        throw new Error('User not found');
    const updatedUser = await prisma.Users.update({
        where: { id: userId },
        data: { role: newRole },
    });
    delete updatedUser.password;
    return updatedUser;
}

async function getAllUsers() {
    const users = await prisma.Users.findMany({
        select: {
            id: true,
            email: true,
            username: true,
            role: true,
            isBanned: true,
            createdAt: true,
            number: true,
            image: true,
            jobTitle: true,
            bio: true,
        },
    });
    return users;
}

module.exports = {
    deleteUserById,
    banUserById,
    unbanUserById,
    createUser,
    changeUserPasswordById,
    setUserRoleById,
    getAllUsers,
};