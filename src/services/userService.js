const {prisma} = require('../config/prisma');

async function getUserProfileById(id, baseUrl) {
    const userId = Number(id);
    const user = await prisma.Users.findUnique({
        where: { id: userId },
        select: {
            id: true,
            username: true,
            email: true,
            number: true,
            image: true,
            jobTitle: true,
            bio: true,
            isBanned: true,
            role: true,
            createdAt: true,
        },
    });
    if (!user) {
        throw new Error('User not found');
    }
    if (user.image)
        user.image = `${baseUrl}${user.image}`;
    return user;
}

async function updateUserProfile(userId, updateData, baseUrl) {
    const updatedUser = await prisma.Users.update({
        where: { id: userId },
        data: updateData,
    });
    if (updatedUser.image)
        updatedUser.image = `${baseUrl}${updatedUser.image}`;
    delete updatedUser.password;
    return updatedUser;
}

module.exports = {
    getUserProfileById,
    updateUserProfile,
};