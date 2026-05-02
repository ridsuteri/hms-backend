const mongoose = require("mongoose");

const AdminAuthSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: { type: String, required: true, trim: true },
    otp: { type: String },
    otpExpires: { type: Date },
  },
  { timestamps: true }
);

const adminauth = mongoose.model("AdminAuth", AdminAuthSchema);
module.exports = adminauth;
