const prisma = require('../config/prisma'); // adjust the path if needed
const jwt = require('jsonwebtoken');

async function verifyCode(email, code) {
    // 1. Find user by email
    const user = await prisma.Users.findUnique({
        where: {
            email: email // just a string, not an object
        }
    });

    // 2. If user not found
    if (!user) throw new Error('User not found');

    // 3. If already verified
    if (user.isVerified) throw new Error('User already verified');

    // 4. Check verification code
    if (user.verificationCode !== code) throw new Error('Invalid verification code');

    // 5. Check expiration
    if (user.codeExpiresAt && user.codeExpiresAt < new Date()) {
        throw new Error('Verification code expired');
    }

    // 6. Update user to verified
    await prisma.Users.update({
        where: { email },
        data: {
            isVerified: true,
            verificationCode: null,
            codeExpiresAt: null
        }
    });

    // 7. Generate a JWT
    const token = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

    return {
        message: 'Email verified successfully',
        token
    };
}

module.exports = verifyCode;
