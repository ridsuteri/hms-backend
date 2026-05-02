const mongoose = require("mongoose");
const bcryptjs = require("bcryptjs");

const AuthSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: { type: String, required: true, trim: true },
    password: { type: String, required: true },
  },
  { timestamps: true }
);

// pre-save hook to hash the password before saving
AuthSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    this.password = await bcryptjs.hash(this.password, 10);
    next();
  } catch (error) {
    console.log(error)
  }
});

const auth = mongoose.model("Auth", AuthSchema);
module.exports = auth;
