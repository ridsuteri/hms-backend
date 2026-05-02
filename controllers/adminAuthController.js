const AdminAuth = require("../models/adminAuthModel");
const jwt = require("jsonwebtoken");
const { deliverAdminOtp } = require("../services/adminOtpService");

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function sanitizeAdmin(admin) {
  return {
    id: admin._id,
    name: admin.name,
    email: admin.email,
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt,
  };
}

exports.signup = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const name = String(req.body.name || "").trim();

    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required" });
    }

    const existingAdmin = await AdminAuth.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ error: "Admin already exists" });
    }

    const admin = new AdminAuth({
      email,
      name,
    });

    await admin.save();
    res.status(201).json({
      message: "Admin created successfully",
      data: { admin: sanitizeAdmin(admin) },
    });
  } catch (error) {
    console.error("Error creating admin:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.login = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const admin = await AdminAuth.findOne({ email });
    if (!admin) {
      return res
        .status(401)
        .json({ error: "Unauthorized. Contact admin for access." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

    admin.otp = String(otp);
    admin.otpExpires = otpExpires;
    await admin.save();

    const delivery = await deliverAdminOtp({ email, otp: String(otp) });

    res.json({
      message:
        delivery.channel === "debug"
          ? "OTP generated for local development. Use the code shown below to continue."
          : "OTP sent successfully",
      data: {
        deliveryChannel: delivery.channel,
        debugOtp: delivery.debugOtp || null,
      },
    });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const submittedOtp = String(req.body.otp || "").trim();

    if (!email || !submittedOtp) {
      return res.status(400).json({ error: "Email and OTP are required" });
    }

    const admin = await AdminAuth.findOne({ email });

    if (
      !admin ||
      String(admin.otp) !== submittedOtp ||
      !admin.otpExpires ||
      new Date() > admin.otpExpires
    ) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    const token = jwt.sign(
      {
        adminId: admin._id.toString(),
        email: admin.email,
        name: admin.name,
        role: "admin",
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    admin.otp = null;
    admin.otpExpires = null;
    await admin.save();

    res.json({
      message: "Login successful",
      token,
      data: { admin: sanitizeAdmin(admin) },
    });
  } catch (error) {
    console.log('error:', error)
    res.status(500).json({ error: "Internal server error" });
  }
};
