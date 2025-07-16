// services/registerWithEmail.js
const prisma = require('../config/prisma');
const bcrypt = require('bcrypt');
const sendEmail = require('../utils/sendEmail');

async function registerWithEmail({ username, email, password }) {
  const existing = await prisma.Users.findUnique({ where: { email } });
  if (existing) throw new Error('Email already registered');

  const hashedPassword = await bcrypt.hash(password, 10);
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = new Date(Date.now() + 15 * 60 * 1000);

  await prisma.Users.create({
    data: {
      username,
      email,
      password: hashedPassword,
      verificationCode: code,
      codeExpiresAt: expires,
    },
  });

  await sendEmail(email, code);

  return { message: 'Verification code sent to email' };
}

module.exports = registerWithEmail;
