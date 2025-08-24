const nodemailer = require('nodemailer');

async function sendEmail(mailOptions) {
    const transporter = nodemailer.createTransport({
        service: 'Gmail', 
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const info = await transporter.sendMail({
        from: `"Your Medical Devices App" <${process.env.EMAIL_USER}>`,
        to: mailOptions.to,
        subject: mailOptions.subject,
        text: mailOptions.text,
        html: mailOptions.html, // Nodemailer can handle both text and HTML
        attachments: mailOptions.attachments,
    });

    console.log('Email sent:', info.messageId);
    return info;
}

module.exports = sendEmail;