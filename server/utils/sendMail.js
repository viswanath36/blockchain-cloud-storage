const nodemailer = require("nodemailer");

const sendMail = async (to, subject, text) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "blockchainstorage11@gmail.com",
      pass: "ksspvpyzlnbwutsn"
    }
  });

  await transporter.sendMail({
    from: "blockchainstorage11@gmail.com",
    to,
    subject,
    text
  });
};

module.exports = sendMail;