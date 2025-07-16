const nodemailer = require('nodemailer');

async function sendVerificationEmail(to, code) {
    const transporter = nodemailer.createTransport({
        service: 'Gmail', // or any SMTP config
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const info = await transporter.sendMail({
        from: `"My App" <${process.env.EMAIL_USER}>`,
        to,
        subject: 'Your Verification Code',
        text: `Your verification code is: ${code}`,
    });

    console.log('Email sent:', info.messageId);
}

module.exports = sendVerificationEmail;
