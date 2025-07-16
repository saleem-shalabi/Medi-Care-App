const prisma = require('../config/prisma');
const bcrypt = require('bcrypt');

async function registerDirect({ username, email, password }) {
    const existing = await prisma.Users.findUnique({ where: { email } });
    if (existing) throw new Error('Email already registered!');
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.Users.create({
        data: {
            username,
            email,
            password: hashedPassword,
            isVerified: true,
        },
    });
    return {message:'User registered successfully'};
}

module.exports = registerDirect;