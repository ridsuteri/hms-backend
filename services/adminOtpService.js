const { sendOTP, canSendEmail } = require("../config/email");

async function deliverAdminOtp({ email, otp }) {
    if (canSendEmail()) {
        await sendOTP(email, otp);
        return { channel: "sendgrid" };
    }

    if (process.env.NODE_ENV !== "production") {
        return { channel: "debug", debugOtp: String(otp) };
    }

    throw new Error("SendGrid email delivery is not configured");
}

module.exports = { deliverAdminOtp };
