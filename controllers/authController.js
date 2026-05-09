const Auth = require("../models/authModel");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function sanitizeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

exports.signup = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const name = String(req.body.name || "").trim();
    const password = String(req.body.password || "").trim();

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: "Name, email & password are required" });
    }

    const existingUser = await Auth.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const user = new Auth({
      email,
      name,
      password,
    });

    await user.save();
    res.status(201).json({
      message: "Account created successfully",
      data: { user: sanitizeUser(user) },
    });
  } catch (error) {
    console.error("Error creating User:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.login = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "").trim();

    if (!email || !password) {
      return res.status(400).json({ error: "Email & password are required" });
    }

    const user = await Auth.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "User doesn't exists" });
    }

    const matched = await bcryptjs.compare(password, user.password);
    if (matched) {
      const token = jwt.sign(
        {
          userId: user._id.toString(),
          email: user.email,
          name: user.name,
          role: "user",
        },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );
      res.status(200).json({
        message: "Login successful",
        token,
        data: { user: sanitizeUser(user) },
      });
    } else {
      res.status(400).json({
        message: "Email & password doesnt match",
      });
    }
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const user = await Auth.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({
      data: { user: sanitizeUser(user) },
    });
  } catch (error) {
    console.error("Error fetching current user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
