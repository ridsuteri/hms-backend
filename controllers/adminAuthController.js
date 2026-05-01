const AdminAuth = require("../models/adminAuthModel");
const sgMail = require("../config/email");

exports.signup = async (req, res) => {
  try {
    const { email, name } = req.body;

    const existingAdmin = await AdminAuth.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ error: "Admin already exists" });
    }

    // Create new admin without storing JWT token
    const admin = new AdminAuth({
      email,
      name,
      // Expiry field will be populated when needed
    });

    await admin.save();
    res.status(201).json({ message: "Admin created successfully", admin });
  } catch (error) {
    console.error("Error creating admin:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.login = async (req, res) => {
    const {email} = req.body
    // check email
    // generate an otp
    // save that otp in adminAuth with expiry

    const msg = {
        from: process.env.SENDGRID_API_FROM,
        to: email,
        subject: `Login OTP for ${email} on Cn-Hms`,
        text: ``
    }
    // sgMail.send(msg)
};

exports.verifyOtp = async (req, res) => {
    // get email + otp from payload
    // verify otp + email + expiry
    // mark otp & expiry as null
    // sign a jwt token and give it response
};
