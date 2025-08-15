const prisma = require('../config/prisma');
const sendEmail = require('../utils/sendEmail');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

async function registerWithEmail({ username, email, password }) {
    const existing = await prisma.Users.findUnique({ where: { email } });

    if (existing && existing.isVerified) {
        throw new Error('Email already registered');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000);
    if (existing && !existing.isVerified) {
        await prisma.Users.update({
            where: { email },
            data: {
                username,
                password: hashedPassword,
                verificationCode: code,
                codeExpiresAt: expires,
            },
        });
    } else {
        await prisma.Users.create({
            data: {
                username,
                email,
                password: hashedPassword,
                verificationCode: code,
                codeExpiresAt: expires,
            },
        });
    }
    await sendEmail(email, code);
    return { message: 'Verification code sent to email' };
}

async function verifyCode(email, code) {
    const user = await prisma.Users.findUnique({
        where: {
            email: email
        }
    });

    if (!user) throw new Error('User not found');

    if (user.isVerified) throw new Error('User already verified');

    if (user.verificationCode !== code) throw new Error('Invalid verification code');

    if (user.codeExpiresAt && user.codeExpiresAt < new Date()) {
        throw new Error('Verification code expired');
    }

    await prisma.Users.update({
        where: { email },
        data: {
            isVerified: true,
            verificationCode: null,
            codeExpiresAt: null
        }
    });

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
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return {
        message: 'Login successful',
        token,
        email: user.email,
        username: user.username,
        role: user.role
    };
}

async function changePassword({ userId, currentPassword, newPassword }) {
    const user = await prisma.Users.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found!');
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) throw new Error('Current password is incorrect!');
    const hashedNew = await bcrypt.hash(newPassword, 10);
    await prisma.Users.update({ where: { id: userId }, data: { password: hashedNew }, });
    return { message: 'Password changed successfully' };
}

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
    registerWithEmail,
    verifyCode,
    login,
    changePassword,
    sendResetCode,
    resetPassword
};