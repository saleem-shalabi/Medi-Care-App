const prisma = require('../config/prisma');
const bcrypt = require('bcrypt');

async function changePassword({ userId, currentPassword, newPassword }) {
    const user = await prisma.Users.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found!');
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) throw new Error('Current password is incorrect!');
    const hashedNew = await bcrypt.hash(newPassword, 10);
    await prisma.Users.update({ where: { id: userId }, data: { password: hashedNew }, });
    return { message: 'Password changed successfully' };
}

module.exports = changePassword;