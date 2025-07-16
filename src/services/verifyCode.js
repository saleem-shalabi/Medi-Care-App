// services/verifyCode.js
const prisma = require('../config/prisma');

async function verifyCode({ email, code }) {
    const user = await prisma.Users.findUnique({ where: { email } });

    if (!user) {
        throw new Error('User not found');
    }

    if (
        user.verificationCode !== code ||
        !user.codeExpiresAt ||
        user.codeExpiresAt < new Date()
    ) {
        throw new Error('Invalid or expired verification code');
    }

    await prisma.Users.update({
        where: { email },
        data: {
            isVerified: true,
            verificationCode: null,
            codeExpiresAt: null,
        },
    });

    return { message: 'Email verified successfully' };
}

module.exports = verifyCode;
