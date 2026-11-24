const nodemailer = require("nodemailer");

const mailTransporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.qq.com",
    port: Number(process.env.EMAIL_PORT) || 465,
    secure: process.env.EMAIL_SECURE !== "false",
    tls: { rejectUnauthorized: false, minVersion: "TLSv1" },
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

module.exports = mailTransporter;
