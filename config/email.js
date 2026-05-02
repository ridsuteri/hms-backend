const sgMail = require("@sendgrid/mail");

function canSendEmail() {
  return Boolean(
    process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL
  );
}

function configureSendGrid() {
  if (!canSendEmail()) {
    throw new Error("Email delivery is not configured");
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

async function sendOTP(email, otp) {
  configureSendGrid();

  const mailOptions = {
    to: email,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject: "Admin Login OTP",
    text: `Your one-time login code is: ${otp}. It will expire in 5 minutes.`,
    html: `<p>Your one-time login code is <strong>${otp}</strong>.</p><p>It will expire in 5 minutes.</p>`,
  };

  await sgMail.send(mailOptions);
}

module.exports = { sendOTP, canSendEmail };
