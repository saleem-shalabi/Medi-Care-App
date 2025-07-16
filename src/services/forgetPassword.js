const prisma = require('../config/prisma');
const bcrypt = require('bcrypt');
const sendEmail = require('../utils/sendEmail');

async function sendResetCode(email) {
    const user = await prisma.Users.findUnique({ where: { email } });
    if (!user) throw new Error('User not found');

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.Users.update({
        where: { email },
        data: { verificationCode: code, codeExpiresAt: expires },
    });

    await sendEmail(email, `Your password reset code: ${code}`);
    return { message: 'Reset code sent to email' };
}

async function resetPassword(email, code, newPassword) {
    const user = await prisma.Users.findUnique({ where: { email } });

    if (
        !user ||
        user.verificationCode !== code ||
        user.codeExpiresAt < new Date()
    ) {
        throw new Error('Invalid or expired code');
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await prisma.Users.update({
        where: { email },
        data: {
            password: hashed,
            verificationCode: null,
            codeExpiresAt: null,
        },
    });

    return { message: 'Password reset successful' };
}

module.exports = {
    sendResetCode,
    resetPassword,
};
