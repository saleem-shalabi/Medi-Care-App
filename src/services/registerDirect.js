const prisma = require('../config/prisma');
const bcrypt = require('bcrypt');

async function registerDirect({ username, email, password }) {
    const existing = await prisma.Users.findUnique({ where: { email } });

    if (existing && existing.isVerified) {
        throw new Error('Email already registered!');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    if (existing && !existing.isVerified) {
        await prisma.Users.update({
            where: { email },
            data: {
                username,
                password: hashedPassword,
                isVerified: true,
                verificationCode: null,
                codeExpiresAt: null,
            },
        });
    } else {
        await prisma.Users.create({
            data: {
                username,
                email,
                password: hashedPassword,
                isVerified: true,
            },
        });
    }
    return { message: 'User registered successfully' };
}


module.exports = registerDirect;