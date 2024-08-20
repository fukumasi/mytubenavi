const nodemailer = require("nodemailer");
const fs = require("fs").promises;
const path = require("path");
const handlebars = require("handlebars");

const sendEmail = async (options) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_PORT === "465", // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    // テンプレートの読み込みと compile
    let html;
    if (options.template) {
      const templatePath = path.join(__dirname, "..", "emailTemplates", `${options.template}.hbs`);
      const template = await fs.readFile(templatePath, "utf-8");
      const compiledTemplate = handlebars.compile(template);
      html = compiledTemplate(options.context);
    }

    const message = {
      from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
      to: options.email,
      subject: options.subject,
      text: options.text, // プレーンテキスト版
      html: html || options.html, // HTML版（テンプレートまたは直接指定）
    };

    // 添付ファイルの追加
    if (options.attachments) {
      message.attachments = options.attachments;
    }

    const info = await transporter.sendMail(message);
    console.log("Message sent: %s", info.messageId);
    return info;
  } catch (error) {
    console.error("Email send error:", error);
    throw new Error("メールの送信に失敗しました");
  }
};

module.exports = sendEmail;