const prisma = require('../config/prisma');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

async function login({ identifier, password }) {
    const user = await prisma.Users.findFirst({
        where: {
            OR: [
                { email: identifier },
                { username: identifier }
            ]
        }
    });
    if (!user) throw new Error('Invalid username/email or password');

    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new Error('Invalid username/email or password');

    if (!user.isVerified) throw new Error('Email not verified');
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return { message: 'Login successful', token };
}

module.exports = login;