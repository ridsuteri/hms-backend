const mongoose = require("mongoose");

const AdminAuthSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  otp: { type: String },
  otpExpires: { type: Date },
  createdAt: { type: Date },
  updatedAt: { type: Date, default: Date.now },
});

const adminauth = mongoose.model("AdminAuth", AdminAuthSchema);
module.exports = adminauth;
