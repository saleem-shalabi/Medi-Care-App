// services/verifyCode.js
const prisma = require('../config/prisma');
const jwt = require('jsonwebtoken');

async function verifyCode(email, code) {
    const user = await prisma.Users.findUnique({ where: { email } });

    if (!user) throw new Error('User not found');
    if (user.isVerified) throw new Error('User already verified');
    if (user.verificationCode !== code || user.codeExpiresAt < new Date()) {
        throw new Error('Invalid or expired code');
    }

    const updatedUser = await prisma.Users.update({
        where: { email },
        data: {
            isVerified: true,
            verificationCode: null,
            codeExpiresAt: null,
        },
    });

    const token = jwt.sign(
        { id: updatedUser.id, email: updatedUser.email, role: updatedUser.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

    return {
        message: 'Email verified successfully.',
        token,
        username: updatedUser.username,
        email: updatedUser.email,
    };
}


module.exports = verifyCode;
