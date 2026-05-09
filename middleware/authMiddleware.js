const jwt = require("jsonwebtoken");

exports.isAuthenticated = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decodeToken = await jwt.verify(token, process.env.JWT_SECRET);
    req.user = decodeToken;
    next();
  } catch (err) {
    console.log(error);
    res.status(400).json({ message: "Invalid token" });
  }
};

exports.isAdminAuthenticated = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decodeToken = await jwt.verify(token, process.env.JWT_SECRET);
    if (decodeToken.role != "admin") {
      res.status(400).json({ message: "Unauthorized" });
    }
    req.user = decodeToken;
    next();
  } catch (err) {
    console.log(error);
    res.status(400).json({ message: "Invalid token" });
  }
};
