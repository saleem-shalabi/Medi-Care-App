const prisma = require('../../generated/prisma');
const bcrypt = require('bcrypt');
const sendEmail = require('../utils/sendEmail');

async function register({ username, email, password }) {
  const hashedPassword = await bcrypt.hash(password, 10);
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  console.log('LOOOOOOOK HERE!')
  console.log('Prisma:', prisma);
  console.log('Prisma.user:', prisma.user);
  const user = await prisma.user.create({
    data: {
      username,
      email,
      password: hashedPassword,
      verificationCode: code,
      codeExpiresAt: expires,
    },
  });

  await sendEmail(email, code);

  return { message: 'User registered. Check email for verification code.' };
}

async function verifyCode(email, code) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.verificationCode !== code || user.codeExpiresAt < new Date()) {
    throw new Error('Invalid or expired code');
  }

  await prisma.user.update({
    where: { email },
    data: {
      isVerified: true,
      verificationCode: null,
      codeExpiresAt: null,
    },
  });

  return { message: 'Email verified successfully.' };
}

module.exports = {
  register,
  verifyCode,
};
